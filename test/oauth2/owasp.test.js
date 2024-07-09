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
const { OAuth2, EmailPassword, Session, supertokens: SuperTokens } = recipesMock;
const { default: generatePKCEChallenge} = require("pkce-challenge");
const { createAuthorizationUrl, testOAuthFlowAndGetAuthCode } = require("../oauth2/utils");

describe(`OAuth2 OWASP checks: ${printPath("[test/oauth2/owasp.test.js]")}`, function () {
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

    const redirectUri = "http://localhost:4000/redirect-url";
    const defaultClientConf = {
        redirectUris: [redirectUri],
        scope: "profile",
        skipConsent: true,
        grantTypes: ["authorization_code", "refresh_token"],
        responseTypes: ["code", "id_token"],
        tokenEndpointAuthMethod: "client_secret_post",
    };

    const apiDomain = `http://localhost:${API_PORT}`;
    const websiteDomain = "http://supertokens.io";

    describe("redirect uri validation when starting the auth flow", () => {
        it("should reject changed path", async () => {
            const connectionURI = await startST();

            const apiDomain = `http://localhost:${API_PORT}`;
            const websiteDomain = "http://supertokens.io";

            SuperTokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain,
                    appName: "SuperTokens",
                    websiteDomain,
                },
                recipeList: [EmailPassword.init(), OAuth2.init(), Session.init()],
            });

            const { client } = await OAuth2.createOAuth2Client(defaultClientConf, {});

            const state = new Buffer.from("some-random-string", "base64").toString();

            const authorisationUrl = createAuthorizationUrl({ apiDomain, clientId: client.clientId, redirectUri: redirectUri + "/subpath", state, scope: "profile" });
            // Start the OAuth Flow
            let res = await fetch(authorisationUrl, { method: "GET", redirect: "manual" });

            let nextUrl = res.headers.get("Location");
            let nextUrlObj = new URL(nextUrl);
            // TODO: check host & path
            assert(nextUrlObj.searchParams.get("error"), "invalid_request");
            assert(
                nextUrlObj.searchParams
                    .get("error_description")
                    .includes(
                        "The 'redirect_uri' parameter does not match any of the OAuth 2.0 Client's pre-registered redirect urls"
                    )
            );
        });

        it("should reject changed domain", async () => {
            const connectionURI = await startST();

            const apiDomain = `http://localhost:${API_PORT}`;
            const websiteDomain = "http://supertokens.io";

            SuperTokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain,
                    appName: "SuperTokens",
                    websiteDomain,
                },
                recipeList: [EmailPassword.init(), OAuth2.init(), Session.init()],
            });

            const { client } = await OAuth2.createOAuth2Client(defaultClientConf, {});

            const state = new Buffer.from("some-random-string", "base64").toString();

            const authorisationUrl = createAuthorizationUrl({ apiDomain, clientId: client.clientId, redirectUri: redirectUri.replace("localhost", "localhost.org"), state, scope: "profile" });

            // Start the OAuth Flow
            let res = await fetch(authorisationUrl, { method: "GET", redirect: "manual" });

            let nextUrl = res.headers.get("Location");
            let nextUrlObj = new URL(nextUrl);
            // TODO: check host & path
            assert(nextUrlObj.searchParams.get("error"), "invalid_request");
            assert(
                nextUrlObj.searchParams
                    .get("error_description")
                    .includes(
                        "The 'redirect_uri' parameter does not match any of the OAuth 2.0 Client's pre-registered redirect urls"
                    )
            );
        });

        it("should reject shortened domain", async () => {
            const connectionURI = await startST();

            const apiDomain = `http://localhost:${API_PORT}`;
            const websiteDomain = "http://supertokens.io";

            SuperTokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain,
                    appName: "SuperTokens",
                    websiteDomain,
                },
                recipeList: [EmailPassword.init(), OAuth2.init(), Session.init()],
            });

            const { client } = await OAuth2.createOAuth2Client(defaultClientConf, {});

            const state = new Buffer.from("some-random-string", "base64").toString();

            const authorisationUrl = createAuthorizationUrl({ apiDomain, clientId: client.clientId, redirectUri: redirectUri.replace("localhost", "127.1"), state, scope: "profile" });

            // Start the OAuth Flow
            let res = await fetch(authorisationUrl, { method: "GET", redirect: "manual" });
            let nextUrl = res.headers.get("Location");
            let nextUrlObj = new URL(nextUrl);
            // TODO: check host & path
            assert(nextUrlObj.searchParams.get("error"), "invalid_request");
            assert(
                nextUrlObj.searchParams
                    .get("error_description")
                    .includes(
                        "The 'redirect_uri' parameter does not match any of the OAuth 2.0 Client's pre-registered redirect urls"
                    )
            );
        });

        it("should reject different domain format", async () => {
            const connectionURI = await startST();

            const apiDomain = `http://localhost:${API_PORT}`;
            const websiteDomain = "http://supertokens.io";

            SuperTokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain,
                    appName: "SuperTokens",
                    websiteDomain,
                },
                recipeList: [EmailPassword.init(), OAuth2.init(), Session.init()],
            });

            const { client } = await OAuth2.createOAuth2Client(defaultClientConf, {});

            const state = new Buffer.from("some-random-string", "base64").toString();

            const authorisationUrl = createAuthorizationUrl({ apiDomain, clientId: client.clientId, redirectUri: redirectUri.replace("localhost", "2130706433"), state, scope: "profile" });
            let res = await fetch(authorisationUrl, { method: "GET", redirect: "manual" });

            let nextUrl = res.headers.get("Location");
            let nextUrlObj = new URL(nextUrl);
            // TODO: check host & path
            assert(nextUrlObj.searchParams.get("error"), "invalid_request");
            assert(
                nextUrlObj.searchParams
                    .get("error_description")
                    .includes(
                        "The 'redirect_uri' parameter does not match any of the OAuth 2.0 Client's pre-registered redirect urls"
                    )
            );
        });
    });

    describe("Authorization Code validation", () => {
        it("should reject codes belonging to a different clientId", async function () {
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
                recipeList: [EmailPassword.init(), OAuth2.init(), Session.init()],
            });

            const redirectUri = "http://localhost:4000/redirect-url";
            const scope = "profile";
            const { client } = await OAuth2.createOAuth2Client(defaultClientConf, {});
            const { client: client2 } = await OAuth2.createOAuth2Client(defaultClientConf, {});

            const state = new Buffer.from("some-random-string", "base64").toString();

            const authorisationUrl = createAuthorizationUrl({ apiDomain, clientId: client.clientId, redirectUri, state, scope });

            const { authorizationCode } = await testOAuthFlowAndGetAuthCode({ apiDomain, websiteDomain, clientId: client.clientId, authorisationUrl, redirectUri, scope, state });

            let url = `${apiDomain}/auth/oauth2/token`;
            const res = await fetch(url, {
                method: "POST",
                body: new URLSearchParams({
                    code: authorizationCode,
                    client_id: client2.clientId,
                    client_secret: client2.clientSecret,
                    grant_type: "authorization_code",
                    redirect_uri: redirectUri,
                }),
            });
            const tokenResp = await res.json();
            assert.strictEqual(res.status, 200);
            assert.deepStrictEqual(tokenResp, {
                error: "invalid_grant",
                error_description:
                    "The provided authorization grant (e.g., authorization code, resource owner credentials) or refresh token is invalid, expired, revoked, does not match the redirection URI used in the authorization request, or was issued to another client. The OAuth 2.0 Client ID from this request does not match the one from the authorize request.",
            });
        });

        it("should reject reused codes", async function () {
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
                recipeList: [EmailPassword.init(), OAuth2.init(), Session.init()],
            });

            const redirectUri = "http://localhost:4000/redirect-url";
            const scope = "profile";
            const { client } = await OAuth2.createOAuth2Client(defaultClientConf, {});

            const state = new Buffer.from("some-random-string", "base64").toString();

            const authorisationUrl = createAuthorizationUrl({ apiDomain, clientId: client.clientId, redirectUri, state, scope });
            const { authorizationCode } = await testOAuthFlowAndGetAuthCode({ apiDomain, websiteDomain, clientId: client.clientId, authorisationUrl, redirectUri, scope, state });

            let url = `${apiDomain}/auth/oauth2/token`;
            // The first call consumes the code
            await fetch(url, {
                method: "POST",
                body: new URLSearchParams({
                    code: authorizationCode,
                    client_id: client.clientId,
                    client_secret: client.clientSecret,
                    grant_type: "authorization_code",
                    redirect_uri: redirectUri,
                }),
            });

            // then we check for errors
            const res = await fetch(url, {
                method: "POST",
                body: new URLSearchParams({
                    code: authorizationCode,
                    client_id: client.clientId,
                    client_secret: client.clientSecret,
                    grant_type: "authorization_code",
                    redirect_uri: redirectUri,
                }),
            });
            const tokenResp = await res.json();

            assert.strictEqual(res.status, 200);
            assert.deepStrictEqual(tokenResp, {
                error: "invalid_grant",
                error_description:
                    "The provided authorization grant (e.g., authorization code, resource owner credentials) or refresh token is invalid, expired, revoked, does not match the redirection URI used in the authorization request, or was issued to another client. The authorization code has already been used.",
            });
        });

        it("should reject codes belonging to a different redirectURI", async function () {
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
                recipeList: [EmailPassword.init(), OAuth2.init(), Session.init()],
            });

            const scope = "profile";
            const redirectUri = "http://localhost:4000/redirect-url";
            const redirectUri2 = "http://localhost:4000/redirect-url2";
            const { client } = await OAuth2.createOAuth2Client(
                { ...defaultClientConf, redirectUris: [redirectUri, redirectUri2] },
                {}
            );

            const state = new Buffer.from("some-random-string", "base64").toString();

            const authorisationUrl = createAuthorizationUrl({ apiDomain, clientId: client.clientId, redirectUri, state, scope });
            const { authorizationCode } = await testOAuthFlowAndGetAuthCode({ apiDomain, websiteDomain, clientId: client.clientId, authorisationUrl, redirectUri, scope, state });

            let url = `${apiDomain}/auth/oauth2/token`;
            // then we check for errors
            const res = await fetch(url, {
                method: "POST",
                body: new URLSearchParams({
                    code: authorizationCode,
                    client_id: client.clientId,
                    client_secret: client.clientSecret,
                    grant_type: "authorization_code",
                    redirect_uri: redirectUri2,
                }),
            });
            const tokenResp = await res.json();

            assert.strictEqual(res.status, 200);
            assert.deepStrictEqual(tokenResp, {
                error: "invalid_grant",
                error_description:
                    "The provided authorization grant (e.g., authorization code, resource owner credentials) or refresh token is invalid, expired, revoked, does not match the redirection URI used in the authorization request, or was issued to another client. The 'redirect_uri' from this request does not match the one from the authorize request.",
            });
        });
    });

    describe("blocking PKCE downgrades", () => {
        it("should reject omitting the code challenge", async function () {
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
                recipeList: [EmailPassword.init(), OAuth2.init(), Session.init()],
            });

            const scope = "profile";
            const redirectUri = "http://localhost:4000/redirect-url";
            const { client } = await OAuth2.createOAuth2Client({...defaultClientConf, }, {});

            const state = new Buffer.from("some-random-string", "base64").toString();
            const { code_challenge, code_verifier } = generatePKCEChallenge(64); // According to https://www.rfc-editor.org/rfc/rfc7636, length must be between 43 and 128

            const authorisationUrl = createAuthorizationUrl({ apiDomain, clientId: client.clientId, redirectUri, state, scope });

            const { authorizationCode } = await testOAuthFlowAndGetAuthCode({ apiDomain, websiteDomain, clientId: client.clientId, authorisationUrl, redirectUri, scope, state });

            let url = `${apiDomain}/auth/oauth2/token`;
            const res = await fetch(url, {
                method: "POST",
                body: new URLSearchParams({
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
            assert.deepStrictEqual(tokenResp, {
                error: "invalid_grant",
                error_description:
                    "The provided authorization grant (e.g., authorization code, resource owner credentials) or refresh token is invalid, expired, revoked, does not match the redirection URI used in the authorization request, or was issued to another client. The PKCE code challenge did not match the code verifier.",
            });
        });

        it("should reject omitting the code verifier", async function () {
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
                recipeList: [EmailPassword.init(), OAuth2.init(), Session.init()],
            });

            const scope = "profile";
            const redirectUri = "http://localhost:4000/redirect-url";
            const { client } = await OAuth2.createOAuth2Client({...defaultClientConf, }, {});

            const state = new Buffer.from("some-random-string", "base64").toString();
            const { code_challenge, code_verifier } = generatePKCEChallenge(64); // According to https://www.rfc-editor.org/rfc/rfc7636, length must be between 43 and 128

            const authorisationUrl = createAuthorizationUrl({ apiDomain, clientId: client.clientId, redirectUri, state, scope, extraQueryParams: {
                code_challenge,
                code_challenge_method: "S256",
            } });

            const { authorizationCode } = await testOAuthFlowAndGetAuthCode({ apiDomain, websiteDomain, clientId: client.clientId, authorisationUrl, redirectUri, scope, state });

            let url = `${apiDomain}/auth/oauth2/token`;
            const res = await fetch(url, {
                method: "POST",
                body: new URLSearchParams({
                    code: authorizationCode,
                    client_id: client.clientId,
                    client_secret: client.clientSecret,
                    grant_type: "authorization_code",
                    redirect_uri: redirectUri,
                }),
            });
            const tokenResp = await res.json();
            assert.strictEqual(res.status, 200);
            assert.deepStrictEqual(tokenResp, {
                error: "invalid_grant",
                error_description:
                    "The provided authorization grant (e.g., authorization code, resource owner credentials) or refresh token is invalid, expired, revoked, does not match the redirection URI used in the authorization request, or was issued to another client. The PKCE code verifier must be at least 43 characters.",
            });
        });

        it("should reject sending the code verifier of another request", async function () {
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
                recipeList: [EmailPassword.init(), OAuth2.init(), Session.init()],
            });

            const scope = "profile";
            const redirectUri = "http://localhost:4000/redirect-url";
            const { client } = await OAuth2.createOAuth2Client({...defaultClientConf, }, {});

            const state = new Buffer.from("some-random-string", "base64").toString();
            const { code_challenge, code_verifier } = generatePKCEChallenge(64); // According to https://www.rfc-editor.org/rfc/rfc7636, length must be between 43 and 128
            const { code_challenge: code_challenge2 } = generatePKCEChallenge(64); // According to https://www.rfc-editor.org/rfc/rfc7636, length must be between 43 and 128

            const authorisationUrl = createAuthorizationUrl({ apiDomain, clientId: client.clientId, redirectUri, state, scope, extraQueryParams: {
                code_challenge,
                code_challenge_method: "S256",
            } });

            const { authorizationCode } = await testOAuthFlowAndGetAuthCode({ apiDomain, websiteDomain, clientId: client.clientId, authorisationUrl, redirectUri, scope, state });

            const authorisationUrl2 = createAuthorizationUrl({ apiDomain, clientId: client.clientId, redirectUri, state, scope, extraQueryParams: {
                code_challenge: code_challenge2,
                code_challenge_method: "S256",
            } });

            const { authorizationCode: authorizationCode2 } = await testOAuthFlowAndGetAuthCode({ apiDomain, websiteDomain, clientId: client.clientId, authorisationUrl: authorisationUrl2, redirectUri, scope, state, useSignIn: true });

            let url = `${apiDomain}/auth/oauth2/token`;
            const res = await fetch(url, {
                method: "POST",
                body: new URLSearchParams({
                    code: authorizationCode2,
                    client_id: client.clientId,
                    client_secret: client.clientSecret,
                    grant_type: "authorization_code",
                    code_verifier,
                    redirect_uri: redirectUri,
                }),
            });
            const tokenResp = await res.json();
            assert.strictEqual(res.status, 200);
            assert.deepStrictEqual(tokenResp, {
                error: "invalid_grant",
                error_description:
                    "The provided authorization grant (e.g., authorization code, resource owner credentials) or refresh token is invalid, expired, revoked, does not match the redirection URI used in the authorization request, or was issued to another client. The PKCE code challenge did not match the code verifier.",
            });
        });
    });
});
