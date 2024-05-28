import { default as AccountLinkingRecipe } from "supertokens-node/lib/build/recipe/accountlinking/recipe";
import { User as UserClass } from "supertokens-node/lib/build/user";
import AccountLinking from "supertokens-node/recipe/accountlinking";
import { queryAPI } from "../fetcher";
import { minify } from "../utils";

export const AccountLinkingMock: Partial<typeof AccountLinking> = {
    init: (config) => {
        return {
            config: JSON.stringify({
                ...config,
                ...(config?.shouldDoAutomaticAccountLinking
                    ? {
                          shouldDoAutomaticAccountLinking: minify(config.shouldDoAutomaticAccountLinking.toString()),
                      }
                    : {}),

                ...(config?.onAccountLinked
                    ? {
                          onAccountLinked: minify(config.onAccountLinked.toString()),
                      }
                    : {}),
            }),
            recipeId: "accountlinking",
        } as any;
    },
    createPrimaryUser: async (recipeUserId, userContext) => {
        const response = await queryAPI({
            method: "post",
            path: "/mock/accountlinking/createprimaryuser",
            input: {
                recipeUserId: recipeUserId.getAsString(),
                userContext,
            },
        });
        return {
            ...response,
            user: response.user && new UserClass(response.user),
        };
    },
    linkAccounts: async (recipeUserId, primaryUserId, userContext) => {
        const response = await queryAPI({
            method: "post",
            path: "/mock/accountlinking/linkaccounts",
            input: {
                recipeUserId: recipeUserId.getAsString(),
                primaryUserId,
                userContext,
            },
        });
        return {
            ...response,
            user: response.user && new UserClass(response.user),
        };
    },
    isEmailChangeAllowed: async (recipeUserId, newEmail, isVerified, session, userContext) => {
        return await queryAPI({
            method: "post",
            path: "/mock/accountlinking/isemailchangeallowed",
            input: {
                recipeUserId: recipeUserId.getAsString(),
                newEmail,
                isVerified,
                session,
                userContext,
            },
        });
    },
    unlinkAccount: async (recipeUserId, userContext) => {
        return await queryAPI({
            method: "post",
            path: "/mock/accountlinking/unlinkaccount",
            input: {
                recipeUserId: recipeUserId.getAsString(),
                userContext,
            },
        });
    },
    createPrimaryUserIdOrLinkAccounts: async (tenantId, recipeUserId, session, userContext) => {
        return await queryAPI({
            method: "post",
            path: "/mock/accountlinking/createprimaryuseridorlinkaccounts",
            input: { tenantId, recipeUserId: recipeUserId.getAsString(), session, userContext },
        });
    },
    getPrimaryUserThatCanBeLinkedToRecipeUserId: async (tenantId, recipeUserId, userContext) => {
        const user = await queryAPI({
            method: "post",
            path: "/mock/accountlinking/getprimaryuserthatcanbelinkedtorecipeuserid",
            input: {
                tenantId,
                recipeUserId: recipeUserId.getAsString(),
                userContext,
            },
        });
        return user === undefined ? undefined : new UserClass(user);
    },
    isSignUpAllowed: async (tenantId, newUser, isVerified, session, userContext) => {
        return await queryAPI({
            method: "post",
            path: "/mock/accountlinking/issignupallowed",
            input: { tenantId, newUser, isVerified, session, userContext },
        });
    },
    isSignInAllowed: async (tenantId, recipeUserId, session, userContext) => {
        return await queryAPI({
            method: "post",
            path: "/mock/accountlinking/issigninallowed",
            input: { tenantId, recipeUserId: recipeUserId.getAsString(), session, userContext },
        });
    },
    canCreatePrimaryUser: async (recipeUserId, userContext) => {
        return await queryAPI({
            method: "post",
            path: "/mock/accountlinking/cancreateprimaryuser",
            input: {
                recipeUserId: recipeUserId.getAsString(),
                userContext,
            },
        });
    },
};

export const AccountLinkingRecipeMock = {
    // @ts-ignore
    getInstance: () =>
        ({
            verifyEmailForRecipeUserIfLinkedAccountsAreVerified: async (input) => {
                return await queryAPI({
                    method: "post",
                    path: "/mock/accountlinking/verifyemailforrecipeuseriflinkedaccountsareverified",
                    input: {
                        ...input,
                        recipeUserId: input.recipeUserId.getAsString(),
                        user: input.user.toJson(),
                    },
                });
            },
        } as AccountLinkingRecipe),
};
