/* Copyright (c) 2024, VRAI Labs and/or its affiliates. All rights reserved.
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

const {
    printPath,
    setupST,
    startST: globalStartST,
    killAllST,
    cleanST,
    extractInfoFromResponse,
    createTenant,
} = require("../utils");
let assert = require("assert");
const { epSignIn, epSignUp, plessEmailSignInUp, tpSignInUp, validateUserEmail } = require("./utils");
const { recipesMock, getOverrideParams, randomString } = require("../../api-mock");
const {
    AccountLinking,
    Session,
    supertokens: SuperTokens,
    ThirdParty,
    MultiFactorAuth,
    Passwordless,
    TOTP: Totp,
    EmailVerification,
    EmailPassword,
} = recipesMock;
const { shouldDoAutomaticAccountLinkingOverride } = require("../overridesMapping");

describe(`mfa with account linking: ${printPath("[test/mfa/mfa.withAccountLinking.test.js]")}`, function () {
    let globalConnectionURI;

    const startST = async () => {
        return createTenant(globalConnectionURI, randomString());
    };

    before(async function () {
        await killAllST();
        await setupST();
        globalConnectionURI = await globalStartST();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("test that thirdparty user sign up is rejected when another user with same email unverified exists", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                AccountLinking.init({
                    shouldDoAutomaticAccountLinking: async () => ({
                        shouldAutomaticallyLink: true,
                        shouldRequireVerification: true,
                    }),
                }),
                EmailPassword.init(),
                Passwordless.init({
                    contactMethod: "EMAIL",
                    flowType: "USER_INPUT_CODE",
                }),
                ThirdParty.init({
                    signInAndUpFeature: {
                        providers: [
                            {
                                config: {
                                    thirdPartyId: "custom3",
                                    clients: [
                                        {
                                            clientId: "clientid1",
                                        },
                                    ],
                                },
                                override: (oI) => {
                                    oI.exchangeAuthCodeForOAuthTokens = async (input) => {
                                        return input.redirectURIInfo.redirectURIQueryParams;
                                    };
                                    oI.getUserInfo = async (input) => {
                                        return {
                                            thirdPartyUserId: input.oAuthTokens.email,
                                            email: {
                                                id: input.oAuthTokens.email,
                                                isVerified: true,
                                            },
                                        };
                                    };
                                    return oI;
                                },
                            },
                        ],
                    },
                }),
                Totp.init(),
                MultiFactorAuth.init(),
                Session.init(),
                EmailVerification.init({ mode: "OPTIONAL" }),
            ],
        });

        let res = await epSignUp("test1@example.com", "password1", undefined);
        assert.strictEqual("OK", res.body.status);

        res = await tpSignInUp("custom3", "test1@example.com", undefined);
        assert.strictEqual("SIGN_IN_UP_NOT_ALLOWED", res.body.status);
    });

    it("should not link when signing-up when automatic account linking is turned off", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
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
                    contactMethod: "EMAIL",
                    flowType: "USER_INPUT_CODE",
                }),
                ThirdParty.init({
                    signInAndUpFeature: {
                        providers: [
                            {
                                config: {
                                    thirdPartyId: "custom3",
                                    clients: [
                                        {
                                            clientId: "clientid1",
                                        },
                                    ],
                                },
                                override: (oI) => {
                                    oI.exchangeAuthCodeForOAuthTokens = async (input) => {
                                        return input.redirectURIInfo.redirectURIQueryParams;
                                    };
                                    oI.getUserInfo = async (input) => {
                                        return {
                                            thirdPartyUserId: input.oAuthTokens.email,
                                            email: {
                                                id: input.oAuthTokens.email,
                                                isVerified: true,
                                            },
                                        };
                                    };
                                    return oI;
                                },
                            },
                        ],
                    },
                }),
                Totp.init(),
                MultiFactorAuth.init(),
                Session.init(),
                AccountLinking.init({
                    shouldDoAutomaticAccountLinking: () => ({ shouldAutomaticallyLink: false }),
                }),
                EmailVerification.init({ mode: "OPTIONAL" }),
            ],
        });

        let res = await tpSignInUp("custom3", "test1@example.com", undefined);
        assert.strictEqual("OK", res.body.status);

        res = await epSignUp("test2@example.com", "password1", undefined);
        assert.strictEqual("OK", res.body.status);
        await validateUserEmail(res.body.user.id);

        let cookies = extractInfoFromResponse(res);
        let accessToken = cookies.accessTokenFromAny;

        res = await plessEmailSignInUp("test1@example.com", accessToken);

        assert.strictEqual(res.status, 400);
        assert.deepStrictEqual(res.body, {
            message:
                "shouldDoAutomaticAccountLinking returned false when creating primary user but shouldTryLinkingWithSessionUser is true",
        });
    });

    it("test factor setup with same email as another existing user when automatic account linking is turned on but verification not required", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                AccountLinking.init({
                    shouldDoAutomaticAccountLinking: () => {
                        return {
                            shouldAutomaticallyLink: true,
                            shouldRequireVerification: false,
                        };
                    },
                }),
                EmailPassword.init(),
                Passwordless.init({
                    contactMethod: "EMAIL",
                    flowType: "USER_INPUT_CODE",
                }),
                ThirdParty.init({
                    signInAndUpFeature: {
                        providers: [
                            {
                                config: {
                                    thirdPartyId: "custom3",
                                    clients: [
                                        {
                                            clientId: "clientid1",
                                        },
                                    ],
                                },
                                override: (oI) => {
                                    oI.exchangeAuthCodeForOAuthTokens = async (input) => {
                                        return input.redirectURIInfo.redirectURIQueryParams;
                                    };
                                    oI.getUserInfo = async (input) => {
                                        return {
                                            thirdPartyUserId: input.oAuthTokens.email,
                                            email: {
                                                id: input.oAuthTokens.email,
                                                isVerified: true,
                                            },
                                        };
                                    };
                                    return oI;
                                },
                            },
                        ],
                    },
                }),
                Totp.init(),
                MultiFactorAuth.init(),
                Session.init(),
                EmailVerification.init({ mode: "OPTIONAL" }),
            ],
        });

        let res = await tpSignInUp("custom3", "test1@example.com", undefined);
        assert.strictEqual("OK", res.body.status);

        res = await epSignUp("test2@example.com", "password1", undefined);
        await validateUserEmail(res.body.user.id);
        assert.strictEqual("OK", res.body.status);

        let cookies = extractInfoFromResponse(res);
        let accessToken = cookies.accessTokenFromAny;

        res = await plessEmailSignInUp("test1@example.com", accessToken);
        assert.strictEqual("SIGN_IN_UP_NOT_ALLOWED", res.body.status);
        assert.strictEqual(
            "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_018)",
            res.body.reason
        );

        const usersRes = await SuperTokens.getUsersOldestFirst({
            tenantId: "public",
        });

        // While the linking doesn't succeed we do not check all conditions (in this case listing other users) to have less core calls
        // The extra recipe user shouldn't cause any issues, since account linking (incl. factor setup) works the same when signing in with an existing user
        assert.strictEqual(3, usersRes.users.length);
    });

    it("test factor setup with same email as another existing user when automatic account linking is turned on and verification is required", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                AccountLinking.init({
                    shouldDoAutomaticAccountLinking: () => {
                        return {
                            shouldAutomaticallyLink: true,
                            shouldRequireVerification: true,
                        };
                    },
                }),
                EmailPassword.init(),
                Passwordless.init({
                    contactMethod: "EMAIL",
                    flowType: "USER_INPUT_CODE",
                }),
                ThirdParty.init({
                    signInAndUpFeature: {
                        providers: [
                            {
                                config: {
                                    thirdPartyId: "custom3",
                                    clients: [
                                        {
                                            clientId: "clientid1",
                                        },
                                    ],
                                },
                                override: (oI) => {
                                    oI.exchangeAuthCodeForOAuthTokens = async (input) => {
                                        return input.redirectURIInfo.redirectURIQueryParams;
                                    };
                                    oI.getUserInfo = async (input) => {
                                        return {
                                            thirdPartyUserId: input.oAuthTokens.email,
                                            email: {
                                                id: input.oAuthTokens.email,
                                                isVerified: true,
                                            },
                                        };
                                    };
                                    return oI;
                                },
                            },
                        ],
                    },
                }),
                Totp.init(),
                MultiFactorAuth.init(),
                Session.init(),
                EmailVerification.init({ mode: "OPTIONAL" }),
            ],
        });

        let res = await tpSignInUp("custom3", "test1@example.com", undefined);
        assert.strictEqual("OK", res.body.status);

        res = await epSignUp("test2@example.com", "password1", undefined);
        await validateUserEmail(res.body.user.id);
        assert.strictEqual("OK", res.body.status);

        let cookies = extractInfoFromResponse(res);
        let accessToken = cookies.accessTokenFromAny;

        res = await plessEmailSignInUp("test1@example.com", accessToken);
        assert.strictEqual("SIGN_IN_UP_NOT_ALLOWED", res.body.status);
        assert.strictEqual(
            "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_018)",
            res.body.reason
        );

        const usersRes = await SuperTokens.getUsersOldestFirst({
            tenantId: "public",
        });

        // While the linking doesn't succeed we do not check all conditions (in this case listing other users) to have less core calls
        // The extra recipe user shouldn't cause any issues, since account linking (incl. factor setup) works the same when signing in with an existing user
        assert.strictEqual(3, usersRes.users.length);
    });

    it("test factor setup with thirdparty same email as another existing user when automatic account linking is turned on and verification is required", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                AccountLinking.init({
                    shouldDoAutomaticAccountLinking: () => {
                        return {
                            shouldAutomaticallyLink: true,
                            shouldRequireVerification: true,
                        };
                    },
                }),
                EmailPassword.init(),
                Passwordless.init({
                    contactMethod: "EMAIL",
                    flowType: "USER_INPUT_CODE",
                }),
                ThirdParty.init({
                    signInAndUpFeature: {
                        providers: [
                            {
                                config: {
                                    thirdPartyId: "custom3",
                                    clients: [
                                        {
                                            clientId: "clientid1",
                                        },
                                    ],
                                },
                                override: (oI) => {
                                    oI.exchangeAuthCodeForOAuthTokens = async (input) => {
                                        return input.redirectURIInfo.redirectURIQueryParams;
                                    };
                                    oI.getUserInfo = async (input) => {
                                        return {
                                            thirdPartyUserId: input.oAuthTokens.email,
                                            email: {
                                                id: input.oAuthTokens.email,
                                                isVerified: true,
                                            },
                                        };
                                    };
                                    return oI;
                                },
                            },
                            {
                                config: {
                                    thirdPartyId: "custom2",
                                    clients: [
                                        {
                                            clientId: "clientid1",
                                        },
                                    ],
                                },
                                override: (oI) => {
                                    oI.exchangeAuthCodeForOAuthTokens = async (input) => {
                                        return input.redirectURIInfo.redirectURIQueryParams;
                                    };
                                    oI.getUserInfo = async (input) => {
                                        return {
                                            thirdPartyUserId: "custom2" + input.oAuthTokens.email,
                                            email: {
                                                id: input.oAuthTokens.email,
                                                isVerified: true,
                                            },
                                        };
                                    };
                                    return oI;
                                },
                            },
                        ],
                    },
                }),
                Totp.init(),
                MultiFactorAuth.init(),
                Session.init(),
                EmailVerification.init({ mode: "OPTIONAL" }),
            ],
        });

        let res = await tpSignInUp("custom3", "test1@example.com", undefined);
        assert.strictEqual("OK", res.body.status);

        res = await epSignUp("test2@example.com", "password1", undefined);
        assert.strictEqual("OK", res.body.status);
        await validateUserEmail(res.body.user.id);
        res = await epSignIn("test2@example.com", "password1", undefined);

        let cookies = extractInfoFromResponse(res);
        let accessToken = cookies.accessTokenFromAny;

        res = await tpSignInUp("custom3", "test2@example.com", accessToken);
        assert.strictEqual("OK", res.body.status);

        res = await tpSignInUp("custom2", "test1@example.com", accessToken);
        assert.strictEqual("SIGN_IN_UP_NOT_ALLOWED", res.body.status);
        assert.strictEqual(
            "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_022)",
            res.body.reason
        );
    });

    it("test that unverified sign up is not allowed as a factor setup", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                AccountLinking.init({
                    shouldDoAutomaticAccountLinking: async () => ({
                        shouldAutomaticallyLink: true,
                        shouldRequireVerification: true,
                    }),
                }),
                EmailPassword.init(),
                Passwordless.init({
                    contactMethod: "EMAIL",
                    flowType: "USER_INPUT_CODE",
                }),
                ThirdParty.init({
                    signInAndUpFeature: {
                        providers: [
                            {
                                config: {
                                    thirdPartyId: "custom3",
                                    clients: [
                                        {
                                            clientId: "clientid1",
                                        },
                                    ],
                                },
                                override: (oI) => {
                                    oI.exchangeAuthCodeForOAuthTokens = async (input) => {
                                        return input.redirectURIInfo.redirectURIQueryParams;
                                    };
                                    oI.getUserInfo = async (input) => {
                                        return {
                                            thirdPartyUserId: input.oAuthTokens.email,
                                            email: {
                                                id: input.oAuthTokens.email,
                                                isVerified: true,
                                            },
                                        };
                                    };
                                    return oI;
                                },
                            },
                        ],
                    },
                }),
                Totp.init(),
                MultiFactorAuth.init(),
                Session.init(),
                EmailVerification.init({ mode: "OPTIONAL" }),
            ],
        });

        let res = await tpSignInUp("custom3", "test@example.com", undefined);
        assert.strictEqual("OK", res.body.status);

        let cookies = extractInfoFromResponse(res);
        let accessToken = cookies.accessTokenFromAny;

        res = await epSignUp("test2@example.com", "password1", accessToken);
        assert.strictEqual("SIGN_UP_NOT_ALLOWED", res.body.status);
        assert.strictEqual(
            "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_013)",
            res.body.reason
        );
    });

    it("test with account linking case 1", async function () {
        // auto account linking is turned off
        // Google signing up with e2  -> recipe user
        // auto account linking is turned on
        // Sign up with google with email e1 (with auto account linking on + verification required)
        // Second factor is email password e2 -> should be rejected
        // Google signing in with e2 -> should be allowed and become a primary user.

        const connectionURI = await startST();
        SuperTokens.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                AccountLinking.init({
                    shouldDoAutomaticAccountLinking: shouldDoAutomaticAccountLinkingOverride.automaticallyLinkDisabled,
                }),
                EmailPassword.init({
                    override: {
                        apis: (oI) => {
                            return {
                                ...oI,
                                signUpPOST: async (input) => {
                                    let body = await input.options.req.getJSONBody();
                                    if (body.userContext && body.userContext.DO_LINK !== undefined) {
                                        input.userContext.DO_LINK = body.userContext.DO_LINK;
                                    }
                                    return oI.signUpPOST(input);
                                },
                            };
                        },
                    },
                }),
                Passwordless.init({
                    contactMethod: "EMAIL",
                    flowType: "USER_INPUT_CODE",
                }),
                ThirdParty.init({
                    override: {
                        apis: (oI) => {
                            return {
                                ...oI,
                                signInUpPOST: async (input) => {
                                    let body = await input.options.req.getJSONBody();
                                    if (body.userContext && body.userContext.DO_LINK !== undefined) {
                                        input.userContext.DO_LINK = body.userContext.DO_LINK;
                                    }
                                    return oI.signInUpPOST(input);
                                },
                            };
                        },
                    },
                    signInAndUpFeature: {
                        providers: [
                            {
                                config: {
                                    thirdPartyId: "custom3",
                                    clients: [
                                        {
                                            clientId: "clientid1",
                                        },
                                    ],
                                },
                                override: (oI) => {
                                    oI.exchangeAuthCodeForOAuthTokens = async (input) => {
                                        return input.redirectURIInfo.redirectURIQueryParams;
                                    };
                                    oI.getUserInfo = async (input) => {
                                        return {
                                            thirdPartyUserId: input.oAuthTokens.email,
                                            email: {
                                                id: input.oAuthTokens.email,
                                                isVerified: true,
                                            },
                                        };
                                    };
                                    return oI;
                                },
                            },
                        ],
                    },
                }),
                Totp.init(),
                MultiFactorAuth.init({
                    firstFactors: ["emailpassword", "thirdparty"],
                }),
                Session.init(),
                EmailVerification.init({ mode: "OPTIONAL" }),
            ],
        });

        let res = await tpSignInUp("custom3", "test2@example.com");
        assert.strictEqual("OK", res.body.status);

        res = await tpSignInUp("custom3", "test1@example.com", undefined, {
            DO_LINK: true,
        });
        assert.strictEqual("OK", res.body.status);

        let cookies = extractInfoFromResponse(res);
        let accessToken = cookies.accessTokenFromAny;

        res = await epSignUp("test2@example.com", "password2", accessToken, {
            DO_LINK: true,
        });
        assert.strictEqual("SIGN_UP_NOT_ALLOWED", res.body.status);
        assert.strictEqual(
            "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_013)",
            res.body.reason
        );

        res = await tpSignInUp("custom3", "test2@example.com", undefined, {
            DO_LINK: true,
        });
        assert.strictEqual("OK", res.body.status);

        assert.strictEqual(true, res.body.user.isPrimaryUser);
    });

    it("test with account linking case 2", async function () {
        // auto account linking is turned off
        // Google signing up with e2  -> recipe user
        // auto account linking is turned on
        // Sign up with google with email e1 (with auto account linking on + verification required)
        // Second factor is email otp e2 -> should be linked
        // Google signing in with e2 -> should link with google account with email e1

        const connectionURI = await startST();
        SuperTokens.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                AccountLinking.init({
                    shouldDoAutomaticAccountLinking: shouldDoAutomaticAccountLinkingOverride.automaticallyLinkDisabled,
                }),
                EmailPassword.init({
                    override: {
                        apis: (oI) => {
                            return {
                                ...oI,
                                signUpPOST: async (input) => {
                                    let body = await input.options.req.getJSONBody();
                                    if (body.userContext && body.userContext.DO_LINK !== undefined) {
                                        input.userContext.DO_LINK = body.userContext.DO_LINK;
                                    }
                                    return oI.signUpPOST(input);
                                },
                            };
                        },
                    },
                }),
                Passwordless.init({
                    contactMethod: "EMAIL",
                    flowType: "USER_INPUT_CODE",
                    override: {
                        apis: (oI) => {
                            return {
                                ...oI,
                                consumeCodePOST: async (input) => {
                                    let body = await input.options.req.getJSONBody();
                                    if (body.userContext && body.userContext.DO_LINK !== undefined) {
                                        input.userContext.DO_LINK = body.userContext.DO_LINK;
                                    }
                                    return oI.consumeCodePOST(input);
                                },
                            };
                        },
                    },
                }),
                ThirdParty.init({
                    override: {
                        apis: (oI) => {
                            return {
                                ...oI,
                                signInUpPOST: async (input) => {
                                    let body = await input.options.req.getJSONBody();
                                    if (body.userContext && body.userContext.DO_LINK !== undefined) {
                                        input.userContext.DO_LINK = body.userContext.DO_LINK;
                                    }
                                    return oI.signInUpPOST(input);
                                },
                            };
                        },
                    },
                    signInAndUpFeature: {
                        providers: [
                            {
                                config: {
                                    thirdPartyId: "custom3",
                                    clients: [
                                        {
                                            clientId: "clientid1",
                                        },
                                    ],
                                },
                                override: (oI) => {
                                    oI.exchangeAuthCodeForOAuthTokens = async (input) => {
                                        return input.redirectURIInfo.redirectURIQueryParams;
                                    };
                                    oI.getUserInfo = async (input) => {
                                        return {
                                            thirdPartyUserId: input.oAuthTokens.email,
                                            email: {
                                                id: input.oAuthTokens.email,
                                                isVerified: true,
                                            },
                                        };
                                    };
                                    return oI;
                                },
                            },
                        ],
                    },
                }),
                Totp.init(),
                MultiFactorAuth.init({
                    firstFactors: ["emailpassword", "thirdparty"],
                }),
                Session.init(),
                EmailVerification.init({ mode: "OPTIONAL" }),
            ],
        });

        let res = await tpSignInUp("custom3", "test2@example.com");
        assert.strictEqual("OK", res.body.status);

        res = await tpSignInUp("custom3", "test1@example.com", undefined, {
            DO_LINK: true,
        });
        assert.strictEqual("OK", res.body.status);

        let cookies = extractInfoFromResponse(res);
        let accessToken = cookies.accessTokenFromAny;

        res = await plessEmailSignInUp("test2@example.com", accessToken, {
            DO_LINK: true,
        });
        assert.strictEqual("OK", res.body.status);

        res = await tpSignInUp("custom3", "test2@example.com", undefined, {
            DO_LINK: true,
        });
        assert.strictEqual("OK", res.body.status);
        assert.strictEqual(true, res.body.user.isPrimaryUser);
        assert.strictEqual(3, res.body.user.loginMethods.length);
    });
});
