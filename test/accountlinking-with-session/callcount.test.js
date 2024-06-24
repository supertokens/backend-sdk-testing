/* Copyright (c) 2021, VRAI Labs and/or its affiliates. All rights reserved.
 *
 * This software is licensed under the Apache License, Version 2.0 (the
 * "License") as published by the Apache Software Foundation.
 *
 * You may not use this file except in compliance with the License. You may
 * obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 */
const { printPath, setupST, killAllST, cleanST, startST: globalStartST, createTenant } = require("../utils");
const {
    getTestEmail,
    postAPI,
    createEmailPasswordUser,
    makeUserPrimary,
    getSessionForUser,
    createThirdPartyUser,
    testPassword,
} = require("./utils");
let assert = require("assert");
const { recipesMock, randomString, resetOverrideParams, getOverrideParams } = require("../../api-mock");
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
    TOTP,
} = recipesMock;
let { TOTP: TOTPGenerator } = require("otpauth");
const { shouldDoAutomaticAccountLinkingOverride } = require("../overridesMapping");

let globalConnectionURI;

const startST = async () => {
    return createTenant(globalConnectionURI, randomString());
};

const setup = async function setup(config = {}) {
    const info = {
        coreCallCount: 0,
    };
    const connectionURI = await startST();
    supertokens.init({
        // debug: true,
        supertokens: {
            connectionURI,
            networkInterceptor: (request, userContext) => {
                ++info.coreCallCount;
                // console.log(`[${request.method}] ${request.url}?${new URLSearchParams(request.params).toString()}`);
                // console.log("cache", userContext?.key, Object.keys(userContext?._default?.coreCallCache ?? {}));
                return request;
            },
        },
        appInfo: {
            apiDomain: "api.supertokens.io",
            appName: "SuperTokens",
            websiteDomain: "supertokens.io",
        },
        recipeList: [
            EmailPassword.init(),
            Passwordless.init({
                flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                contactMethod: "EMAIL_OR_PHONE",
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
            config.initAccountLinking &&
                AccountLinking.init({
                    shouldDoAutomaticAccountLinking: shouldDoAutomaticAccountLinkingOverride.automaticallyLinkNoVerify,
                }),
            EmailVerification.init({
                mode: "OPTIONAL",
            }),
            Multitenancy.init(),
            Session.init(),
            config.initMFA &&
                MultiFactorAuth.init({
                    firstFactors: config.firstFactors,
                }),
            config.initMFA && TOTP.init({}),
        ].filter((init) => !!init),
    });
};

describe(`Multi-recipe account linking flows core call counts: ${printPath(
    "[test/accountlinking-with-session/callcount.test.js]"
)}`, function () {
    before(async function () {
        await killAllST();
        await setupST();
        globalConnectionURI = await globalStartST();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    describe("sign up", function () {
        it("should call the core <=6 times without MFA or AL", async () => {
            await setup({
                initAccountLinking: false,
                initMFA: false,
            });
            const email = getTestEmail();
            const resp = await signUpPOST(email);
            assert.strictEqual(resp.body.status, "OK");

            let overrideParams = await getOverrideParams();
            let info = overrideParams.info;
            assert.strictEqual(info.coreCallCount, 6);
        });
        it("should call the core <=8 times with AL without MFA", async () => {
            await setup({
                initAccountLinking: true,
                initMFA: false,
            });
            const email = getTestEmail();
            const resp = await signUpPOST(email);
            assert.strictEqual(resp.body.status, "OK");

            let overrideParams = await getOverrideParams();
            let info = overrideParams.info;
            assert.strictEqual(info.coreCallCount, 8);
        });

        it("should call the core <=12 times with MFA and AL", async () => {
            await setup({
                initAccountLinking: true,
                initMFA: true,
            });
            const email = getTestEmail();
            const resp = await signUpPOST(email);
            assert.strictEqual(resp.body.status, "OK");

            let overrideParams = await getOverrideParams();
            let info = overrideParams.info;
            assert.strictEqual(info.coreCallCount, 12);
        });
    });

    describe("sign in", function () {
        it("should call the core <=6 times without MFA or AL", async () => {
            await setup({
                initAccountLinking: false,
                initMFA: false,
            });
            const email = getTestEmail();
            await createEmailPasswordUser(email, true);
            await resetOverrideParams();

            const resp = await signInPOST(email);
            assert.strictEqual(resp.body.status, "OK");

            let overrideParams = await getOverrideParams();
            let info = overrideParams.info;
            assert.strictEqual(info.coreCallCount, 6);
        });
        it("should call the core <=9 times with AL without MFA", async () => {
            await setup({
                initAccountLinking: true,
                initMFA: false,
            });

            const email = getTestEmail();
            await createEmailPasswordUser(email);
            await resetOverrideParams();

            const resp = await signInPOST(email);
            assert.strictEqual(resp.body.status, "OK");

            let overrideParams = await getOverrideParams();
            let info = overrideParams.info;
            assert.strictEqual(info.coreCallCount, 9);
        });

        it("should call the core <=13 times with MFA and AL", async () => {
            await setup({
                initAccountLinking: true,
                initMFA: true,
            });

            const email = getTestEmail();
            await createEmailPasswordUser(email);
            await resetOverrideParams();

            const resp = await signInPOST(email);
            assert.strictEqual(resp.body.status, "OK");

            let overrideParams = await getOverrideParams();
            let info = overrideParams.info;
            assert.strictEqual(info.coreCallCount, 13);
        });
    });

    describe("sign up w/ session", function () {
        it("should call the core <=3 times without MFA or AL", async () => {
            await setup({
                initAccountLinking: false,
                initMFA: false,
            });
            const email = getTestEmail();
            let user = await createThirdPartyUser(email, true);
            user = await makeUserPrimary(user);
            const session = await getSessionForUser(user);
            await resetOverrideParams();

            const resp = await signUpPOST(email, session);
            assert.strictEqual(resp.body.status, "OK");

            let overrideParams = await getOverrideParams();
            let info = overrideParams.info;
            assert.strictEqual(info.coreCallCount, 3);
        });

        it("should call the core <=9 times with AL without MFA", async () => {
            await setup({
                initAccountLinking: true,
                initMFA: false,
            });

            const email = getTestEmail();
            const user = await createThirdPartyUser(email, true);
            const session = await getSessionForUser(user);
            await resetOverrideParams();

            const resp = await signUpPOST(email, session);
            assert.strictEqual(resp.body.status, "OK");
            let overrideParams = await getOverrideParams();
            let info = overrideParams.info;
            assert.strictEqual(info.coreCallCount, 9);
        });

        it("should call the core <=17 times with MFA and AL while marking the new user verified, migrating the session and make the session user primary", async () => {
            await setup({
                initAccountLinking: true,
                initMFA: true,
            });

            const email = getTestEmail();
            let user = await createThirdPartyUser(email, true);
            const session = await getSessionForUser(user);
            await resetOverrideParams();
            const resp = await signUpPOST(email, session);
            assert.strictEqual(resp.body.status, "OK");

            let overrideParams = await getOverrideParams();
            let info = overrideParams.info;
            assert.strictEqual(info.coreCallCount, 17);
        });
        it("should call the core <=15 times with MFA and AL while migrating the session and making the session user primary", async () => {
            await setup({
                initAccountLinking: true,
                initMFA: true,
            });

            const email = getTestEmail();
            let user = await createThirdPartyUser(email, false);
            const session = await getSessionForUser(user);
            await resetOverrideParams();
            const resp = await signUpPOST(email, session);
            assert.strictEqual(resp.body.status, "OK");

            let overrideParams = await getOverrideParams();
            let info = overrideParams.info;
            assert.strictEqual(info.coreCallCount, 15);
        });
        it("should call the core <=13 times with MFA and AL while migrating the session", async () => {
            await setup({
                initAccountLinking: true,
                initMFA: true,
            });

            const email = getTestEmail();
            let user = await createThirdPartyUser(email, false);
            user = await makeUserPrimary(user);
            const session = await getSessionForUser(user);
            await resetOverrideParams();
            const resp = await signUpPOST(email, session);
            assert.strictEqual(resp.body.status, "OK");

            let overrideParams = await getOverrideParams();
            let info = overrideParams.info;
            assert.strictEqual(info.coreCallCount, 13);
        });
        it("should call the core <=9 times with MFA and AL", async () => {
            await setup({
                initAccountLinking: true,
                initMFA: true,
            });

            const email = getTestEmail();
            let user = await createThirdPartyUser(email, false);
            user = await makeUserPrimary(user);
            const session = await getSessionForUser(user);
            await session.fetchAndSetClaim(MultiFactorAuth.MultiFactorAuthClaim);
            await resetOverrideParams();
            const resp = await signUpPOST(email, session);
            assert.strictEqual(resp.body.status, "OK");

            let overrideParams = await getOverrideParams();
            let info = overrideParams.info;
            assert.strictEqual(info.coreCallCount, 9);
        });
    });

    describe("factor completion", function () {
        it("should call the core <=8 times when completing otp-email", async () => {
            await setup({
                initAccountLinking: true,
                initMFA: true,
            });

            const email = getTestEmail();
            const user = await createThirdPartyUser(email, true);
            const session = await getSessionForUser(user);

            const code0 = await Passwordless.createCode({
                email,
                tenantId: "public",
                session,
            });
            const resp0 = await consumeCodePOST(code0, session);
            assert.strictEqual(resp0.body.status, "OK");

            const code = await Passwordless.createCode({
                email,
                tenantId: "public",
                session,
            });
            await resetOverrideParams();

            const resp = await consumeCodePOST(code, session);
            assert.strictEqual(resp.body.status, "OK");
            let overrideParams = await getOverrideParams();
            let info = overrideParams.info;
            assert.strictEqual(info.coreCallCount, 8);
        });

        it("should call the core <=5 times when completing totp", async () => {
            await setup({
                initAccountLinking: true,
                initMFA: true,
            });

            const email = getTestEmail();
            const user = await createThirdPartyUser(email, true);
            const session = await getSessionForUser(user);

            const device = await TOTP.createDevice(user.id);
            const totpGen = new TOTPGenerator({ secret: device.secret });
            const verifyRes = await TOTP.verifyDevice(
                "public",
                user.id,
                device.deviceName,
                totpGen.generate({ timestamp: Date.now() - 30000 })
            );
            assert.strictEqual(verifyRes.status, "OK");

            await resetOverrideParams();

            const resp = await totpVerifyPOST(totpGen.generate({ timestamp: Date.now() + 30000 }), session);
            assert.strictEqual(resp.body.status, "OK");
            let overrideParams = await getOverrideParams();
            let info = overrideParams.info;
            assert.strictEqual(info.coreCallCount, 5);
        });
    });
});

async function consumeCodePOST(code, session) {
    return postAPI(
        "/auth/signinup/code/consume",
        code.userInputCode !== undefined
            ? {
                  preAuthSessionId: code.preAuthSessionId,
                  userInputCode: code.userInputCode,
                  deviceId: code.deviceId,
              }
            : {
                  preAuthSessionId: code.preAuthSessionId,
                  linkCode: code.linkCode,
              },
        session
    );
}

async function totpVerifyPOST(totp, session) {
    return postAPI(
        "/auth/totp/verify",
        {
            totp,
        },
        session
    );
}

async function signUpPOST(email, session, password = testPassword) {
    return postAPI(
        "/auth/signup",
        {
            formFields: [
                { id: "email", value: email },
                { id: "password", value: password },
            ],
        },
        session
    );
}

async function signInPOST(email, session, password = testPassword) {
    return postAPI(
        "/auth/signin",
        {
            formFields: [
                { id: "email", value: email },
                { id: "password", value: password },
            ],
        },
        session
    );
}
