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
const { createAuthorizationUrl, testOAuthFlowAndGetAuthCode, getBasicAuthHeader } = require("./utils");
const { OAuth2Provider, EmailPassword, Session, supertokens: SuperTokens } = recipesMock;

describe(`OAuth2Provider-recipeFunctions: ${printPath(
    "[test/oauth2provider/OAuth2Provider.recipeFunctions.test.js]"
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

    it("should allow creating public OAuth2Client", async function () {
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

        const { client } = await OAuth2Provider.createOAuth2Client({
            tokenEndpointAuthMethod: "none",
        });

        assert.ok(client.createdAt);
        assert.ok(client.updatedAt);
        delete client.createdAt;
        delete client.updatedAt;
        assert.ok(client.clientId);
        assert.strictEqual(client.clientSecret, undefined);
        delete client.clientId;
        delete client.clientSecret;
        assert.deepStrictEqual(client, {
            audience: [],
            authorizationCodeGrantAccessTokenLifespan: null,
            authorizationCodeGrantIdTokenLifespan: null,
            authorizationCodeGrantRefreshTokenLifespan: null,
            clientCredentialsGrantAccessTokenLifespan: null,
            clientName: "",
            clientUri: "",
            enableRefreshTokenRotation: false,
            grantTypes: null,
            implicitGrantAccessTokenLifespan: null,
            implicitGrantIdTokenLifespan: null,
            logoUri: "",
            metadata: {},
            policyUri: "",
            redirectUris: null,
            refreshTokenGrantAccessTokenLifespan: null,
            refreshTokenGrantIdTokenLifespan: null,
            refreshTokenGrantRefreshTokenLifespan: null,
            responseTypes: null,
            scope: "offline_access offline openid",
            tokenEndpointAuthMethod: "none",
            tosUri: "",
        });
    });

    it("should default to confidential client", async function () {
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

        const { client } = await OAuth2Provider.createOAuth2Client();

        assert.ok(client.createdAt);
        assert.ok(client.updatedAt);
        delete client.createdAt;
        delete client.updatedAt;
        assert.ok(client.clientId);
        assert.ok(client.clientSecret);
        delete client.clientId;
        delete client.clientSecret;
        assert.deepStrictEqual(client, {
            audience: [],
            authorizationCodeGrantAccessTokenLifespan: null,
            authorizationCodeGrantIdTokenLifespan: null,
            authorizationCodeGrantRefreshTokenLifespan: null,
            clientCredentialsGrantAccessTokenLifespan: null,
            clientName: "",
            clientUri: "",
            enableRefreshTokenRotation: false,
            grantTypes: null,
            implicitGrantAccessTokenLifespan: null,
            implicitGrantIdTokenLifespan: null,
            logoUri: "",
            metadata: {},
            policyUri: "",
            redirectUris: null,
            refreshTokenGrantAccessTokenLifespan: null,
            refreshTokenGrantIdTokenLifespan: null,
            refreshTokenGrantRefreshTokenLifespan: null,
            responseTypes: null,
            scope: "offline_access offline openid",
            tokenEndpointAuthMethod: "client_secret_basic",
            tosUri: "",
        });
    });

    it("should allow creating an OAuth2Client instance with query params in the redirect url", async function () {
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

        const { client } = await OAuth2Provider.createOAuth2Client({
            redirectUris: ["http://localhost:3000/redirect-url?asdf=123"],
        });

        assert.deepStrictEqual(client.redirectUris, ["http://localhost:3000/redirect-url?asdf=123"]);
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

        const resp = await OAuth2Provider.createOAuth2Client({
            redirectUris: ["http://localhost:3000/redirect-url#asdf"],
        });

        assert.deepStrictEqual(resp, {
            status: "ERROR",
            error: "invalid_redirect_uri",
            errorDescription:
                "The value of one or more redirect_uris is invalid. Redirect URIs must not contain fragments (#).",
        });
    });
});
