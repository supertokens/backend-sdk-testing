import EmailPassword from "supertokens-node/recipe/emailpassword";
import AccountLinking from "supertokens-node/recipe/accountlinking";
import { fetch } from "cross-fetch";

const apiMockPort = process.env.ST_SDK === "golang" ? 3032 : process.env.ST_SDK === "python" ? 3031 : 3030;

async function queryAPI({ method, path, input, headers }: any) {
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
        init(config) {
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
        init(config) {
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
async function initApp(config) {
    let tries = 0;
    do {
        try {
            const { ok } = await queryAPI({
                method: "get",
                path: "/mock/ping",
            });
            if (ok) {
                break;
            }
        } catch (ignored) {
            tries++;
            console.warn("Failed to start app:", tries);
            if (tries === 10) {
                throw "Failed to start app";
            }
        }
        await new Promise((r) => setTimeout(r, 200));
    } while (true);

    await queryAPI({
        method: "post",
        path: "/mock/reset",
        input: config,
    });
}

module.exports.recipesMock = recipesMock;
module.exports.initApp = initApp;
module.exports.queryAPI = queryAPI;
