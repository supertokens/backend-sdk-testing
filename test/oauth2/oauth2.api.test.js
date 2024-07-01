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
const { recipesMock, getOverrideParams, randomString, API_PORT } = require("../../api-mock");
const { OAuth2, EmailPassword, Session, supertokens: SuperTokens } = recipesMock;
const setCookieParser = require("set-cookie-parser");

describe(`OAuth2-API: ${printPath("[test/oauth2/oauth2.api.test.js]")}`, function () {
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

    it("should simulate a successful OAuth2 login flow ", async function () {
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

        // This will be used to store all Set-Cookie headers in the subsequent requests
        const allSetCookieHeaders = [];

        function saveCookies(res) {
            const cookieStr = setCookieParser.splitCookiesString(res.headers.get("Set-Cookie"));
            const cookies = setCookieParser.parse(cookieStr);
            allSetCookieHeaders.push(...cookies);
        }

        function getCookieHeader() {
            return allSetCookieHeaders.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
        }

        const redirectUri = "http://localhost:4000/redirect-url";
        const { client } = await OAuth2.createOAuth2Client(
            {
                redirectUris: [redirectUri],
                scope: "profile",
                skipConsent: true,
                grantTypes: ["authorization_code", "refresh_token"],
                responseTypes: ["code", "id_token"],
                tokenEndpointAuthMethod: "client_secret_post",
            },
            {}
        );

        const state = new Buffer.from("some-random-string", "base64").toString();

        const queryParams = {
            client_id: client.clientId,
            redirect_uri: redirectUri,
            response_type: "code",
            scope: "profile",
            state,
        };

        // Start the OAuth Flow
        let url = `${apiDomain}/auth/oauth2/auth?${new URLSearchParams(queryParams)}`;
        let res = await fetch(url, { method: "GET", redirect: "manual" });
        saveCookies(res);

        let nextUrl = res.headers.get("Location");
        let nextUrlObj = new URL(nextUrl);
        const loginChallenge = nextUrlObj.searchParams.get("login_challenge");

        assert.strictEqual(nextUrlObj.origin + nextUrlObj.pathname, apiDomain + "/auth/oauth2/login");
        assert(loginChallenge !== null);

        res = await fetch(nextUrl, {
            method: "GET",
            redirect: "manual",
            headers: {
                Cookie: getCookieHeader(),
            },
        });

        saveCookies(res);

        nextUrl = res.headers.get("Location");
        nextUrlObj = new URL(nextUrl);

        assert.strictEqual(nextUrlObj.origin + nextUrlObj.pathname, `${websiteDomain}/auth`);
        assert.strictEqual(nextUrlObj.searchParams.get("loginChallenge"), loginChallenge);


        // We have been redirected to the frontend login page. We will create the session manually to simulate login.
        const createSessionUser = await EmailPassword.signUp("public", "test@example.com", "password123");
        const session = await Session.createNewSessionWithoutRequestResponse("public", createSessionUser.recipeUserId);

        res = await fetch(`${apiDomain}/auth/oauth2/login?loginChallenge=${loginChallenge}`, {
            method: "GET",
            redirect: "manual",
            headers: {
                Authorization: `Bearer ${session.getAccessToken()}`,
                Cookie: getCookieHeader(),
            },
        });

        saveCookies(res);

        nextUrl = res.headers.get("Location");
        nextUrlObj = new URL(nextUrl);

        assert.strictEqual(nextUrlObj.origin + nextUrlObj.pathname, `${apiDomain}/auth/oauth2/auth`);
        assert.strictEqual(nextUrlObj.searchParams.get("client_id"), client.clientId);
        assert.strictEqual(nextUrlObj.searchParams.get("redirect_uri"), redirectUri);
        assert.strictEqual(nextUrlObj.searchParams.get("response_type"), "code");
        assert.strictEqual(nextUrlObj.searchParams.get("scope"), "profile");
        assert.strictEqual(nextUrlObj.searchParams.get("state"), state);
        assert(nextUrlObj.searchParams.get("login_verifier") !== null);

        res = await fetch(nextUrl, {
            method: "GET",
            redirect: "manual",
            headers: {
                Authorization: `Bearer ${session.getAccessToken()}`,
                Cookie: getCookieHeader(),
            },
        });

        saveCookies(res);

        nextUrl = res.headers.get("Location");
        nextUrlObj = new URL(nextUrl);

        assert.strictEqual(nextUrlObj.origin + nextUrlObj.pathname, `${apiDomain}/auth/oauth2/auth`);
        assert.strictEqual(nextUrlObj.searchParams.get("client_id"), client.clientId);
        assert.strictEqual(nextUrlObj.searchParams.get("redirect_uri"), redirectUri);
        assert.strictEqual(nextUrlObj.searchParams.get("response_type"), "code");
        assert.strictEqual(nextUrlObj.searchParams.get("scope"), "profile");
        assert.strictEqual(nextUrlObj.searchParams.get("state"), state);
        assert(nextUrlObj.searchParams.get("consent_verifier") !== null);


        res = await fetch(nextUrl, {
            method: "GET",
            redirect: "manual",
            headers: {
                Authorization: `Bearer ${session.getAccessToken()}`,
                Cookie: getCookieHeader(),
            },
        });

        saveCookies(res);

        nextUrl = res.headers.get("Location");
        nextUrlObj = new URL(nextUrl);

        assert.strictEqual(nextUrlObj.origin + nextUrlObj.pathname, redirectUri);
        assert.strictEqual(nextUrlObj.searchParams.get("scope"), "profile");
        assert.strictEqual(nextUrlObj.searchParams.get("state"), state);
    });
});
