import SuperTokens from "supertokens-node";
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
                                  sendEmail: minify(
                                      "passwordless.init.emailDelivery.service.sendEmail",
                                      config?.emailDelivery?.service?.sendEmail.toString()
                                  ),
                              },
                          },
                      }
                    : {}),
                ...(config?.smsDelivery?.service?.sendSms
                    ? {
                          smsDelivery: {
                              ...config?.smsDelivery,
                              service: {
                                  ...config?.smsDelivery?.service,
                                  sendSms: minify(
                                      "passwordless.init.smsDelivery.service.sendSms",
                                      config?.smsDelivery?.service?.sendSms.toString()
                                  ),
                              },
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
                                            "passwordless.init.override.apis",
                                            config?.override?.apis.toString()
                                        ),
                                    }
                                  : {}),
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
        return response;
    },
    updateUser: async (input) => {
        return await queryAPI({
            method: "post",
            path: "/test/passwordless/updateuser",
            input: { ...input },
        });
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
        return response;
    },
};
