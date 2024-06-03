let assert = require("assert");
const { recipesMock, queryAPI, randomString } = require("../../api-mock");
const {
    AccountLinking,
    EmailPassword,
    Session,
    supertokens,
    ThirdParty,
    Passwordless,
    Multitenancy,
    EmailVerification,
    MultiFactorAuth,
} = recipesMock;
const { createTenant } = require("../utils");
const { shouldDoAutomaticAccountLinkingOverride } = require("../overridesMapping");

exports.setup = async function setup(config = {}) {
    const connectionURI = await createTenant(config.globalConnectionURI, randomString());
    supertokens.init({
        // debug: true,
        supertokens: {
            connectionURI,
        },
        appInfo: {
            apiDomain: "api.supertokens.io",
            appName: "SuperTokens",
            websiteDomain: "supertokens.io",
        },
        recipeList: [
            EmailPassword.init(),
            Passwordless.init({
                contactMethod: "EMAIL_OR_PHONE",
                flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                ...(config.emailInputs
                    ? {
                          emailDelivery: {
                              service: {
                                  sendEmail: ({ userContext, ...rest }) => {
                                      if (!store || !store.emailInputs) {
                                          store = {
                                              ...store,
                                              emailInputs: [],
                                          };
                                      }
                                      store.emailInputs.push(rest);
                                      return;
                                  },
                              },
                          },
                      }
                    : {}),
            }),
            ThirdParty.init({
                signInAndUpFeature: {
                    providers: [
                        {
                            config: {
                                thirdPartyId: "custom",
                                authorizationEndpoint: "https://test.com/oauth/auth",
                                tokenEndpoint: "https://test.com/oauth/token",
                                requireEmail: false,
                                clients: [
                                    {
                                        clientId: "supertokens",
                                        clientSecret: "",
                                    },
                                ],
                            },
                            override: (oI) => ({
                                ...oI,
                                exchangeAuthCodeForOAuthTokens: ({ redirectURIInfo }) => redirectURIInfo,
                                getUserInfo: ({ oAuthTokens }) => {
                                    if (oAuthTokens.error) {
                                        throw new Error("Credentials error");
                                    }
                                    return {
                                        thirdPartyUserId: oAuthTokens.userId ?? "userId",
                                        email: oAuthTokens.email && {
                                            id: oAuthTokens.email,
                                            isVerified: oAuthTokens.isVerified === true,
                                        },
                                        rawUserInfoFromProvider: {},
                                    };
                                },
                            }),
                        },
                    ],
                },
            }),
            AccountLinking.init({
                shouldDoAutomaticAccountLinking:
                    config.shouldDoAutomaticAccountLinking ||
                    shouldDoAutomaticAccountLinkingOverride.automaticallyLinkIfVerified,
            }),
            EmailVerification.init({
                mode: "OPTIONAL",
            }),
            MultiFactorAuth.init(),
            Multitenancy.init(),
            Session.init(),
        ],
    });

    await Multitenancy.createOrUpdateTenant("tenant1", {
        passwordlessEnabled: true,
        thirdPartyEnabled: true,
        emailPasswordEnabled: true,
    });
    await Multitenancy.createOrUpdateTenant("tenant2", {
        passwordlessEnabled: true,
        thirdPartyEnabled: true,
        emailPasswordEnabled: true,
    });
};

exports.createPasswordlessUser = async function createPasswordlessUser(
    accountInfo,
    isVerified = true,
    tenantId = "public"
) {
    const res = await Passwordless.signInUp({
        ...accountInfo,
        tenantId,
        userContext: { DO_NOT_LINK: true },
    });
    assert.strictEqual(res.status, "OK");

    if (isVerified === false) {
        await EmailVerification.unverifyEmail(res.recipeUserId);
    }
    return res.user;
};

