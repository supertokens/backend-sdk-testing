/* Copyright (c) 2024, VRAI Labs and/or its affiliates. All rights reserved.
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
const { recipesMock, randomString, getOverrideLogs, resetOverrideParams } = require("../../api-mock");
const { EmailPassword, EmailVerification, Session, supertokens } = recipesMock;

describe(`EmailverificationTests: ${printPath(
    "[test/emailverification/emailverification.claim.test.js]"
)}`, function () {
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

    describe("EmailVerification Claim", function () {
        it("value should be fetched if it is undefined", async function () {
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
                recipeList: [EmailPassword.init(), EmailVerification.init(), Session.init()],
            });
            const { user } = await EmailPassword.signUp("public", "test@example.com", "password123");

            const session = await Session.createNewSessionWithoutRequestResponse("public", user.id);

            await session.mergeIntoAccessTokenPayload({ "st-ev": null });

            await resetOverrideParams();

            await assert.rejects(async () => {
                await session.assertClaims([EmailVerification.EmailVerificationClaim.validators.isVerified()], {});
            });

            const logs = await getOverrideLogs();
            const isEmailVerifiedCalledLogs = logs.filter(
                (log) => log.type === "CALL" && log.name === "EmailVerification.override.functions.isEmailVerified"
            );

            assert.strictEqual(isEmailVerifiedCalledLogs.length, 1);
        });

        it("value should be fetched as per maxAgeInSeconds if it is provided", async function () {
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
                recipeList: [EmailPassword.init(), EmailVerification.init(), Session.init()],
            });
            const { user } = await EmailPassword.signUp("public", "test@example.com", "password123");
            const session = await Session.createNewSessionWithoutRequestResponse(
                "public",
                user.id
            );

            {
                await session.mergeIntoAccessTokenPayload({
                    "st-ev": {
                        v: true,
                        t: Date.now(),
                    },
                });

                await resetOverrideParams();
                await session.assertClaims(
                    [EmailVerification.EmailVerificationClaim.validators.isVerified(10, 200)],
                    {}
                );

                let logs = await getOverrideLogs();
                let isEmailVerifiedCalledLogs = logs.filter(
                    (log) => log.type === "CALL" && log.name === "EmailVerification.override.functions.isEmailVerified"
                );
                assert.strictEqual(isEmailVerifiedCalledLogs.length, 0);
            }

            {
                await session.mergeIntoAccessTokenPayload({
                    "st-ev": {
                        v: true,
                        t: Date.now() - 201 * 1000, // 201 seconds ago
                    },
                });

                await resetOverrideParams();

                // The email is not verified. The expired claim value will be refetched and updated to false, causing session.assertClaims to throw an error.
                await assert.rejects(async () => {
                    await session.assertClaims(
                        [EmailVerification.EmailVerificationClaim.validators.isVerified(10, 200)],
                        {}
                    );
                });

                let logs = await getOverrideLogs();
                let isEmailVerifiedCalledLogs = logs.filter(
                    (log) => log.type === "CALL" && log.name === "EmailVerification.override.functions.isEmailVerified"
                );

                assert.strictEqual(isEmailVerifiedCalledLogs.length, 1);
            }
        });

        it("value should be fetched as per refetchTimeOnFalseInSeconds if it is provided", async function () {
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
                recipeList: [EmailPassword.init(), EmailVerification.init(), Session.init()],
            });
            const { user } = await EmailPassword.signUp("public", "test@example.com", "password123");
            const session = await Session.createNewSessionWithoutRequestResponse(
                "public",
                user.id
            );

            {
                await session.mergeIntoAccessTokenPayload({
                    "st-ev": {
                        v: false,
                        t: Date.now(),
                    },
                });

                await resetOverrideParams();

                await assert.rejects(async () => {
                    await session.assertClaims([EmailVerification.EmailVerificationClaim.validators.isVerified(5)], {});
                });

                let logs = await getOverrideLogs();
                let isEmailVerifiedCalledLogs = logs.filter(
                    (log) => log.type === "CALL" && log.name === "EmailVerification.override.functions.isEmailVerified"
                );

                assert.strictEqual(isEmailVerifiedCalledLogs.length, 0);
            }

            {
                await session.mergeIntoAccessTokenPayload({
                    "st-ev": {
                        v: false,
                        t: Date.now() - 6 * 1000, // 6 seconds ago
                    },
                });

                await resetOverrideParams();

                await assert.rejects(async () => {
                    await session.assertClaims([EmailVerification.EmailVerificationClaim.validators.isVerified(5)], {});
                });

                let logs = await getOverrideLogs();
                let isEmailVerifiedCalledLogs = logs.filter(
                    (log) => log.type === "CALL" && log.name === "EmailVerification.override.functions.isEmailVerified"
                );

                assert.strictEqual(isEmailVerifiedCalledLogs.length, 1);
            }
        });

        it("value should be fetched as per default the refetchTimeOnFalseInSeconds if it is not provided", async function () {
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
                recipeList: [EmailPassword.init(), EmailVerification.init(), Session.init()],
            });
            const { user } = await EmailPassword.signUp("public", "test@example.com", "password123");
            const session = await Session.createNewSessionWithoutRequestResponse(
                "public",
                user.id
            );

            // NOTE: the default value of refetchTimeOnFalseInSeconds is 10 seconds
            {
                await session.mergeIntoAccessTokenPayload({
                    "st-ev": {
                        v: false,
                        t: Date.now() - 9 * 1000, // 9 seconds ago
                    },
                });

                await resetOverrideParams();

                await assert.rejects(async () => {
                    await session.assertClaims([EmailVerification.EmailVerificationClaim.validators.isVerified()], {});
                });

                let logs = await getOverrideLogs();
                let isEmailVerifiedCalledLogs = logs.filter(
                    (log) => log.type === "CALL" && log.name === "EmailVerification.override.functions.isEmailVerified"
                );

                assert.strictEqual(isEmailVerifiedCalledLogs.length, 0);
            }

            {
                await session.mergeIntoAccessTokenPayload({
                    "st-ev": {
                        v: false,
                        t: Date.now() - 11 * 1000, // 11 seconds ago
                    },
                });

                await resetOverrideParams();

                await assert.rejects(async () => {
                    await session.assertClaims([EmailVerification.EmailVerificationClaim.validators.isVerified(5)], {});
                });

                let logs = await getOverrideLogs();
                let isEmailVerifiedCalledLogs = logs.filter(
                    (log) => log.type === "CALL" && log.name === "EmailVerification.override.functions.isEmailVerified"
                );

                assert.strictEqual(isEmailVerifiedCalledLogs.length, 1);
            }
        });
    });
});
