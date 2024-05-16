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
const {
    printPath,
    setupST,
    startST,
    stopST,
    killAllST,
    cleanST,
    resetAll,
    signUPRequest,
    extractInfoFromResponse,
} = require("../utils");
let STExpress = require("supertokens-node/");
let Session = require("supertokens-node/recipe/session");
let SessionRecipe = require("supertokens-node/lib/build/recipe/session/recipe").default;
let assert = require("assert");
let { ProcessState } = require("supertokens-node/lib/build/processState");
let { normaliseURLPathOrThrowError } = require("supertokens-node/lib/build/normalisedURLPath");
let { normaliseURLDomainOrThrowError } = require("supertokens-node/lib/build/normalisedURLDomain");
let { normaliseSessionScopeOrThrowError } = require("supertokens-node/lib/build/recipe/session/utils");
const { Querier } = require("supertokens-node/lib/build/querier");
let EmailPassword = require("supertokens-node/recipe/emailpassword");
let EmailPasswordRecipe = require("supertokens-node/lib/build/recipe/emailpassword/recipe").default;
let utils = require("supertokens-node/lib/build/recipe/emailpassword/utils");
const express = require("express");
const request = require("supertest");
const { default: NormalisedURLPath } = require("supertokens-node/lib/build/normalisedURLPath");
let { middleware, errorHandler } = require("supertokens-node/framework/express");
let { maxVersion } = require("supertokens-node/lib/build/utils");

describe(`deleteUser: ${printPath("[test/emailpassword/deleteUser.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("test deleteUser", async function () {
        const connectionURI = await startST();

        STExpress.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [EmailPassword.init(), Session.init({ getTokenTransferMethod: () => "cookie" })],
        });

        let querier = Querier.getNewInstanceOrThrowError(undefined);
        let cdiVersion = await querier.getAPIVersion();
        if (maxVersion("2.10", cdiVersion) === cdiVersion) {
            let user = await EmailPassword.signUp("public", "test@example.com", "1234abcd");

            {
                let response = await STExpress.getUsersOldestFirst({
                    tenantId: "public",
                });
                assert(response.users.length === 1);
            }

            await STExpress.deleteUser(user.user.id);

            {
                let response = await STExpress.getUsersOldestFirst({
                    tenantId: "public",
                });
                assert(response.users.length === 0);
            }
        }
    });
});
