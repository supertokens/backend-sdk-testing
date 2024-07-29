import SuperTokens from "supertokens-node";
import EmailPassword, { User } from "supertokens-node/recipe/emailpassword";
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
                                  ? {
                                        override: minify(
                                            "emailpassword.init.emailDelivery.override",
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
                              ...(config.override.apis
                                  ? {
                                        apis: minify(
                                            "emailpassword.init.override.apis",
                                            config?.override?.apis.toString()
                                        ),
                                    }
                                  : {}),
                          },
                      }
                    : {}),
            }),
            recipeId: "emailpassword",
        } as any;
    },
    createResetPasswordLink: async (tenantId, userId, userContext) => {
        return await queryAPI({
            method: "post",
            path: "/test/emailpassword/createresetpasswordlink",
            input: { tenantId, userId, userContext },
        });
    },
    signUp: async (tenantId: string, email: string, password: string, userContext?: any) => {
        const response = await queryAPI({
            method: "post",
            path: "/test/emailpassword/signup",
            input: { tenantId, email, password, userContext },
        });
        return response as { status: "OK"; user: User } | { status: "EMAIL_ALREADY_EXISTS_ERROR" };
    },
    signIn: async (tenantId: string, email: string, password: string, userContext?: any) => {
        const response = await queryAPI({
            method: "post",
            path: "/test/emailpassword/signin",
            input: { tenantId, email, password, userContext },
        });
        return response as { status: "OK"; user: User } | { status: "WRONG_CREDENTIALS_ERROR" };
    },
    updateEmailOrPassword: async (input) => {
        return await queryAPI({
            method: "post",
            path: "/test/emailpassword/updateemailorpassword",
            input: {
                ...input,
            },
        });
    },
};
