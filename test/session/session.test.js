/* Copyright (c) 2021, VRAI Labs and/or its affiliates. All rights reserved.
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
const { printPath, createCoreApplication } = require("../utils");
const assert = require("assert");
const { recipesMock } = require("../../api-mock");
const { EmailPassword, Session, supertokens } = recipesMock;
const SuperTokens = require("supertokens-node");
const { getMockStatus, initApp, fdiVersion, API_PORT } = require("../../build/api-mock/fetcher");
const { deserializeSession } = require("../../build/api-mock/mocks/SessionMock");
const setCookieParser = require("set-cookie-parser");
const { User: UserClass } = require("supertokens-node/lib/build/user");
const fetch = require("cross-fetch");

// Re-defined functions since these tests require response headers to be parsed
async function queryAPI({ method, path, input, headers, returnResponse, skipInit }) {
    if (!skipInit && getMockStatus() === "NOT_READY") {
        await initApp();
    }
    try {
        let response = await fetch(`http://localhost:${API_PORT}${path}`, {
            method,
            headers: {
                "Content-Type": "application/json",
                "fdi-version": fdiVersion,
                ...headers,
            },
            body: JSON.stringify(input),
        });

        if (returnResponse) {
            return { response, headers: response.headers };
        }

        if (!response.ok) {
            throw response;
        }

        return {
            response: await response.json().catch(() => undefined),
            headers: response.headers,
        };
    } catch (error) {
        console.log(error);
        throw await error.json().catch(() => undefined);
    }
}

const signUp = async (tenantId, email, password, session, userContext) => {
    const { response } = await queryAPI({
        method: "post",
        path: "/test/emailpassword/signup",
        input: { tenantId, email, password, session, userContext },
    });
    return {
        ...response,
        ...("user" in response
            ? {
                  user: new UserClass(response.user),
              }
            : {}),
        ...("recipeUserId" in response
            ? {
                  recipeUserId: SuperTokens.convertToRecipeUserId(response.recipeUserId),
              }
            : {}),
    };
};

const createNewSession = async (
    tenantId,
    recipeUserId,
    accessTokenPayload,
    sessionDataInDatabase,
    disableAntiCsrf,
    userContext
) => {
    const { response, headers } = await queryAPI({
        method: "post",
        path: "/test/session/createnewsession",
        input: {
            tenantId,
            recipeUserId: recipeUserId.getAsString(),
            accessTokenPayload,
            sessionDataInDatabase,
            disableAntiCsrf,
            userContext,
        },
    });
    return { session: deserializeSession(response), headers };
};

describe(`sessionTests: ${printPath("[test/session/session.test.js]")}`, function () {
    describe("Cookie checks", function () {
        it("access and refresh tokens set correctly on new session", async function () {
            const connectionURI = await createCoreApplication();
            supertokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [EmailPassword.init(), Session.init({ getTokenTransferMethod: "cookie" })],
            });

            const signUpResponse = await signUp("public", "test@example.com", "password123");
            const epUser = signUpResponse.user;

            // Create a new session for the user, get headers from the response
            const { session, headers } = await createNewSession("public", epUser.loginMethods[0].recipeUserId);

            let cookies = headers.get("set-cookie");
            if (!Array.isArray(cookies)) {
                cookies = [cookies];
            }

            // Parse cookies from the response. Fastapi set-cookie responses are a large string.
            cookies = cookies
                .flat() // Ensure we have a flat array of cookies
                // Split cookie strings into arrays
                .map((cookieStr) => setCookieParser.splitCookiesString(cookieStr))
                .flat() // Since we have an array of arrays now
                // `parse` the cookies
                .map(setCookieParser.parseString);

            const accessTokenCookie = cookies.find((info) => (info?.key ?? info?.name) == "sAccessToken");
            const refreshTokenCookie = cookies.find((info) => (info?.key ?? info?.name) === "sRefreshToken");

            // Ensure cookies are set and with GMT timezones
            // https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Date - Date headers are always GMT
            // https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie#expiresdate - Invalid cookies become session cookies
            assert(accessTokenCookie, "Access token cookie not found");
            assert(accessTokenCookie.expires, "Access token cookie expiry not set");
            assert(
                new Date(accessTokenCookie.expires).toUTCString().endsWith("GMT"),
                "Access token cookie expiry is not in GMT"
            );

            assert(refreshTokenCookie, "Refresh token cookie not found");
            assert(refreshTokenCookie.expires, "Refresh token cookie expiry not set");
            assert(
                new Date(refreshTokenCookie.expires).toUTCString().endsWith("GMT"),
                "Refresh token cookie expiry is not in GMT"
            );

            assert(session.getUserId() === session.getRecipeUserId().getAsString());
        });
    });
});
