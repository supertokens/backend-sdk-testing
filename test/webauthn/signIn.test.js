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
const { recipesMock, request } = require("../../api-mock");
const { getWebauthnLib } = require("./getWebauthnLib");
const { Session, supertokens, ThirdParty, WebAuthn } = recipesMock;
const express = require("express");
const nock = require("nock");

describe(`webauthnTests: ${printPath("[test/webauthn/signIn.test.js]")}`, function () {
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

    describe("[signIn]", function () {
        it("test signIn with no account linking", async function () {
            const origin = "https://supertokens.io";
            const rpId = "supertokens.io";
            const rpName = "SuperTokens";

            supertokens.init({
                debug: true,
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

            let signInOptionsResponse = await new Promise((resolve, reject) =>
                request()
                    .post("/auth/webauthn/options/signin")
                    .send({ email })
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

            const { createAndAssertCredential } = await getWebauthnLib();
            const credential = createAndAssertCredential(registerOptionsResponse, signInOptionsResponse, {
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
                        credential: credential.attestation,
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

            // todo remove this when the core is implemented
            // mock the core to return the user
            nock("http://localhost:8080/", { allowUnmocked: true })
                .get("/public/users/by-accountinfo")
                .query({ email, doUnionOfAccountInfo: true })
                .reply(200, (uri, body) => {
                    return { status: "OK", users: [signUpResponse.user] };
                })
                .get("/user/id")
                .query({ userId: signUpResponse.user.id })
                .reply(200, (uri, body) => {
                    return { status: "OK", user: signUpResponse.user };
                });

            let signInResponse = await new Promise((resolve, reject) =>
                request()
                    .post("/auth/webauthn/signin")
                    .send({
                        credential: credential.assertion,
                        webauthnGeneratedOptionsId: signInOptionsResponse.webauthnGeneratedOptionsId,
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
            assert(signInResponse.status === "OK");

            assert(signInResponse?.user?.id !== undefined);
            assert(signInResponse?.user?.emails?.length === 1);
            assert(signInResponse?.user?.emails?.[0] === email);
            assert(signInResponse?.user?.webauthn?.credentialIds?.length === 1);
            assert(signInResponse?.user?.webauthn?.credentialIds?.[0] === credential.attestation.id);
        });

        it.skip("test signIn fail with wrong credential", async function () {
            const origin = "https://supertokens.io";
            const rpId = "supertokens.io";
            const rpName = "SuperTokens";

            supertokens.init({
                debug: true,
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

            let signInOptionsResponse = await new Promise((resolve, reject) =>
                request()
                    .post("/auth/webauthn/options/signin")
                    .send({ email: email + "wrong" })
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

            const { createAndAssertCredential } = await getWebauthnLib();
            const credential = createAndAssertCredential(registerOptionsResponse, signInOptionsResponse, {
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
                        credential: credential.attestation,
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

            // todo remove this when the core is implemented
            // mock the core to return the user
            nock("http://localhost:8080/", { allowUnmocked: true })
                .get("/public/users/by-accountinfo")
                .query({ email, doUnionOfAccountInfo: true })
                .reply(200, (uri, body) => {
                    return { status: "OK", users: [signUpResponse.user] };
                })
                .get("/user/id")
                .query({ userId: signUpResponse.user.id })
                .reply(200, (uri, body) => {
                    return { status: "OK", user: signUpResponse.user };
                });

            let signInResponse = await new Promise((resolve, reject) =>
                request()
                    .post("/auth/webauthn/signin")
                    .send({
                        credential: credential.assertion,
                        webauthnGeneratedOptionsId: signInOptionsResponse.webauthnGeneratedOptionsId,
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

            assert(signInResponse.status === "INVALID_CREDENTIALS_ERROR");
        });
    });
});
