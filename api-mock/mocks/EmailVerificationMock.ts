import SuperTokens, { convertToRecipeUserId, RecipeUserId } from "supertokens-node";
import EmailPasswordRecipe from "supertokens-node/lib/build/recipe/emailverification/recipe";
import EmailVerification, { EmailVerificationClaim } from "supertokens-node/recipe/emailverification";
import { queryAPI } from "../fetcher";
import { makeBuiltInClaimSerializable, minify } from "../utils";

export const EmailVerificationRecipeMock: Partial<EmailPasswordRecipe> = {
    // @ts-ignore
    getInstance: () => EmailVerificationRecipeMock,
    updateSessionIfRequiredPostEmailVerification: async (input) => {
        return await queryAPI({
            method: "post",
            path: "/test/emailverification/updatesessionifrequiredpostemailverification",
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
                                  ? {
                                        override: minify(
                                            "emailverification.init.emailDelivery.override",
                                            config.emailDelivery.override.toString()
                                        ),
                                    }
                                  : {}),
                          },
                      }
                    : {}),
                ...(config?.override
                    ? {
                          override: {
                              ...config.override,
                              ...(config.override.functions
                                  ? {
                                        functions: minify(
                                            "emailverification.init.override.functions",
                                            config.override.functions.toString()
                                        ),
                                    }
                                  : {}),
                          },
                      }
                    : {}),
            }),
            recipeId: "emailverification",
        } as any;
    },
    isEmailVerified: async (userId, email, userContext) => {
        return await queryAPI({
            method: "post",
            path: "/test/emailverification/isemailverified",
            input: {
                userId,
                email,
                userContext,
            },
        });
    },
    createEmailVerificationToken: async (
        tenantId: string,
        recipeUserId: RecipeUserId,
        email?: string | undefined,
        userContext?: Record<string, any> | undefined
    ) => {
        return await queryAPI({
            method: "post",
            path: "/test/emailverification/createemailverificationtoken",
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
        attemptAccountLinking?: boolean,
        userContext?: Record<string, any> | undefined
    ) => {
        const response = await queryAPI({
            method: "post",
            path: "/test/emailverification/verifyemailusingtoken",
            input: {
                tenantId,
                token,
                attemptAccountLinking,
                userContext,
            },
        });
        return response;
    },
    unverifyEmail: async (userId, email, userContext) => {
        return await queryAPI({
            method: "post",
            path: "/test/emailverification/unverifyemail",
            input: {
                userId,
                email,
                userContext,
            },
        });
    },
    EmailVerificationClaim: makeBuiltInClaimSerializable(EmailVerificationClaim),
};
