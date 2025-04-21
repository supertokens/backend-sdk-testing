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
    createCoreApplication,
    extractInfoFromResponse,
} = require("../utils");
let assert = require("assert");
const { recipesMock } = require("../../api-mock");
const {
    AccountLinking,
    EmailPassword,
    EmailVerification,
    Session,
    supertokens,
    ThirdParty,
    MultiFactorAuth,
    TOTP,
    Passwordless,
} = recipesMock;
const {
    epSignIn,
    getMfaInfo,
    validateUserEmail,
    totpCreateDevice,
    totpListDevices,
    totpVerifyDevice,
    totpVerifyTOTP,
    totpRemoveDevice,
} = require("./utils");
const { parseJWTWithoutSignatureVerification } = require("supertokens-node/lib/build/recipe/session/jwt");
const { TOTP: TOTPGenerator } = require("otpauth");

describe(`mfa-api w/ TOTP: ${printPath("[test/mfa/mfa.api.test.js]")}`, function () {
    it("should require mfa signing in", async function () {
        const connectionURI = await createCoreApplication();
        supertokens.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "supertokens",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                EmailPassword.init(),
                Passwordless.init({
                    contactMethod: "EMAIL",
                    flowType: "USER_INPUT_CODE",
                }),
                ThirdParty.init(),
                TOTP.init(),
                AccountLinking.init({
                    shouldDoAutomaticAccountLinking: async () => ({
                        shouldAutomaticallyLink: true,
                        shouldRequireVerification: true,
                    }),
                }),
                EmailVerification.init({ mode: "OPTIONAL" }),
                MultiFactorAuth.init({
                    override: {
                        functions: (originalImplementation) => {
                            return {
                                ...originalImplementation,
                                getMFARequirementsForAuth: async () => {
                                    return ["totp"];
                                },
                            };
                        },
                    },
                }),
                Session.init(),
            ],
        });

        const signUpUser = await EmailPassword.signUp("public", "test@example.com", "password");
        await validateUserEmail(signUpUser.recipeUserId.getAsString());

        let res = await epSignIn("test@example.com", "password");
        assert.equal("OK", res.body.status);

        let cookies = extractInfoFromResponse(res);
        const accessToken = cookies.accessTokenFromAny;

        res = await getMfaInfo(accessToken);
        assert.strictEqual(res.body.status, "OK");
        assert.deepEqual(["test@example.com"], res.body.emails.emailpassword);
        assert.deepEqual(res.body.factors.next, ["totp"]);
        assert.deepEqual(res.body.factors.allowedToSetup, ["totp"]);

        const totpDevice = await totpCreateDevice(accessToken);
        assert.strictEqual(totpDevice.status, "OK");

        const totpGen = new TOTPGenerator({ secret: totpDevice.secret });
        const totpCode = totpGen.generate({ timestamp: Date.now() });
        const totpVerify = await totpVerifyDevice(accessToken, totpDevice.deviceName, totpCode);
        assert.strictEqual(totpVerify.body.status, "OK");
        const accessTokenAfterVerify = totpVerify.accessToken;

        assert.deepStrictEqual(await totpListDevices(accessToken), {
            status: "OK",
            devices: [
                {
                    name: totpDevice.deviceName,
                    period: 30,
                    skew: 1,
                    verified: true,
                },
            ],
        });
        let removalError;
        try {
            await totpRemoveDevice(accessToken, totpDevice.deviceName);
        } catch (e) {
            removalError = e;
        }
        assert.ok(removalError);
        assert.deepStrictEqual(
            removalError,
            {
                message: "invalid claim",
                claimValidationErrors: [
                    { id: "st-mfa", reason: { message: "MFA requirement for auth is not satisfied" } },
                ],
            }
        );

        assert.deepStrictEqual(await totpListDevices(accessToken), {
            status: "OK",
            devices: [
                {
                    name: totpDevice.deviceName,
                    period: 30,
                    skew: 1,
                    verified: true,
                },
            ],
        });

        assert.deepStrictEqual(await totpListDevices(accessTokenAfterVerify), {
            status: "OK",
            devices: [
                {
                    name: totpDevice.deviceName,
                    period: 30,
                    skew: 1,
                    verified: true,
                },
            ],
        });
        assert.deepStrictEqual(await totpRemoveDevice(accessTokenAfterVerify, totpDevice.deviceName), {
            didDeviceExist: true,
            status: "OK",
        });
        assert.deepStrictEqual(await totpListDevices(accessTokenAfterVerify), { status: "OK", devices: [] });
    });
});
