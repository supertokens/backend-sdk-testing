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
const { AccountLinking, Passwordless, EmailVerification, Session, supertokens, ThirdParty } = recipesMock;

describe(`accountlinkingTests: ${printPath("[test/accountlinking/passwordless.test.js]")}`, function () {
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

    describe("update email tests", function () {
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
                    Passwordless.init({ contactMethod: "EMAIL_OR_PHONE", flowType: "USER_INPUT_CODE_AND_MAGIC_LINK"}),
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

            let response = await Passwordless.signInUp({ tenantId: "public", email: "test2@example.com"});
            assert(response.user.isPrimaryUser);
            assert(response.status === "OK");

            let isAllowed = await AccountLinking.isEmailChangeAllowed(
                response.user.loginMethods[0].recipeUserId,
                "test@example.com",
                false
            );
            assert(isAllowed === false);

            response = await Passwordless.updateUser({
                recipeUserId: response.user.loginMethods[0].recipeUserId,
                email: "test@example.com",
            });

            assert(response.status === "EMAIL_CHANGE_NOT_ALLOWED_ERROR");
        });

        it("update email which belongs to other primary account should work if passwordless user is not a primary user or is not linked, and account linking is disabled", async function () {
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
                    Passwordless.init({ contactMethod: "EMAIL_OR_PHONE", flowType: "USER_INPUT_CODE_AND_MAGIC_LINK"}),
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

            let response = await Passwordless.signInUp({ tenantId: "public", email: "test2@example.com"});
            assert(response.status === "OK");
            let recipeUserId = response.user.loginMethods[0].recipeUserId;

            let isAllowed = await AccountLinking.isEmailChangeAllowed(
                response.user.loginMethods[0].recipeUserId,
                "test@example.com",
                false
            );
            assert(isAllowed === true);

            response = await Passwordless.updateUser({
                recipeUserId: response.user.loginMethods[0].recipeUserId,
                email: "test@example.com",
            });

            assert(response.status === "OK");
            let isVerified = await EmailVerification.isEmailVerified(recipeUserId);
            assert(!isVerified);
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
                    Passwordless.init({ contactMethod: "EMAIL_OR_PHONE", flowType: "USER_INPUT_CODE_AND_MAGIC_LINK"}),
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

            let epUser = (await Passwordless.signInUp({ tenantId: "public", email})).user;
            await AccountLinking.createPrimaryUser(epUser.loginMethods[0].recipeUserId);

            const emailUpdateRes = await Passwordless.updateUser({
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
