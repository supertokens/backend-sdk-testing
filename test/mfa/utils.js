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

const { recipesMock, request } = require("../../api-mock");
const { EmailVerification, Passwordless, supertokens } = recipesMock;

module.exports.epSignUp = async function (email, password, accessToken, userContext = {}) {
    if (accessToken === undefined) {
        return await new Promise((resolve) => {
            request()
                .post("/auth/signup")
                .send({
                    formFields: [
                        {
                            id: "password",
                            value: password,
                        },
                        {
                            id: "email",
                            value: email,
                        },
                    ],
                    userContext,
                })
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                });
        });
    } else {
        return await new Promise((resolve) => {
            request()
                .post("/auth/signup")
                .set("Authorization", `Bearer ${accessToken}`)
                .send({
                    formFields: [
                        {
                            id: "password",
                            value: password,
                        },
                        {
                            id: "email",
                            value: email,
                        },
                    ],
                    userContext,
                })
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                });
        });
    }
};

module.exports.validateUserEmail = async (id) => {
    return EmailVerification.verifyEmailUsingToken(
        "public",
        (await EmailVerification.createEmailVerificationToken("public", supertokens.convertToRecipeUserId(id))).token,
        false
    );
};

module.exports.epSignIn = async function (email, password, accessToken) {
    if (accessToken === undefined) {
        return await new Promise((resolve) => {
            request()
                .post("/auth/signin")
                .send({
                    formFields: [
                        {
                            id: "password",
                            value: password,
                        },
                        {
                            id: "email",
                            value: email,
                        },
                    ],
                })
                .end((err, res) => {
                    if (err) {
                        resolve(err);
                    } else {
                        resolve(res);
                    }
                });
        });
    } else {
        return await new Promise((resolve) => {
            request()
                .post("/auth/signin")
                .set("Authorization", `Bearer ${accessToken}`)
                .send({
                    formFields: [
                        {
                            id: "password",
                            value: password,
                        },
                        {
                            id: "email",
                            value: email,
                        },
                    ],
                })
                .end((err, res) => {
                    if (err) {
                        resolve(undefined);
                    } else {
                        resolve(res);
                    }
                });
        });
    }
};

module.exports.plessCreateCode = async function ({ email, phoneNumber }, accessToken) {
    if (accessToken === undefined) {
        return await new Promise((resolve) => {
            request()
                .post("/auth/signinup/code")
                .send({
                    email,
                    phoneNumber,
                })
                .end((err, res) => {
                    if (err) {
                        resolve(err);
                    } else {
                        resolve(res);
                    }
                });
        });
    } else {
        return await new Promise((resolve) => {
            request()
                .post("/auth/signinup/code")
                .set("Authorization", `Bearer ${accessToken}`)
                .send({
                    email,
                    phoneNumber,
                })
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(err);
                    } else {
                        resolve(res);
                    }
                });
        });
    }
};

module.exports.plessResendCode = async function (code, accessToken) {
    if (accessToken === undefined) {
        return await new Promise((resolve) => {
            request()
                .post("/auth/signinup/code/resend")
                .send({
                    preAuthSessionId: code.preAuthSessionId,
                    deviceId: code.deviceId,
                })
                .end((err, res) => {
                    if (err) {
                        resolve(err);
                    } else {
                        resolve(res);
                    }
                });
        });
    } else {
        return await new Promise((resolve) => {
            request()
                .post("/auth/signinup/code/resend")
                .set("Authorization", `Bearer ${accessToken}`)
                .send({
                    preAuthSessionId: code.preAuthSessionId,
                    deviceId: code.deviceId,
                })
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(err);
                    } else {
                        resolve(res);
                    }
                });
        });
    }
};

