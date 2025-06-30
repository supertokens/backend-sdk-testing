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
const { recipesMock, request } = require("../../api-mock");
const { EmailPassword, Session, supertokens } = recipesMock;
const SuperTokens = require("supertokens-node");
const setCookieParser = require("set-cookie-parser");
const { User: UserClass } = require("supertokens-node/lib/build/user");

const signUp = async (tenantId, email, password, session, userContext) => {
    let response = await new Promise((resolve) =>
        request()
            .post("/auth/signup")
            .send({
                formFields: [
                    {
                        id: "email",
                        value: email,
                    },
                    {
                        id: "password",
                        value: password,
                    },
                ],
                tenantId,
                session,
                userContext,
            })
            .expect(200)
            .end((err, res) => {
                if (err) {
                    resolve(undefined);
                } else {
                    resolve(res);
                }
            })
    );

    const responseBody = response.body;

    return {
        headers: response.headers,
        response: {
        ...responseBody,
        ...("user" in responseBody
            ? {
                  user: new UserClass(responseBody.user),
              }
            : {}),
        ...("recipeUserId" in responseBody
            ? {
                  recipeUserId: SuperTokens.convertToRecipeUserId(responseBody.recipeUserId),
              }
            : {}),
    }};
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

            const { response, headers } = await signUp("public", "test@example.com", "password123");
            const epUser = response.user;

            // Create a new session for the user, get headers from the response
            const session = await Session.createNewSessionWithoutRequestResponse("public", epUser.loginMethods[0].recipeUserId);

            let cookies = headers?.["set-cookie"];
            assert(cookies, "No cookies found in response headers");

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
