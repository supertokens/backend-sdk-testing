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
    getTestEmail,
    setup,
    postAPI,
    createEmailPasswordUser,
    makeUserPrimary,
    getSessionForUser,
    getUpdatedUserFromDBForRespCompare,
    createThirdPartyUser,
    linkUsers,
} = require("./utils");
let assert = require("assert");
const { recipesMock } = require("../../api-mock");
const { shouldDoAutomaticAccountLinkingOverride } = require("../overridesMapping");
const { supertokens } = recipesMock;

let globalConnectionURI;

describe(`thirdparty accountlinkingTests w/ session: ${printPath(
    "[test/accountlinking-with-session/thirdpartyapis.test.js]"
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

    describe("signInUpPOST", function () {
        describe("during sign up", () => {
            describe("linking with verified user", () => {
                it("should link to session user if the session user is already primary", async () => {
                    const email1 = getTestEmail("1");
                    const email2 = getTestEmail("2");
                    await setup({ globalConnectionURI });
                    let sessionUser = await createEmailPasswordUser(email1, true);
                    sessionUser = await makeUserPrimary(sessionUser);
                    const session = await getSessionForUser(sessionUser);

                    const resp = await signInUpPOST(email2, true, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.strictEqual(body.status, "OK");

                    assert.strictEqual(body.user.id, sessionUser.id);
                    assert.deepStrictEqual(body.user, await getUpdatedUserFromDBForRespCompare(sessionUser));
                });

                it("should link to session user if the session user can be made primary", async () => {
                    const email1 = getTestEmail("1");
                    const email2 = getTestEmail("2");
                    await setup({ globalConnectionURI });
                    let sessionUser = await createEmailPasswordUser(email1, true);

                    const session = await getSessionForUser(sessionUser);
                    const resp = await signInUpPOST(email2, true, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.strictEqual(body.status, "OK");

                    assert.strictEqual(body.user.id, sessionUser.id);
                    assert.deepStrictEqual(body.user, await getUpdatedUserFromDBForRespCompare(sessionUser));
                });

                it("should error if the session user cannot be made primary - conflicting primary user", async () => {
                    const email1 = getTestEmail("1");
                    const email2 = getTestEmail("2");
                    await setup({ globalConnectionURI });

                    const conflictingUser = await createThirdPartyUser(email1, false);
                    await makeUserPrimary(conflictingUser);

                    let sessionUser = await createEmailPasswordUser(email1, true);

                    const session = await getSessionForUser(sessionUser);
                    const resp = await signInUpPOST(email2, true, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.strictEqual(body.status, "SIGN_IN_UP_NOT_ALLOWED");
                    assert.strictEqual(
                        body.reason,
                        "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_023)"
                    );
                });

                it("should error if the session user cannot be made primary - email verification", async () => {
                    const email1 = getTestEmail("1");
                    const email2 = getTestEmail("2");
                    await setup({ globalConnectionURI });

                    let sessionUser = await createEmailPasswordUser(email1, false);

                    const session = await getSessionForUser(sessionUser);
                    const resp = await signInUpPOST(email2, true, session);
                    assert.strictEqual(resp.status, 403);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.deepStrictEqual(body, {
                        message: "invalid claim",
                        claimValidationErrors: [
                            {
                                id: "st-ev",
                                reason: {
                                    actualValue: false,
                                    expectedValue: true,
                                    message: "wrong value",
                                },
                            },
                        ],
                    });
                });

                it("should error if sign up is not allowed", async () => {
                    const email1 = getTestEmail("1");
                    const email2 = getTestEmail("2");
                    await setup({ globalConnectionURI });

                    const conflictingUser = await createThirdPartyUser(email2, true);
                    await makeUserPrimary(conflictingUser);

                    let sessionUser = await createEmailPasswordUser(email1, true);

                    const session = await getSessionForUser(sessionUser);
                    const resp = await signInUpPOST(email2, true, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.deepStrictEqual(body, {
                        status: "SIGN_IN_UP_NOT_ALLOWED",
                        reason: "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_021)",
                    });
                });

                it("should link by account info if shouldDoAutomaticAccountLinking returns false while making the session user primary", async () => {
                    const email1 = "test2@example.com";
                    const email2 = getTestEmail("2");
                    await setup({
                        globalConnectionURI,
                        shouldDoAutomaticAccountLinking:
                            shouldDoAutomaticAccountLinkingOverride.linkingNoVerifyExceptWhenEmailMatchTest,
                    });

                    const otherUser = await createThirdPartyUser(email2, true);

                    let sessionUser = await createEmailPasswordUser(email1, true);

                    const session = await getSessionForUser(sessionUser);
                    const resp = await signInUpPOST(email2, true, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.strictEqual(body.status, "OK");

                    assert.strictEqual(body.user.id, otherUser.id);
                    assert.deepStrictEqual(body.user, await getUpdatedUserFromDBForRespCompare(otherUser));
                });

                it("should make the authenticating user primary if shouldDoAutomaticAccountLinking returns false while making the session user primary", async () => {
                    const email1 = "test2@example.com";
                    const email2 = getTestEmail("2");
                    await setup({
                        globalConnectionURI,
                        shouldDoAutomaticAccountLinking:
                            shouldDoAutomaticAccountLinkingOverride.linkingNoVerifyExceptWhenEmailMatchTest,
                    });

                    let sessionUser = await createEmailPasswordUser(email1, true);

                    const session = await getSessionForUser(sessionUser);
                    const resp = await signInUpPOST(email2, true, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.strictEqual(body.status, "OK");

                    assert.notStrictEqual(body.user.id, sessionUser.id);
                    assert(body.user.isPrimaryUser);
                    assert.strictEqual(body.user.loginMethods.length, 1);
                });

                it("should link by account info and make the session user primary if shouldDoAutomaticAccountLinking returns false while linking to the session user and the session user is primary", async () => {
                    const email1 = getTestEmail("1");
                    const email2 = getTestEmail("2");
                    await setup({
                        globalConnectionURI,
                        shouldDoAutomaticAccountLinking:
                            shouldDoAutomaticAccountLinkingOverride.noLinkingWhenUserEqualsSessionUserDefaultRequireVerification,
                    });

                    const otherUser = await createThirdPartyUser(email2, true);

                    let sessionUser = await createEmailPasswordUser(email1, true);
                    sessionUser = await makeUserPrimary(sessionUser);

                    const session = await getSessionForUser(sessionUser);
                    const resp = await signInUpPOST(email2, true, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.strictEqual(body.status, "OK");

                    assert.strictEqual(body.user.id, otherUser.id);
                    assert.deepStrictEqual(body.user, await getUpdatedUserFromDBForRespCompare(otherUser));

                    sessionUser = await supertokens.getUser(sessionUser.id);
                    assert(sessionUser.isPrimaryUser);
                });

                it("should make the authenticating primary if shouldDoAutomaticAccountLinking returns false while linking to the session user and the session user is primary", async () => {
                    const email1 = getTestEmail("1");
                    const email2 = getTestEmail("2");
                    await setup({
                        globalConnectionURI,
                        shouldDoAutomaticAccountLinking:
                            shouldDoAutomaticAccountLinkingOverride.noLinkingWhenUserEqualsSessionUserDefaultRequireVerification,
                    });

                    let sessionUser = await createEmailPasswordUser(email1, true);
                    sessionUser = await makeUserPrimary(sessionUser);

                    const session = await getSessionForUser(sessionUser);
                    const resp = await signInUpPOST(email2, true, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.strictEqual(body.status, "OK");

                    assert.notStrictEqual(body.user.id, sessionUser.id);
                    assert(body.user.isPrimaryUser);
                    assert.strictEqual(body.user.loginMethods.length, 1);
                });

                it("should link by account info and make the session user primary if shouldDoAutomaticAccountLinking returns false while linking to the session user", async () => {
                    const email1 = getTestEmail("1");
                    const email2 = getTestEmail("2");
                    await setup({
                        globalConnectionURI,
                        shouldDoAutomaticAccountLinking:
                            shouldDoAutomaticAccountLinkingOverride.noLinkingWhenUserEqualsSessionUserDefaultRequireVerification,
                    });

                    const otherUser = await createThirdPartyUser(email2, true);

                    let sessionUser = await createEmailPasswordUser(email1, true);

                    const session = await getSessionForUser(sessionUser);
                    const resp = await signInUpPOST(email2, true, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.strictEqual(body.status, "OK");

                    assert.strictEqual(body.user.id, otherUser.id);
                    assert.deepStrictEqual(body.user, await getUpdatedUserFromDBForRespCompare(otherUser));

                    sessionUser = await supertokens.getUser(sessionUser.id);
                    assert(sessionUser.isPrimaryUser);
                });

                it("should make the authenticating and session user primary if shouldDoAutomaticAccountLinking returns false while linking to the session user", async () => {
                    const email1 = getTestEmail("1");
                    const email2 = getTestEmail("2");
                    await setup({
                        globalConnectionURI,
                        shouldDoAutomaticAccountLinking:
                            shouldDoAutomaticAccountLinkingOverride.noLinkingWhenUserEqualsSessionUserDefaultRequireVerification,
                    });

                    let sessionUser = await createEmailPasswordUser(email1, true);

                    const session = await getSessionForUser(sessionUser);
                    const resp = await signInUpPOST(email2, true, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.strictEqual(body.status, "OK");

                    assert.notStrictEqual(body.user.id, sessionUser.id);
                    assert(body.user.isPrimaryUser);
                    assert.strictEqual(body.user.loginMethods.length, 1);

                    sessionUser = await supertokens.getUser(sessionUser.id);
                    assert(sessionUser.isPrimaryUser);
                });
            });
            describe("linking with unverified user", () => {
                it("should not allow sign up even if the session user is already primary", async () => {
                    const email1 = getTestEmail("1");
                    const email2 = getTestEmail("2");
                    await setup({ globalConnectionURI });
                    let sessionUser = await createEmailPasswordUser(email1, true);
                    sessionUser = await makeUserPrimary(sessionUser);
                    const session = await getSessionForUser(sessionUser);

                    const resp = await signInUpPOST(email2, false, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.strictEqual(body.status, "SIGN_IN_UP_NOT_ALLOWED");
                });

                it("should not allow sign up even if the session user can be made primary", async () => {
                    const email1 = getTestEmail("1");
                    const email2 = getTestEmail("2");
                    await setup({ globalConnectionURI });
                    let sessionUser = await createEmailPasswordUser(email1, true);

                    const session = await getSessionForUser(sessionUser);
                    const resp = await signInUpPOST(email2, false, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.strictEqual(body.status, "SIGN_IN_UP_NOT_ALLOWED");
                });

                it("should error if the session user cannot be made primary - conflicting primary user", async () => {
                    const email1 = getTestEmail("1");
                    const email2 = getTestEmail("2");
                    await setup({ globalConnectionURI });

                    const conflictingUser = await createThirdPartyUser(email1, false);
                    await makeUserPrimary(conflictingUser);

                    let sessionUser = await createEmailPasswordUser(email1, true);

                    const session = await getSessionForUser(sessionUser);
                    const resp = await signInUpPOST(email2, false, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.strictEqual(body.status, "SIGN_IN_UP_NOT_ALLOWED");
                    assert.strictEqual(
                        body.reason,
                        "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_023)"
                    );
                });

                it("should error if the session user cannot be made primary - email verification", async () => {
                    const email1 = getTestEmail("1");
                    const email2 = getTestEmail("2");
                    await setup({ globalConnectionURI });

                    let sessionUser = await createEmailPasswordUser(email1, false);

                    const session = await getSessionForUser(sessionUser);
                    const resp = await signInUpPOST(email2, false, session);
                    assert.strictEqual(resp.status, 403);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.deepStrictEqual(body, {
                        message: "invalid claim",
                        claimValidationErrors: [
                            {
                                id: "st-ev",
                                reason: {
                                    actualValue: false,
                                    expectedValue: true,
                                    message: "wrong value",
                                },
                            },
                        ],
                    });
                });

                it("should error if sign up is not allowed", async () => {
                    const email1 = getTestEmail("1");
                    const email2 = getTestEmail("2");
                    await setup({ globalConnectionURI });

                    const conflictingUser = await createThirdPartyUser(email2, true);
                    await makeUserPrimary(conflictingUser);

                    let sessionUser = await createEmailPasswordUser(email1, true);

                    const session = await getSessionForUser(sessionUser);
                    const resp = await signInUpPOST(email2, false, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.deepStrictEqual(body, {
                        status: "SIGN_IN_UP_NOT_ALLOWED",
                        reason: "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_021)",
                    });
                });

                it("should link by account info if shouldDoAutomaticAccountLinking returns false while making the session user primary", async () => {
                    const email1 = "test2@example.com";
                    const email2 = getTestEmail("2");
                    await setup({
                        globalConnectionURI,
                        shouldDoAutomaticAccountLinking:
                            shouldDoAutomaticAccountLinkingOverride.linkingNoVerifyExceptWhenEmailMatchTest,
                    });

                    const otherUser = await createThirdPartyUser(email2, true);

                    let sessionUser = await createEmailPasswordUser(email1, true);

                    const session = await getSessionForUser(sessionUser);
                    const resp = await signInUpPOST(email2, false, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.strictEqual(body.status, "OK");

                    assert.strictEqual(body.user.id, otherUser.id);
                    assert.deepStrictEqual(body.user, await getUpdatedUserFromDBForRespCompare(otherUser));
                });

                it("should not make the authenticating user primary even if shouldDoAutomaticAccountLinking returns false while making the session user primary", async () => {
                    const email1 = "test2@example.com";
                    const email2 = getTestEmail("2");
                    await setup({
                        globalConnectionURI,
                        shouldDoAutomaticAccountLinking:
                            shouldDoAutomaticAccountLinkingOverride.linkingNoVerifyExceptWhenEmailMatchTest,
                    });

                    let sessionUser = await createEmailPasswordUser(email1, true);

                    const session = await getSessionForUser(sessionUser);
                    const resp = await signInUpPOST(email2, false, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.strictEqual(body.status, "OK");

                    assert.notStrictEqual(body.user.id, sessionUser.id);
                    assert(!body.user.isPrimaryUser);
                    assert.strictEqual(body.user.loginMethods.length, 1);
                });

                it("should link by account info and make the session user primary if shouldDoAutomaticAccountLinking returns false while linking to the session user and the session user is primary", async () => {
                    const email1 = getTestEmail("1");
                    const email2 = getTestEmail("2");
                    await setup({
                        globalConnectionURI,
                        shouldDoAutomaticAccountLinking:
                            shouldDoAutomaticAccountLinkingOverride.noLinkingWhenUserEqualsSessionUserDefaultRequireVerification,
                    });

                    const otherUser = await createThirdPartyUser(email2, true);

                    let sessionUser = await createEmailPasswordUser(email1, true);
                    sessionUser = await makeUserPrimary(sessionUser);

                    const session = await getSessionForUser(sessionUser);
                    const resp = await signInUpPOST(email2, false, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.strictEqual(body.status, "OK");

                    assert.strictEqual(body.user.id, otherUser.id);
                    assert.deepStrictEqual(body.user, await getUpdatedUserFromDBForRespCompare(otherUser));

                    sessionUser = await supertokens.getUser(sessionUser.id);
                    assert(sessionUser.isPrimaryUser);
                });

                it("should not make the authenticating primary if shouldDoAutomaticAccountLinking returns false while linking to the session user and the session user is primary", async () => {
                    const email1 = getTestEmail("1");
                    const email2 = getTestEmail("2");
                    await setup({
                        globalConnectionURI,
                        shouldDoAutomaticAccountLinking:
                            shouldDoAutomaticAccountLinkingOverride.noLinkingWhenUserEqualsSessionUserDefaultRequireVerification,
                    });

                    let sessionUser = await createEmailPasswordUser(email1, true);
                    sessionUser = await makeUserPrimary(sessionUser);

                    const session = await getSessionForUser(sessionUser);
                    const resp = await signInUpPOST(email2, false, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.strictEqual(body.status, "OK");

                    assert.notStrictEqual(body.user.id, sessionUser.id);
                    assert(!body.user.isPrimaryUser);
                    assert.strictEqual(body.user.loginMethods.length, 1);
                });

                it("should link by account info and make the session user primary if shouldDoAutomaticAccountLinking returns false while linking to the session user", async () => {
                    const email1 = getTestEmail("1");
                    const email2 = getTestEmail("2");
                    await setup({
                        globalConnectionURI,
                        shouldDoAutomaticAccountLinking:
                            shouldDoAutomaticAccountLinkingOverride.noLinkingWhenUserEqualsSessionUserDefaultRequireVerification,
                    });

                    const otherUser = await createThirdPartyUser(email2, true);

                    let sessionUser = await createEmailPasswordUser(email1, true);

                    const session = await getSessionForUser(sessionUser);
                    const resp = await signInUpPOST(email2, false, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.strictEqual(body.status, "OK");

                    assert.strictEqual(body.user.id, otherUser.id);
                    assert.deepStrictEqual(body.user, await getUpdatedUserFromDBForRespCompare(otherUser));

                    sessionUser = await supertokens.getUser(sessionUser.id);
                    assert(sessionUser.isPrimaryUser);
                });

                it("should not make the authenticating user primary only the session user if shouldDoAutomaticAccountLinking returns false while linking to the session user", async () => {
                    const email1 = getTestEmail("1");
                    const email2 = getTestEmail("2");
                    await setup({
                        globalConnectionURI,
                        shouldDoAutomaticAccountLinking:
                            shouldDoAutomaticAccountLinkingOverride.noLinkingWhenUserEqualsSessionUserDefaultRequireVerification,
                    });

                    let sessionUser = await createEmailPasswordUser(email1, true);

                    const session = await getSessionForUser(sessionUser);
                    const resp = await signInUpPOST(email2, false, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.strictEqual(body.status, "OK");

                    assert.notStrictEqual(body.user.id, sessionUser.id);
                    assert(!body.user.isPrimaryUser);
                    assert.strictEqual(body.user.loginMethods.length, 1);

                    sessionUser = await supertokens.getUser(sessionUser.id);
                    assert(sessionUser.isPrimaryUser);
                });
            });
        });
        describe("during sign in", () => {
            describe("linking with verified user", () => {
                it("should link to session user if the session user is already primary", async () => {
                    const email1 = getTestEmail("1");
                    const email2 = getTestEmail("2");
                    await setup({ globalConnectionURI });
                    let sessionUser = await createEmailPasswordUser(email1, true);
                    sessionUser = await makeUserPrimary(sessionUser);
                    await createThirdPartyUser(email2, true);

                    const session = await getSessionForUser(sessionUser);
                    const resp = await signInUpPOST(email2, true, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.strictEqual(body.status, "OK");

                    assert.strictEqual(body.user.id, sessionUser.id);
                    assert.deepStrictEqual(body.user, await getUpdatedUserFromDBForRespCompare(sessionUser));
                });

                it("should link to session user if the session user can be made primary", async () => {
                    const email1 = getTestEmail("1");
                    const email2 = getTestEmail("2");
                    await setup({ globalConnectionURI });
                    let sessionUser = await createEmailPasswordUser(email1, true);
                    await createThirdPartyUser(email2, true);

                    const session = await getSessionForUser(sessionUser);
                    const resp = await signInUpPOST(email2, true, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.strictEqual(body.status, "OK");

                    assert.strictEqual(body.user.id, sessionUser.id);
                    assert.deepStrictEqual(body.user, await getUpdatedUserFromDBForRespCompare(sessionUser));
                });

                it("should error if the session user cannot be made primary - conflicting primary user", async () => {
                    const email1 = getTestEmail("1");
                    const email2 = getTestEmail("2");
                    await setup({ globalConnectionURI });

                    const conflictingUser = await createThirdPartyUser(email1, false);
                    await makeUserPrimary(conflictingUser);
                    await createThirdPartyUser(email2, true);

                    let sessionUser = await createEmailPasswordUser(email1, true);

                    const session = await getSessionForUser(sessionUser);
                    const resp = await signInUpPOST(email2, true, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.strictEqual(body.status, "SIGN_IN_UP_NOT_ALLOWED");
                    assert.strictEqual(
                        body.reason,
                        "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_023)"
                    );
                });

                it("should error if the session user cannot be made primary - email verification", async () => {
                    const email1 = getTestEmail("1");
                    const email2 = getTestEmail("2");
                    await setup({ globalConnectionURI });

                    let sessionUser = await createEmailPasswordUser(email1, false);
                    await createThirdPartyUser(email2, true);

                    const session = await getSessionForUser(sessionUser);
                    const resp = await signInUpPOST(email2, true, session);
                    assert.strictEqual(resp.status, 403);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.deepStrictEqual(body, {
                        message: "invalid claim",
                        claimValidationErrors: [
                            {
                                id: "st-ev",
                                reason: {
                                    actualValue: false,
                                    expectedValue: true,
                                    message: "wrong value",
                                },
                            },
                        ],
                    });
                });

                it("should error if the authenticating user is already primary", async () => {
                    const email1 = getTestEmail("1");
                    const email2 = getTestEmail("2");
                    await setup({ globalConnectionURI });

                    let user = await createThirdPartyUser(email2, true);
                    user = await makeUserPrimary(user);

                    let sessionUser = await createEmailPasswordUser(email1, true);

                    const session = await getSessionForUser(sessionUser);
                    const resp = await signInUpPOST(email2, true, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.deepStrictEqual(body, {
                        status: "SIGN_IN_UP_NOT_ALLOWED",
                        reason: "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_021)",
                    });
                });

                it("should link by account info if shouldDoAutomaticAccountLinking returns false while making the session user primary", async () => {
                    const email1 = "test2@example.com";
                    const email2 = getTestEmail("2");
                    await setup({
                        globalConnectionURI,
                        shouldDoAutomaticAccountLinking:
                            shouldDoAutomaticAccountLinkingOverride.linkingNoVerifyExceptWhenEmailMatchTest,
                    });

                    const otherUser = await createThirdPartyUser(email2, true);

                    let sessionUser = await createEmailPasswordUser(email1, true);
                    await createThirdPartyUser(email2, true);

                    const session = await getSessionForUser(sessionUser);
                    const resp = await signInUpPOST(email2, true, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.strictEqual(body.status, "OK");

                    assert.strictEqual(body.user.id, otherUser.id);
                    assert.deepStrictEqual(body.user, await getUpdatedUserFromDBForRespCompare(otherUser));
                });

                it("should make the authenticating user primary if shouldDoAutomaticAccountLinking returns false while making the session user primary", async () => {
                    const email1 = "test2@example.com";
                    const email2 = getTestEmail("2");
                    await setup({
                        globalConnectionURI,
                        shouldDoAutomaticAccountLinking:
                            shouldDoAutomaticAccountLinkingOverride.linkingNoVerifyExceptWhenEmailMatchTest,
                    });

                    let sessionUser = await createEmailPasswordUser(email1, true);
                    await createThirdPartyUser(email2, true);

                    const session = await getSessionForUser(sessionUser);
                    const resp = await signInUpPOST(email2, true, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.strictEqual(body.status, "OK");

                    assert.notStrictEqual(body.user.id, sessionUser.id);
                    assert(body.user.isPrimaryUser);
                    assert.strictEqual(body.user.loginMethods.length, 1);
                });

                it("should link by account info and make the session user primary if shouldDoAutomaticAccountLinking returns false while linking to the session user and the session user is primary", async () => {
                    const email1 = getTestEmail("1");
                    const email2 = getTestEmail("2");
                    await setup({
                        globalConnectionURI,
                        shouldDoAutomaticAccountLinking:
                            shouldDoAutomaticAccountLinkingOverride.noLinkingWhenUserEqualsSessionUserDefaultRequireVerification,
                    });

                    const otherUser = await createThirdPartyUser(email2, true);
                    await createThirdPartyUser(email2, true);

                    let sessionUser = await createEmailPasswordUser(email1, true);
                    sessionUser = await makeUserPrimary(sessionUser);

                    const session = await getSessionForUser(sessionUser);
                    const resp = await signInUpPOST(email2, true, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.strictEqual(body.status, "OK");

                    assert.strictEqual(body.user.id, otherUser.id);
                    assert.deepStrictEqual(body.user, await getUpdatedUserFromDBForRespCompare(otherUser));

                    sessionUser = await supertokens.getUser(sessionUser.id);
                    assert(sessionUser.isPrimaryUser);
                });

                it("should make the authenticating user primary if shouldDoAutomaticAccountLinking returns false while linking to the session user and the session user is primary", async () => {
                    const email1 = getTestEmail("1");
                    const email2 = getTestEmail("2");
                    await setup({
                        globalConnectionURI,
                        shouldDoAutomaticAccountLinking:
                            shouldDoAutomaticAccountLinkingOverride.noLinkingWhenUserEqualsSessionUserDefaultRequireVerification,
                    });

                    let sessionUser = await createEmailPasswordUser(email1, true);
                    sessionUser = await makeUserPrimary(sessionUser);

                    await createThirdPartyUser(email2, true);

                    const session = await getSessionForUser(sessionUser);
                    const resp = await signInUpPOST(email2, true, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.strictEqual(body.status, "OK");

                    assert.notStrictEqual(body.user.id, sessionUser.id);
                    assert(body.user.isPrimaryUser);
                    assert.strictEqual(body.user.loginMethods.length, 1);
                });

                it("should link by account info and make the session user primary if shouldDoAutomaticAccountLinking returns false while linking to the session user", async () => {
                    const email1 = getTestEmail("1");
                    const email2 = getTestEmail("2");
                    await setup({
                        globalConnectionURI,
                        shouldDoAutomaticAccountLinking:
                            shouldDoAutomaticAccountLinkingOverride.noLinkingWhenUserEqualsSessionUserDefaultRequireVerification,
                    });

                    const otherUser = await createThirdPartyUser(email2, true);
                    await createThirdPartyUser(email2, true);

                    let sessionUser = await createEmailPasswordUser(email1, true);

                    const session = await getSessionForUser(sessionUser);
                    const resp = await signInUpPOST(email2, true, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.strictEqual(body.status, "OK");

                    assert.strictEqual(body.user.id, otherUser.id);
                    assert.deepStrictEqual(body.user, await getUpdatedUserFromDBForRespCompare(otherUser));

                    sessionUser = await supertokens.getUser(sessionUser.id);
                    assert(sessionUser.isPrimaryUser);
                });

                it("should make the authenticating and session user primary if shouldDoAutomaticAccountLinking returns false while linking to the session user", async () => {
                    const email1 = getTestEmail("1");
                    const email2 = getTestEmail("2");
                    await setup({
                        globalConnectionURI,
                        shouldDoAutomaticAccountLinking:
                            shouldDoAutomaticAccountLinkingOverride.noLinkingWhenUserEqualsSessionUserDefaultRequireVerification,
                    });

                    let sessionUser = await createEmailPasswordUser(email1, true);
                    await createThirdPartyUser(email2, true);

                    const session = await getSessionForUser(sessionUser);
                    const resp = await signInUpPOST(email2, true, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.strictEqual(body.status, "OK");

                    assert.notStrictEqual(body.user.id, sessionUser.id);
                    assert(body.user.isPrimaryUser);
                    assert.strictEqual(body.user.loginMethods.length, 1);

                    sessionUser = await supertokens.getUser(sessionUser.id);
                    assert(sessionUser.isPrimaryUser);
                });
            });

            describe("linking with unverified user", () => {
                it("should link to session user if the session user is already primary", async () => {
                    const email1 = getTestEmail("1");
                    const email2 = getTestEmail("2");
                    await setup({ globalConnectionURI });
                    let sessionUser = await createEmailPasswordUser(email1, true);
                    sessionUser = await makeUserPrimary(sessionUser);
                    await createThirdPartyUser(email2, false);

                    const session = await getSessionForUser(sessionUser);
                    const resp = await signInUpPOST(email2, true, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.strictEqual(body.status, "OK");

                    assert.strictEqual(body.user.id, sessionUser.id);
                    assert.deepStrictEqual(body.user, await getUpdatedUserFromDBForRespCompare(sessionUser));
                });

                it("should link to session user if the session user can be made primary", async () => {
                    const email1 = getTestEmail("1");
                    const email2 = getTestEmail("2");
                    await setup({ globalConnectionURI });
                    let sessionUser = await createEmailPasswordUser(email1, true);
                    await createThirdPartyUser(email2, false);

                    const session = await getSessionForUser(sessionUser);
                    const resp = await signInUpPOST(email2, true, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.strictEqual(body.status, "OK");

                    assert.strictEqual(body.user.id, sessionUser.id);
                    assert.deepStrictEqual(body.user, await getUpdatedUserFromDBForRespCompare(sessionUser));
                });

                it("should error if the session user cannot be made primary - conflicting primary user", async () => {
                    const email1 = getTestEmail("1");
                    const email2 = getTestEmail("2");
                    await setup({ globalConnectionURI });

                    const conflictingUser = await createThirdPartyUser(email1, false);
                    await makeUserPrimary(conflictingUser);
                    await createThirdPartyUser(email2, false);

                    let sessionUser = await createEmailPasswordUser(email1, true);

                    const session = await getSessionForUser(sessionUser);
                    const resp = await signInUpPOST(email2, true, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.strictEqual(body.status, "SIGN_IN_UP_NOT_ALLOWED");
                    assert.strictEqual(
                        body.reason,
                        "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_023)"
                    );
                });

                it("should error if the session user cannot be made primary - email verification", async () => {
                    const email1 = getTestEmail("1");
                    const email2 = getTestEmail("2");
                    await setup({ globalConnectionURI });

                    let sessionUser = await createEmailPasswordUser(email1, false);
                    await createThirdPartyUser(email2, false);

                    const session = await getSessionForUser(sessionUser);
                    const resp = await signInUpPOST(email2, true, session);
                    assert.strictEqual(resp.status, 403);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.deepStrictEqual(body, {
                        message: "invalid claim",
                        claimValidationErrors: [
                            {
                                id: "st-ev",
                                reason: {
                                    actualValue: false,
                                    expectedValue: true,
                                    message: "wrong value",
                                },
                            },
                        ],
                    });
                });

                it("should error if the authenticating user is already primary", async () => {
                    const email1 = getTestEmail("1");
                    const email2 = getTestEmail("2");
                    await setup({ globalConnectionURI });

                    let user = await createThirdPartyUser(email2, false);
                    user = await makeUserPrimary(user);

                    let sessionUser = await createEmailPasswordUser(email1, true);

                    const session = await getSessionForUser(sessionUser);
                    const resp = await signInUpPOST(email2, true, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.deepStrictEqual(body, {
                        status: "SIGN_IN_UP_NOT_ALLOWED",
                        reason: "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_021)",
                    });
                });

                it("should link by account info if shouldDoAutomaticAccountLinking returns false while making the session user primary", async () => {
                    const email1 = "test2@example.com";
                    const email2 = getTestEmail("2");
                    await setup({
                        globalConnectionURI,
                        shouldDoAutomaticAccountLinking:
                            shouldDoAutomaticAccountLinkingOverride.linkingNoVerifyExceptWhenEmailMatchTest,
                    });

                    const otherUser = await createThirdPartyUser(email2, true);

                    let sessionUser = await createEmailPasswordUser(email1, true);
                    await createThirdPartyUser(email2, false);

                    const session = await getSessionForUser(sessionUser);
                    const resp = await signInUpPOST(email2, true, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.strictEqual(body.status, "OK");

                    assert.strictEqual(body.user.id, otherUser.id);
                    assert.deepStrictEqual(body.user, await getUpdatedUserFromDBForRespCompare(otherUser));
                });

                it("should make the authenticating user primary if shouldDoAutomaticAccountLinking returns false while making the session user primary", async () => {
                    const email1 = "test2@example.com";
                    const email2 = getTestEmail("2");
                    await setup({
                        globalConnectionURI,
                        shouldDoAutomaticAccountLinking:
                            shouldDoAutomaticAccountLinkingOverride.linkingNoVerifyExceptWhenEmailMatchTest,
                    });

                    let sessionUser = await createEmailPasswordUser(email1, true);
                    await createThirdPartyUser(email2, false);

                    const session = await getSessionForUser(sessionUser);
                    const resp = await signInUpPOST(email2, true, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.strictEqual(body.status, "OK");

                    assert.notStrictEqual(body.user.id, sessionUser.id);
                    assert(body.user.isPrimaryUser);
                    assert.strictEqual(body.user.loginMethods.length, 1);
                });

                it("should link by account info and make the session user primary if shouldDoAutomaticAccountLinking returns false while linking to the session user and the session user is primary", async () => {
                    const email1 = getTestEmail("1");
                    const email2 = getTestEmail("2");
                    await setup({
                        globalConnectionURI,
                        shouldDoAutomaticAccountLinking:
                            shouldDoAutomaticAccountLinkingOverride.noLinkingWhenUserEqualsSessionUserDefaultRequireVerification,
                    });

                    const otherUser = await createThirdPartyUser(email2, true);
                    await createThirdPartyUser(email2, false);

                    let sessionUser = await createEmailPasswordUser(email1, true);
                    sessionUser = await makeUserPrimary(sessionUser);

                    const session = await getSessionForUser(sessionUser);
                    const resp = await signInUpPOST(email2, true, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.strictEqual(body.status, "OK");

                    assert.strictEqual(body.user.id, otherUser.id);
                    assert.deepStrictEqual(body.user, await getUpdatedUserFromDBForRespCompare(otherUser));

                    sessionUser = await supertokens.getUser(sessionUser.id);
                    assert(sessionUser.isPrimaryUser);
                });

                it("should make the authenticating user primary if shouldDoAutomaticAccountLinking returns false while linking to the session user and the session user is primary", async () => {
                    const email1 = getTestEmail("1");
                    const email2 = getTestEmail("2");
                    await setup({
                        globalConnectionURI,
                        shouldDoAutomaticAccountLinking:
                            shouldDoAutomaticAccountLinkingOverride.noLinkingWhenUserEqualsSessionUserDefaultRequireVerification,
                    });

                    let sessionUser = await createEmailPasswordUser(email1, true);
                    sessionUser = await makeUserPrimary(sessionUser);

                    await createThirdPartyUser(email2, false);

                    const session = await getSessionForUser(sessionUser);
                    const resp = await signInUpPOST(email2, true, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.strictEqual(body.status, "OK");

                    assert.notStrictEqual(body.user.id, sessionUser.id);
                    assert(body.user.isPrimaryUser);
                    assert.strictEqual(body.user.loginMethods.length, 1);
                });

                it("should link by account info and make the session user primary if shouldDoAutomaticAccountLinking returns false while linking to the session user", async () => {
                    const email1 = getTestEmail("1");
                    const email2 = getTestEmail("2");
                    await setup({
                        globalConnectionURI,
                        shouldDoAutomaticAccountLinking:
                            shouldDoAutomaticAccountLinkingOverride.noLinkingWhenUserEqualsSessionUserDefaultRequireVerification,
                    });

                    const otherUser = await createThirdPartyUser(email2, true);
                    await createThirdPartyUser(email2, false);

                    let sessionUser = await createEmailPasswordUser(email1, true);

                    const session = await getSessionForUser(sessionUser);
                    const resp = await signInUpPOST(email2, true, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.strictEqual(body.status, "OK");

                    assert.strictEqual(body.user.id, otherUser.id);
                    assert.deepStrictEqual(body.user, await getUpdatedUserFromDBForRespCompare(otherUser));

                    sessionUser = await supertokens.getUser(sessionUser.id);
                    assert(sessionUser.isPrimaryUser);
                });

                it("should make the authenticating and session user primary if shouldDoAutomaticAccountLinking returns false while linking to the session user", async () => {
                    const email1 = getTestEmail("1");
                    const email2 = getTestEmail("2");
                    await setup({
                        globalConnectionURI,
                        shouldDoAutomaticAccountLinking:
                            shouldDoAutomaticAccountLinkingOverride.noLinkingWhenUserEqualsSessionUserDefaultRequireVerification,
                    });

                    let sessionUser = await createEmailPasswordUser(email1, true);
                    await createThirdPartyUser(email2, false);

                    const session = await getSessionForUser(sessionUser);
                    const resp = await signInUpPOST(email2, true, session);
                    assert.strictEqual(resp.status, 200);
                    assert.ok(resp.body);

                    const body = resp.body;
                    assert.strictEqual(body.status, "OK");

                    assert.notStrictEqual(body.user.id, sessionUser.id);
                    assert(body.user.isPrimaryUser);
                    assert.strictEqual(body.user.loginMethods.length, 1);

                    sessionUser = await supertokens.getUser(sessionUser.id);
                    assert(sessionUser.isPrimaryUser);
                });
            });
        });

        describe("user association", () => {
            it("should associate an exiting user with the current tenant if the session user has one with the same account info", async () => {
                const email1 = getTestEmail("1");
                const email2 = getTestEmail("2");
                await setup({ globalConnectionURI });
                let sessionUser = await createEmailPasswordUser(email1, true);
                sessionUser = await makeUserPrimary(sessionUser);
                const otherTenantUser = await createThirdPartyUser(email2, true, "tenant1");
                sessionUser = await linkUsers(sessionUser, otherTenantUser);

                const session = await getSessionForUser(sessionUser);
                const resp = await signInUpPOST(email2, true, session);
                assert.strictEqual(resp.status, 200);
                assert.ok(resp.body);

                const body = resp.body;
                assert.strictEqual(body.status, "OK");

                assert.strictEqual(body.user.id, sessionUser.id);
                assert.strictEqual(body.user.loginMethods.length, 2);
                assert(!body.createdNewRecipeUser);
                assert.deepStrictEqual(
                    new Set(body.user.loginMethods.map((lm) => lm.recipeUserId)),
                    new Set([sessionUser.id, otherTenantUser.id])
                );
                assert.deepStrictEqual(
                    new Set(body.user.loginMethods.find((lm) => lm.recipeId === "thirdparty").tenantIds),
                    new Set(["public", "tenant1"])
                );
            });

            it("should not associate an exiting user with the current tenant if the session user is not linked to it", async () => {
                const email1 = getTestEmail("1");
                const email2 = getTestEmail("2");
                await setup({ globalConnectionURI });
                let sessionUser = await createEmailPasswordUser(email1, true);
                sessionUser = await makeUserPrimary(sessionUser);
                await createThirdPartyUser(email2, true, "tenant1");

                const session = await getSessionForUser(sessionUser);
                const resp = await signInUpPOST(email2, true, session);
                assert.strictEqual(resp.status, 200);
                assert.ok(resp.body);

                const body = resp.body;
                assert.strictEqual(body.status, "OK");

                assert.strictEqual(body.user.id, sessionUser.id);
                assert.strictEqual(body.user.loginMethods.length, 2);
                assert(body.createdNewRecipeUser);
                assert.deepStrictEqual(
                    new Set(body.user.loginMethods.find((lm) => lm.recipeId === "thirdparty").tenantIds),
                    new Set(["public"])
                );
            });

            it("should error out if the credentials are wrong", async () => {
                const email1 = getTestEmail("1");
                const email2 = getTestEmail("2");
                await setup({ globalConnectionURI });
                let sessionUser = await createEmailPasswordUser(email1, true);
                sessionUser = await makeUserPrimary(sessionUser);
                const otherTenantUser = await createThirdPartyUser(email2, true, "tenant1");
                sessionUser = await linkUsers(sessionUser, otherTenantUser);

                const session = await getSessionForUser(sessionUser);
                const resp = await signInUpPOST(email2, true, session, undefined, "error");
                assert.strictEqual(resp.status, 500);

                const updatedSessionUser = await supertokens.getUser(sessionUser.id);
                assert.deepStrictEqual(
                    updatedSessionUser.loginMethods.find((lm) => lm.recipeId === "thirdparty").tenantIds,
                    ["tenant1"]
                );
            });
        });
    });
});

async function signInUpPOST(email, isVerified, session, userId = email, error = undefined) {
    return postAPI(
        "/auth/signinup",
        {
            thirdPartyId: "custom",
            oAuthTokens: {
                email,
                isVerified,
                userId,
                error,
            },
        },
        session
    );
}
