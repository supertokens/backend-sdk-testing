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
const { recipesMock, randomString } = require("../../api-mock");
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
        it("shouldRefetch should return false if the claim value is true and maxAgeInSeconds is not provided", async function () {
            const claimValidator = EmailVerification.EmailVerificationClaim.validators.isVerified();

            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

            const payload = {
                "st-ev": {
                    v: true,
                    // timestamp of the claim value shouldn't matter if
                    // maxAgeInSeconds is not provided and the claim value is true
                    t: oneYearAgo.getTime(),
                },
            };

            const shouldRefetch = claimValidator.shouldRefetch(payload, {});

            assert.strictEqual(shouldRefetch, false);
        });

        it("shouldRefetch should return values as per the maxAgeInSeconds if it is provided", async function () {
            const claimValidator = EmailVerification.EmailVerificationClaim.validators.isVerified(10, 200);

            // claim value is true and timestamp is within maxAgeInSeconds
            {
                let payload = {
                    "st-ev": {
                        v: true,
                        t: new Date().getTime(),
                    },
                };

                assert.strictEqual(claimValidator.shouldRefetch(payload, {}), false);
            }

            // claim value is true and timestamp is expired
            {
                payload = {
                    "st-ev": {
                        v: true,
                        t: new Date().getTime() - 300000, // 5 minutes ago
                    },
                };

                assert.strictEqual(claimValidator.shouldRefetch(payload, {}), true);
            }

            // claim value is false and timestamp is within maxAgeInSeconds
            {
                payload = {
                    "st-ev": {
                        v: false,
                        t: new Date().getTime(),
                    },
                };

                assert.strictEqual(claimValidator.shouldRefetch(payload, {}), false);
            }

            // claim value is false and timestamp is expired
            {
                payload = {
                    "st-ev": {
                        v: false,
                        t: new Date().getTime() - 300000, // 5 minutes ago
                    },
                };

                assert.strictEqual(claimValidator.shouldRefetch(payload, {}), true);
            }
        });

        it("shouldRefetch should use the default maxAgeInSeconds if it's not provided and the claim value is false", async function () {
            const claimValidator = EmailVerification.EmailVerificationClaim.validators.isVerified();

            // NOTE: the default maxAgeInSeconds is 300 seconds

            // claim value is false and timestamp is within maxAgeInSeconds
            {
                let payload = {
                    "st-ev": {
                        v: false,
                        t: new Date().getTime(),
                    },
                };

                assert.strictEqual(claimValidator.shouldRefetch(payload, {}), false);
            }

            // claim value is false and timestamp is expired
            {
                payload = {
                    "st-ev": {
                        v: false,
                        t: new Date().getTime() - 600000, // 10 minutes ago
                    },
                };

                assert.strictEqual(claimValidator.shouldRefetch(payload, {}), true);
            }
        });
    });
});
