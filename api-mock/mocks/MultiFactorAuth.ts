import { MultiFactorAuthClaim } from "supertokens-node/lib/build/recipe/multifactorauth/multiFactorAuthClaim";
import MultiFactorAuth from "supertokens-node/recipe/multifactorauth";
import { queryAPI } from "../fetcher";

MultiFactorAuthClaim.fetchValue = async (_userId, recipeUserId, tenantId, currentPayload, userContext) => {
    return await queryAPI({
        method: "post",
        path: "/mock/multifactorauth/multifactorauthclaim.fetchvalue",
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
            }),
            recipeId: "multifactorauth",
        } as any;
    },
    MultiFactorAuthClaim: MultiFactorAuthClaim,
};
