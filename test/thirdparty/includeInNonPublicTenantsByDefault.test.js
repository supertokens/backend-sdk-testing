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
    Session,
    Multitenancy,
    supertokens,
    ThirdParty,
} = recipesMock;

describe(`thirdPartyTests: ${printPath(
    "[test/thirdparty/includeInNonPublicTenantsByDefault.test.js]"
)}`, function () {
    let globalConnectionURI;

    beforeEach(async function () {
        await killAllST();
        await setupST();
        globalConnectionURI = await globalStartST();
    });

    afterEach(async function () {
        await killAllST();
        await cleanST();
    });

    describe("with includeInNonPublicTenantsByDefault not set", function () {
        it("test public tenant that doesn't have providers in core", async function () {
            supertokens.init({
                supertokens: {
                    connectionURI: globalConnectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    Session.init(),
                    ThirdParty.init({
                        signInAndUpFeature: {
                            providers: [
                                {
                                    config: {
                                        thirdPartyId: "google",
                                        clients: [
                                            {
                                                clientId: "test",
                                                clientSecret: "test",
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    }),
                    Multitenancy.init(),
                ],
            });

            let response = await new Promise((resolve, reject) =>
                request()
                    .get("/auth/loginmethods")
                    .send()
                    .end((err, res) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(res);
                        }
                    })
            );

            const providers = response.body.thirdParty.providers;
            assert.equal(providers.length, 1);
            assert.equal(providers[0].id, "google");
        });

        it("test public tenant that have providers in core", async function () {
            supertokens.init({
                supertokens: {
                    connectionURI: globalConnectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    Session.init(),
                    ThirdParty.init({
                        signInAndUpFeature: {
                            providers: [
                                {
                                    config: {
                                        thirdPartyId: "google",
                                        clients: [
                                            {
                                                clientId: "test",
                                                clientSecret: "test",
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    }),
                    Multitenancy.init(),
                ],
            });

            await Multitenancy.createOrUpdateThirdPartyConfig("public", {
                thirdPartyId: "facebook",
                clients: [
                    {
                        clientId: "test",
                        clientSecret: "test",
                    }
                ]
            }, false);


            let response = await new Promise((resolve, reject) =>
                request()
                    .get("/auth/loginmethods")
                    .send()
                    .end((err, res) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(res);
                        }
                    })
            );

            const providers = response.body.thirdParty.providers;
            assert.equal(providers.length, 1);
            assert.equal(providers[0].id, "facebook");
        });

        it("test non-public tenant that doesn't have providers in core", async function () {
            supertokens.init({
                supertokens: {
                    connectionURI: globalConnectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    Session.init(),
                    ThirdParty.init({
                        signInAndUpFeature: {
                            providers: [
                                {
                                    config: {
                                        thirdPartyId: "google",
                                        clients: [
                                            {
                                                clientId: "test",
                                                clientSecret: "test",
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    }),
                    Multitenancy.init(),
                ],
            });

            await Multitenancy.createOrUpdateTenant("t1", {
                firstFactors: null
            })    

            let response = await new Promise((resolve, reject) =>
                request()
                    .get("/auth/t1/loginmethods")
                    .send()
                    .end((err, res) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(res);
                        }
                    })
            );

            const providers = response.body.thirdParty.providers;
            assert.equal(providers.length, 0);
        });

        it("test non-public tenant that has providers in core", async function () {
            supertokens.init({
                supertokens: {
                    connectionURI: globalConnectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    Session.init(),
                    ThirdParty.init({
                        signInAndUpFeature: {
                            providers: [
                                {
                                    config: {
                                        thirdPartyId: "google",
                                        clients: [
                                            {
                                                clientId: "test",
                                                clientSecret: "test",
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    }),
                    Multitenancy.init(),
                ],
            });

            await Multitenancy.createOrUpdateTenant("t1", {
                firstFactors: null
            })

            await Multitenancy.createOrUpdateThirdPartyConfig("t1", {
                thirdPartyId: "facebook",
                clients: [
                    {
                        clientId: "test",
                        clientSecret: "test",
                    }
                ]
            }, false);


            let response = await new Promise((resolve, reject) =>
                request()
                    .get("/auth/t1/loginmethods")
                    .send()
                    .end((err, res) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(res);
                        }
                    })
            );

            const providers = response.body.thirdParty.providers;
            assert.equal(providers.length, 1);
            assert.equal(providers[0].id, "facebook");
        });
    });

    describe("with includeInNonPublicTenantsByDefault set to false", function () {
        it("test public tenant that doesn't have providers in core", async function () {
            supertokens.init({
                supertokens: {
                    connectionURI: globalConnectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    Session.init(),
                    ThirdParty.init({
                        signInAndUpFeature: {
                            providers: [
                                {
                                    config: {
                                        thirdPartyId: "google",
                                        clients: [
                                            {
                                                clientId: "test",
                                                clientSecret: "test",
                                            },
                                        ],
                                    },
                                    includeInNonPublicTenantsByDefault: false,
                                },
                            ],
                        },
                    }),
                    Multitenancy.init(),
                ],
            });

            let response = await new Promise((resolve, reject) =>
                request()
                    .get("/auth/loginmethods")
                    .send()
                    .end((err, res) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(res);
                        }
                    })
            );

            const providers = response.body.thirdParty.providers;
            assert.equal(providers.length, 1);
            assert.equal(providers[0].id, "google");
        });

        it("test public tenant that have providers in core", async function () {
            supertokens.init({
                supertokens: {
                    connectionURI: globalConnectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    Session.init(),
                    ThirdParty.init({
                        signInAndUpFeature: {
                            providers: [
                                {
                                    config: {
                                        thirdPartyId: "google",
                                        clients: [
                                            {
                                                clientId: "test",
                                                clientSecret: "test",
                                            },
                                        ],
                                    },
                                    includeInNonPublicTenantsByDefault: false,
                                },
                            ],
                        },
                    }),
                    Multitenancy.init(),
                ],
            });

            await Multitenancy.createOrUpdateThirdPartyConfig("public", {
                thirdPartyId: "facebook",
                clients: [
                    {
                        clientId: "test",
                        clientSecret: "test",
                    }
                ]
            }, false);


            let response = await new Promise((resolve, reject) =>
                request()
                    .get("/auth/loginmethods")
                    .send()
                    .end((err, res) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(res);
                        }
                    })
            );

            const providers = response.body.thirdParty.providers;
            assert.equal(providers.length, 1);
            assert.equal(providers[0].id, "facebook");
        });

        it("test non-public tenant that doesn't have providers in core", async function () {
            supertokens.init({
                supertokens: {
                    connectionURI: globalConnectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    Session.init(),
                    ThirdParty.init({
                        signInAndUpFeature: {
                            providers: [
                                {
                                    config: {
                                        thirdPartyId: "google",
                                        clients: [
                                            {
                                                clientId: "test",
                                                clientSecret: "test",
                                            },
                                        ],
                                    },
                                    includeInNonPublicTenantsByDefault: false,
                                },
                            ],
                        },
                    }),
                    Multitenancy.init(),
                ],
            });

            await Multitenancy.createOrUpdateTenant("t1", {
                firstFactors: null
            })    

            let response = await new Promise((resolve, reject) =>
                request()
                    .get("/auth/t1/loginmethods")
                    .send()
                    .end((err, res) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(res);
                        }
                    })
            );

            const providers = response.body.thirdParty.providers;
            assert.equal(providers.length, 0);
        });

        it("test non-public tenant that has providers in core", async function () {
            supertokens.init({
                supertokens: {
                    connectionURI: globalConnectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    Session.init(),
                    ThirdParty.init({
                        signInAndUpFeature: {
                            providers: [
                                {
                                    config: {
                                        thirdPartyId: "google",
                                        clients: [
                                            {
                                                clientId: "test",
                                                clientSecret: "test",
                                            },
                                        ],
                                    },
                                    includeInNonPublicTenantsByDefault: false,
                                },
                            ],
                        },
                    }),
                    Multitenancy.init(),
                ],
            });

            await Multitenancy.createOrUpdateTenant("t1", {
                firstFactors: null
            })

            await Multitenancy.createOrUpdateThirdPartyConfig("t1", {
                thirdPartyId: "facebook",
                clients: [
                    {
                        clientId: "test",
                        clientSecret: "test",
                    }
                ]
            }, false);


            let response = await new Promise((resolve, reject) =>
                request()
                    .get("/auth/t1/loginmethods")
                    .send()
                    .end((err, res) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(res);
                        }
                    })
            );

            const providers = response.body.thirdParty.providers;
            assert.equal(providers.length, 1);
            assert.equal(providers[0].id, "facebook");
        });
    });

    describe("with includeInNonPublicTenantsByDefault set to true", function () {
        it("test public tenant that doesn't have providers in core", async function () {
            supertokens.init({
                supertokens: {
                    connectionURI: globalConnectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    Session.init(),
                    ThirdParty.init({
                        signInAndUpFeature: {
                            providers: [
                                {
                                    config: {
                                        thirdPartyId: "google",
                                        clients: [
                                            {
                                                clientId: "test",
                                                clientSecret: "test",
                                            },
                                        ],
                                    },
                                    includeInNonPublicTenantsByDefault: true,
                                },
                            ],
                        },
                    }),
                    Multitenancy.init(),
                ],
            });

            let response = await new Promise((resolve, reject) =>
                request()
                    .get("/auth/loginmethods")
                    .send()
                    .end((err, res) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(res);
                        }
                    })
            );

            const providers = response.body.thirdParty.providers;
            assert.equal(providers.length, 1);
            assert.equal(providers[0].id, "google");
        });

        it("test public tenant that have providers in core", async function () {
            supertokens.init({
                supertokens: {
                    connectionURI: globalConnectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    Session.init(),
                    ThirdParty.init({
                        signInAndUpFeature: {
                            providers: [
                                {
                                    config: {
                                        thirdPartyId: "google",
                                        clients: [
                                            {
                                                clientId: "test",
                                                clientSecret: "test",
                                            },
                                        ],
                                    },
                                    includeInNonPublicTenantsByDefault: true,
                                },
                            ],
                        },
                    }),
                    Multitenancy.init(),
                ],
            });

            await Multitenancy.createOrUpdateThirdPartyConfig("public", {
                thirdPartyId: "facebook",
                clients: [
                    {
                        clientId: "test",
                        clientSecret: "test",
                    }
                ]
            }, false);


            let response = await new Promise((resolve, reject) =>
                request()
                    .get("/auth/loginmethods")
                    .send()
                    .end((err, res) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(res);
                        }
                    })
            );

            const providers = response.body.thirdParty.providers;
            assert.equal(providers.length, 1);
            assert.equal(providers[0].id, "facebook");
        });

        it("test non-public tenant that doesn't have providers in core", async function () {
            supertokens.init({
                supertokens: {
                    connectionURI: globalConnectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    Session.init(),
                    ThirdParty.init({
                        signInAndUpFeature: {
                            providers: [
                                {
                                    config: {
                                        thirdPartyId: "google",
                                        clients: [
                                            {
                                                clientId: "test",
                                                clientSecret: "test",
                                            },
                                        ],
                                    },
                                    includeInNonPublicTenantsByDefault: true,
                                },
                            ],
                        },
                    }),
                    Multitenancy.init(),
                ],
            });

            await Multitenancy.createOrUpdateTenant("t1", {
                firstFactors: null
            })    

            let response = await new Promise((resolve, reject) =>
                request()
                    .get("/auth/t1/loginmethods")
                    .send()
                    .end((err, res) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(res);
                        }
                    })
            );

            const providers = response.body.thirdParty.providers;
            assert.equal(providers.length, 1);
            assert.equal(providers[0].id, "google");
        });

        it("test non-public tenant that has providers in core", async function () {
            supertokens.init({
                supertokens: {
                    connectionURI: globalConnectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [
                    Session.init(),
                    ThirdParty.init({
                        signInAndUpFeature: {
                            providers: [
                                {
                                    config: {
                                        thirdPartyId: "google",
                                        clients: [
                                            {
                                                clientId: "test",
                                                clientSecret: "test",
                                            },
                                        ],
                                    },
                                    includeInNonPublicTenantsByDefault: true,
                                },
                            ],
                        },
                    }),
                    Multitenancy.init(),
                ],
            });

            await Multitenancy.createOrUpdateTenant("t1", {
                firstFactors: null
            })

            await Multitenancy.createOrUpdateThirdPartyConfig("t1", {
                thirdPartyId: "facebook",
                clients: [
                    {
                        clientId: "test",
                        clientSecret: "test",
                    }
                ]
            }, false);


            let response = await new Promise((resolve, reject) =>
                request()
                    .get("/auth/t1/loginmethods")
                    .send()
                    .end((err, res) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(res);
                        }
                    })
            );

            const providers = response.body.thirdParty.providers;
            assert.equal(providers.length, 1);
            assert.equal(providers[0].id, "facebook");
        });
    });
});
