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
const { recipesMock, randomString, API_PORT, request } = require("../../api-mock");
const { OAuth2Provider, OAuth2Client, EmailPassword, Session, supertokens: SuperTokens } = recipesMock;
const { testOAuthFlowAndGetAuthCode, createAuthorizationUrl } = require("../oauth2provider/utils");

describe(`OAuth2Client-API: ${printPath("[test/oauth2client/oauth2client.api.test.js]")}`, function () {
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

    // TODO: Remove this once we've stopped calling Hydra directly from
    // the SDK and found an alternate way to clear clients before each test run.
    beforeEach(async function () {
        const allClients = await fetch(`http://localhost:4445/admin/clients`).then((res) => res.json());

        const deleteClientPromies = await allClients.map((client) => {
            return fetch(`http://localhost:4445/admin/clients/${client.client_id}`, {
                method: "DELETE",
            });
        });

        await Promise.all(deleteClientPromies);
    });

    it("should successfully signin", async function () {
        const connectionURI = await startST();

        const apiDomain = `http://localhost:${API_PORT}`;
        const websiteDomain = "http://supertokens.io";
        const redirectUri = "http://localhost:4000/redirect-url";
        const scope = "profile openid";

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

        SuperTokens.init({
            ...initParams,
            recipeList: [OAuth2Provider.init()],
        });

        const { client } = await OAuth2Provider.createOAuth2Client(
            {
                redirectUris: [redirectUri],
                scope: scope,
                skipConsent: true,
                grantTypes: ["authorization_code", "refresh_token"],
                responseTypes: ["code", "id_token"],
                tokenEndpointAuthMethod: "client_secret_post",
            },
            {}
        );

        SuperTokens.init({
            ...initParams,
            recipeList: [
                OAuth2Provider.init(),
                OAuth2Client.init({
                    providerConfig: {
                        clientId: client.clientId,
                        clientSecret: client.clientSecret,
                        oidcDiscoveryEndpoint: `${apiDomain}/auth/.well-known/openid-configuration`,
                    },
                }),
                Session.init(),
                EmailPassword.init(),
            ],
        });

        const state = Buffer.from("some-random-string").toString("base64");

        const authorisationUrl = createAuthorizationUrl({
            apiDomain,
            clientId: client.clientId,
            redirectUri,
            state,
            scope,
        });

        const { authorizationCode, userId } = await testOAuthFlowAndGetAuthCode({
            apiDomain,
            websiteDomain,
            authorisationUrl,
            clientId: client.clientId,
            redirectUri,
            scope,
            state,
        });

        let signInRes = await new Promise((resolve) =>
            request()
                .post("/auth/oauth/client/signin")
                .send({
                    redirectURIInfo: {
                        redirectURI: redirectUri,
                        redirectURIQueryParams: {
                            code: authorizationCode,
                        },
                    },
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

        assert.strictEqual(signInRes.body.status, "OK");
        assert.strictEqual(signInRes.body.user.id, userId);

        assert(signInRes.headers["front-token"] !== undefined);
        assert(signInRes.headers["st-access-token"] !== undefined);
        assert(signInRes.headers["st-refresh-token"] !== undefined);
    });
});