exports.createEmailPasswordUser = async function createEmailPasswordUser(
    email,
    isVerified = false,
    tenantId = "public"
) {
    const res = await EmailPassword.signUp(tenantId, email, exports.testPassword, undefined, { DO_NOT_LINK: true });
    assert.strictEqual(res.status, "OK");

    if (isVerified) {
        const token = await EmailVerification.createEmailVerificationToken(tenantId, res.recipeUserId);
        const verifyRes = await EmailVerification.verifyEmailUsingToken(tenantId, token.token, false);
        assert.strictEqual(verifyRes.status, "OK");
    }

    return res.user;
};

exports.createThirdPartyUser = async function createThirdPartyUser(
    email,
    isVerified = false,
    tenantId = "public",
    thirdPartyUserId = email
) {
    const res = await ThirdParty.manuallyCreateOrUpdateUser(
        tenantId,
        "custom",
        thirdPartyUserId,
        email,
        isVerified,
        undefined,
        {
            DO_NOT_LINK: true,
        }
    );
    assert.strictEqual(res.status, "OK");

    return res.user;
};

exports.makeUserPrimary = async function makeUserPrimary(user) {
    const res = await AccountLinking.createPrimaryUser(user.loginMethods[0].recipeUserId);
    assert.strictEqual(res.status, "OK");
    return res.user;
};

exports.linkUsers = async function linkUsers(primaryUser, otherUser) {
    const res = await AccountLinking.linkAccounts(otherUser.loginMethods[0].recipeUserId, primaryUser.id);
    assert.strictEqual(res.status, "OK");
    return res.user;
};

exports.getUpdatedUserFromDBForRespCompare = async function getUpdatedUserFromDBForRespCompare(user) {
    return JSON.parse(JSON.stringify((await supertokens.getUser(user.id)).toJson()));
};

exports.getSessionForUser = async function getSessionForUser(user, tenantId = "public") {
    return Session.createNewSessionWithoutRequestResponse(tenantId, user.loginMethods[0].recipeUserId);
};

exports.postAPI = async function post(path, body, session) {
    let headers = {};
    if (session) {
        const sessionTokens = session.getAllSessionTokensDangerously();
        headers = {
            Authorization: `Bearer ${sessionTokens.accessToken}`,
        };
    }
    let response = await queryAPI({
        method: "post",
        path,
        input: body,
        headers,
        returnResponse: true,
    });
    const responseHeaders = {};
    response.headers.forEach((_, key) => {
        responseHeaders[key] = response.headers.get?.(key) || undefined;
    });
    return {
        ...response,
        status: response.status,
        body: await response.json(),
        headers: responseHeaders,
    };
};

exports.getAPI = async function getAPI(path, session) {
    let headers = {};
    if (session) {
        const sessionTokens = session.getAllSessionTokensDangerously();
        headers = {
            Authorization: `Bearer ${sessionTokens.accessToken}`,
        };
    }
    let response = await queryAPI({
        method: "get",
        path,
        headers,
        returnResponse: true,
    });
    if (response.ok) {
        return {
            ...response,
            body: await response.json(),
        };
    }
    return response;
};

exports.putAPI = async function putAPI(path, body, session) {
    let headers = {};
    if (session) {
        const sessionTokens = session.getAllSessionTokensDangerously();
        headers = {
            Authorization: `Bearer ${sessionTokens.accessToken}`,
        };
    }
    let response = await queryAPI({
        method: "put",
        path,
        input: body,
        headers,
        returnResponse: true,
    });
    if (response.ok) {
        return {
            ...response,
            body: await response.json(),
        };
    }
    return response;
};

exports.getTestEmail = function getTestEmail(suffix) {
    return `john.doe+${Date.now()}+${suffix ?? 1}@supertokens.io`;
};

exports.getTestPhoneNumber = function () {
    return `+3630${Date.now().toString().substr(-7)}`;
};

exports.testPassword = "Asdf12..";
exports.wrongPassword = "nopenope";

exports.getSessionFromResponse = function getSessionFromResponse(resp) {
    return Session.getSessionWithoutRequestResponse(resp.headers["st-access-token"], undefined);
};