module.exports.plessEmailSignInUp = async function (email, accessToken, userContext = {}) {
    const code = await Passwordless.createCode({
        tenantId: "public",
        email,
    });

    if (accessToken === undefined) {
        return await new Promise((resolve) => {
            request()
                .post("/auth/signinup/code/consume")
                .send({
                    preAuthSessionId: code.preAuthSessionId,
                    userInputCode: code.userInputCode,
                    deviceId: code.deviceId,
                    userContext,
                })
                .end((err, res) => {
                    if (err) {
                        resolve(err);
                    } else {
                        resolve(res);
                    }
                });
        });
    } else {
        return await new Promise((resolve) => {
            request()
                .post("/auth/signinup/code/consume")
                .set("Authorization", `Bearer ${accessToken}`)
                .send({
                    preAuthSessionId: code.preAuthSessionId,
                    userInputCode: code.userInputCode,
                    deviceId: code.deviceId,
                    userContext,
                })
                .expect(200)
                .end((err, res) => {
                    if (err) {
                        resolve(err);
                    } else {
                        resolve(res);
                    }
                });
        });
    }
};

module.exports.plessPhoneSigninUp = async function (phoneNumber, accessToken) {
    const code = await Passwordless.createCode({
        tenantId: "public",
        phoneNumber,
    });

    if (accessToken === undefined) {
        return await new Promise((resolve) => {
            request()
                .post("/auth/signinup/code/consume")
                .send({
                    preAuthSessionId: code.preAuthSessionId,
                    userInputCode: code.userInputCode,
                    deviceId: code.deviceId,
                })
                .end((err, res) => {
                    if (err) {
                        resolve(err);
                    } else {
                        resolve(res);
                    }
                });
        });
    } else {
        return await new Promise((resolve) => {
            request()
                .post("/auth/signinup/code/consume")
                .set("Authorization", `Bearer ${accessToken}`)
                .send({
                    preAuthSessionId: code.preAuthSessionId,
                    userInputCode: code.userInputCode,
                    deviceId: code.deviceId,
                })
                .end((err, res) => {
                    if (err) {
                        resolve(err);
                    } else {
                        resolve(res);
                    }
                });
        });
    }
};

module.exports.tpSignInUp = async function (thirdPartyId, email, accessToken, userContext = {}) {
    if (accessToken === undefined) {
        return await new Promise((resolve) => {
            request()
                .post("/auth/signinup")
                .send({
                    thirdPartyId: thirdPartyId,
                    redirectURIInfo: {
                        redirectURIOnProviderDashboard: "http://127.0.0.1/callback",
                        redirectURIQueryParams: {
                            email: email,
                        },
                    },
                    userContext,
                })
                .end((err, res) => {
                    if (err) {
                        resolve(err);
                    } else {
                        resolve(res);
                    }
                });
        });
    } else {
        return await new Promise((resolve) => {
            request()
                .post("/auth/signinup")
                .set("Authorization", `Bearer ${accessToken}`)
                .send({
                    thirdPartyId: thirdPartyId,
                    redirectURIInfo: {
                        redirectURIOnProviderDashboard: "http://127.0.0.1/callback",
                        redirectURIQueryParams: {
                            email: email,
                        },
                    },
                    userContext,
                })
                .end((err, res) => {
                    if (err) {
                        resolve(err);
                    } else {
                        resolve(res);
                    }
                });
        });
    }
};

module.exports.getMfaInfo = async function (accessToken, statusCode = 200, userContext = {}) {
    return await new Promise((resolve) => {
        request()
            .put("/auth/mfa/info")
            .set("Authorization", `Bearer ${accessToken}`)
            .send({ userContext })
            .expect(statusCode)
            .end((err, res) => {
                if (err) {
                    resolve(err);
                } else {
                    resolve(res);
                }
            });
    });
};

exports.getTestEmail = function getTestEmail(suffix) {
    return `john.doe+${Date.now()}+${suffix ?? 1}@supertokens.io`;
};

exports.getTestPhoneNumber = function () {
    return `+3630${Date.now().toString().substr(-7)}`;
};
