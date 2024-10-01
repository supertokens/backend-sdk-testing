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

const {
    printPath,
    setupST,
    startST: globalStartST,
    killAllST,
    cleanST,
    createTenant,
    extractInfoFromResponse,
} = require("../utils");
let assert = require("assert");
const { recipesMock, randomString, API_PORT, request } = require("../../api-mock");
const { OAuth2Provider, EmailPassword, Session, supertokens: SuperTokens } = recipesMock;
const {
    createAuthorizationUrl,
    testOAuthFlowAndGetAuthCode,
    validateIdToken,
    createEndSessionUrl,
} = require("./utils");
const { default: generatePKCEChallenge } = require("pkce-challenge");

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

    describe("Login", () => {
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

            const state = Buffer.from("some-random-string").toString("base64");

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

            const state = Buffer.from("some-random-string").toString("base64");

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

            const state = Buffer.from("some-random-string").toString("base64");

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
                recipeList: [Session.init(), OAuth2Provider.init()],
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
                recipeList: [EmailPassword.init(), Session.init(), OAuth2Provider.init()],
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

            assert.strictEqual(res.status, 400);
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

            const state = Buffer.from("some-random-string").toString("base64");

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
            assert.strictEqual(
                errorDescription,
                "The state is missing or does not have enough characters and is therefore considered too weak. Request parameter 'state' must be at least be 8 characters long to ensure sufficient entropy."
            );
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

            const state = Buffer.from("some-random-string").toString("base64");
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

    describe("Logout", () => {
        let connectionURI, apiDomain, websiteDomain, scope, redirectUri, client, state, tokenResp, session;

        beforeEach(async function () {
            connectionURI = await startST();

            apiDomain = `http://localhost:${API_PORT}`;
            websiteDomain = "http://supertokens.io";
            scope = "profile openid";

            SuperTokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain,
                    appName: "SuperTokens",
                    websiteDomain,
                },
                recipeList: [EmailPassword.init(), OAuth2Provider.init(), Session.init({ antiCsrf: "NONE" })],
            });

            redirectUri = "http://localhost:4000/redirect-url";
            postLogoutRedirectUri = "http://localhost:4000/post-logout-redirect-url";
            const createClientResponse = await OAuth2Provider.createOAuth2Client(
                {
                    redirectUris: [redirectUri],
                    scope,
                    grantTypes: ["authorization_code", "refresh_token"],
                    responseTypes: ["code", "id_token"],
                    tokenEndpointAuthMethod: "client_secret_post",
                    postLogoutRedirectUris: [postLogoutRedirectUri],
                },
                {}
            );
            client = createClientResponse.client;

            state = Buffer.from("some-random-string").toString("base64");

            const authorisationUrl = createAuthorizationUrl({
                apiDomain,
                clientId: client.clientId,
                redirectUri,
                state,
                scope,
            });

            const oauthFlowResponse = await testOAuthFlowAndGetAuthCode({
                apiDomain,
                websiteDomain,
                authorisationUrl,
                clientId: client.clientId,
                redirectUri,
                scope,
                state,
            });

            session = oauthFlowResponse.session;

            const res = await fetch(`${apiDomain}/auth/oauth/token`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    code: oauthFlowResponse.authorizationCode,
                    client_id: client.clientId,
                    client_secret: client.clientSecret,
                    grant_type: "authorization_code",
                    redirect_uri: redirectUri,
                }),
            });
            tokenResp = await res.json();

            assert.strictEqual(res.status, 200);
            assert(tokenResp.access_token !== undefined);
            assert(tokenResp.id_token !== undefined);
            assert.strictEqual(tokenResp.token_type, "bearer");
            assert.strictEqual(tokenResp.scope, scope);
        });

        it("should simulate a successful OAuth2 logout flow", async function () {
            const endSessionEndpoint = createEndSessionUrl({
                apiDomain,
                idToken: tokenResp.id_token,
                postLogoutRedirectUri,
                state,
            });

            let logoutRes = await fetch(endSessionEndpoint, {
                method: "GET",
                redirect: "manual",
                headers: {
                    cookie: `sAccessToken=${session.getAccessToken()}`,
                },
            });

            let nextUrl = logoutRes.headers.get("Location");

            const nextUrlObj = new URL(nextUrl);
            const logoutChallenge = nextUrlObj.searchParams.get("logoutChallenge");

            assert.strictEqual(nextUrlObj.origin + nextUrlObj.pathname, `${websiteDomain}/auth/oauth/logout`);
            assert.ok(logoutChallenge !== null);

            // Call the POST logout endpoint after user agrees to logout
            logoutRes = await new Promise((resolve) =>
                request()
                    .post("/auth/oauth/logout")
                    .set("Cookie", ["sAccessToken=" + session.getAccessToken()])
                    .send({ logoutChallenge })
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );
            const cookies = extractInfoFromResponse(logoutRes);

            assert.strictEqual(logoutRes.status, 200);
            assert.strictEqual(logoutRes.body.frontendRedirectTo, `${postLogoutRedirectUri}?state=${state}`);
            assert.strictEqual(cookies.accessToken, "");
            assert.strictEqual(cookies.accessTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
            assert.strictEqual(cookies.frontToken, "remove");
        });

        it("should simulate a successful OAuth2 logout flow (POST request to end_session_endpoint)", async function () {
            let logoutRes = await fetch(`${apiDomain}/auth/oauth/end_session`, {
                method: "POST",
                redirect: "manual",
                headers: {
                    cookie: `sAccessToken=${session.getAccessToken()}`,
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({
                    id_token_hint: tokenResp.id_token,
                    post_logout_redirect_uri: postLogoutRedirectUri,
                    state: state,
                }),
            });

            let nextUrl = logoutRes.headers.get("Location");

            const nextUrlObj = new URL(nextUrl);
            const logoutChallenge = nextUrlObj.searchParams.get("logoutChallenge");

            assert.strictEqual(nextUrlObj.origin + nextUrlObj.pathname, `${websiteDomain}/auth/oauth/logout`);
            assert.ok(logoutChallenge !== null);

            // Call the POST logout endpoint after user agrees to logout
            logoutRes = await new Promise((resolve) =>
                request()
                    .post("/auth/oauth/logout")
                    .set("Cookie", ["sAccessToken=" + session.getAccessToken()])
                    .send({ logoutChallenge })
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );

            const cookies = extractInfoFromResponse(logoutRes);

            assert.strictEqual(logoutRes.status, 200);
            assert.strictEqual(logoutRes.body.frontendRedirectTo, `${postLogoutRedirectUri}?state=${state}`);
            assert.strictEqual(cookies.accessToken, "");
            assert.strictEqual(cookies.accessTokenExpiry, "Thu, 01 Jan 1970 00:00:00 GMT");
            assert.strictEqual(cookies.frontToken, "remove");
        });

        it("should redirect to post_redirect_logout_uri directly if there is no supertokens session", async function () {
            const endSessionEndpoint = createEndSessionUrl({
                apiDomain,
                idToken: tokenResp.id_token,
                postLogoutRedirectUri,
                state,
            });

            let logoutRes = await fetch(endSessionEndpoint, {
                method: "GET",
                redirect: "manual",
            });

            let nextUrl = logoutRes.headers.get("Location");

            assert.strictEqual(nextUrl, `${postLogoutRedirectUri}?state=${state}`);
        });

        it("should redirect to /auth page if no post_redirect_logout_uri is provided", async function () {
            const endSessionEndpoint = createEndSessionUrl({
                apiDomain,
                idToken: tokenResp.id_token,
                state,
            });

            let logoutRes = await fetch(endSessionEndpoint, {
                method: "GET",
                redirect: "manual",
            });

            let nextUrl = logoutRes.headers.get("Location");

            assert.strictEqual(nextUrl, `${websiteDomain}/auth`);
        });

        it("should error out if post_redirect_logout_uri is not included in client.post_logout_redirect_uris", async function () {
            const endSessionEndpoint = createEndSessionUrl({
                apiDomain,
                idToken: tokenResp.id_token,
                postLogoutRedirectUri: "http://localhost:4000/invalid-redirect-uri",
                state,
            });

            let logoutRes = await fetch(endSessionEndpoint, {
                method: "GET",
                redirect: "manual",
            });

            const respBody = await logoutRes.json();

            assert.deepStrictEqual(respBody, {
                error: "invalid_request",
                error_description: "The post_logout_redirect_uri is not valid for this client.",
            });
        });

        it("should throw an error if client_id is different from the one used to issue the id_token", async function () {
            const endSessionEndpoint = createEndSessionUrl({
                apiDomain,
                idToken: tokenResp.id_token,
                clientId: "different-client-id",
                postLogoutRedirectUri,
                state,
            });

            let logoutRes = await fetch(endSessionEndpoint, {
                method: "GET",
                redirect: "manual",
            });

            const resp = await logoutRes.json();

            const error = resp.error;
            const errorDescription = resp.error_description;

            assert.strictEqual(error, "invalid_request");
            assert.strictEqual(
                errorDescription,
                "The client_id in the id_token_hint does not match the client_id in the request."
            );
        });
    });

    it("should simulate a successful OAuth2 login flow (id_token implicit flow)", async function () {
        const connectionURI = await startST();

        const apiDomain = `http://localhost:${API_PORT}`;
        const websiteDomain = "http://supertokens.io";
        const scope = "openid email profile";

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
                responseTypes: ["id_token token", "token"],
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
            responseType: "id_token token",
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

    describe("extra params", () => {
        describe("prompt", function () {
            let connectionURI, apiDomain, websiteDomain, scope, redirectUri, client, state, state2, nonce;

            beforeEach(async function () {
                connectionURI = await startST({ access_token_validity: 2 });

                apiDomain = `http://localhost:${API_PORT}`;
                websiteDomain = "http://supertokens.io";
                scope = "profile openid";

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

                redirectUri = "http://localhost:4000/redirect-url";
                const clientResponse = await OAuth2Provider.createOAuth2Client(
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
                client = clientResponse.client;

                state = Buffer.from("some-random-string").toString("base64");
                state2 = Buffer.from("some-random-string2").toString("base64");
                nonce = "random-nonce";
            });

            describe("prompt=none", function () {
                it("should error if there is no active session", async function () {
                    const authorisationUrl = createAuthorizationUrl({
                        apiDomain,
                        clientId: client.clientId,
                        redirectUri,
                        state,
                        scope,
                        extraQueryParams: {
                            prompt: "none",
                            nonce,
                        },
                    });

                    const { error, errorDescription } = await testOAuthFlowAndGetAuthCode({
                        apiDomain,
                        websiteDomain,
                        authorisationUrl,
                        clientId: client.clientId,
                        redirectUri,
                        scope,
                        state,
                        skipLogin: true,
                        expectError: true,
                    });

                    assert.strictEqual(error, "login_required");
                    assert.ok(errorDescription);
                });

                it("should error if there is a no session with oauth cookies", async function () {
                    const authorisationUrl = createAuthorizationUrl({
                        apiDomain,
                        clientId: client.clientId,
                        redirectUri,
                        state,
                        scope,
                        extraQueryParams: {
                            nonce,
                        },
                    });

                    const { authorizationCode, setCookieHeaders } = await testOAuthFlowAndGetAuthCode({
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
                    assert.strictEqual(res.status, 200);
                    const tokenResp1 = await res.json();

                    const authorisationUrl2 = createAuthorizationUrl({
                        apiDomain,
                        clientId: client.clientId,
                        redirectUri,
                        state: state2,
                        scope,
                        responseType: "code",
                        extraQueryParams: {
                            prompt: "none",
                            nonce,
                        },
                    });

                    const { error, errorDescription } = await testOAuthFlowAndGetAuthCode({
                        apiDomain,
                        websiteDomain,
                        authorisationUrl: authorisationUrl2,
                        clientId: client.clientId,
                        redirectUri,
                        scope,
                        state: state2,
                        prevSetCookieHeaders: setCookieHeaders,
                        skipLogin: true,
                        expectError: true,
                    });

                    assert.strictEqual(error, "login_required");
                    assert.ok(errorDescription);
                });

                it("should work even if there is an expired session", async function () {
                    const authorisationUrl = createAuthorizationUrl({
                        apiDomain,
                        clientId: client.clientId,
                        redirectUri,
                        state,
                        scope,
                        extraQueryParams: {
                            prompt: "none",
                            nonce,
                        },
                    });

                    const createSessionUser = await EmailPassword.signUp("public", "test@example.com", "password123");

                    const session = await Session.createNewSessionWithoutRequestResponse(
                        "public",
                        createSessionUser.recipeUserId
                    );

                    await new Promise((resolve) => setTimeout(resolve, 3000));
                    const { authorizationCode } = await testOAuthFlowAndGetAuthCode({
                        apiDomain,
                        websiteDomain,
                        authorisationUrl,
                        clientId: client.clientId,
                        redirectUri,
                        scope,
                        state,
                        session,
                        skipLogin: true,
                        expectSessionRefresh: true,
                        expectError: false,
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
                    assert.strictEqual(res.status, 200);
                    const tokenResp = await res.json();

                    assert(tokenResp.access_token !== undefined);
                    assert.strictEqual(tokenResp.token_type, "bearer");
                    assert.strictEqual(tokenResp.scope, scope);

                    const { payload, status } = await validateIdToken(tokenResp.id_token, {
                        requiredAudience: client.clientId,
                        requiredScopes: scope.split(" "),
                        requiredClientId: client.clientId,
                    });
                    assert.strictEqual(status, "OK");
                    const accessTokenHash = await crypto.subtle.digest(
                        "SHA-256",
                        new TextEncoder().encode(tokenResp.access_token)
                    );
                    const expectedAtHash = Buffer.from(accessTokenHash.slice(0, 16)).toString("base64url");

                    assert.strictEqual(payload.aud, client.clientId);
                    // assert.strictEqual(payload.iss, apiDomain);
                    assert.strictEqual(payload.sub, session.getUserId());
                    assert(typeof payload.jti === "string");
                    assert(Number.isInteger(payload.iat));
                    assert(Number.isInteger(payload.exp));
                    assert.strictEqual(payload.at_hash, expectedAtHash);

                    assert.strictEqual(payload.nonce, nonce);
                    assert.notStrictEqual(payload.auth_time, undefined);
                });

                it("should work even if there is an expired session with oauth cookies", async function () {
                    const authorisationUrl = createAuthorizationUrl({
                        apiDomain,
                        clientId: client.clientId,
                        redirectUri,
                        state,
                        scope,
                        extraQueryParams: {
                            nonce,
                        },
                    });

                    const { authorizationCode, setCookieHeaders, session } = await testOAuthFlowAndGetAuthCode({
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
                    assert.strictEqual(res.status, 200);
                    const tokenResp1 = await res.json();

                    const authorisationUrl2 = createAuthorizationUrl({
                        apiDomain,
                        clientId: client.clientId,
                        redirectUri,
                        state: state2,
                        scope,
                        responseType: "code",
                        extraQueryParams: {
                            prompt: "none",
                            nonce,
                        },
                    });

                    await new Promise((resolve) => setTimeout(resolve, 3000));

                    const { authorizationCode: authorizationCode2 } = await testOAuthFlowAndGetAuthCode({
                        apiDomain,
                        websiteDomain,
                        authorisationUrl: authorisationUrl2,
                        clientId: client.clientId,
                        redirectUri,
                        scope,
                        state: state2,
                        prevSetCookieHeaders: setCookieHeaders,
                        session,
                        skipLogin: true,
                        expectError: false,
                        expectSessionRefresh: true,
                    });

                    const res2 = await fetch(`${apiDomain}/auth/oauth/token`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            code: authorizationCode2,
                            client_id: client.clientId,
                            client_secret: client.clientSecret,
                            grant_type: "authorization_code",
                            redirect_uri: redirectUri,
                        }),
                    });
                    assert.strictEqual(res2.status, 200);
                    const tokenResp = await res2.json();

                    assert(tokenResp.access_token !== undefined);
                    assert.strictEqual(tokenResp.token_type, "bearer");
                    assert.strictEqual(tokenResp.scope, scope);

                    const { payload, status } = await validateIdToken(tokenResp.id_token, {
                        requiredAudience: client.clientId,
                        requiredScopes: scope.split(" "),
                        requiredClientId: client.clientId,
                    });
                    assert.strictEqual(status, "OK");
                    const accessTokenHash = await crypto.subtle.digest(
                        "SHA-256",
                        new TextEncoder().encode(tokenResp.access_token)
                    );
                    const expectedAtHash = Buffer.from(accessTokenHash.slice(0, 16)).toString("base64url");

                    assert.strictEqual(payload.aud, client.clientId);
                    // assert.strictEqual(payload.iss, apiDomain);
                    assert.strictEqual(payload.sub, session.getUserId());
                    assert(typeof payload.jti === "string");
                    assert(Number.isInteger(payload.iat));
                    assert(Number.isInteger(payload.exp));
                    assert.strictEqual(payload.at_hash, expectedAtHash);

                    assert.strictEqual(payload.nonce, nonce);
                    assert.notStrictEqual(payload.auth_time, undefined);
                });

                it("should error if there is a revoked session", async function () {
                    const authorisationUrl = createAuthorizationUrl({
                        apiDomain,
                        clientId: client.clientId,
                        redirectUri,
                        state,
                        scope,
                        extraQueryParams: {
                            prompt: "none",
                            nonce,
                        },
                    });

                    const createSessionUser = await EmailPassword.signUp("public", "test@example.com", "password123");

                    const session = await Session.createNewSessionWithoutRequestResponse(
                        "public",
                        createSessionUser.recipeUserId
                    );

                    await session.revokeSession();
                    const { error, errorDescription } = await testOAuthFlowAndGetAuthCode({
                        apiDomain,
                        websiteDomain,
                        authorisationUrl,
                        clientId: client.clientId,
                        redirectUri,
                        scope,
                        state,
                        session,
                        skipLogin: true,
                        expectError: true,
                    });

                    assert.strictEqual(error, "login_required");
                    assert.ok(errorDescription);
                });

                it("should error if there is a revoked session with oauth cookies", async function () {
                    const authorisationUrl = createAuthorizationUrl({
                        apiDomain,
                        clientId: client.clientId,
                        redirectUri,
                        state,
                        scope,
                        extraQueryParams: {
                            nonce,
                        },
                    });

                    const { authorizationCode, setCookieHeaders, session } = await testOAuthFlowAndGetAuthCode({
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
                    assert.strictEqual(res.status, 200);
                    const tokenResp1 = await res.json();

                    const authorisationUrl2 = createAuthorizationUrl({
                        apiDomain,
                        clientId: client.clientId,
                        redirectUri,
                        state: state2,
                        scope,
                        responseType: "code",
                        extraQueryParams: {
                            prompt: "none",
                            nonce,
                        },
                    });

                    await session.revokeSession();

                    const { error, errorDescription } = await testOAuthFlowAndGetAuthCode({
                        apiDomain,
                        websiteDomain,
                        authorisationUrl: authorisationUrl2,
                        clientId: client.clientId,
                        redirectUri,
                        scope,
                        state: state2,
                        prevSetCookieHeaders: setCookieHeaders,
                        session,
                        skipLogin: true,
                        expectError: true,
                    });

                    assert.strictEqual(error, "login_required");
                    assert.ok(errorDescription);
                });

                it("should succeed if there is an active session without oauth cookies", async function () {
                    const createSessionUser = await EmailPassword.signUp("public", "test@example.com", "password123");

                    const session = await Session.createNewSessionWithoutRequestResponse(
                        "public",
                        createSessionUser.recipeUserId
                    );

                    const authorisationUrl = createAuthorizationUrl({
                        apiDomain,
                        clientId: client.clientId,
                        redirectUri,
                        state,
                        scope,
                        extraQueryParams: {
                            nonce,
                            prompt: "none",
                        },
                    });

                    const { authorizationCode } = await testOAuthFlowAndGetAuthCode({
                        apiDomain,
                        websiteDomain,
                        authorisationUrl,
                        clientId: client.clientId,
                        redirectUri,
                        session,
                        skipLogin: true,
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
                    assert.strictEqual(res.status, 200);
                    const tokenResp = await res.json();

                    assert(tokenResp.access_token !== undefined);
                    assert.strictEqual(tokenResp.token_type, "bearer");
                    assert.strictEqual(tokenResp.scope, scope);

                    const { payload, status } = await validateIdToken(tokenResp.id_token, {
                        requiredAudience: client.clientId,
                        requiredScopes: scope.split(" "),
                        requiredClientId: client.clientId,
                    });
                    assert.strictEqual(status, "OK");
                    const accessTokenHash = await crypto.subtle.digest(
                        "SHA-256",
                        new TextEncoder().encode(tokenResp.access_token)
                    );
                    const expectedAtHash = Buffer.from(accessTokenHash.slice(0, 16)).toString("base64url");

                    assert.strictEqual(payload.aud, client.clientId);
                    // assert.strictEqual(payload.iss, apiDomain);
                    assert.strictEqual(payload.sub, createSessionUser.user.id);
                    assert(typeof payload.jti === "string");
                    assert(Number.isInteger(payload.iat));
                    assert(Number.isInteger(payload.exp));
                    assert.strictEqual(payload.at_hash, expectedAtHash);

                    assert.strictEqual(payload.nonce, nonce);
                    assert.notStrictEqual(payload.auth_time, undefined);
                });

                it("should succeed if there is an active session with oauth cookies", async function () {
                    const authorisationUrl = createAuthorizationUrl({
                        apiDomain,
                        clientId: client.clientId,
                        redirectUri,
                        state,
                        scope,
                        extraQueryParams: {
                            nonce,
                        },
                    });

                    const { authorizationCode, setCookieHeaders, session } = await testOAuthFlowAndGetAuthCode({
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
                    assert.strictEqual(res.status, 200);
                    const tokenResp1 = await res.json();

                    const authorisationUrl2 = createAuthorizationUrl({
                        apiDomain,
                        clientId: client.clientId,
                        redirectUri,
                        state: state2,
                        scope,
                        responseType: "code",
                        extraQueryParams: {
                            prompt: "none",
                            nonce,
                        },
                    });

                    const { authorizationCode: authorizationCode2, userId } = await testOAuthFlowAndGetAuthCode({
                        apiDomain,
                        websiteDomain,
                        authorisationUrl: authorisationUrl2,
                        clientId: client.clientId,
                        redirectUri,
                        scope,
                        state: state2,
                        prevSetCookieHeaders: setCookieHeaders,
                        session,
                        skipLogin: true,
                    });

                    const res2 = await fetch(`${apiDomain}/auth/oauth/token`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            code: authorizationCode2,
                            client_id: client.clientId,
                            client_secret: client.clientSecret,
                            grant_type: "authorization_code",
                            redirect_uri: redirectUri,
                        }),
                    });
                    const tokenResp2 = await res2.json();
                    assert.strictEqual(res2.status, 200);

                    assert(tokenResp2.access_token !== undefined);
                    assert.strictEqual(tokenResp2.token_type, "bearer");
                    assert.strictEqual(tokenResp2.scope, scope);

                    const { payload, status } = await validateIdToken(tokenResp2.id_token, {
                        requiredAudience: client.clientId,
                        requiredScopes: scope.split(" "),
                        requiredClientId: client.clientId,
                    });
                    assert.strictEqual(status, "OK");
                    const accessTokenHash = await crypto.subtle.digest(
                        "SHA-256",
                        new TextEncoder().encode(tokenResp2.access_token)
                    );
                    const expectedAtHash = Buffer.from(accessTokenHash.slice(0, 16)).toString("base64url");

                    assert.strictEqual(payload.aud, client.clientId);
                    // assert.strictEqual(payload.iss, apiDomain);
                    assert.strictEqual(payload.sub, userId);
                    assert(typeof payload.jti === "string");
                    assert(Number.isInteger(payload.iat));
                    assert(Number.isInteger(payload.exp));
                    assert.strictEqual(payload.at_hash, expectedAtHash);

                    assert.strictEqual(payload.nonce, nonce);
                    assert.notStrictEqual(payload.auth_time, undefined);
                });
            });

            describe("prompt=login", function () {
                it("should work normally if there is no session without oauth cookies", async function () {
                    const authorisationUrl = createAuthorizationUrl({
                        apiDomain,
                        clientId: client.clientId,
                        redirectUri,
                        state,
                        scope,
                        extraQueryParams: {
                            nonce,
                            prompt: "login",
                        },
                    });

                    const { authorizationCode, userId } = await testOAuthFlowAndGetAuthCode({
                        apiDomain,
                        websiteDomain,
                        authorisationUrl,
                        clientId: client.clientId,
                        redirectUri,
                        skipLogin: false,
                        shouldHaveForceFreshAuth: true,
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
                    assert.strictEqual(res.status, 200);
                    const tokenResp = await res.json();

                    assert(tokenResp.access_token !== undefined);
                    assert.strictEqual(tokenResp.token_type, "bearer");
                    assert.strictEqual(tokenResp.scope, scope);

                    const { payload, status } = await validateIdToken(tokenResp.id_token, {
                        requiredAudience: client.clientId,
                        requiredScopes: scope.split(" "),
                        requiredClientId: client.clientId,
                    });
                    assert.strictEqual(status, "OK");
                    const accessTokenHash = await crypto.subtle.digest(
                        "SHA-256",
                        new TextEncoder().encode(tokenResp.access_token)
                    );
                    const expectedAtHash = Buffer.from(accessTokenHash.slice(0, 16)).toString("base64url");

                    assert.strictEqual(payload.aud, client.clientId);
                    // assert.strictEqual(payload.iss, apiDomain);
                    assert.strictEqual(payload.sub, userId);
                    assert(typeof payload.jti === "string");
                    assert(Number.isInteger(payload.iat));
                    assert(Number.isInteger(payload.exp));
                    assert.strictEqual(payload.at_hash, expectedAtHash);

                    assert.strictEqual(payload.nonce, nonce);
                    assert.notStrictEqual(payload.auth_time, undefined);
                });

                it("should work normally if there is no session with oauth cookies", async function () {
                    const authorisationUrl = createAuthorizationUrl({
                        apiDomain,
                        clientId: client.clientId,
                        redirectUri,
                        state,
                        scope,
                        extraQueryParams: {
                            nonce,
                        },
                    });

                    const { authorizationCode, setCookieHeaders, session } = await testOAuthFlowAndGetAuthCode({
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
                    assert.strictEqual(res.status, 200);
                    const tokenResp1 = await res.json();

                    const authorisationUrl2 = createAuthorizationUrl({
                        apiDomain,
                        clientId: client.clientId,
                        redirectUri,
                        state: state2,
                        scope,
                        responseType: "code",
                        extraQueryParams: {
                            prompt: "login",
                            nonce,
                        },
                    });

                    const { authorizationCode: authorizationCode2, userId } = await testOAuthFlowAndGetAuthCode({
                        apiDomain,
                        websiteDomain,
                        authorisationUrl: authorisationUrl2,
                        clientId: client.clientId,
                        redirectUri,
                        scope,
                        state: state2,
                        prevSetCookieHeaders: setCookieHeaders,
                        skipLogin: false,
                        shouldHaveForceFreshAuth: true,
                        useSignIn: true,
                    });

                    const res2 = await fetch(`${apiDomain}/auth/oauth/token`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            code: authorizationCode2,
                            client_id: client.clientId,
                            client_secret: client.clientSecret,
                            grant_type: "authorization_code",
                            redirect_uri: redirectUri,
                        }),
                    });
                    const tokenResp2 = await res2.json();
                    assert.strictEqual(res2.status, 200);

                    assert(tokenResp2.access_token !== undefined);
                    assert.strictEqual(tokenResp2.token_type, "bearer");
                    assert.strictEqual(tokenResp2.scope, scope);

                    const { payload, status } = await validateIdToken(tokenResp2.id_token, {
                        requiredAudience: client.clientId,
                        requiredScopes: scope.split(" "),
                        requiredClientId: client.clientId,
                    });
                    assert.strictEqual(status, "OK");
                    const accessTokenHash = await crypto.subtle.digest(
                        "SHA-256",
                        new TextEncoder().encode(tokenResp2.access_token)
                    );
                    const expectedAtHash = Buffer.from(accessTokenHash.slice(0, 16)).toString("base64url");

                    assert.strictEqual(payload.aud, client.clientId);
                    // assert.strictEqual(payload.iss, apiDomain);
                    assert.strictEqual(payload.sub, userId);
                    assert(typeof payload.jti === "string");
                    assert(Number.isInteger(payload.iat));
                    assert(Number.isInteger(payload.exp));
                    assert.strictEqual(payload.at_hash, expectedAtHash);

                    assert.strictEqual(payload.nonce, nonce);
                    assert.notStrictEqual(payload.auth_time, undefined);
                });

                it("should redirect to auth even if there is an expired session without oauth cookies", async function () {
                    const createSessionUser = await EmailPassword.signUp("public", "test@example.com", "password123");

                    const session = await Session.createNewSessionWithoutRequestResponse(
                        "public",
                        createSessionUser.recipeUserId
                    );

                    const authorisationUrl = createAuthorizationUrl({
                        apiDomain,
                        clientId: client.clientId,
                        redirectUri,
                        state,
                        scope,
                        extraQueryParams: {
                            nonce,
                            prompt: "login",
                        },
                    });
                    await new Promise((resolve) => setTimeout(resolve, 3000));

                    const { authorizationCode, userId } = await testOAuthFlowAndGetAuthCode({
                        apiDomain,
                        websiteDomain,
                        authorisationUrl,
                        clientId: client.clientId,
                        redirectUri,
                        skipLogin: false,
                        useSignIn: true,
                        shouldHaveForceFreshAuth: true,
                        session,
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
                    assert.strictEqual(res.status, 200);
                    const tokenResp = await res.json();

                    assert(tokenResp.access_token !== undefined);
                    assert.strictEqual(tokenResp.token_type, "bearer");
                    assert.strictEqual(tokenResp.scope, scope);

                    const { payload, status } = await validateIdToken(tokenResp.id_token, {
                        requiredAudience: client.clientId,
                        requiredScopes: scope.split(" "),
                        requiredClientId: client.clientId,
                    });
                    assert.strictEqual(status, "OK");
                    const accessTokenHash = await crypto.subtle.digest(
                        "SHA-256",
                        new TextEncoder().encode(tokenResp.access_token)
                    );
                    const expectedAtHash = Buffer.from(accessTokenHash.slice(0, 16)).toString("base64url");

                    assert.strictEqual(payload.aud, client.clientId);
                    // assert.strictEqual(payload.iss, apiDomain);
                    assert.strictEqual(payload.sub, userId);
                    assert(typeof payload.jti === "string");
                    assert(Number.isInteger(payload.iat));
                    assert(Number.isInteger(payload.exp));
                    assert.strictEqual(payload.at_hash, expectedAtHash);

                    assert.strictEqual(payload.nonce, nonce);
                    assert.notStrictEqual(payload.auth_time, undefined);
                });

                it("should redirect to auth even if there is an expired session with oauth cookies", async function () {
                    const authorisationUrl = createAuthorizationUrl({
                        apiDomain,
                        clientId: client.clientId,
                        redirectUri,
                        state,
                        scope,
                        extraQueryParams: {
                            nonce,
                        },
                    });

                    const { authorizationCode, setCookieHeaders, session } = await testOAuthFlowAndGetAuthCode({
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
                    assert.strictEqual(res.status, 200);
                    const tokenResp1 = await res.json();

                    const authorisationUrl2 = createAuthorizationUrl({
                        apiDomain,
                        clientId: client.clientId,
                        redirectUri,
                        state: state2,
                        scope,
                        responseType: "code",
                        extraQueryParams: {
                            prompt: "login",
                            nonce,
                        },
                    });
                    await new Promise((resolve) => setTimeout(resolve, 3000));

                    const { authorizationCode: authorizationCode2, userId } = await testOAuthFlowAndGetAuthCode({
                        apiDomain,
                        websiteDomain,
                        authorisationUrl: authorisationUrl2,
                        clientId: client.clientId,
                        redirectUri,
                        scope,
                        state: state2,
                        session,
                        prevSetCookieHeaders: setCookieHeaders,
                        skipLogin: false,
                        shouldHaveForceFreshAuth: true,
                        useSignIn: true,
                    });

                    const res2 = await fetch(`${apiDomain}/auth/oauth/token`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            code: authorizationCode2,
                            client_id: client.clientId,
                            client_secret: client.clientSecret,
                            grant_type: "authorization_code",
                            redirect_uri: redirectUri,
                        }),
                    });
                    const tokenResp2 = await res2.json();
                    assert.strictEqual(res2.status, 200);

                    assert(tokenResp2.access_token !== undefined);
                    assert.strictEqual(tokenResp2.token_type, "bearer");
                    assert.strictEqual(tokenResp2.scope, scope);

                    const { payload, status } = await validateIdToken(tokenResp2.id_token, {
                        requiredAudience: client.clientId,
                        requiredScopes: scope.split(" "),
                        requiredClientId: client.clientId,
                    });
                    assert.strictEqual(status, "OK");
                    const accessTokenHash = await crypto.subtle.digest(
                        "SHA-256",
                        new TextEncoder().encode(tokenResp2.access_token)
                    );
                    const expectedAtHash = Buffer.from(accessTokenHash.slice(0, 16)).toString("base64url");

                    assert.strictEqual(payload.aud, client.clientId);
                    // assert.strictEqual(payload.iss, apiDomain);
                    assert.strictEqual(payload.sub, userId);
                    assert(typeof payload.jti === "string");
                    assert(Number.isInteger(payload.iat));
                    assert(Number.isInteger(payload.exp));
                    assert.strictEqual(payload.at_hash, expectedAtHash);

                    assert.strictEqual(payload.nonce, nonce);
                    assert.notStrictEqual(payload.auth_time, undefined);
                });

                it("should redirect to auth even if there is an active session without oauth cookies", async function () {
                    const createSessionUser = await EmailPassword.signUp("public", "test@example.com", "password123");

                    const session = await Session.createNewSessionWithoutRequestResponse(
                        "public",
                        createSessionUser.recipeUserId
                    );

                    const authorisationUrl = createAuthorizationUrl({
                        apiDomain,
                        clientId: client.clientId,
                        redirectUri,
                        state,
                        scope,
                        extraQueryParams: {
                            nonce,
                            prompt: "login",
                        },
                    });

                    const { authorizationCode, userId } = await testOAuthFlowAndGetAuthCode({
                        apiDomain,
                        websiteDomain,
                        authorisationUrl,
                        clientId: client.clientId,
                        redirectUri,
                        skipLogin: false,
                        shouldHaveForceFreshAuth: true,
                        useSignIn: true,
                        session,
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
                    assert.strictEqual(res.status, 200);
                    const tokenResp = await res.json();

                    assert(tokenResp.access_token !== undefined);
                    assert.strictEqual(tokenResp.token_type, "bearer");
                    assert.strictEqual(tokenResp.scope, scope);

                    const { payload, status } = await validateIdToken(tokenResp.id_token, {
                        requiredAudience: client.clientId,
                        requiredScopes: scope.split(" "),
                        requiredClientId: client.clientId,
                    });
                    assert.strictEqual(status, "OK");
                    const accessTokenHash = await crypto.subtle.digest(
                        "SHA-256",
                        new TextEncoder().encode(tokenResp.access_token)
                    );
                    const expectedAtHash = Buffer.from(accessTokenHash.slice(0, 16)).toString("base64url");

                    assert.strictEqual(payload.aud, client.clientId);
                    // assert.strictEqual(payload.iss, apiDomain);
                    assert.strictEqual(payload.sub, userId);
                    assert(typeof payload.jti === "string");
                    assert(Number.isInteger(payload.iat));
                    assert(Number.isInteger(payload.exp));
                    assert.strictEqual(payload.at_hash, expectedAtHash);

                    assert.strictEqual(payload.nonce, nonce);
                    assert.notStrictEqual(payload.auth_time, undefined);
                });

                it("should redirect to auth even if there is an active session with oauth cookies", async function () {
                    const authorisationUrl = createAuthorizationUrl({
                        apiDomain,
                        clientId: client.clientId,
                        redirectUri,
                        state,
                        scope,
                        extraQueryParams: {
                            nonce,
                        },
                    });

                    const { authorizationCode, setCookieHeaders, session } = await testOAuthFlowAndGetAuthCode({
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
                    assert.strictEqual(res.status, 200);
                    const tokenResp1 = await res.json();

                    const authorisationUrl2 = createAuthorizationUrl({
                        apiDomain,
                        clientId: client.clientId,
                        redirectUri,
                        state: state2,
                        scope,
                        responseType: "code",
                        extraQueryParams: {
                            prompt: "login",
                            nonce,
                        },
                    });

                    const { authorizationCode: authorizationCode2, userId } = await testOAuthFlowAndGetAuthCode({
                        apiDomain,
                        websiteDomain,
                        authorisationUrl: authorisationUrl2,
                        clientId: client.clientId,
                        redirectUri,
                        scope,
                        state: state2,
                        session,
                        prevSetCookieHeaders: setCookieHeaders,
                        skipLogin: false,
                        shouldHaveForceFreshAuth: true,
                        useSignIn: true,
                    });

                    const res2 = await fetch(`${apiDomain}/auth/oauth/token`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            code: authorizationCode2,
                            client_id: client.clientId,
                            client_secret: client.clientSecret,
                            grant_type: "authorization_code",
                            redirect_uri: redirectUri,
                        }),
                    });
                    const tokenResp2 = await res2.json();
                    assert.strictEqual(res2.status, 200);

                    assert(tokenResp2.access_token !== undefined);
                    assert.strictEqual(tokenResp2.token_type, "bearer");
                    assert.strictEqual(tokenResp2.scope, scope);

                    const { payload, status } = await validateIdToken(tokenResp2.id_token, {
                        requiredAudience: client.clientId,
                        requiredScopes: scope.split(" "),
                        requiredClientId: client.clientId,
                    });
                    assert.strictEqual(status, "OK");
                    const accessTokenHash = await crypto.subtle.digest(
                        "SHA-256",
                        new TextEncoder().encode(tokenResp2.access_token)
                    );
                    const expectedAtHash = Buffer.from(accessTokenHash.slice(0, 16)).toString("base64url");

                    assert.strictEqual(payload.aud, client.clientId);
                    // assert.strictEqual(payload.iss, apiDomain);
                    assert.strictEqual(payload.sub, userId);
                    assert(typeof payload.jti === "string");
                    assert(Number.isInteger(payload.iat));
                    assert(Number.isInteger(payload.exp));
                    assert.strictEqual(payload.at_hash, expectedAtHash);

                    assert.strictEqual(payload.nonce, nonce);
                    assert.notStrictEqual(payload.auth_time, undefined);
                });
            });

            it("should error if there is anything else besides none", async function () {
                const authorisationUrl = createAuthorizationUrl({
                    apiDomain,
                    clientId: client.clientId,
                    redirectUri,
                    state,
                    scope,
                    extraQueryParams: {
                        prompt: "none consent",
                        nonce,
                    },
                });

                const { error, errorDescription } = await testOAuthFlowAndGetAuthCode({
                    apiDomain,
                    websiteDomain,
                    authorisationUrl,
                    clientId: client.clientId,
                    redirectUri,
                    scope,
                    state,
                    skipLogin: true,
                    expectError: true,
                });

                assert.strictEqual(error, "login_required");
                assert.ok(errorDescription);
            });

            it("should error for unknown values (without session)", async function () {
                const authorisationUrl = createAuthorizationUrl({
                    apiDomain,
                    clientId: client.clientId,
                    redirectUri,
                    state,
                    scope,
                    extraQueryParams: {
                        nonce,
                        prompt: "nope",
                    },
                });

                const { error, errorDescription } = await testOAuthFlowAndGetAuthCode({
                    apiDomain,
                    websiteDomain,
                    authorisationUrl,
                    clientId: client.clientId,
                    redirectUri,
                    skipLogin: false,
                    expectError: true,
                    scope,
                    state,
                });

                assert.strictEqual(error, "invalid_request");
                assert.ok(errorDescription);
            });
            it("should error for unknown values (with session)", async function () {
                const createSessionUser = await EmailPassword.signUp("public", "test@example.com", "password123");

                const session = await Session.createNewSessionWithoutRequestResponse(
                    "public",
                    createSessionUser.recipeUserId
                );

                const authorisationUrl = createAuthorizationUrl({
                    apiDomain,
                    clientId: client.clientId,
                    redirectUri,
                    state,
                    scope,
                    extraQueryParams: {
                        nonce,
                        prompt: "nope",
                    },
                });

                const { error, errorDescription } = await testOAuthFlowAndGetAuthCode({
                    apiDomain,
                    websiteDomain,
                    authorisationUrl,
                    clientId: client.clientId,
                    redirectUri,
                    session,
                    skipLogin: true,
                    expectError: true,
                    scope,
                    state,
                });
                assert.strictEqual(error, "invalid_request");
                assert.ok(errorDescription);
            });
            it("should error for unsupported values (without session)", async function () {
                const authorisationUrl = createAuthorizationUrl({
                    apiDomain,
                    clientId: client.clientId,
                    redirectUri,
                    state,
                    scope,
                    extraQueryParams: {
                        nonce,
                        prompt: "select_account",
                    },
                });

                const { error, errorDescription } = await testOAuthFlowAndGetAuthCode({
                    apiDomain,
                    websiteDomain,
                    authorisationUrl,
                    clientId: client.clientId,
                    redirectUri,
                    skipLogin: false,
                    expectError: true,
                    scope,
                    state,
                });

                assert.strictEqual(error, "invalid_request");
                assert.ok(errorDescription);
            });
            it("should error for unsupported values (with session)", async function () {
                const createSessionUser = await EmailPassword.signUp("public", "test@example.com", "password123");

                const session = await Session.createNewSessionWithoutRequestResponse(
                    "public",
                    createSessionUser.recipeUserId
                );

                const authorisationUrl = createAuthorizationUrl({
                    apiDomain,
                    clientId: client.clientId,
                    redirectUri,
                    state,
                    scope,
                    extraQueryParams: {
                        nonce,
                        prompt: "select_account",
                    },
                });

                const { error, errorDescription } = await testOAuthFlowAndGetAuthCode({
                    apiDomain,
                    websiteDomain,
                    authorisationUrl,
                    clientId: client.clientId,
                    redirectUri,
                    session,
                    skipLogin: true,
                    expectError: true,
                    scope,
                    state,
                });
                assert.strictEqual(error, "invalid_request");
                assert.ok(errorDescription);
            });
        });

        describe("max_age", () => {
            let connectionURI, apiDomain, websiteDomain, scope, redirectUri, client, state, state2, nonce;

            beforeEach(async function () {
                connectionURI = await startST({ access_token_validity: 10 });

                apiDomain = `http://localhost:${API_PORT}`;
                websiteDomain = "http://supertokens.io";
                scope = "profile openid";

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

                redirectUri = "http://localhost:4000/redirect-url";
                const clientResponse = await OAuth2Provider.createOAuth2Client(
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
                client = clientResponse.client;

                state = Buffer.from("some-random-string").toString("base64");
                state2 = Buffer.from("some-random-string2").toString("base64");
                nonce = "random-nonce";
            });

            it("should not require fresh sign in if max_age is larger than the session age", async function () {
                const authorisationUrl = createAuthorizationUrl({
                    apiDomain,
                    clientId: client.clientId,
                    redirectUri,
                    state,
                    scope,
                    extraQueryParams: {
                        nonce,
                    },
                });

                const { authorizationCode, setCookieHeaders, session } = await testOAuthFlowAndGetAuthCode({
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
                assert.strictEqual(res.status, 200);
                const tokenResp1 = await res.json();

                const authorisationUrl2 = createAuthorizationUrl({
                    apiDomain,
                    clientId: client.clientId,
                    redirectUri,
                    state: state2,
                    scope,
                    responseType: "code",
                    extraQueryParams: {
                        max_age: 10,
                        nonce,
                    },
                });

                const { authorizationCode: authorizationCode2, userId } = await testOAuthFlowAndGetAuthCode({
                    apiDomain,
                    websiteDomain,
                    authorisationUrl: authorisationUrl2,
                    clientId: client.clientId,
                    redirectUri,
                    scope,
                    state: state2,
                    prevSetCookieHeaders: setCookieHeaders,
                    session,
                    skipLogin: true,
                });

                const res2 = await fetch(`${apiDomain}/auth/oauth/token`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        code: authorizationCode2,
                        client_id: client.clientId,
                        client_secret: client.clientSecret,
                        grant_type: "authorization_code",
                        redirect_uri: redirectUri,
                    }),
                });
                const tokenResp2 = await res2.json();
                assert.strictEqual(res2.status, 200);

                assert(tokenResp2.access_token !== undefined);
                assert.strictEqual(tokenResp2.token_type, "bearer");
                assert.strictEqual(tokenResp2.scope, scope);

                const { payload, status } = await validateIdToken(tokenResp2.id_token, {
                    requiredAudience: client.clientId,
                    requiredScopes: scope.split(" "),
                    requiredClientId: client.clientId,
                });
                assert.strictEqual(status, "OK");
                const accessTokenHash = await crypto.subtle.digest(
                    "SHA-256",
                    new TextEncoder().encode(tokenResp2.access_token)
                );
                const expectedAtHash = Buffer.from(accessTokenHash.slice(0, 16)).toString("base64url");

                assert.strictEqual(payload.aud, client.clientId);
                // assert.strictEqual(payload.iss, apiDomain);
                assert.strictEqual(payload.sub, userId);
                assert(typeof payload.jti === "string");
                assert(Number.isInteger(payload.iat));
                assert(Number.isInteger(payload.exp));
                assert.strictEqual(payload.at_hash, expectedAtHash);

                assert.strictEqual(payload.nonce, nonce);
                assert.notStrictEqual(payload.auth_time, undefined);
            });

            it("should require fresh sign in if max_age is less than the session age", async function () {
                const authorisationUrl = createAuthorizationUrl({
                    apiDomain,
                    clientId: client.clientId,
                    redirectUri,
                    state,
                    scope,
                    extraQueryParams: {
                        nonce,
                    },
                });

                const { authorizationCode, setCookieHeaders, session } = await testOAuthFlowAndGetAuthCode({
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
                assert.strictEqual(res.status, 200);
                const tokenResp1 = await res.json();

                await new Promise((res) => setTimeout(res, 3000));

                const authorisationUrl2 = createAuthorizationUrl({
                    apiDomain,
                    clientId: client.clientId,
                    redirectUri,
                    state: state2,
                    scope,
                    responseType: "code",
                    extraQueryParams: {
                        max_age: 2,
                        nonce,
                    },
                });

                const { authorizationCode: authorizationCode2, userId } = await testOAuthFlowAndGetAuthCode({
                    apiDomain,
                    websiteDomain,
                    authorisationUrl: authorisationUrl2,
                    clientId: client.clientId,
                    redirectUri,
                    scope,
                    state: state2,
                    prevSetCookieHeaders: setCookieHeaders,
                    session,
                    useSignIn: true,
                    skipLogin: false,
                    shouldHaveForceFreshAuth: true,
                });

                const res2 = await fetch(`${apiDomain}/auth/oauth/token`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        code: authorizationCode2,
                        client_id: client.clientId,
                        client_secret: client.clientSecret,
                        grant_type: "authorization_code",
                        redirect_uri: redirectUri,
                    }),
                });
                const tokenResp2 = await res2.json();
                assert.strictEqual(res2.status, 200);

                assert(tokenResp2.access_token !== undefined);
                assert.strictEqual(tokenResp2.token_type, "bearer");
                assert.strictEqual(tokenResp2.scope, scope);

                const { payload, status } = await validateIdToken(tokenResp2.id_token, {
                    requiredAudience: client.clientId,
                    requiredScopes: scope.split(" "),
                    requiredClientId: client.clientId,
                });
                assert.strictEqual(status, "OK");
                const accessTokenHash = await crypto.subtle.digest(
                    "SHA-256",
                    new TextEncoder().encode(tokenResp2.access_token)
                );
                const expectedAtHash = Buffer.from(accessTokenHash.slice(0, 16)).toString("base64url");

                assert.strictEqual(payload.aud, client.clientId);
                // assert.strictEqual(payload.iss, apiDomain);
                assert.strictEqual(payload.sub, userId);
                assert(typeof payload.jti === "string");
                assert(Number.isInteger(payload.iat));
                assert(Number.isInteger(payload.exp));
                assert.strictEqual(payload.at_hash, expectedAtHash);

                assert.strictEqual(payload.nonce, nonce);
                assert.notStrictEqual(payload.auth_time, undefined);
            });

            it("should require fresh sign in if max_age is 0", async function () {
                const authorisationUrl = createAuthorizationUrl({
                    apiDomain,
                    clientId: client.clientId,
                    redirectUri,
                    state,
                    scope,
                    extraQueryParams: {
                        nonce,
                    },
                });

                const { authorizationCode, setCookieHeaders, session } = await testOAuthFlowAndGetAuthCode({
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
                assert.strictEqual(res.status, 200);
                const tokenResp1 = await res.json();

                const authorisationUrl2 = createAuthorizationUrl({
                    apiDomain,
                    clientId: client.clientId,
                    redirectUri,
                    state: state2,
                    scope,
                    responseType: "code",
                    extraQueryParams: {
                        max_age: 0,
                        nonce,
                    },
                });

                const { authorizationCode: authorizationCode2, userId } = await testOAuthFlowAndGetAuthCode({
                    apiDomain,
                    websiteDomain,
                    authorisationUrl: authorisationUrl2,
                    clientId: client.clientId,
                    redirectUri,
                    scope,
                    state: state2,
                    prevSetCookieHeaders: setCookieHeaders,
                    session,
                    useSignIn: true,
                    skipLogin: false,
                    shouldHaveForceFreshAuth: true,
                });

                const res2 = await fetch(`${apiDomain}/auth/oauth/token`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        code: authorizationCode2,
                        client_id: client.clientId,
                        client_secret: client.clientSecret,
                        grant_type: "authorization_code",
                        redirect_uri: redirectUri,
                    }),
                });
                const tokenResp2 = await res2.json();
                assert.strictEqual(res2.status, 200);

                assert(tokenResp2.access_token !== undefined);
                assert.strictEqual(tokenResp2.token_type, "bearer");
                assert.strictEqual(tokenResp2.scope, scope);

                const { payload, status } = await validateIdToken(tokenResp2.id_token, {
                    requiredAudience: client.clientId,
                    requiredScopes: scope.split(" "),
                    requiredClientId: client.clientId,
                });
                assert.strictEqual(status, "OK");
                const accessTokenHash = await crypto.subtle.digest(
                    "SHA-256",
                    new TextEncoder().encode(tokenResp2.access_token)
                );
                const expectedAtHash = Buffer.from(accessTokenHash.slice(0, 16)).toString("base64url");

                assert.strictEqual(payload.aud, client.clientId);
                // assert.strictEqual(payload.iss, apiDomain);
                assert.strictEqual(payload.sub, userId);
                assert(typeof payload.jti === "string");
                assert(Number.isInteger(payload.iat));
                assert(Number.isInteger(payload.exp));
                assert.strictEqual(payload.at_hash, expectedAtHash);

                assert.strictEqual(payload.nonce, nonce);
                assert.notStrictEqual(payload.auth_time, undefined);
            });

            it("should require fresh sign in if max_age is negative", async function () {
                const authorisationUrl = createAuthorizationUrl({
                    apiDomain,
                    clientId: client.clientId,
                    redirectUri,
                    state,
                    scope,
                    extraQueryParams: {
                        nonce,
                    },
                });

                const { authorizationCode, setCookieHeaders, session } = await testOAuthFlowAndGetAuthCode({
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
                assert.strictEqual(res.status, 200);
                const tokenResp1 = await res.json();

                const authorisationUrl2 = createAuthorizationUrl({
                    apiDomain,
                    clientId: client.clientId,
                    redirectUri,
                    state: state2,
                    scope,
                    responseType: "code",
                    extraQueryParams: {
                        max_age: -1,
                        nonce,
                    },
                });

                const { error, errorDescription } = await testOAuthFlowAndGetAuthCode({
                    apiDomain,
                    websiteDomain,
                    authorisationUrl: authorisationUrl2,
                    clientId: client.clientId,
                    redirectUri,
                    scope,
                    state: state2,
                    prevSetCookieHeaders: setCookieHeaders,
                    session,
                    skipLogin: true,
                    expectError: true,
                });

                assert.strictEqual(error, "invalid_request");
                assert(errorDescription.includes("max_age"));
            });

            it("should error if fresh sign in if max_age is not a number", async function () {
                const authorisationUrl = createAuthorizationUrl({
                    apiDomain,
                    clientId: client.clientId,
                    redirectUri,
                    state,
                    scope,
                    extraQueryParams: {
                        nonce,
                    },
                });

                const { authorizationCode, setCookieHeaders, session } = await testOAuthFlowAndGetAuthCode({
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
                assert.strictEqual(res.status, 200);
                const tokenResp1 = await res.json();

                const authorisationUrl2 = createAuthorizationUrl({
                    apiDomain,
                    clientId: client.clientId,
                    redirectUri,
                    state: state2,
                    scope,
                    responseType: "code",
                    extraQueryParams: {
                        max_age: "AAAA",
                        nonce,
                    },
                });

                const { error, errorDescription } = await testOAuthFlowAndGetAuthCode({
                    apiDomain,
                    websiteDomain,
                    authorisationUrl: authorisationUrl2,
                    clientId: client.clientId,
                    redirectUri,
                    scope,
                    state: state2,
                    prevSetCookieHeaders: setCookieHeaders,
                    session,
                    expectError: true,
                    skipLogin: true,
                });

                assert.strictEqual(error, "invalid_request");
                assert.ok(errorDescription);
            });
        });

        describe("display", () => {
            let connectionURI, apiDomain, websiteDomain, scope, redirectUri, client, state, state2, nonce;

            beforeEach(async function () {
                connectionURI = await startST({ access_token_validity: 10 });

                apiDomain = `http://localhost:${API_PORT}`;
                websiteDomain = "http://supertokens.io";
                scope = "profile openid";

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

                redirectUri = "http://localhost:4000/redirect-url";
                const clientResponse = await OAuth2Provider.createOAuth2Client(
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
                client = clientResponse.client;

                state = Buffer.from("some-random-string").toString("base64");
                state2 = Buffer.from("some-random-string2").toString("base64");
                nonce = "random-nonce";
            });

            it("should not error for valid values", async () => {
                const authorisationUrl = createAuthorizationUrl({
                    apiDomain,
                    clientId: client.clientId,
                    redirectUri,
                    state,
                    scope,
                    extraQueryParams: {
                        nonce,
                        display: "popup",
                    },
                });
                await testOAuthFlowAndGetAuthCode({
                    apiDomain,
                    websiteDomain,
                    authorisationUrl,
                    clientId: client.clientId,
                    redirectUri,
                    skipLogin: false,
                    scope,
                    state,
                });
            });

            it("should not error for non-standard values", async () => {
                const authorisationUrl = createAuthorizationUrl({
                    apiDomain,
                    clientId: client.clientId,
                    redirectUri,
                    state,
                    scope,
                    extraQueryParams: {
                        nonce,
                        display: "whatever",
                    },
                });

                await testOAuthFlowAndGetAuthCode({
                    apiDomain,
                    websiteDomain,
                    authorisationUrl,
                    clientId: client.clientId,
                    redirectUri,
                    skipLogin: false,
                    scope,
                    state,
                });
            });
        });

        describe("ui_locales", () => {
            let connectionURI, apiDomain, websiteDomain, scope, redirectUri, client, state, state2, nonce;

            beforeEach(async function () {
                connectionURI = await startST({ access_token_validity: 10 });

                apiDomain = `http://localhost:${API_PORT}`;
                websiteDomain = "http://supertokens.io";
                scope = "profile openid";

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

                redirectUri = "http://localhost:4000/redirect-url";
                const clientResponse = await OAuth2Provider.createOAuth2Client(
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
                client = clientResponse.client;

                state = Buffer.from("some-random-string").toString("base64");
                state2 = Buffer.from("some-random-string2").toString("base64");
                nonce = "random-nonce";
            });

            it("should not error for valid values", async () => {
                const authorisationUrl = createAuthorizationUrl({
                    apiDomain,
                    clientId: client.clientId,
                    redirectUri,
                    state,
                    scope,
                    extraQueryParams: {
                        nonce,
                        ui_locales: "fr-CA fr en",
                    },
                });
                await testOAuthFlowAndGetAuthCode({
                    apiDomain,
                    websiteDomain,
                    authorisationUrl,
                    clientId: client.clientId,
                    redirectUri,
                    skipLogin: false,
                    scope,
                    state,
                });
            });

            it("should not error for non-standard values", async () => {
                const authorisationUrl = createAuthorizationUrl({
                    apiDomain,
                    clientId: client.clientId,
                    redirectUri,
                    state,
                    scope,
                    extraQueryParams: {
                        nonce,
                        ui_locales: "whatever",
                    },
                });

                await testOAuthFlowAndGetAuthCode({
                    apiDomain,
                    websiteDomain,
                    authorisationUrl,
                    clientId: client.clientId,
                    redirectUri,
                    skipLogin: false,
                    scope,
                    state,
                });
            });
        });

        describe("acr_values", () => {
            let connectionURI, apiDomain, websiteDomain, scope, redirectUri, client, state, state2, nonce;

            beforeEach(async function () {
                connectionURI = await startST({ access_token_validity: 10 });

                apiDomain = `http://localhost:${API_PORT}`;
                websiteDomain = "http://supertokens.io";
                scope = "profile openid";

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

                redirectUri = "http://localhost:4000/redirect-url";
                const clientResponse = await OAuth2Provider.createOAuth2Client(
                    {
                        redirectUris: [redirectUri],
                        scope,
                        skipConsent: true,
                        grantTypes: ["authorization_code", "refresh_token", "implicit"],
                        responseTypes: ["code", "id_token"],
                        tokenEndpointAuthMethod: "client_secret_post",
                    },
                    {}
                );
                client = clientResponse.client;

                state = Buffer.from("some-random-string").toString("base64");
                state2 = Buffer.from("some-random-string2").toString("base64");
                nonce = "random-nonce";
            });

            it("should not error for valid values", async () => {
                const authorisationUrl = createAuthorizationUrl({
                    apiDomain,
                    clientId: client.clientId,
                    responseType: "id_token",
                    redirectUri,
                    state,
                    scope,
                    extraQueryParams: {
                        nonce,
                        acr_values: "urn:mace:incommon:iap:silver",
                    },
                });

                const { idToken } = await testOAuthFlowAndGetAuthCode({
                    apiDomain,
                    websiteDomain,
                    authorisationUrl,
                    responseType: "id_token",
                    clientId: client.clientId,
                    redirectUri,
                    skipLogin: false,
                    scope,
                    state,
                });

                const { payload: tokenPayload } = await validateIdToken(idToken);
                assert.strictEqual(tokenPayload.acr, "0");
            });

            it("should not error for non-standard values", async () => {
                const authorisationUrl = createAuthorizationUrl({
                    apiDomain,
                    clientId: client.clientId,
                    responseType: "id_token",
                    redirectUri,
                    state,
                    scope,
                    extraQueryParams: {
                        nonce,
                        acr_values: "whatever",
                    },
                });

                const { idToken } = await testOAuthFlowAndGetAuthCode({
                    apiDomain,
                    websiteDomain,
                    authorisationUrl,
                    responseType: "id_token",
                    clientId: client.clientId,
                    redirectUri,
                    skipLogin: false,
                    scope,
                    state,
                });

                const { payload: tokenPayload } = await validateIdToken(idToken);
                assert.strictEqual(tokenPayload.acr, "0");
            });
        });
    });
});
