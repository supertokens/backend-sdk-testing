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
const { recipesMock, randomString, API_PORT, queryAPI } = require("../../api-mock");
const { OAuth2Client, supertokens: SuperTokens } = recipesMock;

describe(`OAuth2Client-Config: ${printPath("[test/oauth2client/oauth2client.config.test.js]")}`, function () {
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

    it("test missing compulsory configs throws an error", async function () {
        const connectionURI = await startST();

        const apiDomain = `http://localhost:${API_PORT}`;
        const websiteDomain = "http://supertokens.io";

        const initParams = {
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain,
                appName: "SuperTokens",
                websiteDomain,
            },
        };

        // Missing providerConfig
        {
            try {
                SuperTokens.init({
                    ...initParams,
                    recipeList: [OAuth2Client.init()],
                });

                // Call queryAPI to init the SuperTokens instance
                await queryAPI({ path: "/test" });
                assert(false);
            } catch (err) {
                if (err.message !== "Please pass providerConfig argument in the OAuth2Client recipe.") {
                    throw err;
                }
            }
        }

        // Missing clientId
        {
            try {
                SuperTokens.init({
                    ...initParams,
                    recipeList: [
                        OAuth2Client.init({
                            providerConfig: {},
                        }),
                    ],
                });

                // Call queryAPI to init the SuperTokens instance
                await queryAPI({ path: "/test" });
                assert(false);
            } catch (err) {
                if (err.message !== "Please pass clientId argument in the OAuth2Client providerConfig.") {
                    throw err;
                }
            }
        }

        // Missing providerConfig
        {
            try {
                SuperTokens.init({
                    ...initParams,
                    recipeList: [
                        OAuth2Client.init({
                            providerConfig: {
                                clientId: "client_id",
                            },
                        }),
                    ],
                });

                // Call queryAPI to init the SuperTokens instance
                await queryAPI({ path: "/test" });
                assert(false);
            } catch (err) {
                if (err.message !== "Please pass clientSecret argument in the OAuth2Client providerConfig.") {
                    throw err;
                }
            }
        }
    });
});
