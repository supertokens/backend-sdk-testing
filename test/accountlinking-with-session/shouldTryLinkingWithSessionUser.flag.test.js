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
const {
    postToAuthAPI,
    putAPI,
    getUpdatedUserFromDBForRespCompare,
    getSessionFromResponse,
    testPassword,
    setup,
    getTestEmail,
    makeUserPrimary,
    getSessionForUser,
    createThirdPartyUser,
    createEmailPasswordUser,
} = require("./utils");
const { shouldDoAutomaticAccountLinkingOverride } = require("../overridesMapping");
const { recipesMock } = require("../../api-mock");
const { Passwordless } = recipesMock;
let assert = require("assert");

let globalConnectionURI;

describe(`shouldTryLinkingWithSessionUser: ${printPath(
    "[test/accountlinking-with-session/shouldTryLinkingWithSessionUser.flows.test.js]"
)}`, function () {
    before(async function () {
        await killAllST();
        await setupST();
        globalConnectionURI = await globalStartST();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    describe("EmailPassword", function () {
        describe("signUpPost", () => {
            it("should ignore expired session with shouldTryLinkingWithSessionUser=false", async () => {
                const email1 = getTestEmail("1");
                const email2 = getTestEmail("2");
                await setup({
                    globalConnectionURI,
                    shouldDoAutomaticAccountLinking: shouldDoAutomaticAccountLinkingOverride.automaticallyLinkNoVerify,
                    coreConfig: {
                        access_token_validity: 2,
                    },
                });
                let sessionUser = await createThirdPartyUser(email1, true);
                sessionUser = await makeUserPrimary(sessionUser);
                const session = await getSessionForUser(sessionUser);
                await new Promise((res) => setTimeout(res, 3000));
                const resp = await signUpPOST(email2, session, undefined, false);
                assert.strictEqual(resp.status, 200);
                assert.ok(resp.body);

                const body = resp.body;
                assert.strictEqual(body.status, "OK");

                assert.notStrictEqual(body.user.id, sessionUser.id);
            });

            it("should ignore expired session with shouldTryLinkingWithSessionUser=undefined", async () => {
                const email1 = getTestEmail("1");
                const email2 = getTestEmail("2");
                await setup({
                    globalConnectionURI,
                    shouldDoAutomaticAccountLinking: shouldDoAutomaticAccountLinkingOverride.automaticallyLinkNoVerify,
                    coreConfig: {
                        access_token_validity: 2,
                    },
                });
                let sessionUser = await createThirdPartyUser(email1, true);
                sessionUser = await makeUserPrimary(sessionUser);
                const session = await getSessionForUser(sessionUser);
                await new Promise((res) => setTimeout(res, 3000));
                const resp = await signUpPOST(email2, session, undefined, undefined);
                assert.strictEqual(resp.status, 200);
                assert.ok(resp.body);

                const body = resp.body;
                assert.strictEqual(body.status, "OK");

                assert.notStrictEqual(body.user.id, sessionUser.id);
            });

            it("should 401 for expired session with shouldTryLinkingWithSessionUser=true", async () => {
                const email1 = getTestEmail("1");
                const email2 = getTestEmail("2");
                await setup({
                    globalConnectionURI,
                    shouldDoAutomaticAccountLinking: shouldDoAutomaticAccountLinkingOverride.automaticallyLinkNoVerify,
                    coreConfig: {
                        access_token_validity: 2,
                    },
                });
                let sessionUser = await createThirdPartyUser(email1, true);
                sessionUser = await makeUserPrimary(sessionUser);
                const session = await getSessionForUser(sessionUser);
                await new Promise((res) => setTimeout(res, 3000));
                const resp = await signUpPOST(email2, session, undefined, true);
                assert.strictEqual(resp.status, 401);
                assert.ok(resp.body);

                const body = resp.body;
                assert.strictEqual(body.message, "try refresh token");
            });

            it("should 401 without session with shouldTryLinkingWithSessionUser=true", async () => {
                const email1 = getTestEmail("1");
                const email2 = getTestEmail("2");
                await setup({
                    globalConnectionURI,
                    shouldDoAutomaticAccountLinking: shouldDoAutomaticAccountLinkingOverride.automaticallyLinkNoVerify,
                    coreConfig: {
                        access_token_validity: 2,
                    },
                });
                let sessionUser = await createThirdPartyUser(email1, true);
                sessionUser = await makeUserPrimary(sessionUser);
                const resp = await signUpPOST(email2, undefined, undefined, true);
                assert.strictEqual(resp.status, 401);
                assert.ok(resp.body);

                const body = resp.body;
                assert.strictEqual(body.message, "unauthorised");
            });
        });
        describe("signInPost", () => {
            it("should ignore expired session with shouldTryLinkingWithSessionUser=false", async () => {
                const email1 = getTestEmail("1");
                const email2 = getTestEmail("2");
                await setup({
                    globalConnectionURI,
                    shouldDoAutomaticAccountLinking: shouldDoAutomaticAccountLinkingOverride.automaticallyLinkNoVerify,
                    coreConfig: {
                        access_token_validity: 2,
                    },
                });
                await createEmailPasswordUser(email2, false);
                let sessionUser = await createThirdPartyUser(email1, true);
                sessionUser = await makeUserPrimary(sessionUser);
                const session = await getSessionForUser(sessionUser);
                await new Promise((res) => setTimeout(res, 3000));
                const resp = await signInPOST(email2, session, undefined, false);
                assert.strictEqual(resp.status, 200);
                assert.ok(resp.body);

                const body = resp.body;
                assert.strictEqual(body.status, "OK");

                assert.notStrictEqual(body.user.id, sessionUser.id);
            });

            it("should ignore expired session with shouldTryLinkingWithSessionUser=undefined", async () => {
                const email1 = getTestEmail("1");
                const email2 = getTestEmail("2");
                await setup({
                    globalConnectionURI,
                    shouldDoAutomaticAccountLinking: shouldDoAutomaticAccountLinkingOverride.automaticallyLinkNoVerify,
                    coreConfig: {
                        access_token_validity: 2,
                    },
                });
                await createEmailPasswordUser(email2, false);
                let sessionUser = await createThirdPartyUser(email1, true);
                sessionUser = await makeUserPrimary(sessionUser);
                const session = await getSessionForUser(sessionUser);
                await new Promise((res) => setTimeout(res, 3000));
                const resp = await signInPOST(email2, session, undefined, undefined);
                assert.strictEqual(resp.status, 200);
                assert.ok(resp.body);

                const body = resp.body;
                assert.strictEqual(body.status, "OK");

                assert.notStrictEqual(body.user.id, sessionUser.id);
            });

            it("should 401 for expired session with shouldTryLinkingWithSessionUser=true", async () => {
                const email1 = getTestEmail("1");
                const email2 = getTestEmail("2");
                await setup({
                    globalConnectionURI,
                    shouldDoAutomaticAccountLinking: shouldDoAutomaticAccountLinkingOverride.automaticallyLinkNoVerify,
                    coreConfig: {
                        access_token_validity: 2,
                    },
                });
                await createEmailPasswordUser(email2, false);
                let sessionUser = await createThirdPartyUser(email1, true);
                sessionUser = await makeUserPrimary(sessionUser);
                const session = await getSessionForUser(sessionUser);
                await new Promise((res) => setTimeout(res, 3000));
                const resp = await signInPOST(email2, session, undefined, true);
                assert.strictEqual(resp.status, 401);
                assert.ok(resp.body);

                const body = resp.body;
                assert.strictEqual(body.message, "try refresh token");
            });

            it("should 401 without a session with shouldTryLinkingWithSessionUser=true", async () => {
                const email1 = getTestEmail("1");
                const email2 = getTestEmail("2");
                await setup({
                    globalConnectionURI,
                    shouldDoAutomaticAccountLinking: shouldDoAutomaticAccountLinkingOverride.automaticallyLinkNoVerify,
                    coreConfig: {
                        access_token_validity: 2,
                    },
                });
                await createEmailPasswordUser(email2, false);
                let sessionUser = await createThirdPartyUser(email1, true);
                sessionUser = await makeUserPrimary(sessionUser);
                const resp = await signInPOST(email2, undefined, undefined, true);
                assert.strictEqual(resp.status, 401);
                assert.ok(resp.body);

                const body = resp.body;
                assert.strictEqual(body.message, "unauthorised");
            });
        });
    });
    describe("ThirdParty", function () {
        describe("signInUpPost", () => {
            it("should ignore expired session with shouldTryLinkingWithSessionUser=false", async () => {
                const email1 = getTestEmail("1");
                const email2 = getTestEmail("2");
                await setup({
                    globalConnectionURI,
                    shouldDoAutomaticAccountLinking: shouldDoAutomaticAccountLinkingOverride.automaticallyLinkNoVerify,
                    coreConfig: {
                        access_token_validity: 2,
                    },
                });
                let sessionUser = await createEmailPasswordUser(email1, true);
                sessionUser = await makeUserPrimary(sessionUser);
                const session = await getSessionForUser(sessionUser);
                await new Promise((res) => setTimeout(res, 3000));
                const resp = await signInUpPOST(email2, true, session, undefined, undefined, false);
                assert.strictEqual(resp.status, 200);
                assert.ok(resp.body);

                const body = resp.body;
                assert.strictEqual(body.status, "OK");

                assert.notStrictEqual(body.user.id, sessionUser.id);
            });

            it("should ignore expired session with shouldTryLinkingWithSessionUser=undefined", async () => {
                const email1 = getTestEmail("1");
                const email2 = getTestEmail("2");
                await setup({
                    globalConnectionURI,
                    shouldDoAutomaticAccountLinking: shouldDoAutomaticAccountLinkingOverride.automaticallyLinkNoVerify,
                    coreConfig: {
                        access_token_validity: 2,
                    },
                });
                let sessionUser = await createEmailPasswordUser(email1, true);
                sessionUser = await makeUserPrimary(sessionUser);
                const session = await getSessionForUser(sessionUser);
                await new Promise((res) => setTimeout(res, 3000));
                const resp = await signInUpPOST(email2, true, session, undefined, undefined, undefined);
                assert.strictEqual(resp.status, 200);
                assert.ok(resp.body);

                const body = resp.body;
                assert.strictEqual(body.status, "OK");

                assert.notStrictEqual(body.user.id, sessionUser.id);
            });

            it("should 401 for expired session with shouldTryLinkingWithSessionUser=true", async () => {
                const email1 = getTestEmail("1");
                const email2 = getTestEmail("2");
                await setup({
                    globalConnectionURI,
                    shouldDoAutomaticAccountLinking: shouldDoAutomaticAccountLinkingOverride.automaticallyLinkNoVerify,
                    coreConfig: {
                        access_token_validity: 2,
                    },
                });
                let sessionUser = await createEmailPasswordUser(email1, true);
                sessionUser = await makeUserPrimary(sessionUser);
                const session = await getSessionForUser(sessionUser);
                await new Promise((res) => setTimeout(res, 3000));
                const resp = await signInUpPOST(email2, true, session, undefined, undefined, true);
                assert.strictEqual(resp.status, 401);
                assert.ok(resp.body);

                const body = resp.body;
                assert.strictEqual(body.message, "try refresh token");
            });
        });
    });
    describe("Passwordless", function () {
        describe("createCodePOST", () => {
            it("should ignore expired session with shouldTryLinkingWithSessionUser=false", async () => {
                const email1 = getTestEmail("1");
                const email2 = getTestEmail("2");
                await setup({
                    globalConnectionURI,
                    shouldDoAutomaticAccountLinking: shouldDoAutomaticAccountLinkingOverride.automaticallyLinkNoVerify,
                    coreConfig: {
                        access_token_validity: 2,
                    },
                });
                let sessionUser = await createThirdPartyUser(email1, true);
                sessionUser = await makeUserPrimary(sessionUser);
                const session = await getSessionForUser(sessionUser);
                await new Promise((res) => setTimeout(res, 3000));
                const resp = await createCodePOST({ email: email2 }, session, false);
                assert.strictEqual(resp.status, 200);
                assert.ok(resp.body);

                const body = resp.body;
                assert.strictEqual(body.status, "OK");
            });

            it("should ignore expired session with shouldTryLinkingWithSessionUser=undefined", async () => {
                const email1 = getTestEmail("1");
                const email2 = getTestEmail("2");
                await setup({
                    globalConnectionURI,
                    shouldDoAutomaticAccountLinking: shouldDoAutomaticAccountLinkingOverride.automaticallyLinkNoVerify,
                    coreConfig: {
                        access_token_validity: 2,
                    },
                });
                let sessionUser = await createThirdPartyUser(email1, true);
                sessionUser = await makeUserPrimary(sessionUser);
                const session = await getSessionForUser(sessionUser);
                await new Promise((res) => setTimeout(res, 3000));
                const resp = await createCodePOST({ email: email2 }, session, undefined);
                assert.strictEqual(resp.status, 200);
                assert.ok(resp.body);

                const body = resp.body;
                assert.strictEqual(body.status, "OK");
            });

            it("should 401 for expired session with shouldTryLinkingWithSessionUser=true", async () => {
                const email1 = getTestEmail("1");
                const email2 = getTestEmail("2");
                await setup({
                    globalConnectionURI,
                    shouldDoAutomaticAccountLinking: shouldDoAutomaticAccountLinkingOverride.automaticallyLinkNoVerify,
                    coreConfig: {
                        access_token_validity: 2,
                    },
                });
                let sessionUser = await createThirdPartyUser(email1, true);
                sessionUser = await makeUserPrimary(sessionUser);
                const session = await getSessionForUser(sessionUser);
                await new Promise((res) => setTimeout(res, 3000));
                const resp = await createCodePOST({ email: email2 }, session, true);
                assert.strictEqual(resp.status, 401);
                assert.ok(resp.body);

                const body = resp.body;
                assert.strictEqual(body.message, "try refresh token");
            });
        });
        describe("resendCodePOST", () => {
            it("should ignore expired session with shouldTryLinkingWithSessionUser=false", async () => {
                const email1 = getTestEmail("1");
                const email2 = getTestEmail("2");
                await setup({
                    globalConnectionURI,
                    shouldDoAutomaticAccountLinking: shouldDoAutomaticAccountLinkingOverride.automaticallyLinkNoVerify,
                    coreConfig: {
                        access_token_validity: 2,
                    },
                });
                await createEmailPasswordUser(email2, false);
                let sessionUser = await createThirdPartyUser(email1, true);
                sessionUser = await makeUserPrimary(sessionUser);
                const session = await getSessionForUser(sessionUser);
                await new Promise((res) => setTimeout(res, 3000));
                const code = await Passwordless.createCode({
                    email: email2,
                    tenantId: "public",
                    session,
                });

                const resp = await resendCodePOST(
                    {
                        preAuthSessionId: code.preAuthSessionId,
                        deviceId: code.deviceId,
                    },
                    session,
                    false
                );
                assert.strictEqual(resp.status, 200);
                assert.ok(resp.body);

                const body = resp.body;
                assert.strictEqual(body.status, "OK");
            });

            it("should ignore expired session with shouldTryLinkingWithSessionUser=undefined", async () => {
                const email1 = getTestEmail("1");
                const email2 = getTestEmail("2");
                await setup({
                    globalConnectionURI,
                    shouldDoAutomaticAccountLinking: shouldDoAutomaticAccountLinkingOverride.automaticallyLinkNoVerify,
                    coreConfig: {
                        access_token_validity: 2,
                    },
                });
                await createEmailPasswordUser(email2, false);
                let sessionUser = await createThirdPartyUser(email1, true);
                sessionUser = await makeUserPrimary(sessionUser);
                const session = await getSessionForUser(sessionUser);
                await new Promise((res) => setTimeout(res, 3000));
                const code = await Passwordless.createCode({
                    email: email2,
                    tenantId: "public",
                    session,
                });

                const resp = await resendCodePOST(
                    {
                        preAuthSessionId: code.preAuthSessionId,
                        deviceId: code.deviceId,
                    },
                    session,
                    undefined
                );
                assert.strictEqual(resp.status, 200);
                assert.ok(resp.body);

                const body = resp.body;
                assert.strictEqual(body.status, "OK");
            });

            it("should 401 for expired session with shouldTryLinkingWithSessionUser=true", async () => {
                const email1 = getTestEmail("1");
                const email2 = getTestEmail("2");
                await setup({
                    globalConnectionURI,
                    shouldDoAutomaticAccountLinking: shouldDoAutomaticAccountLinkingOverride.automaticallyLinkNoVerify,
                    coreConfig: {
                        access_token_validity: 2,
                    },
                });
                await createEmailPasswordUser(email2, false);
                let sessionUser = await createThirdPartyUser(email1, true);
                sessionUser = await makeUserPrimary(sessionUser);
                const session = await getSessionForUser(sessionUser);
                await new Promise((res) => setTimeout(res, 3000));
                const code = await Passwordless.createCode({
                    email: email2,
                    tenantId: "public",
                    session,
                });

                const resp = await resendCodePOST(
                    {
                        preAuthSessionId: code.preAuthSessionId,
                        deviceId: code.deviceId,
                    },
                    session,
                    true
                );
                assert.strictEqual(resp.status, 401);
                assert.ok(resp.body);

                const body = resp.body;
                assert.strictEqual(body.message, "try refresh token");
            });
        });
        describe("consumeCodePOST", () => {
            it("should ignore expired session with shouldTryLinkingWithSessionUser=false", async () => {
                const email1 = getTestEmail("1");
                const email2 = getTestEmail("2");
                await setup({
                    globalConnectionURI,
                    shouldDoAutomaticAccountLinking: shouldDoAutomaticAccountLinkingOverride.automaticallyLinkNoVerify,
                    coreConfig: {
                        access_token_validity: 2,
                    },
                });
                await createEmailPasswordUser(email2, false);
                let sessionUser = await createThirdPartyUser(email1, true);
                sessionUser = await makeUserPrimary(sessionUser);
                const session = await getSessionForUser(sessionUser);
                await new Promise((res) => setTimeout(res, 3000));
                const code = await Passwordless.createCode({
                    email: email2,
                    tenantId: "public",
                    session,
                });
                const resp = await consumeCodePOST(code, session, false);
                assert.strictEqual(resp.status, 200);
                assert.ok(resp.body);

                const body = resp.body;
                assert.strictEqual(body.status, "OK");

                assert.notStrictEqual(body.user.id, sessionUser.id);
            });

            it("should ignore expired session with shouldTryLinkingWithSessionUser=undefined", async () => {
                const email1 = getTestEmail("1");
                const email2 = getTestEmail("2");
                await setup({
                    globalConnectionURI,
                    shouldDoAutomaticAccountLinking: shouldDoAutomaticAccountLinkingOverride.automaticallyLinkNoVerify,
                    coreConfig: {
                        access_token_validity: 2,
                    },
                });
                await createEmailPasswordUser(email2, false);
                let sessionUser = await createThirdPartyUser(email1, true);
                sessionUser = await makeUserPrimary(sessionUser);
                const session = await getSessionForUser(sessionUser);
                await new Promise((res) => setTimeout(res, 3000));
                const code = await Passwordless.createCode({
                    email: email2,
                    tenantId: "public",
                    session,
                });
                const resp = await consumeCodePOST(code, session, undefined);
                assert.strictEqual(resp.status, 200);
                assert.ok(resp.body);

                const body = resp.body;
                assert.strictEqual(body.status, "OK");

                assert.notStrictEqual(body.user.id, sessionUser.id);
            });

            it("should 401 for expired session with shouldTryLinkingWithSessionUser=true", async () => {
                const email1 = getTestEmail("1");
                const email2 = getTestEmail("2");
                await setup({
                    globalConnectionURI,
                    shouldDoAutomaticAccountLinking: shouldDoAutomaticAccountLinkingOverride.automaticallyLinkNoVerify,
                    coreConfig: {
                        access_token_validity: 2,
                    },
                });
                await createEmailPasswordUser(email2, false);
                let sessionUser = await createThirdPartyUser(email1, true);
                sessionUser = await makeUserPrimary(sessionUser);
                const session = await getSessionForUser(sessionUser);
                await new Promise((res) => setTimeout(res, 3000));
                const code = await Passwordless.createCode({
                    email: email2,
                    tenantId: "public",
                    session,
                });
                const resp = await consumeCodePOST(code, session, true);
                assert.strictEqual(resp.status, 401);
                assert.ok(resp.body);

                const body = resp.body;
                assert.strictEqual(body.message, "try refresh token");
            });
        });
    });
});

async function signInUpPOST(
    email,
    isVerified,
    session,
    userId = email,
    error = undefined,
    shouldTryLinkingWithSessionUser
) {
    return postToAuthAPI(
        "/auth/signinup",
        {
            thirdPartyId: "custom",
            oAuthTokens: {
                email,
                isVerified,
                userId,
                error,
            },
            shouldTryLinkingWithSessionUser,
        },
        session
    );
}

async function signUpPOST(email, session, password = testPassword, shouldTryLinkingWithSessionUser) {
    return postToAuthAPI(
        "/auth/signup",
        {
            formFields: [
                { id: "email", value: email },
                { id: "password", value: password },
            ],
            shouldTryLinkingWithSessionUser,
        },
        session
    );
}

async function signInPOST(email, session, password = testPassword, shouldTryLinkingWithSessionUser) {
    return postToAuthAPI(
        "/auth/signin",
        {
            formFields: [
                { id: "email", value: email },
                { id: "password", value: password },
            ],
            shouldTryLinkingWithSessionUser,
        },
        session
    );
}

async function consumeCodePOST(code, session, shouldTryLinkingWithSessionUser) {
    return postToAuthAPI(
        "/auth/signinup/code/consume",
        code.userInputCode !== undefined
            ? {
                  preAuthSessionId: code.preAuthSessionId,
                  userInputCode: code.userInputCode,
                  deviceId: code.deviceId,
                  shouldTryLinkingWithSessionUser,
              }
            : {
                  preAuthSessionId: code.preAuthSessionId,
                  linkCode: code.linkCode,
                  shouldTryLinkingWithSessionUser,
              },
        session
    );
}

async function createCodePOST(accountInfo, session, shouldTryLinkingWithSessionUser) {
    return postToAuthAPI("/auth/signinup/code", { ...accountInfo, shouldTryLinkingWithSessionUser }, session);
}

async function resendCodePOST(deviceInfo, session, shouldTryLinkingWithSessionUser) {
    return postToAuthAPI("/auth/signinup/code/resend", { ...deviceInfo, shouldTryLinkingWithSessionUser }, session);
}
