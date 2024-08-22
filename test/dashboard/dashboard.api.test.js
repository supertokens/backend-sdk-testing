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
const { printPath, setupST, killAllST, cleanST, startST: globalStartST, createTenant } = require("../utils");
let assert = require("assert");
const { recipesMock, request } = require("../../api-mock");
const { EmailPassword, Session, supertokens, ThirdParty, Multitenancy, Passwordless } = recipesMock;

let connectionURI;

async function stInitWithThirdParty(includeInNonPublicTenantsByDefault = undefined) {
    await supertokens.init({
        supertokens: {
            connectionURI,
        },
        appInfo: {
            appName: "SuperTokens",
            apiDomain: "api.supertokens.io",
            websiteDomain: "supertokens.io",
        },
        recipeList: [
            EmailPassword.init(),
            ThirdParty.init({
                signInAndUpFeature: {
                    providers: [
                        {
                            config: {
                                thirdPartyId: "google",
                                clients: [{ clientId: "clientid", clientSecret: "secret" }],
                            },
                            includeInNonPublicTenantsByDefault,
                        },
                        {
                            config: {
                                thirdPartyId: "facebook",
                                clients: [{ clientId: "clientid", clientSecret: "secret" }],
                            },
                        },
                        {
                            config: {
                                thirdPartyId: "github",
                                clients: [{ clientId: "clientid", clientSecret: "secret" }],
                            },
                            includeInNonPublicTenantsByDefault,
                        },
                    ],
                },
            }),
            Session.init(),
        ],
    });
}

async function stInitWithoutThirdParty() {
    await supertokens.init({
        supertokens: {
            connectionURI,
        },
        appInfo: {
            appName: "SuperTokens",
            apiDomain: "api.supertokens.io",
            websiteDomain: "supertokens.io",
        },
        recipeList: [EmailPassword.init(), Session.init()],
    });
}

