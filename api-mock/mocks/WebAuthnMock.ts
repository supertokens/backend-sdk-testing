import SuperTokens from "supertokens-node";
import { User as UserClass } from "supertokens-node/lib/build/user";
import WebAuthn from "supertokens-node/recipe/webauthn";
import { queryAPI } from "../fetcher";
import { minify } from "../utils";

export const WebAuthnMock: Partial<typeof WebAuthn> = {
    init: (config) => {
        return {
            config: JSON.stringify({
                ...config,
                ...(config?.getOrigin
                    ? {
                          getOrigin: minify("webauthn.init.getOrigin", config.getOrigin.toString()),
                      }
                    : {}),
                ...(config?.getRelyingPartyId
                    ? {
                          getRelyingPartyId: minify(
                              "webauthn.init.getRelyingPartyId",
                              config.getRelyingPartyId.toString()
                          ),
                      }
                    : {}),
                ...(config?.getRelyingPartyName
                    ? {
                          getRelyingPartyName: minify(
                              "webauthn.init.getRelyingPartyName",
                              config.getRelyingPartyName.toString()
                          ),
                      }
                    : {}),
                ...(config?.validateEmailAddress
                    ? {
                          validateEmailAddress: minify(
                              "webauthn.init.validateEmailAddress",
                              config.validateEmailAddress.toString()
                          ),
                      }
                    : {}),
                ...(config?.emailDelivery
                    ? {
                          emailDelivery: {
                              ...config?.emailDelivery,
                              ...(config?.emailDelivery.override
                                  ? {
                                        override: minify(
                                            "webauthn.init.emailDelivery.override",
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
                                        apis: minify("webauthn.init.override.apis", config?.override?.apis.toString()),
                                    }
                                  : {}),
                              ...(config.override.functions
                                  ? {
                                        functions: minify(
                                            "webauthn.init.override.functions",
                                            config?.override?.functions.toString()
                                        ),
                                    }
                                  : {}),
                          },
                      }
                    : {}),
            }),
            recipeId: "webauthn",
        } as any;
    },

    registerOptions: async (input) => {
        return await queryAPI({
            method: "post",
            path: "/test/webauthn/registeroptions",
            input,
        });
    },

    signInOptions: async (input) => {
        return await queryAPI({
            method: "post",
            path: "/test/webauthn/signinoptions",
            input,
        });
    },

    getGeneratedOptions: async (input) => {
        return await queryAPI({
            method: "post",
            path: "/test/webauthn/getgeneratedoptions",
            input,
        });
    },

    signUp: async (input) => {
        return await queryAPI({
            method: "post",
            path: "/test/webauthn/signup",
            input,
        });
    },

    signIn: async (input) => {
        return await queryAPI({
            method: "post",
            path: "/test/webauthn/signin",
            input,
        });
    },

    verifyCredentials: async (input) => {
        return await queryAPI({
            method: "post",
            path: "/test/webauthn/verifycredentials",
            input,
        });
    },

    generateRecoverAccountToken: async (input) => {
        return await queryAPI({
            method: "post",
            path: "/test/webauthn/generaterecoveraccounttoken",
            input,
        });
    },

    recoverAccount: async (input) => {
        return await queryAPI({
            method: "post",
            path: "/test/webauthn/recoveraccount",
            input,
        });
    },

    consumeRecoverAccountToken: async (input) => {
        return await queryAPI({
            method: "post",
            path: "/test/webauthn/consumerecoveraccounttoken",
            input,
        });
    },

    registerCredential: async (input) => {
        return await queryAPI({
            method: "post",
            path: "/test/webauthn/registercredential",
            input,
        });
    },

    createRecoverAccountLink: async (input) => {
        return await queryAPI({
            method: "post",
            path: "/test/webauthn/createrecoveraccountlink",
            input,
        });
    },

    sendRecoverAccountEmail: async (input) => {
        return await queryAPI({
            method: "post",
            path: "/test/webauthn/sendrecoveraccountemail",
            input,
        });
    },

    sendEmail: async (input) => {
        return await queryAPI({
            method: "post",
            path: "/test/webauthn/sendemail",
            input,
        });
    },

    getUserFromRecoverAccountToken: async (input) => {
        return await queryAPI({
            method: "post",
            path: "/test/webauthn/getuserfromrecoveraccounttoken",
            input,
        });
    },

    removeGeneratedOptions: async (input) => {
        return await queryAPI({
            method: "post",
            path: "/test/webauthn/removegeneratedoptions",
            input,
        });
    },

    removeCredential: async (input) => {
        return await queryAPI({
            method: "post",
            path: "/test/webauthn/removecredential",
            input,
        });
    },

    getCredential: async (input) => {
        return await queryAPI({
            method: "post",
            path: "/test/webauthn/getcredential",
            input,
        });
    },

    listCredentials: async (input) => {
        return await queryAPI({
            method: "post",
            path: "/test/webauthn/listcredentials",
            input,
        });
    },
};
