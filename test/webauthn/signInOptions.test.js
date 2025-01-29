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

describe(`webauthnTests: ${printPath("[test/webauthn/signInOptions.test.js]")}`, function () {
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

    describe("[signInOptions]", function () {
        it("test signInOptions with default values", async function () {
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
            let signInOptionsResponse = await new Promise((resolve, reject) =>
                request()
                    .post("/auth/webauthn/options/signin")
                    .send({ email: "test@example.com" })
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

            assert(signInOptionsResponse.status === "OK");

            assert(typeof signInOptionsResponse.challenge === "string");
            assert(Number.isInteger(signInOptionsResponse.timeout));
            assert(signInOptionsResponse.userVerification === "preferred");

            const generatedOptions = await WebAuthn.getGeneratedOptions({
                webauthnGeneratedOptionsId: signInOptionsResponse.webauthnGeneratedOptionsId,
            });

            assert(generatedOptions.rpId === "api.supertokens.io");
            assert(generatedOptions.origin === "https://supertokens.io");
        });

        it("test signInOptions with custom values", async function () {
            supertokens.init({
                supertokens: {
                    connectionURI: globalConnectionURI,
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
                    }),
                ],
            });

            // passing valid field
            let signInOptionsResponse = await new Promise((resolve, reject) =>
                request()
                    .post("/auth/webauthn/options/signin")
                    .send({ email: "test@example.com" })
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

            assert(signInOptionsResponse.status === "OK");

            assert(typeof signInOptionsResponse.challenge === "string");
            assert(Number.isInteger(signInOptionsResponse.timeout));
            assert(signInOptionsResponse.userVerification === "preferred");

            const generatedOptions = await WebAuthn.getGeneratedOptions({
                webauthnGeneratedOptionsId: signInOptionsResponse.webauthnGeneratedOptionsId,
            });

            assert(generatedOptions.rpId === "testId.com");
            assert(generatedOptions.origin === "testOrigin.com");
        });
    });
});
