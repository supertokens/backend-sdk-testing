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
const { recipesMock, randomString, API_PORT } = require("../../api-mock");
const { createAuthorizationUrl, testOAuthFlowAndGetAuthCode } = require("./utils");
const { OAuth2Provider, EmailPassword, Session, supertokens: SuperTokens } = recipesMock;

describe(`OAuth2Provider-recipeFunctions: ${printPath(
    "[test/oauth2provider/OAuth2Provider.recipeFunctions.test.js]"
)}`, function () {
    let globalConnectionURI;

    const startST = async () => {
        return createTenant(globalConnectionURI, randomString());
    };

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

    before(async function () {
        await killAllST();
        await setupST();
        globalConnectionURI = await globalStartST();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    it("should create an OAuth2Client instance with empty input", async function () {
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
            recipeList: [OAuth2Provider.init()],
        });

        const { client } = await OAuth2Provider.createOAuth2Client({}, {});

        assert(client.clientId !== undefined);
        assert(client.clientSecret !== undefined);
        assert.strictEqual(client.scope, "offline_access offline openid");
    });

    it("should create an OAuth2Client instance with custom input", async function () {
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
            recipeList: [OAuth2Provider.init()],
        });

        const { client } = await OAuth2Provider.createOAuth2Client(
            {
                audience: ["storageAPI", "calendarAPI"],
            },
            {}
        );

        assert.deepStrictEqual(client.audience, ["storageAPI", "calendarAPI"]);
    });

    it("should not allow creating a client with a redirect URI containing a URL fragment", async function () {
        // NOTE: Url fragments are not allowed in redirect URIs as per https://datatracker.ietf.org/doc/html/rfc6749#section-3.1.2
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
            recipeList: [OAuth2Provider.init()],
        });

        const resp = await OAuth2Provider.createOAuth2Client(
            {
                redirectUris: ["http://localhost:3000/redirect-url#asdf"],
            }
        );

        assert.strictEqual(resp.client.redirectUris, null);
    });

    it("should update the OAuth2Client", async function () {
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
            recipeList: [OAuth2Provider.init()],
        });

        // Create a client
        const { client } = await OAuth2Provider.createOAuth2Client(
            {
                scope: "offline_access offline",
                redirectUris: ["http://localhost:3000"],
            },
            {}
        );

        assert.strictEqual(client.scope, "offline_access offline");
        assert.strictEqual(JSON.stringify(client.redirectUris), JSON.stringify(["http://localhost:3000"]));
        assert.strictEqual(JSON.stringify(client.metadata), JSON.stringify({}));

        // Update the client
        const { client: updatedClient } = await OAuth2Provider.updateOAuth2Client(
            {
                clientId: client.clientId,
                clientSecret: "new_client_secret",
                scope: "offline_access",
                redirectUris: null,
                metadata: { a: 1, b: 2 },
            },
            {}
        );

        assert.strictEqual(updatedClient.clientSecret, "new_client_secret");
        assert.strictEqual(updatedClient.scope, "offline_access");
        assert.strictEqual(updatedClient.redirectUris, null);
        assert.strictEqual(JSON.stringify(updatedClient.metadata), JSON.stringify({ a: 1, b: 2 }));
    });

    it("should delete the OAuth2Client", async function () {
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
            recipeList: [OAuth2Provider.init()],
        });

        // Create a client
        const { client } = await OAuth2Provider.createOAuth2Client();

        // Delete the client
        const { status } = await OAuth2Provider.deleteOAuth2Client(
            {
                clientId: client.clientId,
            },
            {}
        );

        assert.strictEqual(status, "OK");
    });

    it("should get OAuth2Clients with pagination", async function () {
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
            recipeList: [OAuth2Provider.init()],
        });

        let clientIds = [];
        // Create 10 clients
        for (let i = 0; i < 10; i++) {
            const { client } = await OAuth2Provider.createOAuth2Client();
            clientIds.push(client.clientId);
        }

        let allClients = [];
        let nextPaginationToken = undefined;

        // Fetch clients in pages of 3
        do {
            const result = await OAuth2Provider.getOAuth2Clients(
                { pageSize: 3, paginationToken: nextPaginationToken },
                {}
            );
            assert.strictEqual(result.status, "OK");
            assert.strictEqual(result.clients.length, Math.min(3, 10 - allClients.length));
            nextPaginationToken = result.nextPaginationToken;
            allClients.push(...result.clients);
        } while (nextPaginationToken);

        // Check the client IDs
        assert.deepStrictEqual(new Set(allClients.map((client) => client.clientId)), new Set(clientIds));
    });

    it("should get OAuth2Clients with filter", async function () {
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
            recipeList: [OAuth2Provider.init()],
        });

        // Create 5 clients with clientName = "customClientName"
        for (let i = 0; i < 5; i++) {
            await OAuth2Provider.createOAuth2Client({ clientName: "customClientName" }, {});
        }

        // Create 5 clients without the above prop
        for (let i = 0; i < 5; i++) {
            await OAuth2Provider.createOAuth2Client();
        }

        let result = await OAuth2Provider.getOAuth2Clients();
        assert.strictEqual(result.status, "OK");
        assert.strictEqual(result.clients.length, 10);

        result = await OAuth2Provider.getOAuth2Clients({ clientName: "customClientName" }, {});
        assert.strictEqual(result.status, "OK");
        assert.strictEqual(result.clients.length, 5);

    });

    describe("validateAccessToken", function () {
        it("should validate tokens from a successful OAuth2 login flow (openid, offline_access)", async function () {
            const connectionURI = await startST();

            const apiDomain = `http://localhost:${API_PORT}`;
            const websiteDomain = "http://supertokens.io";
            const scope = "profile offline_access openid";

            SuperTokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain,
                    appName: "SuperTokens",
                    websiteDomain,
                },
                recipeList: [EmailPassword.init(), OAuth2Provider.init(), Session.init()],
            });

            const redirectUri = "http://localhost:4000/redirect-url";
            const { client } = await OAuth2Provider.createOAuth2Client(
                {
                    redirectUris: [redirectUri],
                    scope,
                    skipConsent: true,
                    grantTypes: ["authorization_code", "refresh_token"],
                    responseTypes: ["code", "id_token"],
                    tokenEndpointAuthMethod: "client_secret_post",
                },
                {}
            );

            const state = Buffer.from("some-random-string").toString("base64");

            const authorisationUrl = createAuthorizationUrl({
                apiDomain,
                clientId: client.clientId,
                redirectUri,
                state,
                scope,
            });

            const { authorizationCode, sessionId } = await testOAuthFlowAndGetAuthCode({
                apiDomain,
                websiteDomain,
                authorisationUrl,
                clientId: client.clientId,
                redirectUri,
                scope,
                state,
            });

            const res = await fetch(`${apiDomain}/auth/oauth/token`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    code: authorizationCode,
                    client_id: client.clientId,
                    client_secret: client.clientSecret,
                    grant_type: "authorization_code",
                    redirect_uri: redirectUri,
                }),
            });
            const tokenResp = await res.json();

            assert.strictEqual(res.status, 200);
            assert(tokenResp.access_token !== undefined);

            const { payload, status } = await OAuth2Provider.validateOAuth2AccessToken(tokenResp.access_token, {
                clientId: client.clientId,
                scopes: scope.split(" "),
            });
            assert.strictEqual(status, "OK");
            assert.strictEqual(payload.client_id, client.clientId);
            assert.strictEqual(payload.sessionHandle, sessionId);
            assert.strictEqual(payload.scp.length, 3);
            assert.strictEqual(payload.scp[0], "profile");
            assert.strictEqual(payload.scp[1], "offline_access");
            assert.strictEqual(payload.scp[2], "openid");
        });

        it("should validate tokens from a successful OAuth2 login flow (client credentials)", async function () {
            const connectionURI = await startST();

            const apiDomain = `http://localhost:${API_PORT}`;
            const websiteDomain = "http://supertokens.io";
            const scope = "profile offline_access openid";

            SuperTokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain,
                    appName: "SuperTokens",
                    websiteDomain,
                },
                recipeList: [EmailPassword.init(), OAuth2Provider.init(), Session.init()],
            });

            const redirectUri = "http://localhost:4000/redirect-url";
            const { client } = await OAuth2Provider.createOAuth2Client(
                {
                    redirectUris: [redirectUri],
                    audience: ["storageAPI", "calendarAPI"],
                    scope,
                    skipConsent: true,
                    grantTypes: ["authorization_code", "refresh_token", "client_credentials"],
                    responseTypes: ["code", "id_token"],
                    tokenEndpointAuthMethod: "client_secret_post",
                },
                {}
            );

            const res = await fetch(`${apiDomain}/auth/oauth/token`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    client_id: client.clientId,
                    client_secret: client.clientSecret,
                    grant_type: "client_credentials",
                    audience: "storageAPI",
                    scope,
                }),
            });

            const tokenResp = await res.json();

            assert.strictEqual(res.status, 200);
            assert(tokenResp.access_token !== undefined);

            const { payload, status } = await OAuth2Provider.validateOAuth2AccessToken(tokenResp.access_token, {
                clientId: client.clientId,
                scopes: scope.split(" "),
            });
            assert.strictEqual(status, "OK");
            assert.strictEqual(payload.client_id, client.clientId);
            assert.strictEqual(payload.scp.length, 3);
            assert.strictEqual(payload.scp[0], "profile");
            assert.strictEqual(payload.scp[1], "offline_access");
            assert.strictEqual(payload.scp[2], "openid");
        });

        it("should validate tokens from a successful OAuth2 login flow (client credentials)", async function () {
            const connectionURI = await startST();

            const apiDomain = `http://localhost:${API_PORT}`;
            const websiteDomain = "http://supertokens.io";
            const scope = "profile offline_access openid";

            SuperTokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain,
                    appName: "SuperTokens",
                    websiteDomain,
                },
                recipeList: [EmailPassword.init(), OAuth2Provider.init(), Session.init()],
            });

            const redirectUri = "http://localhost:4000/redirect-url";
            const { client } = await OAuth2Provider.createOAuth2Client(
                {
                    redirectUris: [redirectUri],
                    audience: ["storageAPI", "calendarAPI"],
                    scope,
                    skipConsent: true,
                    grantTypes: ["authorization_code", "refresh_token", "client_credentials"],
                    responseTypes: ["code", "id_token"],
                    tokenEndpointAuthMethod: "client_secret_post",
                },
                {}
            );

            const res = await fetch(`${apiDomain}/auth/oauth/token`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    client_id: client.clientId,
                    client_secret: client.clientSecret,
                    grant_type: "client_credentials",
                    audience: "storageAPI",
                    scope,
                }),
            });

            const tokenResp = await res.json();

            assert.strictEqual(res.status, 200);
            assert(tokenResp.access_token !== undefined);

            const { payload, status } = await OAuth2Provider.validateOAuth2AccessToken(tokenResp.access_token, {
                clientId: client.clientId,
                scopes: scope.split(" "),
            });
            assert.strictEqual(status, "OK");
            assert.strictEqual(payload.client_id, client.clientId);
            assert.strictEqual(payload.scp.length, 3);
            assert.strictEqual(payload.scp[0], "profile");
            assert.strictEqual(payload.scp[1], "offline_access");
            assert.strictEqual(payload.scp[2], "openid");
        });

        it("should validate tokens from a successful createTokenForClientCredentials call", async function () {
            const connectionURI = await startST();

            const apiDomain = `http://localhost:${API_PORT}`;
            const websiteDomain = "http://supertokens.io";
            const scope = "profile offline_access openid";

            SuperTokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain,
                    appName: "SuperTokens",
                    websiteDomain,
                },
                recipeList: [EmailPassword.init(), OAuth2Provider.init(), Session.init()],
            });

            const redirectUri = "http://localhost:4000/redirect-url";
            const { client } = await OAuth2Provider.createOAuth2Client(
                {
                    redirectUris: [redirectUri],
                    audience: ["storageAPI", "calendarAPI"],
                    scope,
                    skipConsent: true,
                    grantTypes: ["authorization_code", "refresh_token", "client_credentials"],
                    responseTypes: ["code", "id_token"],
                    tokenEndpointAuthMethod: "client_secret_post",
                },
                {}
            );

            const tokenResp = await OAuth2Provider.createTokenForClientCredentials(
                client.clientId,
                client.clientSecret,
                scope.split(" "),
                "storageAPI",
                {}
            );

            assert(tokenResp.access_token !== undefined);

            const { payload, status } = await OAuth2Provider.validateOAuth2AccessToken(tokenResp.access_token, {
                clientId: client.clientId,
                audience: "storageAPI",
                scopes: scope.split(" "),
            });
            assert.strictEqual(status, "OK");
            assert.strictEqual(payload.client_id, client.clientId);
            assert.strictEqual(payload.scp.length, 3);
            assert.strictEqual(payload.scp[0], "profile");
            assert.strictEqual(payload.scp[1], "offline_access");
            assert.strictEqual(payload.scp[2], "openid");
        });

        it("should validate tokens with checkDatabase true from a successful createTokenForClientCredentials call", async function () {
            const connectionURI = await startST();

            const apiDomain = `http://localhost:${API_PORT}`;
            const websiteDomain = "http://supertokens.io";
            const scope = "profile offline_access openid";

            SuperTokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain,
                    appName: "SuperTokens",
                    websiteDomain,
                },
                recipeList: [EmailPassword.init(), OAuth2Provider.init(), Session.init()],
            });

            const redirectUri = "http://localhost:4000/redirect-url";
            const { client } = await OAuth2Provider.createOAuth2Client(
                {
                    redirectUris: [redirectUri],
                    audience: ["storageAPI", "calendarAPI"],
                    scope,
                    skipConsent: true,
                    grantTypes: ["authorization_code", "refresh_token", "client_credentials"],
                    responseTypes: ["code", "id_token"],
                    tokenEndpointAuthMethod: "client_secret_post",
                },
                {}
            );

            const tokenResp = await OAuth2Provider.createTokenForClientCredentials(
                client.clientId,
                client.clientSecret,
                scope.split(" "),
                "storageAPI",
                {}
            );

            assert(tokenResp.access_token !== undefined);

            const { payload, status } = await OAuth2Provider.validateOAuth2AccessToken(
                tokenResp.access_token,
                {
                    clientId: client.clientId,
                    audience: "storageAPI",
                    scopes: scope.split(" "),
                },
                true
            );

            assert.strictEqual(status, "OK");
            assert.strictEqual(payload.client_id, client.clientId);
            assert.strictEqual(payload.scp.length, 3);
            assert.strictEqual(payload.scp[0], "profile");
            assert.strictEqual(payload.scp[1], "offline_access");
            assert.strictEqual(payload.scp[2], "openid");
        });
    });
});
