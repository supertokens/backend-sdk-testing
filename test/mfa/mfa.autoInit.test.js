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

const { printPath, setupST, startST: globalStartST, killAllST, cleanST, createTenant } = require("../utils");
let assert = require("assert");
const { recipesMock, randomString } = require("../../api-mock");
const { EmailPassword, Session, supertokens: SuperTokens, MultiFactorAuth, TOTP: Totp, UserMetadata } = recipesMock;

describe(`mfa-autoinit: ${printPath("[test/mfa/mfa.autoInit.test.js]")}`, function () {
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

    it("test usermetadata is auto-initialised if mfa is initialised", async function () {
        const connectionURI = await startST();
        SuperTokens.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [MultiFactorAuth.init(), Session.init()],
        });

        await UserMetadata.updateUserMetadata("test-userid", { key: "val" }); // should not have an error
    });

    it("test init throws if totp is initialised without MFA", async function () {
        const connectionURI = await startST();
        let caught;
        try {
            SuperTokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [EmailPassword.init(), Totp.init(), Session.init()],
            });

            // we execute some function so that a query is sent to the backend, so that the init is done
            await EmailPassword.signUp("public", "test@example.com", "abcd1234");
        } catch (err) {
            caught = err;
        }
        assert.ok(caught);
        assert.strictEqual(caught.message, "Please initialize the MultiFactorAuth recipe to use TOTP.");
    });
});
