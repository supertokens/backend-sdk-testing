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
let assert = require("assert");
const { recipesMock, randomString } = require("../../api-mock");
const { shouldDoAutomaticAccountLinkingOverride } = require("../overridesMapping");
const { AccountLinking, EmailPassword, EmailVerification, Session, supertokens, ThirdParty } = recipesMock;

describe(`accountlinkingTests: ${printPath("[test/accountlinking/emailpassword.test.js]")}`, function () {
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

    describe("sign up tests", function () {
        it("sign up without account linking does not make primary user", async function () {
            const connectionURI = await startST();
            supertokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [EmailPassword.init()],
            });

            let user = (await EmailPassword.signUp("public", "test@example.com", "password123")).user;
            assert(!user.isPrimaryUser);
        });

        it("sign up with account linking makes primary user if email verification is not require", async function () {
            const connectionURI = await startST();
            supertokens.init({
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
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking:
                            shouldDoAutomaticAccountLinkingOverride.automaticallyLinkNoVerify,
                    }),
                ],
            });

            let user = (await EmailPassword.signUp("public", "test@example.com", "password123")).user;
            assert(user.isPrimaryUser);
        });

        it("sign up with account linking does not make primary user if email verification is required", async function () {
            const connectionURI = await startST();
            supertokens.init({
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
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking:
                            shouldDoAutomaticAccountLinkingOverride.automaticallyLinkIfVerified,
                    }),
                ],
            });

            let user = (await EmailPassword.signUp("public", "test@example.com", "password123")).user;
            assert(!user.isPrimaryUser);
        });

        it("sign up allowed even if account linking is on and email already used by another recipe (cause in recipe level, it is allowed), but no linking happens if email verification is required", async function () {
            const connectionURI = await startST();
            supertokens.init({
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
                    Session.init(),
                    ThirdParty.init({
                        signInAndUpFeature: {
                            providers: [
                                {
                                    config: {
                                        thirdPartyId: "google",
                                        clients: [
                                            {
                                                clientId: "",
                                                clientSecret: "",
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking:
                            shouldDoAutomaticAccountLinkingOverride.automaticallyLinkIfVerified,
                    }),
                ],
            });

            let { user } = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "abc",
                "test@example.com",
                false
            );

            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(user.id));

            let response = await EmailPassword.signUp("public", "test@example.com", "password123");

            assert(response.status === "OK");
            assert(response.user.id !== user.id);
            assert(response.user.isPrimaryUser === false);
        });

        it("sign up allowed if account linking is on, email verification is off, and email already used by another recipe", async function () {
            const connectionURI = await startST();
            supertokens.init({
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
                    Session.init(),
                    ThirdParty.init({
                        signInAndUpFeature: {
                            providers: [
                                {
                                    config: {
                                        thirdPartyId: "google",
                                        clients: [
                                            {
                                                clientId: "",
                                                clientSecret: "",
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking:
                            shouldDoAutomaticAccountLinkingOverride.automaticallyLinkNoVerify,
                    }),
                ],
            });

            let { user } = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "abc",
                "test@example.com",
                false
            );

            assert(user.isPrimaryUser);

            let response = await EmailPassword.signUp("public", "test@example.com", "password123");

            assert(response.status === "OK");
            assert(response.user.id === user.id);
            assert(response.user.loginMethods.length === 2);
        });

        it("sign up allowed if account linking is off, and email already used by another recipe", async function () {
            const connectionURI = await startST();
            supertokens.init({
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
                    Session.init(),
                    ThirdParty.init({
                        signInAndUpFeature: {
                            providers: [
                                {
                                    config: {
                                        thirdPartyId: "google",
                                        clients: [
                                            {
                                                clientId: "",
                                                clientSecret: "",
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking:
                            shouldDoAutomaticAccountLinkingOverride.automaticallyLinkDisabled,
                    }),
                ],
            });

            let { user } = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "abc",
                "test@example.com",
                false
            );

            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(user.id));

            let response = await EmailPassword.signUp("public", "test@example.com", "password123");

            assert(response.status === "OK");
        });

        it("sign up doesn't link user to existing account if email verification is needed", async function () {
            const connectionURI = await startST();
            supertokens.init({
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
                    Session.init(),
                    ThirdParty.init({
                        signInAndUpFeature: {
                            providers: [
                                {
                                    config: {
                                        thirdPartyId: "google",
                                        clients: [
                                            {
                                                clientId: "",
                                                clientSecret: "",
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking:
                            shouldDoAutomaticAccountLinkingOverride.linkingNoVerifyExceptEmailPasswordExist,
                    }),
                ],
            });

            let { user } = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "abc",
                "test@example.com",
                false
            );

            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(user.id));

            let response = await EmailPassword.signUp("public", "test@example.com", "password123");

            assert(response.status === "OK");
            assert(response.user.id !== user.id);
            assert(!response.user.isPrimaryUser);
        });
    });

    describe("sign in tests", function () {
        it("sign in recipe function should make the user primary if verification is not required", async function () {
            const connectionURI = await startST();
            supertokens.init({
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
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking:
                            shouldDoAutomaticAccountLinkingOverride.automaticallyLinkNoVerify,
                    }),
                ],
            });

            let user = (
                await EmailPassword.signUp("public", "test@example.com", "password123", undefined, {
                    DO_NOT_LINK: true,
                })
            ).user;
            assert(!user.isPrimaryUser);

            user = (await EmailPassword.signIn("public", "test@example.com", "password123")).user;
            assert(user.isPrimaryUser);
        });

        it("sign in recipe function should link to the session user if verification is not required", async function () {
            const connectionURI = await startST();
            supertokens.init({
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
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking:
                            shouldDoAutomaticAccountLinkingOverride.automaticallyLinkNoVerify,
                    }),
                    Session.init(),
                ],
            });

            const createSessionUser = await EmailPassword.signUp("public", "test2@example.com", "password123");
            const session = await Session.createNewSessionWithoutRequestResponse(
                "public",
                createSessionUser.recipeUserId
            );

            let user = (
                await EmailPassword.signUp("public", "test@example.com", "password123", undefined, {
                    DO_NOT_LINK: true,
                })
            ).user;
            assert(!user.isPrimaryUser);

            const signInResp = await EmailPassword.signIn("public", "test@example.com", "password123", session);
            assert(signInResp.status, "OK");
            assert(signInResp.user.isPrimaryUser);
            assert.strictEqual(signInResp.user.id, createSessionUser.user.id);
            assert.notStrictEqual(signInResp.recipeUserId.getAsString(), createSessionUser.recipeUserId.getAsString());
        });

        it("sign in recipe function marks email as verified if linked accounts has email as verified and uses the same email", async function () {
            const connectionURI = await startST();
            supertokens.init({
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
                    Session.init(),
                    EmailVerification.init({
                        mode: "OPTIONAL",
                    }),
                    ThirdParty.init({
                        signInAndUpFeature: {
                            providers: [
                                {
                                    config: {
                                        thirdPartyId: "google",
                                        clients: [
                                            {
                                                clientId: "",
                                                clientSecret: "",
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking:
                            shouldDoAutomaticAccountLinkingOverride.automaticallyLinkIfVerified,
                    }),
                ],
            });

            let tpUser = (
                await ThirdParty.manuallyCreateOrUpdateUser("public", "abc", "abcd", "test@example.com", true)
            ).user;
            assert(tpUser.isPrimaryUser);

            let user = (await EmailPassword.signUp("public", "test@example.com", "password123")).user;
            assert(!user.isPrimaryUser);
            assert(user.loginMethods[0].verified === false);

            await AccountLinking.linkAccounts(user.loginMethods[0].recipeUserId, tpUser.id);

            user = (await EmailPassword.signIn("public", "test@example.com", "password123")).user;
            assert(user.isPrimaryUser === true);
            assert(user.loginMethods[0].verified === true);
            assert(user.loginMethods[1].verified === true);
        });

        it("sign in returns the primary user even if accountlinking was later disabled", async function () {
            const connectionURI = await startST();
            supertokens.init({
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
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking:
                            shouldDoAutomaticAccountLinkingOverride.automaticallyLinkNoVerify,
                    }),
                ],
            });

            const email1 = `test+${Date.now()}@example.com`;
            let user = (await EmailPassword.signUp("public", email1, "password123")).user;
            const email2 = `test+${Date.now()}@example.com`;
            let user2 = (
                await EmailPassword.signUp("public", email2, "password123", undefined, {
                    DO_NOT_LINK: true,
                })
            ).user;

            const linkResp = await AccountLinking.linkAccounts(user2.loginMethods[0].recipeUserId, user.id);
            assert.strictEqual(linkResp.status, "OK");

            const primUser = linkResp.user;

            // init will reset the app

            supertokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [EmailPassword.init()],
            });

            const signInResp1 = await EmailPassword.signIn("public", email1, "password123");
            const signInResp2 = await EmailPassword.signIn("public", email2, "password123");

            assert.deepStrictEqual(signInResp1.user.toJson(), primUser.toJson());
            assert.deepStrictEqual(signInResp2.user.toJson(), primUser.toJson());
        });
    });

    describe("update email or password tests", function () {
        it("update email which belongs to other primary account, and current user is also a primary user should not work", async function () {
            const connectionURI = await startST();
            supertokens.init({
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
                    Session.init(),
                    ThirdParty.init({
                        signInAndUpFeature: {
                            providers: [
                                {
                                    config: {
                                        thirdPartyId: "google",
                                        clients: [
                                            {
                                                clientId: "",
                                                clientSecret: "",
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking:
                            shouldDoAutomaticAccountLinkingOverride.automaticallyLinkNoVerify,
                    }),
                ],
            });

            let { user } = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "abc",
                "test@example.com",
                false
            );
            assert(user.isPrimaryUser);

            let response = await EmailPassword.signUp("public", "test2@example.com", "password123");
            assert(response.user.isPrimaryUser);
            assert(response.status === "OK");

            let isAllowed = await AccountLinking.isEmailChangeAllowed(
                response.user.loginMethods[0].recipeUserId,
                "test@example.com",
                false
            );
            assert(isAllowed === false);

            response = await EmailPassword.updateEmailOrPassword({
                recipeUserId: response.user.loginMethods[0].recipeUserId,
                email: "test@example.com",
            });

            assert(response.status === "EMAIL_CHANGE_NOT_ALLOWED_ERROR");
        });

        it("update email which belongs to other primary account should work if email password user is not a primary user or is not linked, and account linking is disabled", async function () {
            const connectionURI = await startST();
            supertokens.init({
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
                    Session.init(),
                    EmailVerification.init({
                        mode: "OPTIONAL",
                    }),
                    ThirdParty.init({
                        signInAndUpFeature: {
                            providers: [
                                {
                                    config: {
                                        thirdPartyId: "google",
                                        clients: [
                                            {
                                                clientId: "",
                                                clientSecret: "",
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking:
                            shouldDoAutomaticAccountLinkingOverride.automaticallyLinkDisabled,
                    }),
                ],
            });

            let { user } = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "abc",
                "test@example.com",
                true
            );

            await AccountLinking.createPrimaryUser(supertokens.convertToRecipeUserId(user.id));

            let response = await EmailPassword.signUp("public", "test2@example.com", "password123");
            assert(response.status === "OK");
            let recipeUserId = response.user.loginMethods[0].recipeUserId;

            let isAllowed = await AccountLinking.isEmailChangeAllowed(
                response.user.loginMethods[0].recipeUserId,
                "test@example.com",
                false
            );
            assert(isAllowed === true);

            response = await EmailPassword.updateEmailOrPassword({
                recipeUserId: response.user.loginMethods[0].recipeUserId,
                email: "test@example.com",
            });

            assert(response.status === "OK");
            let isVerified = await EmailVerification.isEmailVerified(recipeUserId);
            assert(!isVerified);
        });

        it("update email which belongs to linked user should mark email as verified of email password user", async function () {
            const connectionURI = await startST();
            supertokens.init({
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
                    Session.init(),
                    EmailVerification.init({
                        mode: "OPTIONAL",
                    }),
                    ThirdParty.init({
                        signInAndUpFeature: {
                            providers: [
                                {
                                    config: {
                                        thirdPartyId: "google",
                                        clients: [
                                            {
                                                clientId: "",
                                                clientSecret: "",
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking:
                            shouldDoAutomaticAccountLinkingOverride.automaticallyLinkIfVerified,
                    }),
                ],
            });

            let { user } = await ThirdParty.manuallyCreateOrUpdateUser(
                "public",
                "google",
                "abc",
                "test@example.com",
                true
            );
            assert(user.isPrimaryUser);

            let response = await EmailPassword.signUp("public", "test2@example.com", "password123");
            assert(response.status === "OK");
            let recipeUserId = response.user.loginMethods[0].recipeUserId;
            await AccountLinking.linkAccounts(recipeUserId, user.id);

            let isAllowed = await AccountLinking.isEmailChangeAllowed(recipeUserId, "test@example.com", false);
            assert(isAllowed === true);

            response = await EmailPassword.updateEmailOrPassword({
                recipeUserId: recipeUserId,
                email: "test@example.com",
            });

            assert(response.status === "OK");
            let isVerified = await EmailVerification.isEmailVerified(recipeUserId);
            assert(isVerified);
        });

        it("should not allow account takeover by updating to an unverified email address matching another user", async function () {
            let date = Date.now();
            let email = `john.doe+${date}+a@supertokens.com`;
            let email2 = `john.doe+${date}+v@supertokens.com`;
            const connectionURI = await startST();
            supertokens.init({
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
                    EmailVerification.init({
                        mode: "OPTIONAL",
                    }),
                    Session.init(),
                    ThirdParty.init({
                        signInAndUpFeature: {
                            providers: [
                                {
                                    config: {
                                        thirdPartyId: "google",
                                        clients: [
                                            {
                                                clientId: "",
                                                clientSecret: "",
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    }),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking:
                            shouldDoAutomaticAccountLinkingOverride.automaticallyLinkIfVerified,
                    }),
                ],
            });

            let tpUserV = (await ThirdParty.manuallyCreateOrUpdateUser("public", "google", "abcd2" + date, email2, true, undefined, { DO_NOT_LINK: true}));
            assert(!tpUserV.user.isPrimaryUser)

            let epUser = (await EmailPassword.signUp("public", email, "differentvalidpass123")).user;
            await AccountLinking.createPrimaryUser(epUser.loginMethods[0].recipeUserId);

            const emailUpdateRes = await EmailPassword.updateEmailOrPassword({
                recipeUserId: epUser.loginMethods[0].recipeUserId,
                email: email2,
                applyPasswordPolicy: false,
                password: "differentvalidpass123",
             });

            assert.strictEqual(emailUpdateRes.status, "EMAIL_CHANGE_NOT_ALLOWED_ERROR");
            assert.strictEqual(emailUpdateRes.reason, "New email cannot be applied to existing account because of account takeover risks.");
        });
    });
});
