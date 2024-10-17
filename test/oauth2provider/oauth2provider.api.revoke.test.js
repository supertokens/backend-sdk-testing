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
const { OAuth2Provider, EmailPassword, Session, supertokens: SuperTokens } = recipesMock;
const { createAuthorizationUrl, testOAuthFlowAndGetAuthCode } = require("./utils");

describe(`OAuth2Provider-API: ${printPath("[test/oauth2provider/oauth2provider.api.test.js]")}`, function () {
    let globalConnectionURI;

    const startST = async (cfg) => {
        return createTenant(globalConnectionURI, randomString(), cfg);
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

    it("should revoke previously issued access tokens when revoking a refresh token with enableRefreshTokenRotation", async function () {
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
                enableRefreshTokenRotation: true,
            },
            {}
        );

        const state = new Buffer.from("some-random-string", "base64").toString();

        const authorisationUrl = createAuthorizationUrl({
            apiDomain,
            clientId: client.clientId,
            redirectUri,
            state,
            scope,
        });

        const { authorizationCode } = await testOAuthFlowAndGetAuthCode({
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

        await new Promise((resolve) => setTimeout(resolve, 1000));

        assert.strictEqual(res.status, 200);
        assert(tokenResp.access_token !== undefined);
        assert(tokenResp.refresh_token !== undefined);
        assert(tokenResp.id_token !== undefined);
        assert.strictEqual(tokenResp.token_type, "bearer");
        assert.strictEqual(tokenResp.scope, scope);

        let refreshTokenRes = await fetch(`${apiDomain}/auth/oauth/token`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                client_id: client.clientId,
                client_secret: client.clientSecret,
                refresh_token: tokenResp.refresh_token,
                grant_type: "refresh_token",
            }),
        });

        refreshTokenRes = await refreshTokenRes.json();

        assert(refreshTokenRes.access_token !== undefined);
        assert(refreshTokenRes.refresh_token !== undefined);
        assert(refreshTokenRes.id_token !== undefined);
        assert.strictEqual(refreshTokenRes.token_type, "bearer");
        assert.strictEqual(refreshTokenRes.scope, scope);


        assert.strictEqual(await isTokenRevoked(apiDomain, refreshTokenRes.refresh_token), false);
        assert.strictEqual(await isTokenRevoked(apiDomain, refreshTokenRes.access_token), false);
        assert.strictEqual(await isTokenRevoked(apiDomain, tokenResp.access_token), false);
        assert.strictEqual(await isTokenRevoked(apiDomain, tokenResp.refresh_token), true);

        let revokeRes = await fetch(`${apiDomain}/auth/oauth/revoke`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                client_id: client.clientId,
                client_secret: client.clientSecret,
                token: refreshTokenRes.refresh_token,
                token_type_hint: "refresh_token",
            }),
        });

        assert.strictEqual(revokeRes.status, 200);
        revokeRes = await revokeRes.json();

        assert.strictEqual(await isTokenRevoked(apiDomain, refreshTokenRes.refresh_token), true);
        assert.strictEqual(await isTokenRevoked(apiDomain, refreshTokenRes.access_token), true);
        assert.strictEqual(await isTokenRevoked(apiDomain, tokenResp.refresh_token), true);
        assert.strictEqual(await isTokenRevoked(apiDomain, tokenResp.access_token), true);
    });

    it("should revoke previously issued access tokens when revoking a refresh token without enableRefreshTokenRotation", async function () {
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

        const state = new Buffer.from("some-random-string", "base64").toString();

        const authorisationUrl = createAuthorizationUrl({
            apiDomain,
            clientId: client.clientId,
            redirectUri,
            state,
            scope,
        });

        const { authorizationCode } = await testOAuthFlowAndGetAuthCode({
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

        await new Promise((resolve) => setTimeout(resolve, 1000));

        assert.strictEqual(res.status, 200);
        assert(tokenResp.access_token !== undefined);
        assert(tokenResp.refresh_token !== undefined);
        assert(tokenResp.id_token !== undefined);
        assert.strictEqual(tokenResp.token_type, "bearer");
        assert.strictEqual(tokenResp.scope, scope);

        let refreshTokenRes = await fetch(`${apiDomain}/auth/oauth/token`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                client_id: client.clientId,
                client_secret: client.clientSecret,
                refresh_token: tokenResp.refresh_token,
                grant_type: "refresh_token",
            }),
        });

        refreshTokenRes = await refreshTokenRes.json();

        assert(refreshTokenRes.access_token !== undefined);
        assert(refreshTokenRes.refresh_token === undefined);
        assert(refreshTokenRes.id_token !== undefined);
        assert.strictEqual(refreshTokenRes.token_type, "bearer");
        assert.strictEqual(refreshTokenRes.scope, scope);


        assert.strictEqual(await isTokenRevoked(apiDomain, refreshTokenRes.access_token), false);
        assert.strictEqual(await isTokenRevoked(apiDomain, tokenResp.access_token), false);
        assert.strictEqual(await isTokenRevoked(apiDomain, tokenResp.refresh_token), false);

        let revokeRes = await fetch(`${apiDomain}/auth/oauth/revoke`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                client_id: client.clientId,
                client_secret: client.clientSecret,
                token: tokenResp.refresh_token,
                token_type_hint: "refresh_token",
            }),
        });

        assert.strictEqual(revokeRes.status, 200);
        revokeRes = await revokeRes.json();

        assert.strictEqual(await isTokenRevoked(apiDomain, refreshTokenRes.access_token), true);
        assert.strictEqual(await isTokenRevoked(apiDomain, tokenResp.refresh_token), true);
        assert.strictEqual(await isTokenRevoked(apiDomain, tokenResp.access_token), true);
    });
});

async function isTokenRevoked(apiDomain, token) {
    const response = await fetch(`${apiDomain}/auth/oauth/introspect`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            token: token,
        }),
    });

    if (response.status !== 200) {
        throw new Error(`Failed to introspect token: ${response.status}`);
    }

    const result = await response.json();
    return !result.active;
}
