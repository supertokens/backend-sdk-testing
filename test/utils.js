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
const { exec, spawn } = require("child_process");
const nock = require("nock");
let fs = require("fs");
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
let debug = require("debug");
let assert = require("assert");
const { CollectingResponse } = require("supertokens-node/framework/custom");

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

module.exports.setKeyValueInConfig = async function (key, value) {
    return new Promise((resolve, reject) => {
        let installationPath = process.env.INSTALL_PATH;
        fs.readFile(installationPath + "/config.yaml", "utf8", function (err, data) {
            if (err) {
                reject(err);
                return;
            }
            let oldStr = new RegExp("((#\\s)?)" + key + "(:|((:\\s).+))\n");
            let newStr = key + ": " + value + "\n";
            let result = data.replace(oldStr, newStr);
            fs.writeFile(installationPath + "/config.yaml", result, "utf8", function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    });
};

module.exports.extractInfoFromResponse = function (res) {
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

    if (res instanceof CollectingResponse) {
        const accessTokenCookie = res.cookies.find((info) => info.key === "sAccessToken");
        if (accessTokenCookie) {
            accessToken = accessTokenCookie.value;
            accessTokenExpiry = new Date(accessTokenCookie.expires).toUTCString();
            accessTokenDomain = accessTokenCookie.domain;
            accessTokenHttpOnly = accessTokenCookie.httpOnly;
        }
        const refreshTokenCookie = res.cookies.find((info) => info.key === "sRefreshToken");
        if (refreshTokenCookie) {
            refreshToken = refreshTokenCookie.value;
            refreshTokenExpiry = new Date(refreshTokenCookie.expires).toUTCString();
            refreshTokenDomain = refreshTokenCookie.domain;
            refreshTokenHttpOnly = refreshTokenCookie.httpOnly;
        }
        headers = Object.fromEntries(res.headers.entries());
    } else {
        headers = res.headers;
        let cookies = res.headers["set-cookie"] || res.headers["Set-Cookie"];
        cookies = cookies === undefined ? [] : cookies;
        if (!Array.isArray(cookies)) {
            cookies = [cookies];
        }

        cookies.forEach((i) => {
            if (i.split(";")[0].split("=")[0] === "sAccessToken") {
                /**
                 * if token is sAccessToken=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsInZlcnNpb24iOiIyIn0=.eyJzZXNzaW9uSGFuZGxlIjoiMWI4NDBhOTAtMjVmYy00ZjQ4LWE2YWMtMDc0MDIzZjNjZjQwIiwidXNlcklkIjoiIiwicmVmcmVzaFRva2VuSGFzaDEiOiJjYWNhZDNlMGNhMDVkNzRlNWYzNTc4NmFlMGQ2MzJjNDhmMTg1YmZmNmUxNThjN2I2OThkZDYwMzA1NzAyYzI0IiwidXNlckRhdGEiOnt9LCJhbnRpQ3NyZlRva2VuIjoiYTA2MjRjYWItZmIwNy00NTFlLWJmOTYtNWQ3YzU2MjMwZTE4IiwiZXhwaXJ5VGltZSI6MTYyNjUxMjM3NDU4NiwidGltZUNyZWF0ZWQiOjE2MjY1MDg3NzQ1ODYsImxtcnQiOjE2MjY1MDg3NzQ1ODZ9.f1sCkjt0OduS6I6FBQDBLV5zhHXpCU2GXnbe+8OCU6HKG00TX5CM8AyFlOlqzSHABZ7jES/+5k0Ff/rdD34cczlNqICcC4a23AjJg2a097rFrh8/8V7J5fr4UrHLIM4ojZNFz1NyVyDK/ooE6I7soHshEtEVr2XsnJ4q3d+fYs2wwx97PIT82hfHqgbRAzvlv952GYt+OH4bWQE4vTzDqGN7N2OKpn9l2fiCB1Ytzr3ocHRqKuQ8f6xW1n575Q1sSs9F9TtD7lrKfFQH+//6lyKFe2Q1SDc7YU4pE5Cy9Kc/LiqiTU+gsGIJL5qtMzUTG4lX38ugF4QDyNjDBMqCKw==; Max-Age=3599; Expires=Sat, 17 Jul 2021 08:59:34 GMT; Secure; HttpOnly; SameSite=Lax; Path=/'
                 * i.split(";")[0].split("=")[1] will result in eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsInZlcnNpb24iOiIyIn0
                 */
                accessToken = decodeURIComponent(i.split(";")[0].split("=").slice(1).join("="));
                if (i.split(";")[2].includes("Expires=")) {
                    accessTokenExpiry = i.split(";")[2].split("=")[1];
                } else if (i.split(";")[2].includes("expires=")) {
                    accessTokenExpiry = i.split(";")[2].split("=")[1];
                } else {
                    accessTokenExpiry = i.split(";")[3].split("=")[1];
                }
                if (i.split(";")[1].includes("Domain=")) {
                    accessTokenDomain = i.split(";")[1].split("=")[1];
                }
                accessTokenHttpOnly = i.split(";").findIndex((j) => j.includes("HttpOnly")) !== -1;
            } else if (i.split(";")[0].split("=")[0] === "sRefreshToken") {
                refreshToken = i.split(";")[0].split("=").slice(1).join("=");
                if (i.split(";")[2].includes("Expires=")) {
                    refreshTokenExpiry = i.split(";")[2].split("=")[1];
                } else if (i.split(";")[2].includes("expires=")) {
                    refreshTokenExpiry = i.split(";")[2].split("=")[1];
                } else {
                    refreshTokenExpiry = i.split(";")[3].split("=")[1];
                }
                if (i.split(";")[1].includes("Domain=")) {
                    refreshTokenDomain = i.split(";")[1].split("=").slice(1).join("=");
                }
                refreshTokenHttpOnly = i.split(";").findIndex((j) => j.includes("HttpOnly")) !== -1;
            }
        });
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

module.exports.setupST = async function () {
    let installationPath = process.env.INSTALL_PATH;
    try {
        await module.exports.executeCommand("cd " + installationPath + " && cp temp/licenseKey ./licenseKey");
    } catch (ignore) {}
    await module.exports.executeCommand("cd " + installationPath + " && cp temp/config.yaml ./config.yaml");
};

module.exports.cleanST = async function () {
    let installationPath = process.env.INSTALL_PATH;
    try {
        await module.exports.executeCommand("cd " + installationPath + " && rm licenseKey");
    } catch (ignore) {}
    await module.exports.executeCommand("cd " + installationPath + " && rm config.yaml");
    await module.exports.executeCommand("cd " + installationPath + " && rm -rf .webserver-temp-*");
    await module.exports.executeCommand("cd " + installationPath + " && rm -rf .started");
};

module.exports.stopST = async function (pid) {
    let pidsBefore = await getListOfPids();
    if (pidsBefore.length === 0) {
        return;
    }
    await module.exports.executeCommand("kill " + pid);
    let startTime = Date.now();
    while (Date.now() - startTime < 10000) {
        let pidsAfter = await getListOfPids();
        if (pidsAfter.includes(pid)) {
            await new Promise((r) => setTimeout(r, 100));
            continue;
        } else {
            return;
        }
    }
    throw new Error("error while stopping ST with PID: " + pid);
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
    DashboardRecipe.reset();
    ProcessState.getInstance().reset();
    MultitenancyRecipe.reset();
    TotpRecipe.reset();
    MultiFactorAuthRecipe.reset();
    if (disableLogging) {
        debug.disable();
    }
};

module.exports.killAllST = async function () {
    let pids = await getListOfPids();
    for (let i = 0; i < pids.length; i++) {
        await module.exports.stopST(pids[i]);
    }
    module.exports.resetAll();
    nock.cleanAll();
};

module.exports.startST = async function (config = {}) {
    const host = config.host ?? "localhost";
    const port = config.port ?? 8080;
    const notUsingTestApp =
        process.env.REAL_DB_TEST !== "true" || host !== "localhost" || port !== 8080 || config.noApp === true;
    if (config.coreConfig && notUsingTestApp) {
        for (const [k, v] of Object.entries(config.coreConfig)) {
            await module.exports.setKeyValueInConfig(k, v);
        }
    }
    return new Promise(async (resolve, reject) => {
        let installationPath = process.env.INSTALL_PATH;
        let pidsBefore = await getListOfPids();
        let returned = false;
        const child = spawn("java", [
            "-Djava.security.egd=file:/dev/urandom",
            "-classpath",
            "./core/*:./plugin-interface/*",
            "io.supertokens.Main",
            "./",
            "DEV",
            "host=" + host,
            "port=" + port,
            "test_mode",
        ], {
            stdio: "pipe",
            cwd: installationPath,
        });
        child.on("error", (err) => {
            reject(err);
        });
        const stdout = [];
        child.stdio.on("data", (data) => {
            // console.log("[Core log]", data);
            stdout.push(data);
        });
        const stderr = [];
        child.stderr.on("data", (data) => {
            stderr.push(data);
        });
        child.on("close", (code) => {
            if (!returned) {
                returned = true;
                if (code !== 0) {
                    console.log("error starting ST", code);
                    console.log("stdout", stdout);
                    console.log("stderr", stderr);
                    reject(code);
                }
            }
        });
        let startTime = Date.now();
        while (Date.now() - startTime < 30000) {
            let pidsAfter = await getListOfPids();
            if (pidsAfter.length <= pidsBefore.length) {
                await new Promise((r) => setTimeout(r, 100));
                continue;
            }
            let nonIntersection = pidsAfter.filter((x) => !pidsBefore.includes(x));
            if (nonIntersection.length !== 1) {
                if (!returned) {
                    returned = true;
                    reject("something went wrong while starting ST");
                }
            } else {
                if (!returned) {
                    returned = true;
                    if (notUsingTestApp) {
                        return resolve(`http://${host}:${port}`);
                    }
                    try {
                        // Math.random is an unsafe random but it doesn't actually matter here
                        // const appId = configs.appId ?? `testapp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                        const appId = config.appId ?? `testapp`;

                        await module.exports.removeAppAndTenants(appId);

                        // Create app
                        const createAppResp = await fetch(`http://${host}:${port}/recipe/multitenancy/app/v2`, {
                            method: "PUT",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                                appId,
                                coreConfig: config.coreConfig,
                            }),
                        });
                        const respBody = await createAppResp.json();
                        assert.strictEqual(respBody.status, "OK");
                        resolve(`http://${host}:${port}/appid-${appId}`);
                    } catch (err) {
                        reject(err);
                    }
                }
            }
        }
        if (!returned) {
            returned = true;
            reject("could not start ST process");
        }
    });
};

module.exports.createTenant = async function (connectionURI, appId, coreConfig = {}) {
    const createAppResp = await fetch(`${connectionURI}/recipe/multitenancy/app/v2`, {
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

    return `${connectionURI}/appid-${appId}`;
};

module.exports.removeAppAndTenants = async function (appId) {
    const tenantsResp = await fetch(`http://localhost:8080/appid-${appId}/recipe/multitenancy/tenant/list/v2`);
    if (tenantsResp.status === 401) {
        const updateAppResp = await fetch(`http://localhost:8080/recipe/multitenancy/app/v2`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                appId,
                coreConfig: { api_keys: null },
            }),
        });
        assert.strictEqual(updateAppResp.status, 200);
        await module.exports.removeAppAndTenants(appId);
    } else if (tenantsResp.status === 200) {
        const tenants = (await tenantsResp.json()).tenants;
        for (const t of tenants) {
            if (t.tenantId !== "public") {
                await fetch(`http://localhost:8080/appid-${appId}/recipe/multitenancy/tenant/remove`, {
                    method: "POST",
                    headers: {
                        "content-type": "application/json; charset=utf-8",
                    },
                    body: JSON.stringify({
                        tenantId: t.tenantId,
                    }),
                });
            }
        }

        const removeResp = await fetch(`http://localhost:8080/recipe/multitenancy/app/remove`, {
            method: "POST",
            headers: {
                "content-type": "application/json; charset=utf-8",
            },
            body: JSON.stringify({
                appId,
            }),
        });
        const removeRespBody = await removeResp.json();
        assert.strictEqual(removeRespBody.status, "OK");
    }
};

async function getListOfPids() {
    let installationPath = process.env.INSTALL_PATH;
    let currList;
    try {
        currList = (await module.exports.executeCommand("cd " + installationPath + " && ls .started/")).stdout;
    } catch (err) {
        return [];
    }
    currList = currList.split("\n");
    let result = [];
    for (let i = 0; i < currList.length; i++) {
        let item = currList[i];
        if (item === "") {
            continue;
        }
        try {
            let pid = (await module.exports.executeCommand("cd " + installationPath + " && cat .started/" + item))
                .stdout;
            pid = pid.split("\n")[0];
            result.push(pid);
        } catch (err) {}
    }
    return result;
}

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
