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
const { printPath, setupST, killAllST, cleanST, startST: globalStartST } = require("../utils");
let assert = require("assert");
const { recipesMock, request } = require("../../api-mock");
const { supertokens, WebAuthn } = recipesMock;

describe(`webauthnTests: ${printPath("[test/webauthn/registerOptions.test.js]")}`, function () {
    let globalConnectionURI;

    beforeEach(async function () {
        await killAllST();
        await setupST();
        globalConnectionURI = await globalStartST();
    });

    afterEach(async function () {
        await killAllST();
        await cleanST();
    });

    describe("[registerOptions]", function () {
        it("test registerOptions with default values", async function () {
            supertokens.init({
                supertokens: {
                    connectionURI: globalConnectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [WebAuthn.init()],
            });

            // passing valid field
            let registerOptionsResponse = await new Promise((resolve, reject) =>
                request()
                    .post("/auth/webauthn/options/register")
                    .send({
                        email: "test@example.com",
                    })
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            console.log(err);
                            reject(err);
                        } else {
                            resolve(JSON.parse(res.text));
                        }
                    })
            );

            assert(registerOptionsResponse.status === "OK");

            assert(typeof registerOptionsResponse.challenge === "string");
            assert(registerOptionsResponse.attestation === "none");
            assert(registerOptionsResponse.rp.id === "api.supertokens.io");
            assert(registerOptionsResponse.rp.name === "SuperTokens");
            assert(registerOptionsResponse.user.name === "test@example.com");
            assert(registerOptionsResponse.user.displayName === "test@example.com");
            assert(Number.isInteger(registerOptionsResponse.timeout));
            assert(registerOptionsResponse.authenticatorSelection.userVerification === "preferred");
            assert(registerOptionsResponse.authenticatorSelection.requireResidentKey === true);
            assert(registerOptionsResponse.authenticatorSelection.residentKey === "required");

            const generatedOptions = await WebAuthn.getGeneratedOptions({
                webauthnGeneratedOptionsId: registerOptionsResponse.webauthnGeneratedOptionsId,
            });

            assert(generatedOptions.origin === "https://supertokens.io");
        });

        it("test registerOptions with custom values", async function () {
            const connectionURI = globalConnectionURI;

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
                    WebAuthn.init({
                        getOrigin: () => {
                            return "testOrigin.com";
                        },
                        getRelyingPartyId: () => {
                            return "testId.com";
                        },
                        getRelyingPartyName: () => {
                            return "testName";
                        },
                        validateEmailAddress: (email) => {
                            return email === "test@example.com" ? undefined : "Invalid email";
                        },
                        override: {
                            functions: (originalImplementation) => {
                                return {
                                    ...originalImplementation,
                                    signInOptions: (input) => {
                                        return originalImplementation.signInOptions({
                                            ...input,
                                            timeout: 10 * 1000,
                                            userVerification: "required",
                                            relyingPartyId: "testId.com",
                                        });
                                    },
                                };
                            },
                        },
                    }),
                ],
            });

            // passing valid field
            let registerOptionsResponse = await new Promise((resolve, reject) =>
                request()
                    .post("/auth/webauthn/options/register")
                    .send({
                        email: "test@example.com",
                    })
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            console.log(err);
                            reject(err);
                        } else {
                            resolve(JSON.parse(res.text));
                        }
                    })
            );

            assert(registerOptionsResponse.status === "OK");

            assert(typeof registerOptionsResponse.challenge === "string");
            assert(registerOptionsResponse.attestation === "none");
            assert(registerOptionsResponse.rp.id === "testId.com");
            assert(registerOptionsResponse.rp.name === "testName");
            assert(registerOptionsResponse.user.name === "test@example.com");
            assert(registerOptionsResponse.user.displayName === "test@example.com");
            assert(Number.isInteger(registerOptionsResponse.timeout));
            assert(registerOptionsResponse.authenticatorSelection.userVerification === "preferred");
            assert(registerOptionsResponse.authenticatorSelection.requireResidentKey === true);
            assert(registerOptionsResponse.authenticatorSelection.residentKey === "required");

            const generatedOptions = await WebAuthn.getGeneratedOptions({
                webauthnGeneratedOptionsId: registerOptionsResponse.webauthnGeneratedOptionsId,
            });
            assert(generatedOptions.origin === "testOrigin.com");
        });
    });
});
