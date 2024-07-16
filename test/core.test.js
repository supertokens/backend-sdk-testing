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
const { printPath, setupST, killAllST, cleanST, startST: globalStartST, createTenant } = require("./utils");
let assert = require("assert");
const { recipesMock, randomString, getOverrideLogs, request } = require("../api-mock");
const { EmailPassword, Session, supertokens } = recipesMock;

describe(`coreTests: ${printPath("[test/core.test.js]")}`, function () {
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

    it("apiversion payload test when calling API", async function () {
        const connectionURI = await startST();

        await supertokens.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                appName: "SuperTokens",
                apiDomain: "api.supertokens.io",
                websiteDomain: "supertokens.io",
            },
            recipeList: [EmailPassword.init(), Session.init()],
        });

        let res = await new Promise((resolve) =>
            request()
                .post("/auth/signup")
                .send({
                    formFields: [
                        {
                            id: "email",
                            value: "test@example.com",
                        },
                        {
                            id: "password",
                            value: "password123!",
                        },
                    ],
                })
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                })
        );
        assert(res !== undefined);

        const logs = await getOverrideLogs();
        let found = false;
        for (const log of logs) {
            if (log.name === "networkInterceptor" && log.type === "RES") {
                if (log.data.url.endsWith("/apiversion")) {
                    found = true;
                    assert(log.data.params.apiDomain === "https://api.supertokens.io");
                    assert(log.data.params.websiteDomain === "https://supertokens.io");
                }
            }
        }

        assert(found);
    });

    it("apiversion payload test when calling recipe function", async function () {
        const connectionURI = await startST();

        await supertokens.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                appName: "SuperTokens",
                apiDomain: "api.supertokens.io",
                websiteDomain: "supertokens.io",
            },
            recipeList: [EmailPassword.init(), Session.init()],
        });

        await EmailPassword.signUp("public", "anotheruser@example.com", "password123");

        const logs = await getOverrideLogs();
        let found = false;
        for (const log of logs) {
            if (log.name === "networkInterceptor" && log.type === "RES") {
                if (log.data.url.endsWith("/apiversion")) {
                    found = true;
                    assert(log.data.params.apiDomain === "https://api.supertokens.io");
                    assert(log.data.params.websiteDomain === "https://supertokens.io");
                }
            }
        }

        assert(found);
    });
});
