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
const { getWebauthnLib } = require("./getWebauthnLib");
const { Session, supertokens, WebAuthn } = recipesMock;

describe(`webauthnTests: ${printPath("[test/webauthn/signUp.test.js]")}`, function () {
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

    describe("[signUp]", function () {
        it("test signUp with no account linking", async function () {
            const origin = "https://supertokens.io";
            const rpId = "supertokens.io";
            const rpName = "SuperTokens";

            supertokens.init({
                supertokens: {
                    connectionURI: globalConnectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [Session.init(), WebAuthn.init()],
            });

            const email = `${Math.random().toString().slice(2)}@supertokens.com`;
            let registerOptionsResponse = await new Promise((resolve, reject) =>
                request()
                    .post("/auth/webauthn/options/register")
                    .send({
                        email,
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

            const { createCredential } = await getWebauthnLib();
            const credential = createCredential(registerOptionsResponse, {
                rpId,
                rpName,
                origin,
                userNotPresent: false,
                userNotVerified: false,
            });

            let signUpResponse = await new Promise((resolve, reject) =>
                request()
                    .post("/auth/webauthn/signup")
                    .send({
                        credential,
                        webauthnGeneratedOptionsId: registerOptionsResponse.webauthnGeneratedOptionsId,
                        shouldTryLinkingWithSessionUser: false,
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

            assert(signUpResponse.status === "OK");

            assert(signUpResponse?.user?.id !== undefined);
            assert(signUpResponse?.user?.emails?.length === 1);
            assert(signUpResponse?.user?.emails?.[0] === email);
            assert(signUpResponse?.user?.webauthn?.credentialIds?.length === 1);
            assert(signUpResponse?.user?.webauthn?.credentialIds?.[0] === credential.id);
        });
    });
});
