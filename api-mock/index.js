let EmailPassword = require("supertokens-node/recipe/emailpassword");
let AccountLinking = require("supertokens-node/recipe/accountlinking");
const { fetch } = require("cross-fetch");
const { fork } = require("child_process");
const { join } = require("path");
const kill = require("tree-kill");

const apiMockPort = 3030;

async function queryAPI({ method, path, input, headers }) {
    let response = await fetch(`http://localhost:${apiMockPort}${path}`, {
        method,
        headers: {
            "Content-Type": "application/json",
            ...headers,
        },
        body: JSON.stringify(input),
    });

    if (response.status === 200) {
        return await response.json();
    } else {
        let message = await response.text();
        throw new Error(message);
    }
}

const recipesMock = {
    /** @type {import("supertokens-node/recipe/emailpassword")} */
    EmailPassword: {
        ...EmailPassword,
        init(config = {}) {
            return EmailPassword.init({
                ...config,
                override: {
                    functions: (originalImplementation) => {
                        return {
                            ...originalImplementation,
                            signUp: async (input) => {
                                return await queryAPI({
                                    method: "post",
                                    path: "/mock/EmailPassword/signup",
                                    input,
                                });
                            },
                            ...config?.override?.functions(originalImplementation),
                        };
                    },
                    apis: (originalImplementation) => {
                        return {
                            ...originalImplementation,
                            ...config?.override?.apis(originalImplementation),
                        };
                    },
                },
            });
        },
        createResetPasswordLink: async (tenantId, userId, email, userContext) => {
            return await queryAPI({
                method: "post",
                path: "/mock/EmailPassword/createResetPasswordLink",
                input: { tenantId, userId, email, userContext },
            });
        },
    },
    /** @type {import('supertokens-node/recipe/accountlinking')} */
    AccountLinking: {
        ...AccountLinking,
        init(config = {}) {
            return AccountLinking.init({
                ...config,
                override: {
                    functions: (originalImplementation) => {
                        return {
                            ...originalImplementation,
                            // createPrimaryUser: async (input) => {
                            //     return await queryAPI({
                            //         method: "post",
                            //         path: "/mock/AccountLinking/createPrimaryUser",
                            //         input,
                            //     });
                            // },
                            ...config?.override?.functions(originalImplementation),
                        };
                    },
                    apis: (originalImplementation) => {
                        return {
                            ...originalImplementation,
                            ...config?.override?.apis(originalImplementation),
                        };
                    },
                },
            });
        },
        createPrimaryUser: async (input) => {
            return await queryAPI({
                method: "post",
                path: "/mock/AccountLinking/createPrimaryUser",
                input,
            });
        },
    },
};

/** @type {import('./api-mock-server').MockStartServer} */
async function startApp(pid, config) {
    config.port = apiMockPort;
    if (pid) {
        await queryAPI({
            method: "post",
            path: "/mock/reset",
            input: config,
        });
        return pid;
    }
    return new Promise(async (resolve, reject) => {
        const child = fork(join(__dirname, "api-mock-server.ts"), {
            execArgv: ["node_modules/.bin/tsx"],
        });

        let tries = 0;

        do {
            try {
                const { ok } = await queryAPI({
                    method: "get",
                    path: "/mock/ping",
                });
                if (ok) {
                    await queryAPI({
                        method: "post",
                        path: "/mock/reset",
                        input: config,
                    });
                    break;
                }
            } catch (ignored) {
                tries++;
                if (tries === 10) {
                    reject(new Error("Failed to start app"));
                    return;
                }
            }
            await new Promise((r) => setTimeout(r, 200));
        } while (true);

        resolve(child.pid);
    });
}

async function stopApp(pid) {
    if (pid === undefined) {
        return;
    }
    return new Promise((resolve, reject) => {
        kill(pid, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

module.exports.recipesMock = recipesMock;
module.exports.startApp = startApp;
module.exports.stopApp = stopApp;
module.exports.queryAPI = queryAPI;
