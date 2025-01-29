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
                          },
                      }
                    : {}),
            }),
            recipeId: "webauthn",
        } as any;
    },
    getGeneratedOptions: async ({ webauthnGeneratedOptionsId, tenantId, userContext }) => {
        return await queryAPI({
            method: "post",
            path: "/test/webauthn/getgeneratedoptions",
            input: { webauthnGeneratedOptionsId, tenantId, userContext },
        });
    },
};
