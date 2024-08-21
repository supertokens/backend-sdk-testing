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

                it("test delete config from static adds rest to the core", async function() {
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

                it("test delete config from static adds rest to the core", async function() {
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
                    assert.deepEqual(res.body.tenant.firstFactors, [
                        "emailpassword",
                    ]);
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
                        recipeList: [Passwordless.init({
                            flowType: "USER_INPUT_CODE",
                            contactMethod: "EMAIL",
                        }), Session.init()],
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
                    assert.deepEqual(res.body.tenant.firstFactors, [
                        "otp-email",
                    ]);
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
        //     it("test get config from static config", async function () {});

        //     it("test get config from core", async function () {});

        //     it("test get non-existing config from core", async function () {});

        //     it("test get config when thirdParty is not initialised", async function () {});

        //     it("test get okta config with valid oktaDomain", async function () {});

        //     it("test get okta config with invalid oktaDomain", async function () {});

        //     it("test get ad config with valid directoryId", async function () {});

        //     it("test get ad config with invalid directoryId", async function () {});

        //     it("test get invalid static config resolves after adding valid config in core", async function () {});
        });

        // describe("listAllTenants", function () {
        //     it("test list all tenants with login methods", async function () {});

        //     it("test login methods based on SDK init", async function () {});

        //     it("test login methods based on core config", async function () {});
        // });

        // describe("updateTenantCoreConfig", function () {
        //     it("test update core config with valid config", async function () {});

        //     it("test update core config with invalid config", async function () {});

        //     it("test update public tenant core config", async function () {});
        // });

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
