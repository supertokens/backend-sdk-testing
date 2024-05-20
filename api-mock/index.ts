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
        createResetPasswordLink: async (tenantId, userId, email, userContext) => {
            return await queryAPI({
                method: "post",
                path: "/mock/emailpassword/createresetpasswordlink",
                input: { tenantId, userId, email, userContext },
            });
        },
        signUp: async (tenantId, email, password, session, userContext) => {
            return await queryAPI({
                method: "post",
                path: "/mock/emailpassword/signup",
                input: { tenantId, email, password, session, userContext },
            });
        },
        signIn: async (tenantId, email, password, session, userContext) => {
            return await queryAPI({
                method: "post",
                path: "/mock/emailpassword/signin",
                input: { tenantId, email, password, session, userContext },
            });
        },
        updateEmailOrPassword: async ({ recipeUserId: { recipeUserId }, ...input }) => {
            return await queryAPI({
                method: "post",
                path: "/mock/emailpassword/updateemailorpassword",
                input: {
                    recipeUserId,
                    ...input,
                },
            });
        },
    },
    /** @type {import('supertokens-node/recipe/accountlinking')} */
    AccountLinking: {
        createPrimaryUser: async ({ recipeUserId }, userContext) => {
            return await queryAPI({
                method: "post",
                path: "/mock/accountlinking/createprimaryuser",
                input: {
                    recipeUserId,
                    userContext,
                },
            });
        },
        linkAccounts: async ({ recipeUserId }, primaryUserId, userContext) => {
            return await queryAPI({
                method: "post",
                path: "/mock/accountlinking/linkaccounts",
                input: {
                    recipeUserId,
                    primaryUserId,
                    userContext,
                },
            });
        },
        isEmailChangeAllowed: async ({ recipeUserId }, newEmail, isVerified, session, userContext) => {
            return await queryAPI({
                method: "post",
                path: "/mock/accountlinking/isemailchangeallowed",
                input: {
                    recipeUserId,
                    newEmail,
                    isVerified,
                    session,
                    userContext,
                },
            });
        },
    },
    /** @type {import('supertokens-node/recipe/thirdparty')} */
    ThirdParty: {
        manuallyCreateOrUpdateUser: async (
            tenantId,
            thirdPartyId,
            thirdPartyUserId,
            email,
            isVerified,
            session,
            userContext
        ) => {
            return await queryAPI({
                method: "post",
                path: "/mock/thirdparty/manuallycreateorupdateuser",
                input: { tenantId, thirdPartyId, thirdPartyUserId, email, isVerified, session, userContext },
            });
        },
    },
    /** @type {import('supertokens-node/recipe/session')} */
    Session: {
        createNewSessionWithoutRequestResponse: async (
            tenantId,
            { recipeUserId },
            accessTokenPayload,
            sessionDataInDatabase,
            disableAntiCsrf,
            userContext
        ) => {
            return await queryAPI({
                method: "post",
                path: "/mock/session/createnewsessionwithoutrequestresponse",
                input: {
                    tenantId,
                    recipeUserId,
                    accessTokenPayload,
                    sessionDataInDatabase,
                    disableAntiCsrf,
                    userContext,
                },
            });
        },
    },
    /** @type {import('supertokens-node/recipe/emailverification')} */
    EmailVerification: {
        isEmailVerified: async ({ recipeUserId }, email, userContext) => {
            return await queryAPI({
                method: "post",
                path: "/mock/emailverification/isemailverified",
                input: {
                    recipeUserId,
                    email,
                    userContext,
                },
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
