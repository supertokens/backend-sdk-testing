import { MultiFactorAuthClaim } from "supertokens-node/lib/build/recipe/multifactorauth/multiFactorAuthClaim";
import MultiFactorAuth from "supertokens-node/recipe/multifactorauth";
import { queryAPI } from "../fetcher";
import { minify } from "../utils";

MultiFactorAuthClaim.fetchValue = async (_userId, recipeUserId, tenantId, currentPayload, userContext) => {
    return await queryAPI({
        method: "post",
        path: "/test/multifactorauth/multifactorauthclaim.fetchvalue",
        input: {
            _userId,
            recipeUserId: recipeUserId.getAsString(),
            tenantId,
            currentPayload,
            userContext,
        },
    });
};

export const MultiFactorAuthMock: Partial<typeof MultiFactorAuth> = {
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
                                        apis: minify(config?.override?.apis.toString()),
                                    }
                                  : {}),
                              ...(config.override.functions
                                  ? {
                                        functions: minify(config?.override?.functions.toString()),
                                    }
                                  : {}),
                          },
                      }
                    : {}),
            }),
            recipeId: "multifactorauth",
        } as any;
    },
    MultiFactorAuthClaim: MultiFactorAuthClaim,
};
