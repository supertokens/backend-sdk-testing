import SuperTokens from "supertokens-node";
import { User as UserClass } from "supertokens-node/lib/build/user";
import Passwordless from "supertokens-node/recipe/passwordless";
import { queryAPI } from "../fetcher";
import { minify } from "../utils";

export const PasswordlessMock: Partial<typeof Passwordless> = {
    init: (config) => {
        return {
            config: JSON.stringify({
                ...config,
                ...(config?.emailDelivery?.service?.sendEmail
                    ? {
                          emailDelivery: {
                              ...config?.emailDelivery,
                              service: {
                                  ...config?.emailDelivery?.service,
                                  sendEmail: minify(config?.emailDelivery?.service?.sendEmail.toString()),
                              },
                          },
                      }
                    : {}),
            }),
            recipeId: "passwordless",
        } as any;
    },
    signInUp: async (input) => {
        const response = await queryAPI({
            method: "post",
            path: "/test/passwordless/signinup",
            input: { ...input },
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
    createCode: async (input) => {
        return await queryAPI({
            method: "post",
            path: "/test/passwordless/createcode",
            input: { ...input },
        });
    },
    consumeCode: async (input) => {
        const response = await queryAPI({
            method: "post",
            path: "/test/passwordless/consumecode",
            input: { ...input },
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
};
