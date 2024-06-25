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
const { plessCreateCode, plessResendCode, getTestExpressApp, getTestEmail, getTestPhoneNumber } = require("./utils");
const { recipesMock, randomString, getOverrideParams } = require("../../api-mock");
const { Session, supertokens: SuperTokens, MultiFactorAuth, Passwordless } = recipesMock;

describe(`mfa with passwordless: ${printPath("[test/mfa/mfa.passwordlessapis.test.js]")}`, function () {
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

    describe("firstFactors config", () => {
        it("should make pwless apis send the appropriate email (otp-email)", async function () {
            const email = getTestEmail();
            const phoneNumber = getTestPhoneNumber();

            const connectionURI = await startST();
            SuperTokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    Passwordless.init({
                        contactMethod: "EMAIL_OR_PHONE",
                        flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                        emailDelivery: {
                            service: {
                                sendEmail: (input) => {
                                    delete input.userContext;
                                    sendEmailInputs.push(input);
                                },
                            },
                        },
                        smsDelivery: {
                            service: {
                                sendSms: (input) => {
                                    delete input.userContext;
                                    sendSmsInputs.push(input);
                                },
                            },
                        },
                    }),
                    MultiFactorAuth.init({
                        firstFactors: ["otp-email"],
                    }),
                    Session.init(),
                ],
            });

            let res;

            res = await plessCreateCode({ phoneNumber }, undefined);
            assert.strictEqual(res.status, 401);

            res = await plessCreateCode({ email }, undefined);
            let overrideParams = await getOverrideParams();
            let sendSmsInputs = overrideParams.sendSmsInputs;
            let sendEmailInputs = overrideParams.sendEmailInputs;
            assert.strictEqual(res.body.status, "OK");
            assert.strictEqual(res.body.flowType, "USER_INPUT_CODE");
            assert.strictEqual(sendSmsInputs.length, 0);
            assert.strictEqual(sendEmailInputs.length, 1);
            assert.strictEqual(sendEmailInputs[0].urlWithLinkCode, undefined);
            assert.notStrictEqual(sendEmailInputs[0].userInputCode, undefined);
            assert.strictEqual(sendEmailInputs[0].isFirstFactor, true);

            res = await plessResendCode(
                { preAuthSessionId: res.body.preAuthSessionId, deviceId: res.body.deviceId },
                undefined
            );
            assert.strictEqual(res.body.status, "OK");
            overrideParams = await getOverrideParams();
            sendSmsInputs = overrideParams.sendSmsInputs;
            sendEmailInputs = overrideParams.sendEmailInputs;
            assert.strictEqual(sendSmsInputs.length, 0);
            assert.strictEqual(sendEmailInputs.length, 2);
            assert.strictEqual(sendEmailInputs[1].urlWithLinkCode, undefined);
            assert.notStrictEqual(sendEmailInputs[1].userInputCode, undefined);
            assert.strictEqual(sendEmailInputs[1].isFirstFactor, true);
        });

        it("should make pwless apis send the appropriate email (link-email)", async function () {
            const email = getTestEmail();
            const phoneNumber = getTestPhoneNumber();

            const connectionURI = await startST();
            SuperTokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    Passwordless.init({
                        contactMethod: "EMAIL_OR_PHONE",
                        flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                        emailDelivery: {
                            service: {
                                sendEmail: (input) => {
                                    delete input.userContext;
                                    sendEmailInputs.push(input);
                                },
                            },
                        },
                        smsDelivery: {
                            service: {
                                sendSms: (input) => {
                                    delete input.userContext;
                                    sendSmsInputs.push(input);
                                },
                            },
                        },
                    }),
                    MultiFactorAuth.init({
                        firstFactors: ["link-email"],
                    }),
                    Session.init(),
                ],
            });

            let res;

            res = await plessCreateCode({ phoneNumber }, undefined);
            assert.strictEqual(res.status, 401);

            res = await plessCreateCode({ email }, undefined);
            assert.strictEqual(res.body.status, "OK");
            assert.strictEqual(res.body.flowType, "MAGIC_LINK");
            let overrideParams = await getOverrideParams();
            let sendSmsInputs = overrideParams.sendSmsInputs;
            let sendEmailInputs = overrideParams.sendEmailInputs;
            assert.strictEqual(sendSmsInputs.length, 0);
            assert.strictEqual(sendEmailInputs.length, 1);
            assert.notStrictEqual(sendEmailInputs[0].urlWithLinkCode, undefined);
            assert.strictEqual(sendEmailInputs[0].userInputCode, undefined);
            assert.strictEqual(sendEmailInputs[0].isFirstFactor, true);

            res = await plessResendCode(
                { preAuthSessionId: res.body.preAuthSessionId, deviceId: res.body.deviceId },
                undefined
            );
            assert.strictEqual(res.body.status, "OK");
            overrideParams = await getOverrideParams();
            sendSmsInputs = overrideParams.sendSmsInputs;
            sendEmailInputs = overrideParams.sendEmailInputs;
            assert.strictEqual(sendSmsInputs.length, 0);
            assert.strictEqual(sendEmailInputs.length, 2);
            assert.notStrictEqual(sendEmailInputs[1].urlWithLinkCode, undefined);
            assert.strictEqual(sendEmailInputs[1].userInputCode, undefined);
            assert.strictEqual(sendEmailInputs[1].isFirstFactor, true);
        });

        it("should make pwless apis send the appropriate email (otp+link-email)", async function () {
            const email = getTestEmail();
            const phoneNumber = getTestPhoneNumber();

            const connectionURI = await startST();
            SuperTokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    Passwordless.init({
                        contactMethod: "EMAIL_OR_PHONE",
                        flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                        emailDelivery: {
                            service: {
                                sendEmail: (input) => {
                                    delete input.userContext;
                                    sendEmailInputs.push(input);
                                },
                            },
                        },
                        smsDelivery: {
                            service: {
                                sendSms: (input) => {
                                    delete input.userContext;
                                    sendSmsInputs.push(input);
                                },
                            },
                        },
                    }),
                    MultiFactorAuth.init({
                        firstFactors: ["otp-email", "link-email"],
                    }),
                    Session.init(),
                ],
            });

            let res;

            res = await plessCreateCode({ phoneNumber }, undefined);
            assert.strictEqual(res.status, 401);

            res = await plessCreateCode({ email }, undefined);
            assert.strictEqual(res.body.status, "OK");
            assert.strictEqual(res.body.flowType, "USER_INPUT_CODE_AND_MAGIC_LINK");
            let overrideParams = await getOverrideParams();
            let sendSmsInputs = overrideParams.sendSmsInputs;
            let sendEmailInputs = overrideParams.sendEmailInputs;
            assert.strictEqual(sendSmsInputs.length, 0);
            assert.strictEqual(sendEmailInputs.length, 1);
            assert.notStrictEqual(sendEmailInputs[0].urlWithLinkCode, undefined);
            assert.notStrictEqual(sendEmailInputs[0].userInputCode, undefined);
            assert.strictEqual(sendEmailInputs[0].isFirstFactor, true);

            res = await plessResendCode(
                { preAuthSessionId: res.body.preAuthSessionId, deviceId: res.body.deviceId },
                undefined
            );
            assert.strictEqual(res.body.status, "OK");
            overrideParams = await getOverrideParams();
            sendSmsInputs = overrideParams.sendSmsInputs;
            sendEmailInputs = overrideParams.sendEmailInputs;
            assert.strictEqual(sendSmsInputs.length, 0);
            assert.strictEqual(sendEmailInputs.length, 2);
            assert.notStrictEqual(sendEmailInputs[1].urlWithLinkCode, undefined);
            assert.notStrictEqual(sendEmailInputs[1].userInputCode, undefined);
            assert.strictEqual(sendEmailInputs[1].isFirstFactor, true);
        });

        it("should make pwless apis send the appropriate email (otp-phone)", async function () {
            const email = getTestEmail();
            const phoneNumber = getTestPhoneNumber();

            const connectionURI = await startST();
            SuperTokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    Passwordless.init({
                        contactMethod: "EMAIL_OR_PHONE",
                        flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                        emailDelivery: {
                            service: {
                                sendEmail: (input) => {
                                    delete input.userContext;
                                    sendEmailInputs.push(input);
                                },
                            },
                        },
                        smsDelivery: {
                            service: {
                                sendSms: (input) => {
                                    delete input.userContext;
                                    sendSmsInputs.push(input);
                                },
                            },
                        },
                    }),
                    MultiFactorAuth.init({
                        firstFactors: ["otp-phone"],
                    }),
                    Session.init(),
                ],
            });

            let res;

            res = await plessCreateCode({ email }, undefined);
            assert.strictEqual(res.status, 401);

            res = await plessCreateCode({ phoneNumber }, undefined);
            assert.strictEqual(res.body.status, "OK");
            assert.strictEqual(res.body.flowType, "USER_INPUT_CODE");
            let overrideParams = await getOverrideParams();
            let sendSmsInputs = overrideParams.sendSmsInputs;
            let sendEmailInputs = overrideParams.sendEmailInputs;
            assert.strictEqual(sendEmailInputs.length, 0);
            assert.strictEqual(sendSmsInputs.length, 1);
            assert.strictEqual(sendSmsInputs[0].urlWithLinkCode, undefined);
            assert.notStrictEqual(sendSmsInputs[0].userInputCode, undefined);
            assert.strictEqual(sendSmsInputs[0].isFirstFactor, true);

            res = await plessResendCode(
                { preAuthSessionId: res.body.preAuthSessionId, deviceId: res.body.deviceId },
                undefined
            );
            assert.strictEqual(res.body.status, "OK");
            overrideParams = await getOverrideParams();
            sendSmsInputs = overrideParams.sendSmsInputs;
            sendEmailInputs = overrideParams.sendEmailInputs;
            assert.strictEqual(sendEmailInputs.length, 0);
            assert.strictEqual(sendSmsInputs.length, 2);
            assert.strictEqual(sendSmsInputs[1].urlWithLinkCode, undefined);
            assert.notStrictEqual(sendSmsInputs[1].userInputCode, undefined);
            assert.strictEqual(sendSmsInputs[1].isFirstFactor, true);
        });

        it("should make pwless apis send the appropriate email (link-phone)", async function () {
            const email = getTestEmail();
            const phoneNumber = getTestPhoneNumber();

            const connectionURI = await startST();
            SuperTokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    Passwordless.init({
                        contactMethod: "EMAIL_OR_PHONE",
                        flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                        emailDelivery: {
                            service: {
                                sendEmail: (input) => {
                                    delete input.userContext;
                                    sendEmailInputs.push(input);
                                },
                            },
                        },
                        smsDelivery: {
                            service: {
                                sendSms: (input) => {
                                    delete input.userContext;
                                    sendSmsInputs.push(input);
                                },
                            },
                        },
                    }),
                    MultiFactorAuth.init({
                        firstFactors: ["link-phone"],
                    }),
                    Session.init(),
                ],
            });

            let res;

            res = await plessCreateCode({ email }, undefined);
            assert.strictEqual(res.status, 401);

            res = await plessCreateCode({ phoneNumber }, undefined);
            assert.strictEqual(res.body.status, "OK");
            assert.strictEqual(res.body.flowType, "MAGIC_LINK");
            let overrideParams = await getOverrideParams();
            let sendSmsInputs = overrideParams.sendSmsInputs;
            let sendEmailInputs = overrideParams.sendEmailInputs;
            assert.strictEqual(sendEmailInputs.length, 0);
            assert.strictEqual(sendSmsInputs.length, 1);
            assert.notStrictEqual(sendSmsInputs[0].urlWithLinkCode, undefined);
            assert.strictEqual(sendSmsInputs[0].userInputCode, undefined);
            assert.strictEqual(sendSmsInputs[0].isFirstFactor, true);

            res = await plessResendCode(
                { preAuthSessionId: res.body.preAuthSessionId, deviceId: res.body.deviceId },
                undefined
            );
            assert.strictEqual(res.body.status, "OK");
            overrideParams = await getOverrideParams();
            sendSmsInputs = overrideParams.sendSmsInputs;
            sendEmailInputs = overrideParams.sendEmailInputs;
            assert.strictEqual(sendEmailInputs.length, 0);
            assert.strictEqual(sendSmsInputs.length, 2);
            assert.notStrictEqual(sendSmsInputs[1].urlWithLinkCode, undefined);
            assert.strictEqual(sendSmsInputs[1].userInputCode, undefined);
            assert.strictEqual(sendSmsInputs[1].isFirstFactor, true);
        });

        it("should make pwless apis send the appropriate email (otp+link-phone)", async function () {
            const email = getTestEmail();
            const phoneNumber = getTestPhoneNumber();

            const connectionURI = await startST();
            SuperTokens.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    Passwordless.init({
                        contactMethod: "EMAIL_OR_PHONE",
                        flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                        emailDelivery: {
                            service: {
                                sendEmail: (input) => {
                                    delete input.userContext;
                                    sendEmailInputs.push(input);
                                },
                            },
                        },
                        smsDelivery: {
                            service: {
                                sendSms: (input) => {
                                    delete input.userContext;
                                    sendSmsInputs.push(input);
                                },
                            },
                        },
                    }),
                    MultiFactorAuth.init({
                        firstFactors: ["otp-phone", "link-phone"],
                    }),
                    Session.init(),
                ],
            });

            let res;

            res = await plessCreateCode({ email }, undefined);
            assert.strictEqual(res.status, 401);

            res = await plessCreateCode({ phoneNumber }, undefined);
            assert.strictEqual(res.body.status, "OK");
            assert.strictEqual(res.body.flowType, "USER_INPUT_CODE_AND_MAGIC_LINK");
            let overrideParams = await getOverrideParams();
            let sendSmsInputs = overrideParams.sendSmsInputs;
            let sendEmailInputs = overrideParams.sendEmailInputs;
            assert.strictEqual(sendEmailInputs.length, 0);
            assert.strictEqual(sendSmsInputs.length, 1);
            assert.notStrictEqual(sendSmsInputs[0].urlWithLinkCode, undefined);
            assert.notStrictEqual(sendSmsInputs[0].userInputCode, undefined);
            assert.strictEqual(sendSmsInputs[0].isFirstFactor, true);

            res = await plessResendCode(
                { preAuthSessionId: res.body.preAuthSessionId, deviceId: res.body.deviceId },
                undefined
            );
            assert.strictEqual(res.body.status, "OK");
            overrideParams = await getOverrideParams();
            sendSmsInputs = overrideParams.sendSmsInputs;
            sendEmailInputs = overrideParams.sendEmailInputs;
            assert.strictEqual(sendEmailInputs.length, 0);
            assert.strictEqual(sendSmsInputs.length, 2);
            assert.notStrictEqual(sendSmsInputs[1].urlWithLinkCode, undefined);
            assert.notStrictEqual(sendSmsInputs[1].userInputCode, undefined);
            assert.strictEqual(sendSmsInputs[1].isFirstFactor, true);
        });
    });
});
