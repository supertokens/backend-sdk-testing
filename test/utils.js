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
const { exec } = require("child_process");
const { default: fetch } = require("cross-fetch");
let SuperTokens = require("supertokens-node/lib/build/supertokens").default;
let SessionRecipe = require("supertokens-node/lib/build/recipe/session/recipe").default;
let AccountLinkingRecipe = require("supertokens-node/lib/build/recipe/accountlinking/recipe").default;
let ThirdPartyRecipe = require("supertokens-node/lib/build/recipe/thirdparty/recipe").default;
let EmailPasswordRecipe = require("supertokens-node/lib/build/recipe/emailpassword/recipe").default;
let DashboardRecipe = require("supertokens-node/lib/build/recipe/dashboard/recipe").default;
let TotpRecipe = require("supertokens-node/lib/build/recipe/totp/recipe").default;
const EmailVerificationRecipe = require("supertokens-node/lib/build/recipe/emailverification/recipe").default;
let JWTRecipe = require("supertokens-node/lib/build/recipe/jwt/recipe").default;
const UserMetadataRecipe = require("supertokens-node/lib/build/recipe/usermetadata/recipe").default;
let PasswordlessRecipe = require("supertokens-node/lib/build/recipe/passwordless/recipe").default;
let MultitenancyRecipe = require("supertokens-node/lib/build/recipe/multitenancy/recipe").default;
let MultiFactorAuthRecipe = require("supertokens-node/lib/build/recipe/multifactorauth/recipe").default;
const UserRolesRecipe = require("supertokens-node/lib/build/recipe/userroles/recipe").default;
let { ProcessState } = require("supertokens-node/lib/build/processState");
const { default: OpenIDRecipe } = require("supertokens-node/lib/build/recipe/openid/recipe");
let debug = require("debug");
let assert = require("assert");
const { CollectingResponse } = require("supertokens-node/framework/custom");
const { randomUUID } = require("node:crypto");
const setCookieParser = require("set-cookie-parser");

module.exports.printPath = function (path) {
    return `${createFormat([consoleOptions.yellow, consoleOptions.italic, consoleOptions.dim])}${path}${createFormat([
        consoleOptions.default,
    ])}`;
};

module.exports.executeCommand = async function (cmd) {
    return new Promise((resolve, reject) => {
        exec(cmd, (err, stdout, stderr) => {
            if (err) {
                reject(err);
                return;
            }
            resolve({ stdout, stderr });
        });
    });
};

module.exports.extractInfoFromResponse = function (res) {
    if (!res) {
        throw new Error("Expected `res` to be defined to parse response.");
    }

    let headers;
    let accessToken = undefined;
    let refreshToken = undefined;
    let accessTokenExpiry = undefined;
    let refreshTokenExpiry = undefined;
    let idRefreshTokenExpiry = undefined;
    let accessTokenDomain = undefined;
    let refreshTokenDomain = undefined;
    let idRefreshTokenDomain = undefined;
    let accessTokenHttpOnly = false;
    let idRefreshTokenHttpOnly = false;
    let refreshTokenHttpOnly = false;

    let cookies = [];
    if (res instanceof CollectingResponse) {
        headers = Object.fromEntries(res.headers.entries());
        cookies = res.cookies;
    } else {
        headers = res.headers;
        cookies = res.headers["set-cookie"] || res.headers["Set-Cookie"];
        cookies = cookies === undefined ? [] : cookies;
        if (!Array.isArray(cookies)) {
            cookies = [cookies];
        }

        cookies = cookies
            .flat() // Ensure we have a flat array of cookies
            // Split cookie strings into arrays
            .map((cookieStr) => setCookieParser.splitCookiesString(cookieStr))
            .flat() // Since we have an array of arrays now
            // `parse` the cookies
            .map(setCookieParser.parseString);
    }
    // `CollectingResponse` objects use `key`, `set-cookie-parser` objects use `name`
    const accessTokenCookie = cookies.find((info) => (info?.key ?? info?.name) == "sAccessToken");
    if (accessTokenCookie) {
        accessToken = accessTokenCookie?.value;
        accessTokenExpiry = new Date(accessTokenCookie.expires).toUTCString();
        accessTokenDomain = accessTokenCookie.domain;
        accessTokenHttpOnly = accessTokenCookie.httpOnly;
    }
    const refreshTokenCookie = cookies.find((info) => (info?.key ?? info?.name) === "sRefreshToken");
    if (refreshTokenCookie) {
        refreshToken = refreshTokenCookie?.value;
        refreshTokenExpiry = new Date(refreshTokenCookie.expires).toUTCString();
        refreshTokenDomain = refreshTokenCookie.domain;
        refreshTokenHttpOnly = refreshTokenCookie.httpOnly;
    }

    let antiCsrf = headers["anti-csrf"];
    let frontToken = headers["front-token"];

    const refreshTokenFromHeader = headers["st-refresh-token"];
    const accessTokenFromHeader = headers["st-access-token"];

    const accessTokenFromAny = accessToken === undefined ? accessTokenFromHeader : accessToken;
    const refreshTokenFromAny = refreshToken === undefined ? refreshTokenFromHeader : refreshToken;

    return {
        status: res.status || res.statusCode,
        body: res.body,
        antiCsrf,
        accessToken,
        refreshToken,
        accessTokenFromHeader,
        refreshTokenFromHeader,
        accessTokenFromAny,
        refreshTokenFromAny,
        accessTokenExpiry,
        refreshTokenExpiry,
        idRefreshTokenExpiry,
        accessTokenDomain,
        refreshTokenDomain,
        idRefreshTokenDomain,
        frontToken,
        accessTokenHttpOnly,
        refreshTokenHttpOnly,
        idRefreshTokenHttpOnly,
    };
};

