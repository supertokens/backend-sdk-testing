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
    createCoreApplication,
    extractInfoFromResponse,
} = require("../utils");
let assert = require("assert");
const { recipesMock, API_PORT, request } = require("../../api-mock");
const { OAuth2Provider, EmailPassword, Session, supertokens: SuperTokens } = recipesMock;
const {
    createAuthorizationUrl,
    testOAuthFlowAndGetAuthCode,
    validateIdToken,
    createEndSessionUrl,
    getBasicAuthHeader,
} = require("./utils");
const { default: generatePKCEChallenge } = require("pkce-challenge");

const apiDomain = `http://localhost:${API_PORT}`;
const websiteDomain = "http://supertokens.io";
const redirectUri = "http://localhost:4000/redirect-url";
const state = Buffer.from("some-random-string").toString("base64");

describe(`OAuth2Provider-Token API: ${printPath("[test/oauth2provider/rfc6749.token.api.test.js]")}`, function () {
    let user, session;

    before(async function () {
        const connectionURI = await createCoreApplication();

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

        const signUpRes = await EmailPassword.signUp(undefined, "test@test.com", "test");

        user = signUpRes.user;
        session = await Session.createNewSessionWithoutRequestResponse(undefined, signUpRes.recipeUserId);
    });

    describe("client authentication", () => {
        it("should error out if the authorization is passed using both methods", async function () {
            const { client } = await OAuth2Provider.createOAuth2Client({
                redirectUris: [redirectUri],
                responseTypes: ["code"],
            });

            const authorizationCode = await getAuthCode(client.clientId, redirectUri, session);

            const res = await fetch(`${apiDomain}/auth/oauth/token`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: getBasicAuthHeader(client),
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

            assert.strictEqual(res.status, 401);
            assert.deepStrictEqual(tokenResp, {
                error: "invalid_client",
                error_description:
                    "Client authentication failed (e.g., unknown client, no client authentication included, or unsupported authentication method). The OAuth 2.0 Client supports client authentication method 'client_secret_basic', but method 'client_secret_post' was requested. You must configure the OAuth 2.0 client's 'token_endpoint_auth_method' value to accept 'client_secret_post'.",
            });
        });

        it("should error out if the authorization is passed using both methods (set to client_secret_post)", async function () {
            const { client } = await OAuth2Provider.createOAuth2Client({
                redirectUris: [redirectUri],
                responseTypes: ["code"],
                tokenEndpointAuthMethod: "client_secret_post",
            });

            const authorizationCode = await getAuthCode(client.clientId, redirectUri, session);

            const res = await fetch(`${apiDomain}/auth/oauth/token`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: getBasicAuthHeader(client),
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

            assert.strictEqual(res.status, 401);
            assert.deepStrictEqual(tokenResp, {
                error: "invalid_client",
                error_description:
                    "Client authentication failed (e.g., unknown client, no client authentication included, or unsupported authentication method). The OAuth 2.0 Client supports client authentication method 'client_secret_post', but method 'client_secret_basic' was requested. You must configure the OAuth 2.0 client's 'token_endpoint_auth_method' value to accept 'client_secret_basic'.",
            });
        });

        it("should error out if the authorization is passed using both methods (set to none)", async function () {
            const { client } = await OAuth2Provider.createOAuth2Client({
                redirectUris: [redirectUri],
                responseTypes: ["code"],
                tokenEndpointAuthMethod: "none",
            });

            const authorizationCode = await getAuthCode(client.clientId, redirectUri, session);

            const res = await fetch(`${apiDomain}/auth/oauth/token`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: getBasicAuthHeader(client),
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

            assert.strictEqual(res.status, 401);
            assert.deepStrictEqual(tokenResp, {
                error: "invalid_client",
                error_description:
                    "Client authentication failed (e.g., unknown client, no client authentication included, or unsupported authentication method). The OAuth 2.0 Client supports client authentication method 'none', but method 'client_secret_basic' was requested. You must configure the OAuth 2.0 client's 'token_endpoint_auth_method' value to accept 'client_secret_basic'.",
            });
        });

        it("should error out if the authorization is passed using the wrong method (set client_secret_basic, using client_secret_post)", async function () {
            const { client } = await OAuth2Provider.createOAuth2Client({
                tokenEndpointAuthMethod: "client_secret_post",
                redirectUris: [redirectUri],
                responseTypes: ["code"],
            });

            const authorizationCode = await getAuthCode(client.clientId, redirectUri, session);

            const res = await fetch(`${apiDomain}/auth/oauth/token`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: getBasicAuthHeader(client),
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

            assert.strictEqual(res.status, 401);
            assert.deepStrictEqual(tokenResp, {
                error: "invalid_client",
                error_description:
                    "Client authentication failed (e.g., unknown client, no client authentication included, or unsupported authentication method). The OAuth 2.0 Client supports client authentication method 'client_secret_post', but method 'client_secret_basic' was requested. You must configure the OAuth 2.0 client's 'token_endpoint_auth_method' value to accept 'client_secret_basic'.",
            });
        });

        it("should error out if the authorization is passed using the wrong method (set client_secret_post, using client_secret_basic)", async function () {
            const { client } = await OAuth2Provider.createOAuth2Client({
                redirectUris: [redirectUri],
                responseTypes: ["code"],
            });

            const authorizationCode = await getAuthCode(client.clientId, redirectUri, session);

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

            assert.strictEqual(res.status, 401);
            assert.deepStrictEqual(tokenResp, {
                error: "invalid_client",
                error_description:
                    "Client authentication failed (e.g., unknown client, no client authentication included, or unsupported authentication method). The OAuth 2.0 Client supports client authentication method 'client_secret_basic', but method 'client_secret_post' was requested. You must configure the OAuth 2.0 client's 'token_endpoint_auth_method' value to accept 'client_secret_post'.",
            });
        });
    });
});

async function getAuthCode(clientId, redirectUri, session, scope) {
    const authorisationUrl = createAuthorizationUrl({
        apiDomain,
        responseType: "code",
        clientId,
        redirectUri,
        state,
        scope,
    });
    const res = await fetch(authorisationUrl, {
        method: "GET",
        redirect: "manual",
        headers: {
            Authorization: `Bearer ${session.getAllSessionTokensDangerously().accessToken}`,
        },
    });
    const url = new URL(res.headers.get("location"));
    assert.strictEqual(url.protocol + "//" + url.host + url.pathname, redirectUri);
    assert.strictEqual(url.searchParams.size, 3);

    const code = url.searchParams.get("code");
    assert(typeof code === "string");
    assert.strictEqual(url.searchParams.get("state"), state);
    assert.strictEqual(url.searchParams.get("scope"), scope ?? "");
    assert.strictEqual(url.hash, "");

    return code;
}
