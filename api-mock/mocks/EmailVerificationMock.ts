import SuperTokens from "supertokens-node";
import EmailPasswordRecipe from "supertokens-node/lib/build/recipe/emailverification/recipe";
import EmailVerification from "supertokens-node/recipe/emailverification";
import { queryAPI } from "../fetcher";
import { minify } from "../utils";

export const EmailVerificationRecipeMock: Partial<EmailPasswordRecipe> = {
    // @ts-ignore
    getInstance: () => EmailVerificationRecipeMock,
    updateSessionIfRequiredPostEmailVerification: async (input) => {
        return await queryAPI({
            method: "post",
            path: "/mock/emailverification/updatesessionifrequiredpostemailverification",
            input,
        });
    },
};

export const EmailVerificationMock: Partial<typeof EmailVerification> = {
    init: (config) => {
        return {
            config: JSON.stringify({
                ...config,
                ...(config?.emailDelivery
                    ? {
                          emailDelivery: {
                              ...config?.emailDelivery,
                              ...(config?.emailDelivery.override
                                  ? { override: minify(config.emailDelivery.override.toString()) }
                                  : {}),
                          },
                      }
                    : {}),
                ...(config?.getEmailForRecipeUserId
                    ? {
                          getEmailForRecipeUserId: minify(config.getEmailForRecipeUserId.toString()),
                      }
                    : {}),

                ...(config?.override
                    ? {
                          override: {
                              ...config.override,
                              ...(config.override.functions
                                  ? {
                                        functions: minify(config.override.functions.toString()),
                                    }
                                  : {}),
                          },
                      }
                    : {}),
            }),
            recipeId: "emailverification",
        } as any;
    },
    isEmailVerified: async (recipeUserId, email, userContext) => {
        return await queryAPI({
            method: "post",
            path: "/mock/emailverification/isemailverified",
            input: {
                recipeUserId: recipeUserId.getAsString(),
                email,
                userContext,
            },
        });
    },
    createEmailVerificationToken: async (
        tenantId: string,
        recipeUserId: SuperTokens.RecipeUserId,
        email?: string | undefined,
        userContext?: Record<string, any> | undefined
    ) => {
        return await queryAPI({
            method: "post",
            path: "/mock/emailverification/createemailverificationtoken",
            input: {
                tenantId,
                recipeUserId: recipeUserId.getAsString(),
                email,
                userContext,
            },
        });
    },
    verifyEmailUsingToken: async (
        tenantId: string,
        token: string,
        attemptAccountLinking?: boolean | undefined,
        userContext?: Record<string, any> | undefined
    ) => {
        const response = await queryAPI({
            method: "post",
            path: "/mock/emailverification/verifyemailusingtoken",
            input: {
                token,
                userContext,
                attemptAccountLinking,
                tenantId,
            },
        });
        return "user" in response
            ? {
                  ...response,
                  user: {
                      ...response.user,
                      recipeUserId: SuperTokens.convertToRecipeUserId(response.user.recipeUserId.recipeUserId),
                  },
              }
            : response;
    },
    unverifyEmail: async (recipeUserId, email, userContext) => {
        return await queryAPI({
            method: "post",
            path: "/mock/emailverification/unverifyemail",
            input: {
                recipeUserId: recipeUserId.getAsString(),
                email,
                userContext,
            },
        });
    },
    EmailVerificationClaim: EmailVerification.EmailVerificationClaim,
};