module.exports.resetAll = function (disableLogging = true) {
    SuperTokens.reset();
    AccountLinkingRecipe.reset();
    SessionRecipe.reset();
    EmailPasswordRecipe.reset();
    ThirdPartyRecipe.reset();
    EmailVerificationRecipe.reset();
    JWTRecipe.reset();
    UserMetadataRecipe.reset();
    UserRolesRecipe.reset();
    PasswordlessRecipe.reset();
    OpenIDRecipe.reset();
    DashboardRecipe.reset();
    ProcessState.getInstance().reset();
    MultitenancyRecipe.reset();
    TotpRecipe.reset();
    MultiFactorAuthRecipe.reset();
    if (disableLogging) {
        debug.disable();
    }
};

module.exports.getCoreUrl = () => {
    const host = process.env?.SUPERTOKENS_CORE_HOST ?? "localhost";
    const port = process.env?.SUPERTOKENS_CORE_PORT ?? "3567";

    const coreUrl = `http://${host}:${port}`;

    return coreUrl;
};

module.exports.getCoreUrlFromConnectionURI = (connectionURI) => {
    let coreUrl = connectionURI;

    if (coreUrl.includes("appid-")) {
        coreUrl = connectionURI.split("appid-")[0];
    }

    if (coreUrl.endsWith("/")) {
        coreUrl = coreUrl.slice(0, -1);
    }

    return coreUrl;
};

module.exports.getAppIdFromConnectionURI = function (connectionURI) {
    return connectionURI.split("/").pop().split("-").pop();
};

module.exports.createCoreApplication = async function ({ appId, coreConfig } = {}) {
    const coreUrl = module.exports.getCoreUrl();

    if (!appId) {
        appId = randomUUID();
    }

    if (!coreConfig) {
        coreConfig = {};
    }

    const createAppResp = await fetch(`${coreUrl}/recipe/multitenancy/app/v2`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            appId,
            coreConfig,
        }),
    });

    const respBody = await createAppResp.json();
    assert.strictEqual(respBody.status, "OK");
    assert.strictEqual(respBody.createdNew, true);

    return `${coreUrl}/appid-${appId}`;
};

module.exports.removeCoreApplication = async function ({ connectionURI } = {}) {
    const coreUrl = module.exports.getCoreUrlFromConnectionURI(connectionURI);
    const appId = module.exports.getAppIdFromConnectionURI(connectionURI);

    const removeAppResp = await fetch(`${coreUrl}/recipe/multitenancy/app/remove`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            appId,
        }),
    });

    const respBody = await removeAppResp.json();
    assert.strictEqual(respBody.status, "OK");

    return true;
};

function createFormat(options) {
    if (options.length === 0) {
        return ``;
    }
    let format = `\x1b[`;
    for (let i = 0; i < options.length; i++) {
        format += options[i];
        if (i !== options.length - 1) {
            format += `;`;
        }
    }
    format += `m`;
    return format;
}

const consoleOptions = {
    default: 0,
    bold: 1,
    dim: 2,
    italic: 3,
    underline: 4,
    blink: 5,
    white: 29,
    black: 30,
    red: 31,
    green: 32,
    yellow: 33,
    blue: 34,
    purple: 35,
    cyan: 36,
};

module.exports.assertJSONEquals = (actual, expected) => {
    assert.deepStrictEqual(JSON.parse(JSON.stringify(actual)), JSON.parse(JSON.stringify(expected)));
};
