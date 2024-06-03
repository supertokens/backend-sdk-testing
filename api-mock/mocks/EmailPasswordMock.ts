import SuperTokens from "supertokens-node";
import { User as UserClass } from "supertokens-node/lib/build/user";
import EmailPassword from "supertokens-node/recipe/emailpassword";
import { queryAPI } from "../fetcher";
import { minify } from "../utils";

export const EmailPasswordMock: Partial<typeof EmailPassword> = {
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
                ...(config?.override
                    ? {
                          override: {
                              ...config.override,
                              ...(config.override.apis
                                  ? {
                                        apis: minify(config?.override?.apis.toString()),
                                    }
                                  : {}),
                          },
                      }
                    : {}),
            }),
            recipeId: "emailpassword",
        } as any;
    },
    createResetPasswordLink: async (tenantId, userId, email, userContext) => {
        return await queryAPI({
            method: "post",
            path: "/test/emailpassword/createresetpasswordlink",
            input: { tenantId, userId, email, userContext },
        });
    },
    signUp: async (tenantId, email, password, session, userContext) => {
        const response = await queryAPI({
            method: "post",
            path: "/test/emailpassword/signup",
            input: { tenantId, email, password, session, userContext },
        });
        return {
            ...response,
            ...("user" in response
                ? {
                      user: new UserClass(response.user),
                  }
                : {}),
            ...("recipeUserId" in response
                ? {
                      recipeUserId: SuperTokens.convertToRecipeUserId(response.recipeUserId),
                  }
                : {}),
        };
    },
    signIn: async (tenantId, email, password, session, userContext) => {
        const response = await queryAPI({
            method: "post",
            path: "/test/emailpassword/signin",
            input: { tenantId, email, password, session, userContext },
        });
        return {
            ...response,
            ...("user" in response
                ? {
                      user: new UserClass(response.user),
                  }
                : {}),
            ...("recipeUserId" in response
                ? {
                      recipeUserId: SuperTokens.convertToRecipeUserId(response.recipeUserId),
                  }
                : {}),
        };
    },
    updateEmailOrPassword: async ({ recipeUserId, ...input }) => {
        return await queryAPI({
            method: "post",
            path: "/test/emailpassword/updateemailorpassword",
            input: {
                recipeUserId: recipeUserId.getAsString(),
                ...input,
            },
        });
    },
};
