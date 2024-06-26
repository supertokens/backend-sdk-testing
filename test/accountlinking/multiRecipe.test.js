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
const { printPath, setupST, killAllST, cleanST, startST: globalStartST, createTenant } = require("../utils");
let assert = require("assert");
const { recipesMock, randomString, request } = require("../../api-mock");
const { shouldDoAutomaticAccountLinkingOverride } = require("../overridesMapping");
const {
    AccountLinking,
    EmailPassword,
    EmailVerification,
    Session,
    supertokens,
    ThirdParty,
    Passwordless,
} = recipesMock;

describe(`accountlinkingTests: ${printPath("[test/accountlinking/multiRecipe.test.js]")}`, function () {
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

    describe("migration tests", function () {
        it("allows sign in with verified recipe user even if there is an unverified one w/ the same email", async function () {
            const connectionURI = await startST();
            initST(connectionURI);

            let epUser = await EmailPassword.signUp("public", "test@example.com", "password1234");
            assert.strictEqual(epUser.user.isPrimaryUser, false);

            let pwlessUser = await Passwordless.signInUp({
                tenantId: "public",
                email: "test@example.com",
                userContext: { DO_NOT_LINK: true },
            });
            assert.strictEqual(pwlessUser.user.isPrimaryUser, false);

            const code = await Passwordless.createCode({
                tenantId: "public",
                email: "test@example.com",
            });

            let consumeCodeResponse = await new Promise((resolve) =>
                request()
                    .post("/auth/signinup/code/consume")
                    .send({
                        preAuthSessionId: code.preAuthSessionId,
                        deviceId: code.deviceId,
                        userInputCode: code.userInputCode,
                    })
                    .end((err, res) => {
                        if (err) {
                            resolve(undefined);
                        } else {
                            resolve(res);
                        }
                    })
            );

            assert.strictEqual(consumeCodeResponse.body.status, "OK");
        });

        it("should not allow sign in with unverified recipe user when there is a verified one w/ the same email", async function () {
            const connectionURI = await startST();
            initST(connectionURI);

            let epUser = await EmailPassword.signUp("public", "test@example.com", "password1234");
            assert.strictEqual(epUser.user.isPrimaryUser, false);

            let pwlessUser = await Passwordless.signInUp({
                tenantId: "public",
                email: "test@example.com",
                userContext: { DO_NOT_LINK: true },
            });
            assert.strictEqual(pwlessUser.user.isPrimaryUser, false);

            let res = await new Promise((resolve) =>
                request()
                    .post("/auth/signin")
                    .send({
                        formFields: [
                            {
                                id: "email",
                                value: "test@example.com",
                            },
                            {
                                id: "password",
                                value: "password1234",
                            },
                        ],
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
            assert.notStrictEqual(res, undefined);
            assert.strictEqual(res.body.status, "SIGN_IN_NOT_ALLOWED");
        });
    });
});

function initST(connectionURI) {
    supertokens.init({
        supertokens: {
            connectionURI,
        },
        appInfo: {
            apiDomain: "api.supertokens.io",
            appName: "SuperTokens",
            websiteDomain: "supertokens.io",
        },
        recipeList: [
            EmailPassword.init(),
            Session.init(),
            EmailVerification.init({
                mode: "OPTIONAL",
            }),
            Passwordless.init({
                contactMethod: "EMAIL_OR_PHONE",
                flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
            }),
            ThirdParty.init({
                signInAndUpFeature: {
                    providers: [
                        {
                            config: {
                                thirdPartyId: "google",
                                clients: [
                                    {
                                        clientId: "",
                                        clientSecret: "",
                                    },
                                ],
                            },
                        },
                    ],
                },
            }),
            AccountLinking.init({
                shouldDoAutomaticAccountLinking: shouldDoAutomaticAccountLinkingOverride.automaticallyLinkIfVerified,
            }),
        ],
    });
}