describe(`dashboardTests: ${printPath("[test/dashboard/dashboard.api.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        connectionURI = await globalStartST();
    });

    afterEach(async function () {
        await killAllST();
        await cleanST();
    });

    describe("multitenancy", function () {
        describe("createOrUpdateThirdPartyConfig", function () {
            describe("with public tenant", function () {
                it("test adding new thirdParty id adds all static providers to core", async function () {
                    await stInitWithThirdParty();

                    let res = await new Promise((resolve) =>
                        request()
                            .put("/auth/dashboard/api/thirdparty/config")
                            .set("Authorization", "Bearer test")
                            .send({
                                providerConfig: {
                                    thirdPartyId: "discord",
                                    clients: [{ clientId: "clientid", clientSecret: "secret" }],
                                },
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
                    assert(res !== undefined);
                    assert.equal(res.body.createdNew, true);

                    // google should be available from static
                    let thirdPartyProvider = await ThirdParty.getProvider("public", "google");
                    assert.equal(thirdPartyProvider.config.thirdPartyId, "google");
                    assert.equal(thirdPartyProvider.config.clientId, "clientid");

                    // discord should be available from core
                    thirdPartyProvider = await ThirdParty.getProvider("public", "discord");
                    assert.equal(thirdPartyProvider.config.thirdPartyId, "discord");
                    assert.equal(thirdPartyProvider.config.clientId, "clientid");
                });

                it("test updating thirdParty config from static adds all providers to core", async function () {
                    await stInitWithThirdParty();

                    let res = await new Promise((resolve) =>
                        request()
                            .put("/auth/dashboard/api/thirdparty/config")
                            .set("Authorization", "Bearer test")
                            .send({
                                providerConfig: {
                                    thirdPartyId: "google",
                                    clients: [{ clientId: "updclientid", clientSecret: "updsecret" }],
                                },
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
                    assert(res !== undefined);
                    assert.equal(res.body.createdNew, false);

                    // google should be available from core
                    let thirdPartyProvider = await ThirdParty.getProvider("public", "google");
                    assert.equal(thirdPartyProvider.config.thirdPartyId, "google");
                    assert.equal(thirdPartyProvider.config.clientId, "updclientid");

                    // discord should be available from static
                    thirdPartyProvider = await ThirdParty.getProvider("public", "github");
                    assert.equal(thirdPartyProvider.config.thirdPartyId, "github");
                    assert.equal(thirdPartyProvider.config.clientId, "clientid");
                });

                it("test adding thirdParty config without thirdParty initialised", async function () {
                    await stInitWithoutThirdParty();

                    let res = await new Promise((resolve) =>
                        request()
                            .put("/auth/dashboard/api/thirdparty/config")
                            .set("Authorization", "Bearer test")
                            .send({
                                providerConfig: {
                                    thirdPartyId: "discord",
                                    clients: [{ clientId: "clientid", clientSecret: "secret" }],
                                },
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
                    assert(res !== undefined);
                    assert.equal(res.body.createdNew, true);
                });
            });

            describe("with t1 tenant", function () {
                it("test adding new thirdParty id adds all static providers with includeInNonPublicTenantsByDefault to core", async function () {
                    await stInitWithThirdParty(true);
                    await Multitenancy.createOrUpdateTenant("t1");

                    let res = await new Promise((resolve) =>
                        request()
                            .put("/auth/t1/dashboard/api/thirdparty/config")
                            .set("Authorization", "Bearer test")
                            .send({
                                providerConfig: {
                                    thirdPartyId: "discord",
                                    clients: [{ clientId: "clientid", clientSecret: "secret" }],
                                },
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
                    assert(res !== undefined);
                    assert.equal(res.body.createdNew, true);

                    // google should be available from static
                    let thirdPartyProvider = await ThirdParty.getProvider("t1", "google");
                    assert.equal(thirdPartyProvider.config.thirdPartyId, "google");
                    assert.equal(thirdPartyProvider.config.clientId, "clientid");

                    // discord should be available from core
                    thirdPartyProvider = await ThirdParty.getProvider("t1", "discord");
                    assert.equal(thirdPartyProvider.config.thirdPartyId, "discord");
                    assert.equal(thirdPartyProvider.config.clientId, "clientid");

                    thirdPartyProvider = await ThirdParty.getProvider("t1", "facebook");
                    assert(thirdPartyProvider.config === undefined);
                });

                it("test updating thirdParty config from static adds all providers with includeInNonPublicTenantsByDefault to core", async function () {
                    await stInitWithThirdParty(true);
                    await Multitenancy.createOrUpdateTenant("t1");

                    let res = await new Promise((resolve) =>
                        request()
                            .put("/auth/t1/dashboard/api/thirdparty/config")
                            .set("Authorization", "Bearer test")
                            .send({
                                providerConfig: {
                                    thirdPartyId: "google",
                                    clients: [{ clientId: "updclientid", clientSecret: "updsecret" }],
                                },
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
                    assert(res !== undefined);
                    assert.equal(res.body.createdNew, false);

                    // google should be available from core
                    let thirdPartyProvider = await ThirdParty.getProvider("t1", "google");
                    assert.equal(thirdPartyProvider.config.thirdPartyId, "google");
                    assert.equal(thirdPartyProvider.config.clientId, "updclientid");

                    // discord should be available from static
                    thirdPartyProvider = await ThirdParty.getProvider("t1", "github");
                    assert.equal(thirdPartyProvider.config.thirdPartyId, "github");
                    assert.equal(thirdPartyProvider.config.clientId, "clientid");
                });

                it("test adding thirdParty config without thirdParty initialised", async function () {
                    await stInitWithoutThirdParty();
                    await Multitenancy.createOrUpdateTenant("t1");

                    let res = await new Promise((resolve) =>
                        request()
                            .put("/auth/t1/dashboard/api/thirdparty/config")
                            .set("Authorization", "Bearer test")
                            .send({
                                providerConfig: {
                                    thirdPartyId: "discord",
                                    clients: [{ clientId: "clientid", clientSecret: "secret" }],
                                },
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
                    assert(res !== undefined);
                    assert.equal(res.body.createdNew, true);
                });
            });
        });

        describe("deleteThirdPartyConfig", function () {
            describe("with public tenant", function () {
                it("test delete existing config from core", async function () {
                    await supertokens.init({
                        supertokens: {
                            connectionURI,
                        },
                        appInfo: {
                            appName: "SuperTokens",
                            apiDomain: "api.supertokens.io",
                            websiteDomain: "supertokens.io",
                        },
                        recipeList: [
                            EmailPassword.init(),
                            ThirdParty.init({
                                signInAndUpFeature: {
                                    providers: [],
                                },
                            }),
                            Session.init(),
                        ],
                    });

                    await new Promise((resolve) =>
                        request()
                            .put("/auth/dashboard/api/thirdparty/config")
                            .set("Authorization", "Bearer test")
                            .send({
                                providerConfig: {
                                    thirdPartyId: "google",
                                    clients: [{ clientId: "clientid", clientSecret: "secret" }],
                                },
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

                    let res = await new Promise((resolve) =>
                        request()
                            .put("/auth/dashboard/api/thirdparty/config")
                            .set("Authorization", "Bearer test")
                            .send({
                                providerConfig: {
                                    thirdPartyId: "google",
                                    clients: [{ clientId: "clientid", clientSecret: "secret" }],
                                },
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
                    assert(res !== undefined);
                    assert.equal(res.body.createdNew, false);

                    let thirdPartyProvider = await ThirdParty.getProvider("public", "google");
                    assert.equal(thirdPartyProvider.config.thirdPartyId, "google");
                    assert.equal(thirdPartyProvider.config.clientId, "clientid");

                    res = await new Promise((resolve) =>
                        request()
                            .del("/auth/dashboard/api/thirdparty/config?thirdPartyId=google")
                            .set("Authorization", "Bearer test")
                            .send({})
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
                    assert(res !== undefined);
                    assert.equal(res.body.didConfigExist, true);

                    res = await new Promise((resolve) =>
                        request()
                            .del("/auth/dashboard/api/thirdparty/config?thirdPartyId=google")
                            .set("Authorization", "Bearer test")
                            .send({})
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
                    assert(res !== undefined);
                    assert.equal(res.body.didConfigExist, false);
                });

                it("test delete config from static adds rest to the core", async function () {
                    await stInitWithThirdParty();

                    let res = await new Promise((resolve) =>
                        request()
                            .del("/auth/dashboard/api/thirdparty/config?thirdPartyId=google")
                            .set("Authorization", "Bearer test")
                            .send({})
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
                    assert(res !== undefined);
                    assert.equal(res.body.didConfigExist, true);

                    let thirdPartyProvider = await ThirdParty.getProvider("public", "google");
                    assert.equal(thirdPartyProvider.config, undefined);
                });
            });

            describe("with t1 tenant", function () {
                it("test delete existing config from core", async function () {
                    await supertokens.init({
                        supertokens: {
                            connectionURI,
                        },
                        appInfo: {
                            appName: "SuperTokens",
                            apiDomain: "api.supertokens.io",
                            websiteDomain: "supertokens.io",
                        },
                        recipeList: [
                            EmailPassword.init(),
                            ThirdParty.init({
                                signInAndUpFeature: {
                                    providers: [],
                                },
                            }),
                            Session.init(),
                        ],
                    });
                    await Multitenancy.createOrUpdateTenant("t1");

                    await new Promise((resolve) =>
                        request()
                            .put("/auth/t1/dashboard/api/thirdparty/config")
                            .set("Authorization", "Bearer test")
                            .send({
                                providerConfig: {
                                    thirdPartyId: "google",
                                    clients: [{ clientId: "clientid", clientSecret: "secret" }],
                                },
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

                    let res = await new Promise((resolve) =>
                        request()
                            .put("/auth/t1/dashboard/api/thirdparty/config")
                            .set("Authorization", "Bearer test")
                            .send({
                                providerConfig: {
                                    thirdPartyId: "google",
                                    clients: [{ clientId: "clientid", clientSecret: "secret" }],
                                },
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
                    assert(res !== undefined);
                    assert.equal(res.body.createdNew, false);

                    let thirdPartyProvider = await ThirdParty.getProvider("t1", "google");
                    assert.equal(thirdPartyProvider.config.thirdPartyId, "google");
                    assert.equal(thirdPartyProvider.config.clientId, "clientid");

                    res = await new Promise((resolve) =>
                        request()
                            .del("/auth/t1/dashboard/api/thirdparty/config?thirdPartyId=google")
                            .set("Authorization", "Bearer test")
                            .send({})
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
                    assert(res !== undefined);
                    assert.equal(res.body.didConfigExist, true);

                    res = await new Promise((resolve) =>
                        request()
                            .del("/auth/t1/dashboard/api/thirdparty/config?thirdPartyId=google")
                            .set("Authorization", "Bearer test")
                            .send({})
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
                    assert(res !== undefined);
                    assert.equal(res.body.didConfigExist, false);
                });

                it("test delete config from static adds rest to the core", async function () {
                    await stInitWithThirdParty(true);
                    await Multitenancy.createOrUpdateTenant("t1");

                    let res = await new Promise((resolve) =>
                        request()
                            .del("/auth/t1/dashboard/api/thirdparty/config?thirdPartyId=google")
                            .set("Authorization", "Bearer test")
                            .send({})
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
                    assert(res !== undefined);
                    assert.equal(res.body.didConfigExist, true);

                    let thirdPartyProvider = await ThirdParty.getProvider("t1", "google");
                    assert.equal(thirdPartyProvider.config, undefined);
                });
            });
        });

        describe("createTenant", function () {
            it("test create new tenant", async function () {
                await supertokens.init({
                    supertokens: {
                        connectionURI,
                    },
                    appInfo: {
                        appName: "SuperTokens",
                        apiDomain: "api.supertokens.io",
                        websiteDomain: "supertokens.io",
                    },
                    recipeList: [EmailPassword.init(), Session.init()],
                });

                let res = await new Promise((resolve) =>
                    request()
                        .post("/auth/dashboard/api/tenant")
                        .set("Authorization", "Bearer test")
                        .send({
                            tenantId: "t1",
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
                assert(res !== undefined);
                assert.equal(res.body.status, "OK");

                res = await new Promise((resolve) =>
                    request()
                        .post("/auth/dashboard/api/tenant")
                        .set("Authorization", "Bearer test")
                        .send({
                            tenantId: "t1",
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
                assert(res !== undefined);
                assert.equal(res.body.status, "TENANT_ID_ALREADY_EXISTS_ERROR");

                res = await new Promise((resolve) =>
                    request()
                        .post("/auth/dashboard/api/tenant")
                        .set("Authorization", "Bearer test")
                        .send({
                            tenantId: "recipe",
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
                assert(res !== undefined);
                assert.equal(res.body.status, "INVALID_TENANT_ID_ERROR");

                res = await new Promise((resolve) =>
                    request()
                        .post("/auth/dashboard/api/tenant")
                        .set("Authorization", "Bearer test")
                        .send({
                            tenantId: "public",
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
                assert(res !== undefined);
                assert.equal(res.body.status, "TENANT_ID_ALREADY_EXISTS_ERROR");
            });
        });

        describe("deleteTenant", function () {
            it("test delete existing tenant", async function () {
                await supertokens.init({
                    supertokens: {
                        connectionURI,
                    },
                    appInfo: {
                        appName: "SuperTokens",
                        apiDomain: "api.supertokens.io",
                        websiteDomain: "supertokens.io",
                    },
                    recipeList: [EmailPassword.init(), Session.init()],
                });
                await new Promise((resolve) =>
                    request()
                        .post("/auth/dashboard/api/tenant")
                        .set("Authorization", "Bearer test")
                        .send({
                            tenantId: "t1",
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

                let res = await new Promise((resolve) =>
                    request()
                        .del("/auth/t1/dashboard/api/tenant")
                        .set("Authorization", "Bearer test")
                        .send({})
                        .expect(200)
                        .end((err, res) => {
                            if (err) {
                                resolve(undefined);
                            } else {
                                resolve(res);
                            }
                        })
                );
                assert(res !== undefined);
                assert.equal(res.body.status, "OK");
                assert.equal(res.body.didExist, true);

                res = await new Promise((resolve) =>
                    request()
                        .del("/auth/t1/dashboard/api/tenant")
                        .set("Authorization", "Bearer test")
                        .send({})
                        .expect(200)
                        .end((err, res) => {
                            if (err) {
                                resolve(undefined);
                            } else {
                                resolve(res);
                            }
                        })
                );
                assert(res !== undefined);
                assert.equal(res.body.status, "OK");
                assert.equal(res.body.didExist, false);

                res = await new Promise((resolve) =>
                    request()
                        .del("/auth/tx/dashboard/api/tenant")
                        .set("Authorization", "Bearer test")
                        .send({})
                        .expect(200)
                        .end((err, res) => {
                            if (err) {
                                resolve(undefined);
                            } else {
                                resolve(res);
                            }
                        })
                );
                assert(res !== undefined);
                assert.equal(res.body.status, "OK");
                assert.equal(res.body.didExist, false);

                res = await new Promise((resolve) =>
                    request()
                        .del("/auth/public/dashboard/api/tenant")
                        .set("Authorization", "Bearer test")
                        .send({})
                        .expect(200)
                        .end((err, res) => {
                            if (err) {
                                resolve(undefined);
                            } else {
                                resolve(res);
                            }
                        })
                );
                assert(res !== undefined);
                assert.equal(res.body.status, "CANNOT_DELETE_PUBLIC_TENANT_ERROR");
            });
        });

        describe("getTenantInfo", function () {
            describe("with public tenant", function () {
                it("test with only emailpassword initialised", async function () {
                    await supertokens.init({
                        supertokens: {
                            connectionURI,
                        },
                        appInfo: {
                            appName: "SuperTokens",
                            apiDomain: "api.supertokens.io",
                            websiteDomain: "supertokens.io",
                        },
                        recipeList: [EmailPassword.init(), Session.init()],
                    });

                    let res = await new Promise((resolve) =>
                        request()
                            .get("/auth/dashboard/api/tenant")
                            .set("Authorization", "Bearer test")
                            .send()
                            .expect(200)
                            .end((err, res) => {
                                if (err) {
                                    resolve(undefined);
                                } else {
                                    resolve(res);
                                }
                            })
                    );
                    assert.equal(res.body.status, "OK");
                    assert.equal(res.body.tenant.tenantId, "public");
                    assert.deepEqual(res.body.tenant.firstFactors, ["emailpassword"]);
                });

                it("test with only passwordless initialised with only one factor", async function () {
                    await supertokens.init({
                        supertokens: {
                            connectionURI,
                        },
                        appInfo: {
                            appName: "SuperTokens",
                            apiDomain: "api.supertokens.io",
                            websiteDomain: "supertokens.io",
                        },
                        recipeList: [
                            Passwordless.init({
                                flowType: "USER_INPUT_CODE",
                                contactMethod: "EMAIL",
                            }),
                            Session.init(),
                        ],
                    });

                    let res = await new Promise((resolve) =>
                        request()
                            .get("/auth/dashboard/api/tenant")
                            .set("Authorization", "Bearer test")
                            .send()
                            .expect(200)
                            .end((err, res) => {
                                if (err) {
                                    resolve(undefined);
                                } else {
                                    resolve(res);
                                }
                            })
                    );
                    assert.equal(res.body.status, "OK");
                    assert.equal(res.body.tenant.tenantId, "public");
                    assert.deepEqual(res.body.tenant.firstFactors, ["otp-email"]);
                });
            });

            it("test non-existing tenant info", async function () {
                await supertokens.init({
                    supertokens: {
                        connectionURI,
                    },
                    appInfo: {
                        appName: "SuperTokens",
                        apiDomain: "api.supertokens.io",
                        websiteDomain: "supertokens.io",
                    },
                    recipeList: [EmailPassword.init(), Session.init()],
                });

                let res = await new Promise((resolve) =>
                    request()
                        .get("/auth/t1/dashboard/api/tenant")
                        .set("Authorization", "Bearer test")
                        .send()
                        .expect(200)
                        .end((err, res) => {
                            if (err) {
                                resolve(undefined);
                            } else {
                                resolve(res);
                            }
                        })
                );
                assert.equal(res.body.status, "UNKNOWN_TENANT_ERROR");
            });
        });

        describe("getThirdPartyConfig", function () {
            it("test get config from static config", async function () {
                await stInitWithThirdParty();

                const res = await new Promise((resolve) =>
                    request()
                        .get("/auth/dashboard/api/thirdparty/config?thirdPartyId=google")
                        .set("Authorization", "Bearer test")
                        .send()
                        .expect(200)
                        .end((err, res) => {
                            if (err) {
                                resolve(undefined);
                            } else {
                                resolve(res);
                            }
                        })
                );
                assert.equal(res.body.providerConfig.thirdPartyId, "google");
                assert.equal(res.body.providerConfig.clients.length, 1);
                assert.equal(res.body.providerConfig.clients[0].clientId, "clientid");
            });

            it("test get config from core", async function () {
                await stInitWithThirdParty();

                await new Promise((resolve) =>
                    request()
                        .put("/auth/dashboard/api/thirdparty/config")
                        .set("Authorization", "Bearer test")
                        .send({
                            providerConfig: {
                                thirdPartyId: "discord",
                                clients: [{ clientId: "clientid", clientSecret: "secret" }],
                            },
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

                const res = await new Promise((resolve) =>
                    request()
                        .get("/auth/dashboard/api/thirdparty/config?thirdPartyId=discord")
                        .set("Authorization", "Bearer test")
                        .send()
                        .expect(200)
                        .end((err, res) => {
                            if (err) {
                                resolve(undefined);
                            } else {
                                resolve(res);
                            }
                        })
                );

                assert.equal(res.body.providerConfig.thirdPartyId, "discord");
                assert.equal(res.body.providerConfig.clients.length, 1);
                assert.equal(res.body.providerConfig.clients[0].clientId, "clientid");
            });

            it("test get config from merged between static and core", async function () {
                await stInitWithThirdParty();

                await new Promise((resolve) =>
                    request()
                        .put("/auth/dashboard/api/thirdparty/config")
                        .set("Authorization", "Bearer test")
                        .send({
                            providerConfig: {
                                thirdPartyId: "google",
                            },
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

                const res = await new Promise((resolve) =>
                    request()
                        .get("/auth/dashboard/api/thirdparty/config?thirdPartyId=google")
                        .set("Authorization", "Bearer test")
                        .send()
                        .expect(200)
                        .end((err, res) => {
                            if (err) {
                                resolve(undefined);
                            } else {
                                resolve(res);
                            }
                        })
                );

                assert.equal(res.body.providerConfig.thirdPartyId, "google");
                assert.equal(res.body.providerConfig.clients.length, 1);
                assert.equal(res.body.providerConfig.clients[0].clientId, "clientid");
            });

            it("test get non-existing config from core", async function () {
                await stInitWithThirdParty();

                const res = await new Promise((resolve) =>
                    request()
                        .get("/auth/dashboard/api/thirdparty/config?thirdPartyId=discord")
                        .set("Authorization", "Bearer test")
                        .send()
                        .expect(200)
                        .end((err, res) => {
                            if (err) {
                                resolve(undefined);
                            } else {
                                resolve(res);
                            }
                        })
                );

                assert.equal(res.body.providerConfig.thirdPartyId, "discord");
                assert.equal(res.body.providerConfig.clients.length, 1);
                assert.equal(res.body.providerConfig.clients[0].clientId, "");
                assert.equal(res.body.providerConfig.authorizationEndpoint, "https://discord.com/oauth2/authorize");
            });

            it("test get okta config with valid oktaDomain", async function () {
                await stInitWithThirdParty();

                const res = await new Promise((resolve) =>
                    request()
                        .get(
                            "/auth/dashboard/api/thirdparty/config?thirdPartyId=okta&oktaDomain=https%3A%2F%2Fdev-8636097.okta.com"
                        )
                        .set("Authorization", "Bearer test")
                        .send()
                        .expect(200)
                        .end((err, res) => {
                            if (err) {
                                resolve(undefined);
                            } else {
                                resolve(res);
                            }
                        })
                );

                assert.equal(res.body.providerConfig.thirdPartyId, "okta");
                assert.equal(res.body.providerConfig.clients.length, 1);
                assert.equal(res.body.providerConfig.clients[0].clientId, "");
                assert.equal(
                    res.body.providerConfig.authorizationEndpoint,
                    "https://dev-8636097.okta.com/oauth2/v1/authorize"
                );
            });

            it("test get okta config with invalid oktaDomain", async function () {
                await stInitWithThirdParty();

                const res = await new Promise((resolve) =>
                    request()
                        .get(
                            "/auth/dashboard/api/thirdparty/config?thirdPartyId=okta&oktaDomain=https%3A%2F%2Fdev-12345.okta.com"
                        )
                        .set("Authorization", "Bearer test")
                        .send()
                        .expect(200)
                        .end((err, res) => {
                            if (err) {
                                resolve(undefined);
                            } else {
                                resolve(res);
                            }
                        })
                );

                assert.equal(res.body.providerConfig.thirdPartyId, "okta");
                assert.equal(res.body.providerConfig.clients.length, 1);
                assert.equal(res.body.providerConfig.clients[0].clientId, "");
                assert.equal(
                    res.body.providerConfig.clients[0].additionalConfig.oktaDomain,
                    "https://dev-12345.okta.com"
                );
                assert.equal(res.body.providerConfig.authorizationEndpoint, undefined);
            });

            it("test get ad config with valid directoryId", async function () {
                await stInitWithThirdParty();

                const res = await new Promise((resolve) =>
                    request()
                        .get(
                            "/auth/dashboard/api/thirdparty/config?thirdPartyId=active-directory&directoryId=97f9a564-fcee-4b88-ae34-a1fbc4656593"
                        )
                        .set("Authorization", "Bearer test")
                        .send()
                        .expect(200)
                        .end((err, res) => {
                            if (err) {
                                resolve(undefined);
                            } else {
                                resolve(res);
                            }
                        })
                );

                assert.equal(res.body.providerConfig.thirdPartyId, "active-directory");
                assert.equal(res.body.providerConfig.clients.length, 1);
                assert.equal(res.body.providerConfig.clients[0].clientId, "");
                assert.equal(
                    res.body.providerConfig.authorizationEndpoint,
                    "https://login.microsoftonline.com/97f9a564-fcee-4b88-ae34-a1fbc4656593/oauth2/v2.0/authorize"
                );
            });

            it("test get ad config with invalid directoryId", async function () {
                await stInitWithThirdParty();

                const res = await new Promise((resolve) =>
                    request()
                        .get(
                            "/auth/dashboard/api/thirdparty/config?thirdPartyId=active-directory&directoryId=97f9a564-1234-4b88-ae34-a1fbc4656593"
                        )
                        .set("Authorization", "Bearer test")
                        .send()
                        .expect(200)
                        .end((err, res) => {
                            if (err) {
                                resolve(undefined);
                            } else {
                                resolve(res);
                            }
                        })
                );

                assert.equal(res.body.providerConfig.thirdPartyId, "active-directory");
                assert.equal(res.body.providerConfig.clients.length, 1);
                assert.equal(res.body.providerConfig.clients[0].clientId, "");
                assert.equal(
                    res.body.providerConfig.clients[0].additionalConfig.directoryId,
                    "97f9a564-1234-4b88-ae34-a1fbc4656593"
                );
                assert.equal(res.body.providerConfig.authorizationEndpoint, undefined);
            });

            it("test get invalid static config resolves after adding valid config in core", async function () {
                await supertokens.init({
                    supertokens: {
                        connectionURI,
                    },
                    appInfo: {
                        appName: "SuperTokens",
                        apiDomain: "api.supertokens.io",
                        websiteDomain: "supertokens.io",
                    },
                    recipeList: [
                        Session.init(),
                        ThirdParty.init({
                            signInAndUpFeature: {
                                providers: [
                                    {
                                        config: {
                                            thirdPartyId: "active-directory",
                                            clients: [
                                                {
                                                    clientId: "clientid",
                                                    clientSecret: "secret",
                                                    additionalConfig: {
                                                        directoryId: "97f9a564-1234-4b88-ae34-a1fbc4656593", // invalid directory Id
                                                    },
                                                },
                                            ],
                                        },
                                    },
                                ],
                            },
                        }),
                    ],
                });

                let res = await new Promise((resolve) =>
                    request()
                        .get("/auth/dashboard/api/thirdparty/config?thirdPartyId=active-directory")
                        .set("Authorization", "Bearer test")
                        .send()
                        .expect(200)
                        .end((err, res) => {
                            if (err) {
                                resolve(undefined);
                            } else {
                                resolve(res);
                            }
                        })
                );

                assert.equal(res.body.providerConfig.thirdPartyId, "active-directory");
                assert.equal(res.body.providerConfig.clients.length, 1);
                assert.equal(res.body.providerConfig.clients[0].clientId, "clientid");
                assert.equal(
                    res.body.providerConfig.clients[0].additionalConfig.directoryId,
                    "97f9a564-1234-4b88-ae34-a1fbc4656593"
                );
                assert.equal(res.body.providerConfig.authorizationEndpoint, undefined);

                await new Promise((resolve) =>
                    request()
                        .put("/auth/dashboard/api/thirdparty/config")
                        .set("Authorization", "Bearer test")
                        .send({
                            providerConfig: {
                                thirdPartyId: "active-directory",
                                clients: [
                                    {
                                        clientId: "clientid",
                                        clientSecret: "secret",
                                        additionalConfig: {
                                            directoryId: "97f9a564-fcee-4b88-ae34-a1fbc4656593", // valid directory Id
                                        },
                                    },
                                ],
                            },
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

                res = await new Promise((resolve) =>
                    request()
                        .get("/auth/dashboard/api/thirdparty/config?thirdPartyId=active-directory")
                        .set("Authorization", "Bearer test")
                        .send()
                        .expect(200)
                        .end((err, res) => {
                            if (err) {
                                resolve(undefined);
                            } else {
                                resolve(res);
                            }
                        })
                );

                assert.equal(res.body.providerConfig.thirdPartyId, "active-directory");
                assert.equal(res.body.providerConfig.clients.length, 1);
                assert.equal(res.body.providerConfig.clients[0].clientId, "clientid");
                assert.equal(
                    res.body.providerConfig.clients[0].additionalConfig.directoryId,
                    "97f9a564-fcee-4b88-ae34-a1fbc4656593"
                );
                assert.equal(
                    res.body.providerConfig.authorizationEndpoint,
                    "https://login.microsoftonline.com/97f9a564-fcee-4b88-ae34-a1fbc4656593/oauth2/v2.0/authorize"
                );
            });
        });

        describe("listAllTenants", function () {
            it("test list all tenants with login methods", async function () {
                await supertokens.init({
                    supertokens: {
                        connectionURI,
                    },
                    appInfo: {
                        appName: "SuperTokens",
                        apiDomain: "api.supertokens.io",
                        websiteDomain: "supertokens.io",
                    },
                    recipeList: [
                        EmailPassword.init(),
                        ThirdParty.init(),
                        Passwordless.init({
                            flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
                            contactMethod: "EMAIL_OR_PHONE",
                        }),
                        Session.init(),
                    ],
                });

                await Multitenancy.createOrUpdateTenant("t1", {
                    firstFactors: null,
                });
                await Multitenancy.createOrUpdateTenant("t2", {
                    firstFactors: [],
                });
                await Multitenancy.createOrUpdateTenant("t3", {
                    firstFactors: ["emailpassword"],
                });
                await Multitenancy.createOrUpdateTenant("t4", {
                    firstFactors: ["otp-email", "link-phone"],
                });
                await Multitenancy.createOrUpdateTenant("t5", {
                    firstFactors: ["thirdparty", "emailpassword"],
                });

                let res = await new Promise((resolve) =>
                    request()
                        .get("/auth/dashboard/api/tenants")
                        .set("Authorization", "Bearer test")
                        .send()
                        .expect(200)
                        .end((err, res) => {
                            if (err) {
                                resolve(undefined);
                            } else {
                                resolve(res);
                            }
                        })
                );
                assert.equal(res.body.status, "OK");
                assert.equal(res.body.tenants.length, 6);
                for (const tenant of res.body.tenants) {
                    if (tenant.tenantId === "public") {
                        assert.deepEqual(tenant.firstFactors, [
                            "emailpassword",
                            "thirdparty",
                            "otp-email",
                            "otp-phone",
                            "link-email",
                            "link-phone",
                        ]);
                    } else if (tenant.tenantId === "t1") {
                        assert.deepEqual(tenant.firstFactors, [
                            "emailpassword",
                            "thirdparty",
                            "otp-email",
                            "otp-phone",
                            "link-email",
                            "link-phone",
                        ]);
                    } else if (tenant.tenantId === "t2") {
                        assert.deepEqual(tenant.firstFactors, []);
                    } else if (tenant.tenantId === "t3") {
                        assert.deepEqual(tenant.firstFactors, ["emailpassword"]);
                    } else if (tenant.tenantId === "t4") {
                        assert.deepEqual(tenant.firstFactors, ["otp-email", "link-phone"]);
                    } else if (tenant.tenantId === "t5") {
                        assert.deepEqual(tenant.firstFactors, ["emailpassword", "thirdparty"]);
                    } else {
                        assert.fail("Unknown tenant");
                    }
                }
            });

            it("test login methods based on SDK init", async function () {
                await supertokens.init({
                    supertokens: {
                        connectionURI,
                    },
                    appInfo: {
                        appName: "SuperTokens",
                        apiDomain: "api.supertokens.io",
                        websiteDomain: "supertokens.io",
                    },
                    recipeList: [
                        EmailPassword.init(),
                        Passwordless.init({
                            flowType: "USER_INPUT_CODE",
                            contactMethod: "EMAIL",
                        }),
                        Session.init(),
                    ],
                });

                await Multitenancy.createOrUpdateTenant("t1", {
                    firstFactors: null,
                });
                await Multitenancy.createOrUpdateTenant("t2", {
                    firstFactors: [],
                });
                await Multitenancy.createOrUpdateTenant("t3", {
                    firstFactors: ["emailpassword"],
                });
                await Multitenancy.createOrUpdateTenant("t4", {
                    firstFactors: ["otp-email", "link-phone"],
                });
                await Multitenancy.createOrUpdateTenant("t5", {
                    firstFactors: ["thirdparty", "emailpassword"],
                });

                let res = await new Promise((resolve) =>
                    request()
                        .get("/auth/dashboard/api/tenants")
                        .set("Authorization", "Bearer test")
                        .send()
                        .expect(200)
                        .end((err, res) => {
                            if (err) {
                                resolve(undefined);
                            } else {
                                resolve(res);
                            }
                        })
                );
                assert.equal(res.body.status, "OK");
                assert.equal(res.body.tenants.length, 6);
                for (const tenant of res.body.tenants) {
                    if (tenant.tenantId === "public") {
                        assert.deepEqual(tenant.firstFactors, ["emailpassword", "otp-email"]);
                    } else if (tenant.tenantId === "t1") {
                        assert.deepEqual(tenant.firstFactors, ["emailpassword", "otp-email"]);
                    } else if (tenant.tenantId === "t2") {
                        assert.deepEqual(tenant.firstFactors, []);
                    } else if (tenant.tenantId === "t3") {
                        assert.deepEqual(tenant.firstFactors, ["emailpassword"]);
                    } else if (tenant.tenantId === "t4") {
                        assert.deepEqual(tenant.firstFactors, ["otp-email"]);
                    } else if (tenant.tenantId === "t5") {
                        assert.deepEqual(tenant.firstFactors, ["emailpassword"]);
                    } else {
                        assert.fail("Unknown tenant");
                    }
                }
            });
        });

        describe("updateTenantCoreConfig", function () {
            it("test update core config with valid config", async function () {
                await supertokens.init({
                    supertokens: {
                        connectionURI,
                    },
                    appInfo: {
                        appName: "SuperTokens",
                        apiDomain: "api.supertokens.io",
                        websiteDomain: "supertokens.io",
                    },
                    recipeList: [Session.init(), EmailPassword.init(), ThirdParty.init()],
                });

                await Multitenancy.createOrUpdateTenant("t1", { firstFactors: null });

                let res = await new Promise((resolve) =>
                    request()
                        .put("/auth/t1/dashboard/api/tenant/core-config")
                        .set("Authorization", "Bearer test")
                        .send({
                            name: "email_verification_token_lifetime",
                            value: 17200000,
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

                assert.equal(res.body.status, "OK");

                res = await new Promise((resolve) =>
                    request()
                        .get("/auth/t1/dashboard/api/tenant")
                        .set("Authorization", "Bearer test")
                        .send()
                        .expect(200)
                        .end((err, res) => {
                            if (err) {
                                resolve(undefined);
                            } else {
                                resolve(res);
                            }
                        })
                );

                let found = false;
                for (const config of res.body.tenant.coreConfig) {
                    if (config.key === "email_verification_token_lifetime") {
                        assert.equal(config.value, 17200000);
                        found = true;
                        break;
                    }
                }
                assert(found, "email_verification_token_lifetime not found");
            });

            it("test update core config with invalid config", async function () {
                await supertokens.init({
                    supertokens: {
                        connectionURI,
                    },
                    appInfo: {
                        appName: "SuperTokens",
                        apiDomain: "api.supertokens.io",
                        websiteDomain: "supertokens.io",
                    },
                    recipeList: [Session.init(), EmailPassword.init(), ThirdParty.init()],
                });

                await Multitenancy.createOrUpdateTenant("t1", { firstFactors: null });

                let res = await new Promise((resolve) =>
                    request()
                        .put("/auth/t1/dashboard/api/tenant/core-config")
                        .set("Authorization", "Bearer test")
                        .send({
                            name: "email_verification_token_lifetime",
                            value: true,
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

                assert.equal(res.body.status, "INVALID_CONFIG_ERROR");

                res = await new Promise((resolve) =>
                    request()
                        .get("/auth/t1/dashboard/api/tenant")
                        .set("Authorization", "Bearer test")
                        .send()
                        .expect(200)
                        .end((err, res) => {
                            if (err) {
                                resolve(undefined);
                            } else {
                                resolve(res);
                            }
                        })
                );

                let found = false;
                for (const config of res.body.tenant.coreConfig) {
                    if (config.key === "email_verification_token_lifetime") {
                        assert.equal(config.value, config.defaultValue);
                        found = true;
                        break;
                    }
                }
                assert(found, "email_verification_token_lifetime not found");
            });

            it("test update public tenant core config", async function () {
                await supertokens.init({
                    supertokens: {
                        connectionURI,
                    },
                    appInfo: {
                        appName: "SuperTokens",
                        apiDomain: "api.supertokens.io",
                        websiteDomain: "supertokens.io",
                    },
                    recipeList: [Session.init(), EmailPassword.init(), ThirdParty.init()],
                });

                await Multitenancy.createOrUpdateTenant("t1", { firstFactors: null });

                let res = await new Promise((resolve) =>
                    request()
                        .put("/auth/public/dashboard/api/tenant/core-config")
                        .set("Authorization", "Bearer test")
                        .send({
                            name: "email_verification_token_lifetime",
                            value: 17200000,
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

                assert.equal(res.body.status, "INVALID_CONFIG_ERROR");
            });
        });

        // describe("updateTenantFirstFactor", function () {
        //     it("test enabling first factor", async function () {});

        //     it("test disabling first factor", async function () {});

        //     it("test enabling first factor that is not initialised", async function () {});

        //     it("test enabling first factor that does not have a valid contact method", async function () {});

        //     it("test enabling first factor that does not have a valid flow type", async function () {});
        // });

        // describe("updateTenantSecondaryFactor", function () {
        //     it("test enabling secondary factor", async function () {});

        //     it("test disabling secondary factor", async function () {});

        //     it("test enabling secondary factor that is not initialised", async function () {});

        //     it("test enabling secondary factor that does not have a valid contact method", async function () {});

        //     it("test enabling secondary factor that does not have a valid flow type", async function () {});
        // });
    });
});
