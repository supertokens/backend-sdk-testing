import { User } from "supertokens-node";
import ThirdParty from "supertokens-node/recipe/thirdparty";
import { queryAPI } from "../fetcher";
import { minify } from "../utils";

export const ThirdPartyMock: Partial<typeof ThirdParty> = {
    init: (config) => {
        return {
            config: JSON.stringify({
                ...config,
                ...(config?.override
                    ? {
                          override: {
                              ...config.override,
                              ...(config.override.apis
                                  ? {
                                        apis: minify("thirdparty.init.override.apis", config.override.apis.toString()),
                                    }
                                  : {}),
                          },
                      }
                    : {}),
                ...(config?.signInAndUpFeature
                    ? {
                          signInAndUpFeature: {
                              ...config?.signInAndUpFeature,
                              ...(config?.signInAndUpFeature.providers
                                  ? {
                                        providers: config?.signInAndUpFeature.providers.map((p) => ({
                                            ...p,
                                            ...(p.override
                                                ? {
                                                      override: minify(
                                                          "thirdparty.init.signInAndUpFeature.providers." +
                                                              p.config.thirdPartyId +
                                                              ".override",
                                                          p.override.toString()
                                                      ),
                                                  }
                                                : {}),
                                        })),
                                    }
                                  : {}),
                          },
                      }
                    : {}),
            }),
            recipeId: "thirdparty",
        } as any;
    },
    manuallyCreateOrUpdateUser: async (
        tenantId: string,
        thirdPartyId: string,
        thirdPartyUserId: string,
        email: string,
        isVerified: boolean,
        userContext?: any
    ) => {
        const response = await queryAPI({
            method: "post",
            path: "/test/thirdparty/manuallycreateorupdateuser",
            input: { tenantId, thirdPartyId, thirdPartyUserId, email, isVerified, userContext },
        });
        return {
            status: "OK",
            createdNewRecipeUser: response.createdNewUser,
            recipeUserId: response.recipeUserId,
            user: response.user as User,
        };
    },
};
