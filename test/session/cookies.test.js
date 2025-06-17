/* Copyright (c) 2025, VRAI Labs and/or its affiliates. All rights reserved.
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
let assert = require("assert");
const { recipesMock, request } = require("../../api-mock");
const { EmailPassword, Session, supertokens } = recipesMock;

describe(`sessionTests: ${printPath("[test/session/cookies.test.js]")}`, function () {
    let user;
    let session;

    before(async function () {
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
            recipeList: [EmailPassword.init(), Session.init()],
            debug: true,
        });

        user = (await EmailPassword.signUp("public", "test@example.com", "password123")).user;
        session = await Session.createNewSessionWithoutRequestResponse(
            "public",
            user.loginMethods[0].recipeUserId,
            {},
            {}
        );
    });

    describe("cookie parsing tests", function () {
        it("should parse encoded cookies correctly", async function () {
            let res = await new Promise((resolve) =>
                request()
                    .post("/getsession")
                    .set("Cookie", ["sAccessToken=" + session.getAccessToken()])
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );
            assert(res.body.userId === user.id);
        });
        it("should parse unencoded cookies correctly", async function () {
            const cookies = ["sAccessToken=" + session.getAccessToken(), ";somethingElse=test%%%again"];
            let res = await new Promise((resolve) =>
                request()
                    .post("/getsession")
                    .set("Cookie", cookies)
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            console.log(err);
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );
            assert(res.body.userId === user.id);
        });
        it("should parse multiple unencoded cookies correctly", async function () {
            const cookies = [
                "sAccessToken=" + session.getAccessToken(),
                ";somethingElse=test%%%once", // invalid %% format
                ";somethingElse=test%%%again", // invalid %% format
                ";completelyDifferent=test%80", // invalid utf-8 character
            ];
            let res = await new Promise((resolve) =>
                request()
                    .post("/getsession")
                    .set("Cookie", cookies)
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            console.log(err);
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );
            assert(res.body.userId === user.id);
        });
        it("should return 401 if invalid sAccessToken is passed", async function () {
            const cookies = [
                "sAccessToken=" + session.getAccessToken(),
                ";sAccessToken=somethingElse%80test%%%again",
            ];
            await new Promise((resolve) =>
                request()
                    .post("/getsession")
                    .set("Cookie", cookies)
                    .expect(401)
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );
        });
    });
});
