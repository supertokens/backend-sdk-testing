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
const { default: generatePKCEChallenge } = require("pkce-challenge");

describe(`OAuth2Provider-API: ${printPath("[test/oauth2provider/OAuth2Provider.api.test.js]")}`, function () {
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

    it("should simulate a successful OAuth2 login flow", async function () {
        const connectionURI = await startST();

        const apiDomain = `http://localhost:${API_PORT}`;
        const websiteDomain = "http://supertokens.io";
        const scope = "profile";

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

        assert.strictEqual(res.status, 200);
        assert(tokenResp.access_token !== undefined);
        assert.strictEqual(tokenResp.token_type, "bearer");
        assert.strictEqual(tokenResp.scope, scope);
    });

    it("should simulate a successful OAuth2 login flow (openid, offline_access)", async function () {
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
    });

    it("should simulate a successful OAuth2 login flow with PKCE", async function () {
        const connectionURI = await startST();

        const apiDomain = `http://localhost:${API_PORT}`;
        const websiteDomain = "http://supertokens.io";
        const scope = "profile";

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

        const { code_challenge, code_verifier } = generatePKCEChallenge(64); // According to https://www.rfc-editor.org/rfc/rfc7636, length must be between 43 and 128

        const authorisationUrl = createAuthorizationUrl({
            apiDomain,
            clientId: client.clientId,
            redirectUri,
            state,
            scope,
            extraQueryParams: {
                code_challenge,
                code_challenge_method: "S256",
            },
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
                code_verifier,
                redirect_uri: redirectUri,
            }),
        });
        const tokenResp = await res.json();

        assert.strictEqual(res.status, 200);
        assert(tokenResp.access_token !== undefined);
        assert.strictEqual(tokenResp.token_type, "bearer");
        assert.strictEqual(tokenResp.scope, scope);
    });

    it("should simulate a successful OAuth2 login flow (client_credentials)", async function () {
        const connectionURI = await startST();

        const apiDomain = `http://localhost:${API_PORT}`;
        const websiteDomain = "http://supertokens.io";
        const scope = "profile";

        SuperTokens.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain,
                appName: "SuperTokens",
                websiteDomain,
            },
            recipeList: [OAuth2Provider.init()],
        });

        const redirectUri = "http://localhost:4000/redirect-url";
        const { client } = await OAuth2Provider.createOAuth2Client(
            {
                redirectUris: [redirectUri],
                scope,
                skipConsent: true,
                grantTypes: ["client_credentials"],
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
                scope,
            }),
        });

        const tokenResp = await res.json();

        assert.strictEqual(res.status, 200);
        assert(tokenResp.access_token !== undefined);
        assert.strictEqual(tokenResp.token_type, "bearer");
        assert.strictEqual(tokenResp.scope, scope);
    });

    it("should return an error for Resource Owner Password Credentials Flow", async function () {
        const connectionURI = await startST();

        const apiDomain = `http://localhost:${API_PORT}`;
        const websiteDomain = "http://supertokens.io";
        const scope = "profile";

        SuperTokens.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain,
                appName: "SuperTokens",
                websiteDomain,
            },
            recipeList: [EmailPassword.init(), OAuth2Provider.init()],
        });

        const redirectUri = "http://localhost:4000/redirect-url";
        const { client } = await OAuth2Provider.createOAuth2Client(
            {
                redirectUris: [redirectUri],
                scope,
                skipConsent: true,
                grantTypes: ["password"],
                responseTypes: ["code", "id_token"],
                tokenEndpointAuthMethod: "client_secret_post",
            },
            {}
        );

        const { status } = await EmailPassword.signUp("public", "test@example.com", "password123");

        assert.strictEqual(status, "OK");

        const res = await fetch(`${apiDomain}/auth/oauth/token`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                client_id: client.clientId,
                client_secret: client.clientSecret,
                grant_type: "password",
                username: "test@example.com",
                password: "password123",
                scope,
            }),
        });

        const tokenResp = await res.json();

        assert.strictEqual(res.status, 200);
        assert.strictEqual(tokenResp.error, "invalid_request");
    });

    it("should preserve query params in the redirect URI after a successful OAuth flow", async function () {
        const connectionURI = await startST();

        const apiDomain = `http://localhost:${API_PORT}`;
        const websiteDomain = "http://supertokens.io";
        const scope = "profile";

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

        // NOTE: Url fragments are not allowed in redirect URIs as per https://datatracker.ietf.org/doc/html/rfc6749#section-3.1.2
        const redirectUri = "http://localhost:4000/redirect-url?foo=bar&baz=qux";
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

        assert.strictEqual(res.status, 200);
        assert(tokenResp.access_token !== undefined);
        assert.strictEqual(tokenResp.token_type, "bearer");
        assert.strictEqual(tokenResp.scope, scope);
    });

    it("should throw an error if state is not passed in the OAuth flow", async function () {
        const connectionURI = await startST();

        const apiDomain = `http://localhost:${API_PORT}`;
        const websiteDomain = "http://supertokens.io";
        const scope = "profile";

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

        const state = undefined;

        const authorisationUrl = createAuthorizationUrl({
            apiDomain,
            clientId: client.clientId,
            redirectUri,
            state,
            scope,
        });

        const res = await fetch(authorisationUrl, { method: "GET", redirect: "manual" });

        const nextUrl = res.headers.get("Location");
        nextUrlObj = new URL(nextUrl);

        const error = nextUrlObj.searchParams.get("error");
        const errorDescription = nextUrlObj.searchParams.get("error_description");

        assert.strictEqual(error, "invalid_state");
        assert.strictEqual(errorDescription, "The state is missing or does not have enough characters and is therefore considered too weak. Request parameter 'state' must be at least be 8 characters long to ensure sufficient entropy.");
    });

    it("should simulate a successful OAuth2 login flow (id_token only implicit flow)", async function () {
        const connectionURI = await startST();

        const apiDomain = `http://localhost:${API_PORT}`;
        const websiteDomain = "http://supertokens.io";
        const scope = "openid";

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

        const redirectUri = "http://localhost:4000/redirect-url?foo=bar&baz";
        const { client } = await OAuth2Provider.createOAuth2Client(
            {
                redirectUris: [redirectUri],
                scope,
                skipConsent: true,
                grantTypes: ["implicit"],
                responseTypes: ["id_token"],
                tokenEndpointAuthMethod: "client_secret_post",
            },
            {}
        );

        const state = new Buffer.from("some-random-string", "base64").toString();
        const nonce = "random-nonce";

        const authorisationUrl = createAuthorizationUrl({
            apiDomain,
            clientId: client.clientId,
            redirectUri,
            state,
            scope,
            responseType: "id_token",
            extraQueryParams: {
                nonce,
            },
        });

        const { idToken, userId } = await testOAuthFlowAndGetAuthCode({
            apiDomain,
            websiteDomain,
            authorisationUrl,
            clientId: client.clientId,
            redirectUri,
            scope,
            state,
            responseType: "id_token",
        });

        const decodedToken = JSON.parse(atob(idToken.split(".")[1]));

        assert.strictEqual(decodedToken.nonce, nonce);
        assert.strictEqual(decodedToken.sub, userId);
    });
});
