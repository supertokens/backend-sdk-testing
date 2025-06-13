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
const { printPath, createCoreApplication } = require("../utils");
const assert = require("assert");
const createWebauthnUser = require("../webauthn/lib/createUser");
const { recipesMock, request } = require("../../api-mock");
const { EmailPassword, EmailVerification, supertokens, Session, AccountLinking, WebAuthn } = recipesMock;

describe(`apiInterface: ${printPath("[test/emailverification/apiInterface.test.js]")}`, function () {
    describe("[verifyEmailPOST]", function () {
        it("should verify the user when user signed up with emailpassword recipe", async function () {
            const connectionURI = await createCoreApplication();

            supertokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [Session.init(), EmailPassword.init(), EmailVerification.init({ mode: "REQUIRED" }), AccountLinking.init()],
            });

            const email = `${Math.random().toString().slice(2)}@supertokens.com`;
            const signUpResult = await EmailPassword.signUp("public", email, "1234");

            assert.equal(signUpResult.status, "OK");
            assert.equal(typeof signUpResult.user.id, "string");
            assert.equal(typeof signUpResult.recipeUserId.getAsString(), "string");

            const tokenResult = await EmailVerification.createEmailVerificationToken("public", signUpResult.recipeUserId, email, {});

            assert.equal(tokenResult.status, "OK");
            assert.equal(typeof tokenResult.token, "string");

            const verifyResponse = await new Promise((resolve, reject) =>
                request()
                    .post("/auth/user/email/verify")
                    .send({
                        token: tokenResult.token,
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

            assert.equal(verifyResponse.status, "OK");

            const user = await supertokens.getUser(signUpResult.user.id, {});
            assert(user?.loginMethods?.find((method) => method.recipeId === "emailpassword")?.verified);
        });

        it("should verify the user when user signed up with webauthn recipe", async function () {
            const connectionURI = await createCoreApplication();

            const origin = "https://supertokens.io";
            const rpId = "supertokens.io";
            const rpName = "SuperTokens";
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
                    Session.init(),
                    AccountLinking.init(),
                    WebAuthn.init({
                        // Using hard-coded values to make backend-sdk server mappings simpler
                        getOrigin: async () => {
                            return "https://supertokens.io"; // set it like this because the default value would actually use the origin and it would not match the default relying party id
                        },
                        getRelyingPartyId: async () => {
                            return "supertokens.io";
                        },
                        getRelyingPartyName: async () => {
                            return "SuperTokens";
                        },
                    }),
                    EmailVerification.init({ mode: "REQUIRED" }),
                ],
            });

            const { email, signUpResponse } = await createWebauthnUser(rpId, rpName, origin);

            assert.equal(signUpResponse.status, "OK");
            assert.equal(
                typeof signUpResponse.user?.loginMethods?.find((method) => method.recipeId === "webauthn")
                    ?.recipeUserId,
                "string"
            );
            const recipeUserId = supertokens.convertToRecipeUserId(
                signUpResponse.user?.loginMethods?.find((method) => method.recipeId === "webauthn")?.recipeUserId
            );

            const tokenResult = await EmailVerification.createEmailVerificationToken("public", recipeUserId, email, {});

            assert.equal(tokenResult.status, "OK");
            assert.equal(typeof tokenResult.token, "string");

            const verifyResponse = await new Promise((resolve, reject) =>
                request()
                    .post("/auth/user/email/verify")
                    .send({
                        token: tokenResult.token,
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

            assert.equal(verifyResponse.status, "OK");

            const user = await supertokens.getUser(signUpResponse.user.id, {});
            assert(user?.loginMethods?.find((method) => method.recipeId === "webauthn")?.verified);
        });
    });
});
