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

const apiDomain = `http://localhost:${API_PORT}`;
const websiteDomain = "http://supertokens.io";
const redirectUri = "http://localhost:4000/redirect-url";
const state = Buffer.from("some-random-string").toString("base64");

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

    describe("Authorization endpoint", () => {
        let user, session;
        before(async function () {
            const connectionURI = await startST();

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

        describe("clientid validation", () => {
            it("should error out if the client is not found", async function () {
                const authorisationUrl = createAuthorizationUrl({
                    apiDomain,
                    clientId: "nope",
                    redirectUri,
                    state,
                });

                const res = await fetch(authorisationUrl, {
                    method: "GET",
                    redirect: "manual",
                });

                assert.strictEqual(res.status, 400);
                assert.deepStrictEqual(await res.json(), {
                    error: "invalid_request",
                    error_description: "The provided client_id is not valid",
                });
            });
            it("should error out if the clientid is omitted", async function () {
                const authorisationUrl = createAuthorizationUrl({
                    apiDomain,
                    clientId: undefined,
                    redirectUri,
                    state,
                });

                const res = await fetch(authorisationUrl, {
                    method: "GET",
                    redirect: "manual",
                });

                assert.strictEqual(res.status, 400);
                assert.deepStrictEqual(await res.json(), {
                    error: "invalid_request",
                    error_description: "client_id is required and must be a string",
                });
            });
            it("should error out if the clientid is empty", async function () {
                const authorisationUrl = createAuthorizationUrl({
                    apiDomain,
                    clientId: "",
                    redirectUri,
                    state,
                });

                const res = await fetch(authorisationUrl, {
                    method: "GET",
                    redirect: "manual",
                });

                assert.strictEqual(res.status, 400);
                assert.deepStrictEqual(await res.json(), {
                    error: "invalid_request",
                    error_description: "The provided client_id is not valid",
                });
            });
        });

        describe("redirect uri validation", () => {
            it("should allow omitting the redirect uri if the client has only one redirect uri", async function () {
                const { client } = await OAuth2Provider.createOAuth2Client({
                    redirectUris: [redirectUri],
                });

                const authorisationUrl = createAuthorizationUrl({
                    apiDomain,
                    responseType: "code",
                    clientId: client.clientId,
                    state,
                });

                const res = await fetch(authorisationUrl, {
                    method: "GET",
                    redirect: "manual",
                });

                assert.strictEqual(res.status, 302);
                assert(res.headers.get("location").startsWith(websiteDomain));
            });

            it("should error when omitting the redirect uri if the client has no redirect uris", async function () {
                const { client } = await OAuth2Provider.createOAuth2Client();

                const authorisationUrl = createAuthorizationUrl({
                    apiDomain,
                    clientId: client.clientId,
                    state,
                });

                const res = await fetch(authorisationUrl, {
                    method: "GET",
                    redirect: "manual",
                });

                assert.strictEqual(res.status, 400);
                assert.deepStrictEqual(await res.json(), {
                    error: "invalid_request",
                    error_description:
                        "The request is missing a required parameter, includes an invalid parameter value, includes a parameter more than once, or is otherwise malformed. The 'redirect_uri' parameter does not match any of the OAuth 2.0 Client's pre-registered redirect urls.",
                });
            });

            it("should error when omitting the redirect uri if the client has multiple redirect uris", async function () {
                const { client } = await OAuth2Provider.createOAuth2Client({
                    redirectUris: [redirectUri, redirectUri + "2"],
                });

                const authorisationUrl = createAuthorizationUrl({
                    apiDomain,
                    clientId: client.clientId,
                    state,
                });

                const res = await fetch(authorisationUrl, {
                    method: "GET",
                    redirect: "manual",
                });

                assert.strictEqual(res.status, 400);
                assert.deepStrictEqual(await res.json(), {
                    error: "invalid_request",
                    error_description:
                        "The request is missing a required parameter, includes an invalid parameter value, includes a parameter more than once, or is otherwise malformed. The 'redirect_uri' parameter does not match any of the OAuth 2.0 Client's pre-registered redirect urls.",
                });
            });

            it("should error out if the redirect uri is not matching", async function () {
                const { client } = await OAuth2Provider.createOAuth2Client({
                    redirectUris: [redirectUri],
                });

                const authorisationUrl = createAuthorizationUrl({
                    apiDomain,
                    clientId: client.clientId,
                    redirectUri: "http://nope.localhost/redirect-url",
                    state,
                });

                const res = await fetch(authorisationUrl, {
                    method: "GET",
                    redirect: "manual",
                });

                assert.strictEqual(res.status, 400);
                assert.deepStrictEqual(await res.json(), {
                    error: "invalid_request",
                    error_description:
                        "The request is missing a required parameter, includes an invalid parameter value, includes a parameter more than once, or is otherwise malformed. The 'redirect_uri' parameter does not match any of the OAuth 2.0 Client's pre-registered redirect urls.",
                });
            });

            it("should error out if the redirect uri has an extra /", async function () {
                const { client } = await OAuth2Provider.createOAuth2Client({
                    redirectUris: [redirectUri],
                });

                const authorisationUrl = createAuthorizationUrl({
                    apiDomain,
                    clientId: client.clientId,
                    redirectUri: redirectUri + "/",
                    state,
                });

                const res = await fetch(authorisationUrl, {
                    method: "GET",
                    redirect: "manual",
                });

                assert.strictEqual(res.status, 400);
                assert.deepStrictEqual(await res.json(), {
                    error: "invalid_request",
                    error_description:
                        "The request is missing a required parameter, includes an invalid parameter value, includes a parameter more than once, or is otherwise malformed. The 'redirect_uri' parameter does not match any of the OAuth 2.0 Client's pre-registered redirect urls.",
                });
            });

            it("should error out if the redirect uri has additional query params", async function () {
                const { client } = await OAuth2Provider.createOAuth2Client({
                    redirectUris: [redirectUri],
                });

                const authorisationUrl = createAuthorizationUrl({
                    apiDomain,
                    clientId: client.clientId,
                    redirectUri: redirectUri + "?test=value",
                    state,
                });

                const res = await fetch(authorisationUrl, {
                    method: "GET",
                    redirect: "manual",
                });

                assert.strictEqual(res.status, 400);
                assert.deepStrictEqual(await res.json(), {
                    error: "invalid_request",
                    error_description:
                        "The request is missing a required parameter, includes an invalid parameter value, includes a parameter more than once, or is otherwise malformed. The 'redirect_uri' parameter does not match any of the OAuth 2.0 Client's pre-registered redirect urls.",
                });
            });

            it("should error out if the redirect uri has additional fragment", async function () {
                const { client } = await OAuth2Provider.createOAuth2Client({
                    redirectUris: [redirectUri],
                });

                const authorisationUrl = createAuthorizationUrl({
                    apiDomain,
                    clientId: client.clientId,
                    redirectUri: redirectUri + "#asdfasdfa",
                    state,
                });

                const res = await fetch(authorisationUrl, {
                    method: "GET",
                    redirect: "manual",
                });

                assert.strictEqual(res.status, 400);
                assert.deepStrictEqual(await res.json(), {
                    error: "invalid_request",
                    error_description:
                        "The request is missing a required parameter, includes an invalid parameter value, includes a parameter more than once, or is otherwise malformed. The 'redirect_uri' parameter does not match any of the OAuth 2.0 Client's pre-registered redirect urls.",
                });
            });
        });

        describe("response type validation", () => {
            it("should support code the response type by default", async function () {
                const { client } = await OAuth2Provider.createOAuth2Client({
                    redirectUris: [redirectUri],
                });

                const authorisationUrl = createAuthorizationUrl({
                    apiDomain,
                    clientId: client.clientId,
                    responseType: "code",
                    redirectUri,
                    state,
                });

                const res = await fetch(authorisationUrl, {
                    method: "GET",
                    redirect: "manual",
                });

                assert.strictEqual(res.status, 302);
                assert(res.headers.get("location").startsWith(websiteDomain));
            });

            it("should not care about ordering if multiple response types are listed", async function () {
                const { client } = await OAuth2Provider.createOAuth2Client({
                    responseTypes: ["code", "id_token", "code id_token"],
                    redirectUris: [redirectUri],
                });

                const authorisationUrl = createAuthorizationUrl({
                    apiDomain,
                    clientId: client.clientId,
                    responseType: "id_token code",
                    redirectUri,
                    state,
                });

                const res = await fetch(authorisationUrl, {
                    method: "GET",
                    redirect: "manual",
                });

                assert.strictEqual(res.status, 302);
                assert(res.headers.get("location").startsWith(websiteDomain));
            });

            it("should error out if the response type is omitted", async function () {
                const { client } = await OAuth2Provider.createOAuth2Client({
                    redirectUris: [redirectUri],
                    responseTypes: ["token"],
                });

                const authorisationUrl = createAuthorizationUrl({
                    apiDomain,
                    clientId: client.clientId,
                    responseType: undefined,
                    redirectUri,
                    state,
                });

                const res = await fetch(authorisationUrl, {
                    method: "GET",
                    redirect: "manual",
                });

                checkErrorRedirection(
                    res,
                    "unsupported_response_type",
                    // We get it with the extra `
                    "The authorization server does not support obtaining a token using this method. `The request is missing the 'response_type' parameter."
                );
            });
            it("should error out if the response type is valid but not supported (code)", async function () {
                const { client } = await OAuth2Provider.createOAuth2Client({
                    redirectUris: [redirectUri],
                    responseTypes: ["token"],
                });

                const authorisationUrl = createAuthorizationUrl({
                    apiDomain,
                    clientId: client.clientId,
                    responseType: "code",
                    redirectUri,
                    state,
                });

                const res = await fetch(authorisationUrl, {
                    method: "GET",
                    redirect: "manual",
                });

                checkErrorRedirection(
                    res,
                    "unsupported_response_type",
                    "The authorization server does not support obtaining a token using this method. The client is not allowed to request response_type 'code'."
                );
            });

            it("should error out if response type is valid but not supported (token)", async function () {
                const { client } = await OAuth2Provider.createOAuth2Client({
                    redirectUris: [redirectUri],
                    responseTypes: ["code"],
                });

                const authorisationUrl = createAuthorizationUrl({
                    apiDomain,
                    clientId: client.clientId,
                    responseType: "token",
                    redirectUri,
                    state,
                });

                const res = await fetch(authorisationUrl, {
                    method: "GET",
                    redirect: "manual",
                });

                assert.strictEqual(res.status, 302);
                checkErrorRedirection(
                    res,
                    "unsupported_response_type",
                    "The authorization server does not support obtaining a token using this method. The client is not allowed to request response_type 'token'."
                );
            });
        });

        describe("state validation", () => {
            it("should error out if the state is omitted", async function () {
                const { client } = await OAuth2Provider.createOAuth2Client({
                    redirectUris: [redirectUri],
                });
                const authorisationUrl = createAuthorizationUrl({
                    apiDomain,
                    responseType: "code",
                    clientId: client.clientId,
                    redirectUri,
                    state: undefined,
                });

                const res = await fetch(authorisationUrl, {
                    method: "GET",
                    redirect: "manual",
                });

                checkErrorRedirection(
                    res,
                    "invalid_state",
                    "The state is missing or does not have enough characters and is therefore considered too weak. Request parameter 'state' must be at least be 8 characters long to ensure sufficient entropy.",
                    ""
                );
            });

            it("should error out if the state is empty", async function () {
                const { client } = await OAuth2Provider.createOAuth2Client({
                    redirectUris: [redirectUri],
                });
                const authorisationUrl = createAuthorizationUrl({
                    apiDomain,
                    responseType: "code",
                    clientId: client.clientId,
                    redirectUri,
                    state: "",
                });

                const res = await fetch(authorisationUrl, {
                    method: "GET",
                    redirect: "manual",
                });

                checkErrorRedirection(
                    res,
                    "invalid_state",
                    "The state is missing or does not have enough characters and is therefore considered too weak. Request parameter 'state' must be at least be 8 characters long to ensure sufficient entropy.",
                    ""
                );
            });

            it("should error out if the state is too short", async function () {
                const { client } = await OAuth2Provider.createOAuth2Client({
                    redirectUris: [redirectUri],
                });
                const authorisationUrl = createAuthorizationUrl({
                    apiDomain,
                    responseType: "code",
                    clientId: client.clientId,
                    redirectUri,
                    state: "1234",
                });

                const res = await fetch(authorisationUrl, {
                    method: "GET",
                    redirect: "manual",
                });
                checkErrorRedirection(
                    res,
                    "invalid_state",
                    "The state is missing or does not have enough characters and is therefore considered too weak. Request parameter 'state' must be at least be 8 characters long to ensure sufficient entropy.",
                    "1234"
                );
            });
        });

        describe("valid input behaviours", () => {
            it("should ignore unrecognised parameters", async function () {
                const { client } = await OAuth2Provider.createOAuth2Client({
                    redirectUris: [redirectUri],
                });
                const authorisationUrl = createAuthorizationUrl({
                    apiDomain,
                    responseType: "code",
                    clientId: client.clientId,
                    redirectUri,
                    state,
                    extraQueryParams: {
                        asdfasdf: "asdfasdf",
                    }
                });
    
                const res = await fetch(authorisationUrl, {
                    method: "GET",
                    redirect: "manual",
                });

                assert.strictEqual(res.status, 302);
                assert(res.headers.get("location").startsWith(websiteDomain));
            });

            it("should redirect to the website domain + basepath if there is no session", async function () {
                const { client } = await OAuth2Provider.createOAuth2Client({
                    redirectUris: [redirectUri],
                });
                const authorisationUrl = createAuthorizationUrl({
                    apiDomain,
                    responseType: "code",
                    clientId: client.clientId,
                    redirectUri,
                    state,
                    extraQueryParams: {
                        asdfasdf: "asdfasdf",
                    }
                });
    
                const res = await fetch(authorisationUrl, {
                    method: "GET",
                    redirect: "manual",
                });

                assert.strictEqual(res.status, 302);
                assert(res.headers.get("location").startsWith(websiteDomain + "/auth?"));
            });

            it("should redirect to the website domain + basepath if there is an invalid session token", async function () {
                const { client } = await OAuth2Provider.createOAuth2Client({
                    redirectUris: [redirectUri],
                });
                const authorisationUrl = createAuthorizationUrl({
                    apiDomain,
                    responseType: "code",
                    clientId: client.clientId,
                    redirectUri,
                    state,
                    extraQueryParams: {
                        asdfasdf: "asdfasdf",
                    }
                });
    
                const res = await fetch(authorisationUrl, {
                    method: "GET",
                    redirect: "manual",
                    headers: {
                        "Authorization": `Bearer !!!${session.accessToken}`,
                    },
                });

                assert.strictEqual(res.status, 302);
                // We either get redirected to the auth page or the try-refresh page depending on "how wrong" the token is
                // Both works, so we just check that we get redirected to the right basepath
                assert(res.headers.get("location").startsWith(websiteDomain + "/auth"));
            });

            it("should redirect to the client if there is a session (code)", async function () {
                const { client } = await OAuth2Provider.createOAuth2Client({
                    redirectUris: [redirectUri],
                    responseTypes: ["code"],
                });
                const authorisationUrl = createAuthorizationUrl({
                    apiDomain,
                    responseType: "code",
                    clientId: client.clientId,
                    redirectUri,
                    state,
                    extraQueryParams: {
                        asdfasdf: "asdfasdf",
                    }
                });
    
                const res = await fetch(authorisationUrl, {
                    method: "GET",
                    headers: {
                        "Authorization": `Bearer ${session.accessToken}`,
                    },
                    redirect: "manual",
                });

                assert.strictEqual(res.status, 302);
                const url = new URL(res.headers.get("location"));
                assert(url.href.startsWith(redirectUri + "?"));
                assert.notStrictEqual(url.searchParams.get("code"), undefined);
                assert.strictEqual(url.searchParams.get("state"), state);
                assert.strictEqual(url.searchParams.get("scope"), ""); // We do not set a scope, so it maps to an empty string
            });

            it("should redirect to the client if there is a session (implicit)", async function () {
                const { client } = await OAuth2Provider.createOAuth2Client({
                    redirectUris: [redirectUri],
                    grantTypes: ["implicit"],
                    responseTypes: ["token"],
                });
                const authorisationUrl = createAuthorizationUrl({
                    apiDomain,
                    responseType: "token",
                    clientId: client.clientId,
                    redirectUri,
                    state,
                    extraQueryParams: {
                        asdfasdf: "asdfasdf",
                    }
                });
    
                const res = await fetch(authorisationUrl, {
                    method: "GET",
                    redirect: "manual",
                    headers: {
                        "Authorization": `Bearer ${session.accessToken}`,
                    },
                });

                assert.strictEqual(res.status, 302);
                assert(res.headers.get("location").startsWith(redirectUri + "#"));

                // We already check above that the extra information is in the fragment, this is just for easier parsing
                const url = new URL(res.headers.get("location").replace(redirectUri + "#", redirectUri + "?"));

                assert.notStrictEqual(url.searchParams.get("token"), undefined);
                assert.notStrictEqual(url.searchParams.get("id_token"), undefined);
                assert.strictEqual(url.searchParams.get("state"), state);
                assert.strictEqual(url.searchParams.get("scope"), ""); // We do not set a scope, so it maps to an empty string
                assert.strictEqual(url.searchParams.get("token_type"), "bearer");
                assert.notStrictEqual(url.searchParams.get("expires_in"), undefined);
                assert(Number.parseInt(url.searchParams.get("expires_in")) > 3595); // 5 seconds minus the default 1h expiry
            });

            it("should redirect to the client if there is a session (implicit)", async function () {
                const { client } = await OAuth2Provider.createOAuth2Client({
                    redirectUris: [redirectUri],
                    grantTypes: ["implicit"],
                    responseTypes: ["token"],
                });
                const authorisationUrl = createAuthorizationUrl({
                    apiDomain,
                    responseType: "token",
                    clientId: client.clientId,
                    redirectUri,
                    state,
                });
    
                const res = await fetch(authorisationUrl, {
                    method: "GET",
                    redirect: "manual",
                    headers: {
                        "Authorization": `Bearer ${session.accessToken}`,
                    },
                });

                assert.strictEqual(res.status, 302);
                assert(res.headers.get("location").startsWith(redirectUri + "#"));

                // We already check above that the extra information is in the fragment, this is just for easier parsing
                const url = new URL(res.headers.get("location").replace(redirectUri + "#", redirectUri + "?"));

                assert.notStrictEqual(url.searchParams.get("token"), undefined);
                assert.notStrictEqual(url.searchParams.get("id_token"), undefined);
                assert.strictEqual(url.searchParams.get("state"), state);
                assert.strictEqual(url.searchParams.get("scope"), ""); // We do not set a scope, so it maps to an empty string
                assert.strictEqual(url.searchParams.get("token_type"), "bearer");
                assert.notStrictEqual(url.searchParams.get("expires_in"), undefined);
                assert(Number.parseInt(url.searchParams.get("expires_in")) > 3595); // 5 seconds minus the default 1h expiry
            });

            it("should redirect to the client if there is a session (code+token)", async function () {
                const { client } = await OAuth2Provider.createOAuth2Client({
                    redirectUris: [redirectUri],
                    grantTypes: ["implicit", "authorization_code"],
                    responseTypes: ["code token"],
                });
                const authorisationUrl = createAuthorizationUrl({
                    apiDomain,
                    responseType: "code token",
                    clientId: client.clientId,
                    redirectUri,
                    state,
                });
    
                const res = await fetch(authorisationUrl, {
                    method: "GET",
                    redirect: "manual",
                    headers: {
                        "Authorization": `Bearer ${session.accessToken}`,
                    },
                });

                assert.strictEqual(res.status, 302);
                assert(res.headers.get("location").startsWith(redirectUri + "#"));

                // We already check above that the extra information is in the fragment, this is just for easier parsing
                const url = new URL(res.headers.get("location").replace(redirectUri + "#", redirectUri + "?"));

                assert.notStrictEqual(url.searchParams.get("token"), undefined);
                assert.notStrictEqual(url.searchParams.get("id_token"), undefined);
                assert.strictEqual(url.searchParams.get("state"), state);
                assert.strictEqual(url.searchParams.get("scope"), ""); // We do not set a scope, so it maps to an empty string
                assert.strictEqual(url.searchParams.get("token_type"), "bearer");
                assert.notStrictEqual(url.searchParams.get("expires_in"), undefined);
                assert(Number.parseInt(url.searchParams.get("expires_in")) > 3595); // 5 seconds minus the default 1h expiry
            });
        })
    });

    describe("token endpoint", () => {
        let user, session;
        before(async function () {
            const connectionURI = await startST();

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
                        Authorization: getBasicAuthHeader(client.clientId, client.clientSecret),
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
                        Authorization: getBasicAuthHeader(client.clientId, client.clientSecret),
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
                        Authorization: getBasicAuthHeader(client.clientId, client.clientSecret),
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
                        Authorization: getBasicAuthHeader(client.clientId, client.clientSecret),
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

function checkErrorRedirection(res, expectedError, expectedErrorDescription, customState) {
    assert.strictEqual(res.status, 302);
    const url = new URL(res.headers.get("location"));
    assert.strictEqual(url.protocol + "//" + url.host + url.pathname, redirectUri);
    assert.strictEqual(url.searchParams.size, 3);

    assert.strictEqual(url.searchParams.get("error"), expectedError);
    assert.strictEqual(url.searchParams.get("error_description"), expectedErrorDescription);
    assert.strictEqual(url.searchParams.get("state"), customState ?? state);
    assert.strictEqual(url.hash, "");
}

function getBasicAuthHeader(clientId, clientSecret) {
    return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
}
