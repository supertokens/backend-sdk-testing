import SuperTokens from "supertokens-node";
import { User as UserClass } from "supertokens-node/lib/build/user";
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
                                        apis: minify(config.override.apis.toString()),
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
                                                      override: minify(p.override.toString()),
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
        tenantId,
        thirdPartyId,
        thirdPartyUserId,
        email,
        isVerified,
        session,
        userContext
    ) => {
        const response = await queryAPI({
            method: "post",
            path: "/mock/thirdparty/manuallycreateorupdateuser",
            input: { tenantId, thirdPartyId, thirdPartyUserId, email, isVerified, session, userContext },
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
