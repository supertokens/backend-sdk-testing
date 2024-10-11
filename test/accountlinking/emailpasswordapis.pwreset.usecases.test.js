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
const { resetOverrideLogs, randomString, recipesMock, request, getOverrideLogs } = require("../../api-mock");
const { shouldDoAutomaticAccountLinkingOverride } = require("../overridesMapping");
const { AccountLinking, EmailPassword, EmailVerification, Session, supertokens, ThirdParty } = recipesMock;

describe(`accountlinkingTests: ${printPath("[test/accountlinking/emailpasswordapis2.test.js]")}`, function () {
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

    const customProviderWithEmailVerified = {
        config: {
            thirdPartyId: "custom-ev",
            authorizationEndpoint: "https://test.com/oauth/auth",
            tokenEndpoint: "https://test.com/oauth/token",
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
                return {
                    thirdPartyUserId: oAuthTokens.userId ?? "user",
                    email: {
                        id: oAuthTokens.email ?? "email@test.com",
                        isVerified: true,
                    },
                    rawUserInfoFromProvider: {},
                };
            },
        }),
    };

    const customProviderWithEmailNotVerified = {
        config: {
            thirdPartyId: "custom-no-ev",
            authorizationEndpoint: "https://test.com/oauth/auth",
            tokenEndpoint: "https://test.com/oauth/token",
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
                return {
                    thirdPartyUserId: oAuthTokens.userId ?? "user",
                    email: {
                        id: oAuthTokens.email ?? "email@test.com",
                        isVerified: true,
                    },
                    rawUserInfoFromProvider: {},
                };
            },
        }),
    };

    describe("with automaticallyLinkIfVerified", () => {
        beforeEach(async function () {
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
                    EmailVerification.init(),
                    EmailPassword.init(),
                    Session.init(),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking:
                            shouldDoAutomaticAccountLinkingOverride.automaticallyLinkIfVerified,
                    }),
                    ThirdParty.init({
                        signInAndUpFeature: {
                            providers: [customProviderWithEmailVerified, customProviderWithEmailNotVerified],
                        },
                    }),
                ],
            });
        });

        it("the reset password flow not be allowed if an unverified TP user exists with the same email exists and linking requires verification", async function () {
            const email = "test@example.com";

            await createTpUserThroughAPI(email, false);

            const { sentEmail, body } = await callGenerateTokenPOST(email);

            assert(!sentEmail);
            assert.strictEqual(body.status, "OK");
        });

        it("the reset password flow should not call shouldDoAccountLinking if the user is primary and verified", async function () {
            const email = "test@example.com";

            const epUser = await createEpUserThroughAPI(email, true);
            assert(epUser.isPrimaryUser);

            const tpUser = await createTpUserThroughAPI(email, true);
            assert.strictEqual(epUser.id, tpUser.id);

            await resetOverrideLogs();
            const { sentEmail, sendEmailToUserId, token } = await callGenerateTokenPOST(email);
            assert(sentEmail);

            assert.strictEqual(sendEmailToUserId, epUser.id);

            const { userPostPasswordReset } = await callPasswordResetPOST(token);

            assert.strictEqual(userPostPasswordReset.loginMethods.length, 2);
            assert.strictEqual(userPostPasswordReset.id, epUser.id);

            const logs = await getOverrideLogs();
            assert(
                !logs.some((l) => l.name === "AccountLinking.override.apis.shouldDoAccountLinking" && l.type === "CALL")
            );
        });

        it("the reset password flow should link to the oldest user", async function () {
            const email = "test@example.com";

            const { user: tpUser1} = await ThirdParty.manuallyCreateOrUpdateUser("public", "sso", "user1", email, true, undefined, { DO_NOT_LINK: true });
            assert.notStrictEqual(tpUser1, undefined);
            const { user: tpUser2} = await ThirdParty.manuallyCreateOrUpdateUser("public", "sso", "user2", email, true, undefined, { DO_NOT_LINK: true });
            assert.notStrictEqual(tpUser2, undefined);
            const { user: tpUser3} = await ThirdParty.manuallyCreateOrUpdateUser("public", "sso", "user3", email, true, undefined, { DO_NOT_LINK: true });
            assert.notStrictEqual(tpUser3, undefined);

            const { sentEmail, sendEmailToUserId, token } = await callGenerateTokenPOST(email);
            assert(sentEmail);
            
            assert.strictEqual(sendEmailToUserId, tpUser1.id);

            const { userPostPasswordReset } = await callPasswordResetPOST(token);

            assert.strictEqual(userPostPasswordReset.loginMethods.length, 2);
            assert.strictEqual(userPostPasswordReset.id, tpUser1.id);
            const logs = await getOverrideLogs();
            assert(
                !logs.some((l) => l.name === "AccountLinking.override.apis.shouldDoAccountLinking" && l.type === "CALL")
            );
        });
    });

    describe("with onlyLinkIfNewUserVerified&setIsVerifiedInSignInUp overrides", () => {
        const emailA = "test@example.com";
        const emailB = "test2@example.com";

        beforeEach(async function () {
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
                    EmailVerification.init(),
                    EmailPassword.init(),
                    Session.init(),
                    AccountLinking.init({
                        shouldDoAutomaticAccountLinking: "onlyLinkIfNewUserVerified",
                    }),
                    ThirdParty.init({
                        signInAndUpFeature: {
                            providers: [customProviderWithEmailVerified, customProviderWithEmailNotVerified],
                        },
                        override: {
                            functions: "thirdparty.init.override.functions:setIsVerifiedInSignInUp",
                        },
                    }),
                ],
            });
        });

        it("should not allow generating the pw reset token if the email is only associated with an unverified TP user", async function () {
            await createTpUserThroughAPI(emailA, false);

            const { sentEmail } = await callGenerateTokenPOST(emailA);
            assert(!sentEmail);
        });

        it("should allow password reset and link if the email is only associated with a verified TP user", async function () {
            const tpUser = await createTpUserThroughAPI(emailA, true);

            const { sentEmail, sendEmailToUserId, token } = await callGenerateTokenPOST(emailA);
            assert(sentEmail);
            assert.strictEqual(sendEmailToUserId, tpUser.id);
            assert.notStrictEqual(token, undefined);

            await callPasswordResetPOST(token);

            assert.strictEqual(emailPostPasswordReset, "test@example.com");
            assert(userPostPasswordReset.isPrimaryUser);
            assert.strictEqual(userPostPasswordReset.loginMethods.length, 2);
            assert.strictEqual(userPostPasswordReset.id, tpUser.id);
        });

        it("should allow password reset and not link if the email is associated with an unverified TP user but also has an EP user", async function () {
            const epUser = await createEpUserThroughAPI(emailA, true);
            const tpUser = await createTpUserThroughAPI(emailA, false);

            const { sentEmail, sendEmailToUserId, token } = await callGenerateTokenPOST(emailA);
            assert(sentEmail);
            assert.strictEqual(sendEmailToUserId, epUser.id);
            assert.notStrictEqual(token, undefined);

            await callPasswordResetPOST(token);

            assert.strictEqual(emailPostPasswordReset, "test@example.com");
            assert(userPostPasswordReset.isPrimaryUser);
            assert.strictEqual(userPostPasswordReset.loginMethods.length, 1);
            assert.notStrictEqual(userPostPasswordReset.id, tpUser.id);
        });
    });

    async function createTpUserThroughAPI(email, isVerified, userId = "user1") {
        let response = await new Promise((resolve, reject) =>
            request()
                .post("/auth/signinup")
                .send({
                    thirdPartyId: isVerified ? "custom-ev" : "custom-no-ev",
                    redirectURIInfo: {
                        redirectURIOnProviderDashboard: "http://127.0.0.1/callback",
                        redirectURIQueryParams: {
                            code: "abcdefghj",
                        },
                        email,
                        userId,
                    },
                })
                .end((err, res) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(res);
                    }
                })
        );
        return response.body.user;
    }

    async function createEpUserThroughAPI(email, verified) {
        const response = await new Promise((resolve) =>
            request()
                .post("/auth/signup")
                .send({
                    formFields: [
                        {
                            id: "email",
                            value: email,
                        },
                        {
                            id: "password",
                            value: "password123",
                        },
                    ],
                })
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert.notStrictEqual(response, undefined);
        assert.strictEqual(response.body.status, "OK");

        const user = response.body.user;

        if (verified) {
            let token = await EmailVerification.createEmailVerificationToken(
                "public",
                supertokens.convertToRecipeUserId(user.id)
            );
            await EmailVerification.verifyEmailUsingToken("public", token.token);

            return supertokens.getUser(user.id);
        }

        return response.body.user;
    }

    async function callPasswordResetPOST(token) {
        await new Promise((resolve, reject) =>
            request()
                .post("/auth/user/password/reset")
                .send({
                    formFields: [
                        {
                            id: "password",
                            value: "validpass123",
                        },
                    ],
                    token,
                })
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(JSON.parse(res.text));
                    }
                })
        );

        logs = await getOverrideLogs();

        const passwordResetPOSTRes = logs
            .filter((l) => l.name === "EmailPassword.override.apis.passwordResetPOST" && l.type === "RES")
            .map((l) => l.data);
        assert.strictEqual(passwordResetPOSTRes.length, 1);

        const passwordResetPOSTResInput = passwordResetPOSTRes[0];
        emailPostPasswordReset = passwordResetPOSTResInput.email;
        userPostPasswordReset = passwordResetPOSTResInput.user;

        return {
            emailPostPasswordReset,
            userPostPasswordReset,
        };
    }

    async function callGenerateTokenPOST(email) {
        let res = await new Promise((resolve, reject) =>
            request()
                .post("/auth/user/password/reset/token")
                .send({
                    formFields: [
                        {
                            id: "email",
                            value: email,
                        },
                    ],
                })
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert.notStrictEqual(res, undefined);
        assert.strictEqual(res.body.status, "OK");

        const logs = await getOverrideLogs();
        const sendEmailCallParams = logs
            .filter((l) => l.name === "EmailPassword.emailDelivery.override.sendEmail" && l.type === "CALL")
            .map((l) => l.data);
        const sentEmail = sendEmailCallParams.length === 1;
        return {
            body: res.body,
            sentEmail,
            sendEmailToUserId: sentEmail ? sendEmailCallParams[0][0].user.id : undefined,
            token: sentEmail
                ? sendEmailCallParams[0][0].passwordResetLink.split("?")[1].split("&")[0].split("=")[1]
                : undefined,
        };
    }
});
