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
const { createAuthorizationUrl, testOAuthFlowAndGetAuthCode } = require("../oauth2/utils");

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
            recipeList: [EmailPassword.init(), OAuth2.init(), Session.init()],
        });

        const redirectUri = "http://localhost:4000/redirect-url";
        const { client } = await OAuth2.createOAuth2Client(
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

        const authorisationUrl = createAuthorizationUrl({ apiDomain, clientId : client.clientId, redirectUri, state });

        const { authorizationCode } = await testOAuthFlowAndGetAuthCode({
            apiDomain,
            websiteDomain,
            authorisationUrl,
            clientId: client.clientId,
            redirectUri,
            scope,
            state
        });

        const res = await fetch(`${apiDomain}/auth/oauth2/token`, {
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
        assert(tokenResp.access_token !== undefined);
        assert.strictEqual(tokenResp.token_type, "bearer");
        assert.strictEqual(tokenResp.scope, scope);
    });
});
