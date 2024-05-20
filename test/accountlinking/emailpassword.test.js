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
const {
    printPath,
    setupST,
    killAllST,
    cleanST,
    startSTWithMultitenancyAndAccountLinking,
    createTenant,
    assertJSONEquals,
} = require("../utils");
let supertokens = require("supertokens-node");
let assert = require("assert");
let { ProcessState } = require("supertokens-node/lib/build/processState");
const apiMock = require("../../api-mock");
const crypto = require("crypto");
const random = () => crypto.randomUUID();

describe(`accountlinkingTests: ${printPath("[test/accountlinking/emailpassword.test.js]")}`, function () {
    let mainConnectionURI = "";
    before(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
        mainConnectionURI = await startSTWithMultitenancyAndAccountLinking();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    describe("sign up tests", function () {
        it("sign up without account linking does not make primary user", async function () {
            const connectionURI = await createTenant(mainConnectionURI, random());
            await apiMock.initApp({
                connectionURI,
                recipes: {
                    emailpassword: {},
                },
            });
            const { EmailPassword } = apiMock.recipesMock;

            let user = (await EmailPassword.signUp("public", "test@example.com", "password123")).user;
            assert(!user.isPrimaryUser);
        });

        it("sign up with account linking makes primary user if email verification is not require", async function () {
            const connectionURI = await createTenant(mainConnectionURI, random());
            await apiMock.initApp({
                connectionURI,
                recipes: {
                    emailpassword: {},
                    accountlinking: {
                        shouldDoAutomaticAccountLinking: "true-without-verification",
                    },
                },
            });
            const { EmailPassword } = apiMock.recipesMock;

            let user = (await EmailPassword.signUp("public", "test@example.com", "password123")).user;
            assert(user.isPrimaryUser);
        });

        it("sign up with account linking does not make primary user if email verification is required", async function () {
            const connectionURI = await createTenant(mainConnectionURI, random());
            await apiMock.initApp({
                connectionURI,
                recipes: {
                    emailpassword: {},
                    accountlinking: {
                        shouldDoAutomaticAccountLinking: "true-with-verification",
                    },
                },
            });
            const { EmailPassword } = apiMock.recipesMock;

            let user = (await EmailPassword.signUp("public", "test@example.com", "password123")).user;
            assert(!user.isPrimaryUser);
        });

        it("sign up allowed even if account linking is on and email already used by another recipe (cause in recipe level, it is allowed), but no linking happens if email verification is required", async function () {
            const connectionURI = await createTenant(mainConnectionURI, random());
            await apiMock.initApp({
                connectionURI,
                recipes: {
                    emailpassword: {},
                    session: {},
                    accountlinking: {
                        shouldDoAutomaticAccountLinking: "true-with-verification",
                    },
                    thirdparty: {
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
                    },
                },
            });
            const { EmailPassword, AccountLinking, ThirdParty } = apiMock.recipesMock;

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
            const connectionURI = await createTenant(mainConnectionURI, random());
            await apiMock.initApp({
                connectionURI,
                recipes: {
                    emailpassword: {},
                    session: {},
                    accountlinking: {
                        shouldDoAutomaticAccountLinking: "true-without-verification",
                    },
                    thirdparty: {
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
                    },
                },
            });
            const { EmailPassword, ThirdParty } = apiMock.recipesMock;

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
            const connectionURI = await createTenant(mainConnectionURI, random());
            await apiMock.initApp({
                connectionURI,
                recipes: {
                    emailpassword: {},
                    session: {},
                    accountlinking: {
                        shouldDoAutomaticAccountLinking: "false",
                    },
                    thirdparty: {
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
                    },
                },
            });
            const { EmailPassword, ThirdParty, AccountLinking } = apiMock.recipesMock;

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
            const connectionURI = await createTenant(mainConnectionURI, random());
            await apiMock.initApp({
                connectionURI,
                recipes: {
                    emailpassword: {},
                    session: {},
                    accountlinking: {
                        shouldDoAutomaticAccountLinking: "doesEmailPasswordUserExist",
                    },
                    thirdparty: {
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
                    },
                },
            });
            const { EmailPassword, ThirdParty, AccountLinking } = apiMock.recipesMock;

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
            const connectionURI = await createTenant(mainConnectionURI, random());
            await apiMock.initApp({
                connectionURI,
                recipes: {
                    emailpassword: {},
                    accountlinking: {
                        shouldDoAutomaticAccountLinking: "userContextDoNotLink",
                    },
                },
            });
            const { EmailPassword } = apiMock.recipesMock;

            let user = (
                await EmailPassword.signUp("public", "test@example.com", "password123", undefined, {
                    doNotLink: true,
                })
            ).user;
            assert(!user.isPrimaryUser);

            user = (await EmailPassword.signIn("public", "test@example.com", "password123")).user;
            assert(user.isPrimaryUser);
        });

        it("sign in recipe function should link to the session user if verification is not required", async function () {
            const connectionURI = await createTenant(mainConnectionURI, random());
            await apiMock.initApp({
                connectionURI,
                recipes: {
                    emailpassword: {},
                    session: {},
                    accountlinking: {
                        shouldDoAutomaticAccountLinking: "userContextDoNotLink",
                    },
                },
            });

            const { EmailPassword, Session } = apiMock.recipesMock;

            const createSessionUser = await EmailPassword.signUp("public", "test2@example.com", "password123");
            const session = await Session.createNewSessionWithoutRequestResponse(
                "public",
                createSessionUser.recipeUserId
            );

            let user = (
                await EmailPassword.signUp("public", "test@example.com", "password123", undefined, {
                    doNotLink: true,
                })
            ).user;
            assert(!user.isPrimaryUser);

            const signInResp = await EmailPassword.signIn("public", "test@example.com", "password123", session);
            assert(signInResp.status, "OK");
            assert(signInResp.user.isPrimaryUser);
            assert.strictEqual(signInResp.user.id, createSessionUser.user.id);
            assert.notStrictEqual(signInResp.recipeUserId, createSessionUser.recipeUserId);
        });

        it("sign in recipe function marks email as verified if linked accounts has email as verified and uses the same email", async function () {
            const connectionURI = await createTenant(mainConnectionURI, random());
            await apiMock.initApp({
                connectionURI,
                recipes: {
                    emailpassword: {},
                    session: {},
                    accountlinking: {
                        shouldDoAutomaticAccountLinking: "true-with-verification",
                    },
                    emailverification: {
                        mode: "OPTIONAL",
                    },
                    thirdparty: {
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
                    },
                },
            });

            const { EmailPassword, ThirdParty, AccountLinking } = apiMock.recipesMock;

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
            const connectionURI = await createTenant(mainConnectionURI, random());
            await apiMock.initApp({
                connectionURI,
                recipes: {
                    emailpassword: {},
                    accountlinking: {
                        shouldDoAutomaticAccountLinking: "userContextDoNotLink",
                    },
                },
            });

            const { EmailPassword, AccountLinking } = apiMock.recipesMock;

            const email1 = `test+${Date.now()}@example.com`;
            let user = (await EmailPassword.signUp("public", email1, "password123")).user;
            const email2 = `test+${Date.now()}@example.com`;
            let user2 = (
                await EmailPassword.signUp("public", email2, "password123", undefined, {
                    doNotLink: true,
                })
            ).user;

            const linkResp = await AccountLinking.linkAccounts(user2.loginMethods[0].recipeUserId, user.id);
            assert.strictEqual(linkResp.status, "OK");

            const primUser = linkResp.user;

            await apiMock.initApp({
                connectionURI,
                recipes: {
                    emailpassword: {},
                },
            });

            const signInResp1 = await EmailPassword.signIn("public", email1, "password123");
            const signInResp2 = await EmailPassword.signIn("public", email2, "password123");

            assertJSONEquals(signInResp1.user, primUser);
            assertJSONEquals(signInResp2.user, primUser);
        });
    });

    describe("update email or password tests", function () {
        it("update email which belongs to other primary account, and current user is also a primary user should not work", async function () {
            const connectionURI = await createTenant(mainConnectionURI, random());
            await apiMock.initApp({
                connectionURI,
                recipes: {
                    emailpassword: {},
                    session: {},
                    accountlinking: {
                        shouldDoAutomaticAccountLinking: "true-without-verification",
                    },

                    thirdparty: {
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
                    },
                },
            });

            const { EmailPassword, ThirdParty, AccountLinking } = apiMock.recipesMock;

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
            const connectionURI = await createTenant(mainConnectionURI, random());
            await apiMock.initApp({
                connectionURI,
                recipes: {
                    emailpassword: {},
                    session: {},
                    emailverification: {
                        mode: "OPTIONAL",
                    },
                    accountlinking: {
                        shouldDoAutomaticAccountLinking: "false",
                    },
                    thirdparty: {
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
                    },
                },
            });

            const { EmailPassword, ThirdParty, AccountLinking, EmailVerification } = apiMock.recipesMock;

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
            const connectionURI = await createTenant(mainConnectionURI, random());
            await apiMock.initApp({
                connectionURI,
                recipes: {
                    emailpassword: {},
                    session: {},
                    emailverification: {
                        mode: "OPTIONAL",
                    },
                    accountlinking: {
                        shouldDoAutomaticAccountLinking: "true-with-verification",
                    },
                    thirdparty: {
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
                    },
                },
            });
            const { EmailPassword, ThirdParty, AccountLinking, EmailVerification } = apiMock.recipesMock;

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
    });
});
