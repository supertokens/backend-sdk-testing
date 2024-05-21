import { fetch } from "cross-fetch";
import type AccountLinking from "supertokens-node/recipe/accountlinking";
import type EmailPassword from "supertokens-node/recipe/emailpassword";
import type EmailVerification from "supertokens-node/recipe/emailverification";
import type Session from "supertokens-node/recipe/session";
import type ThirdParty from "supertokens-node/recipe/thirdparty";
import type { MockConfig } from "./api-mock-server"; // FIXME: update this import when moving to its own package
import { RecipeUserId } from "supertokens-node/lib/build";

const apiMockPort = process.env.ST_SDK === "golang" ? 3032 : process.env.ST_SDK === "python" ? 3031 : 3030;

export async function queryAPI({
    method,
    path,
    input,
    headers,
}: {
    method: "post" | "get" | "delete" | "put";
    path: string;
    input?: object;
    headers?: Record<string, string>;
}) {
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

const parseRecipeUserId = (recipeUserId: RecipeUserId | { recipeUserId: string }) => {
    return "getAsString" in recipeUserId ? recipeUserId.getAsString() : recipeUserId.recipeUserId;
};

const EmailPasswordMock: Partial<typeof EmailPassword> = {
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
    updateEmailOrPassword: async ({ recipeUserId, ...input }) => {
        return await queryAPI({
            method: "post",
            path: "/mock/emailpassword/updateemailorpassword",
            input: {
                recipeUserId: parseRecipeUserId(recipeUserId),
                ...input,
            },
        });
    },
};

const ThirdPartyMock: Partial<typeof ThirdParty> = {
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
};

const AccountLinkingMock: Partial<typeof AccountLinking> = {
    createPrimaryUser: async (recipeUserId, userContext) => {
        return await queryAPI({
            method: "post",
            path: "/mock/accountlinking/createprimaryuser",
            input: {
                recipeUserId: parseRecipeUserId(recipeUserId),
                userContext,
            },
        });
    },
    linkAccounts: async (recipeUserId, primaryUserId, userContext) => {
        return await queryAPI({
            method: "post",
            path: "/mock/accountlinking/linkaccounts",
            input: {
                recipeUserId: parseRecipeUserId(recipeUserId),
                primaryUserId,
                userContext,
            },
        });
    },
    isEmailChangeAllowed: async (recipeUserId, newEmail, isVerified, session, userContext) => {
        return await queryAPI({
            method: "post",
            path: "/mock/accountlinking/isemailchangeallowed",
            input: {
                recipeUserId: parseRecipeUserId(recipeUserId),
                newEmail,
                isVerified,
                session,
                userContext,
            },
        });
    },
};

const SessionMock: Partial<typeof Session> = {
    createNewSessionWithoutRequestResponse: async (
        tenantId,
        recipeUserId,
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
                recipeUserId: parseRecipeUserId(recipeUserId),
                accessTokenPayload,
                sessionDataInDatabase,
                disableAntiCsrf,
                userContext,
            },
        });
    },
};

const EmailVerificationMock: Partial<typeof EmailVerification> = {
    isEmailVerified: async (recipeUserId, email, userContext) => {
        return await queryAPI({
            method: "post",
            path: "/mock/emailverification/isemailverified",
            input: {
                recipeUserId: parseRecipeUserId(recipeUserId),
                email,
                userContext,
            },
        });
    },
};

export const recipesMock = {
    EmailPassword: EmailPasswordMock,
    AccountLinking: AccountLinkingMock,
    ThirdParty: ThirdPartyMock,
    Session: SessionMock,
    EmailVerification: EmailVerificationMock,
};

export async function initApp(config: MockConfig) {
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
