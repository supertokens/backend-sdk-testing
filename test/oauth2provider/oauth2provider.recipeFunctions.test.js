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
const { OAuth2Provider, supertokens: SuperTokens } = recipesMock;

describe(`OAuth2Provider-recipeFunctions: ${printPath("[test/oauth2provider/OAuth2Provider.recipeFunctions.test.js]")}`, function () {
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
                client_id: "client_id",
                client_secret: "client_secret",
            },
            {}
        );

        assert.strictEqual(client.clientId, "client_id");
        assert.strictEqual(client.clientSecret, "client_secret");
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

        const { error } = await OAuth2Provider.createOAuth2Client(
            {
                client_id: "client_id",
                client_secret: "client_secret",
                redirect_uris: ["http://localhost:3000/#fragment"],
            },
            {}
        );

        assert.strictEqual(error, "invalid_redirect_uri");
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
                client_id: "client_id",
                client_secret: "client_secret",
                scope: "offline_access offline",
                redirectUris: ["http://localhost:3000"],
            },
            {}
        );

        assert.strictEqual(client.clientId, "client_id");
        assert.strictEqual(client.clientSecret, "client_secret");
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
        const { client } = await OAuth2Provider.createOAuth2Client(
            {
                client_id: "client_id",
                client_secret: "client_secret",
            },
            {}
        );

        assert.strictEqual(client.clientId, "client_id");
        assert.strictEqual(client.clientSecret, "client_secret");

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

        // Create 10 clients
        for (let i = 0; i < 10; i++) {
            await OAuth2Provider.createOAuth2Client(
                {
                    client_id: `client_id_${i}`,
                },
                {}
            );
        }

        let allClients = [];
        let nextPaginationToken = undefined;

        // Fetch clients in pages of 3
        do {
            const result = await OAuth2Provider.getOAuth2Clients({ pageSize: 3, paginationToken: nextPaginationToken }, {});
            assert.strictEqual(result.status, "OK");
            nextPaginationToken = result.nextPaginationToken;
            allClients.push(...result.clients);
        } while (nextPaginationToken);

        // Check the client IDs
        for (let i = 0; i < 10; i++) {
            assert.strictEqual(allClients[i].clientId, `client_id_${i}`);
        }
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

        // Create 5 clients with owner = "test"
        for (let i = 0; i < 5; i++) {
            await OAuth2Provider.createOAuth2Client({ owner: "test" }, {});
        }

        let result = await OAuth2Provider.getOAuth2Clients({ clientName: "customClientName" }, {});
        assert.strictEqual(result.status, "OK");
        assert.strictEqual(result.clients.length, 5);

        result = await OAuth2Provider.getOAuth2Clients({ owner: "test" }, {});
        assert.strictEqual(result.status, "OK");
        assert.strictEqual(result.clients.length, 5);
    });
});
