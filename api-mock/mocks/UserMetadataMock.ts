import SuperTokens from "supertokens-node";
import { User as UserClass } from "supertokens-node/lib/build/user";
import UserMetadata from "supertokens-node/recipe/usermetadata";
import { queryAPI } from "../fetcher";
import { minify } from "../utils";

export const UserMetadataMock: Partial<typeof UserMetadata> = {
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
                                        apis: minify(
                                            "usermetadata.init.override.apis",
                                            config?.override?.apis.toString()
                                        ),
                                    }
                                  : {}),
                              ...(config.override.functions
                                  ? {
                                        functions: minify(
                                            "usermetadata.init.override.functions",
                                            config?.override?.functions.toString()
                                        ),
                                    }
                                  : {}),
                          },
                      }
                    : {}),
            }),
            recipeId: "usermetadata",
        } as any;
    },
    getUserMetadata: async (userId, userContext) => {
        return await queryAPI({
            method: "post",
            path: "/test/usermetadata/getusermetadata",
            input: { userId, userContext },
        });
    },
    updateUserMetadata: async (userId, metadataUpdate, userContext) => {
        return await queryAPI({
            method: "post",
            path: "/test/usermetadata/updateusermetadata",
            input: { userId, metadataUpdate, userContext },
        });
    },
    clearUserMetadata: async (userId, userContext) => {
        return await queryAPI({
            method: "post",
            path: "/test/usermetadata/clearusermetadata",
            input: { userId, userContext },
        });
    },
};
