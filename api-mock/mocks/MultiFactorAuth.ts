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

export let MultiFactorAuthMock: Partial<typeof MultiFactorAuth> = {
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
                                            "multifactorauth.init.override.apis",
                                            config?.override?.apis.toString()
                                        ),
                                    }
                                  : {}),
                              ...(config.override.functions
                                  ? {
                                        functions: minify(
                                            "multifactorauth.init.override.functions",
                                            config?.override?.functions.toString()
                                        ),
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
    getFactorsSetupForUser: async (userId, userContext) => {
        return await queryAPI({
            method: "post",
            path: "/test/multifactorauth/getfactorssetupforuser",
            input: { userId, userContext },
        });
    },
    assertAllowedToSetupFactorElseThrowInvalidClaimError: async (session, factorId, userContext) => {
        return await queryAPI({
            method: "post",
            path: "/test/multifactorauth/assertallowedtosetupfactorelsethowinvalidclaimerror",
            input: { session, factorId, userContext },
        });
    },
    getMFARequirementsForAuth: async (session, userContext) => {
        return await queryAPI({
            method: "post",
            path: "/test/multifactorauth/getmfarequirementsforauth",
            input: { session, userContext },
        });
    },
    markFactorAsCompleteInSession: async (session, factorId, userContext) => {
        return await queryAPI({
            method: "post",
            path: "/test/multifactorauth/markfactorascompleteinsession",
            input: { session, factorId, userContext },
        });
    },
    getRequiredSecondaryFactorsForUser: async (userId, userContext) => {
        return await queryAPI({
            method: "post",
            path: "/test/multifactorauth/getrequiredsecondaryfactorsforuser",
            input: { userId, userContext },
        });
    },
    addToRequiredSecondaryFactorsForUser: async (userId, factorId, userContext) => {
        return await queryAPI({
            method: "post",
            path: "/test/multifactorauth/addtorequiredsecondaryfactorsforuser",
            input: { userId, factorId, userContext },
        });
    },
    removeFromRequiredSecondaryFactorsForUser: async (userId, factorId, userContext) => {
        return await queryAPI({
            method: "post",
            path: "/test/multifactorauth/removefromrequiredsecondaryfactorsforuser",
            input: { userId, factorId, userContext },
        });
    },
};

// one of the tests needs to call the recipe inteface impl of this function, so it is exported as part of the MultiFactorAuth mock.
(MultiFactorAuthMock as any).recipeImplementation = {
    getMFARequirementsForAuth: async (input: {
        user: any;
        requiredSecondaryFactorsForUser: string[];
        requiredSecondaryFactorsForTenant: string[];
        completedFactors: Record<string, number>;
        tenantId: string;
        accessTokenPayload: any;
        factorsSetUpForUser: string[];
        userContext: any;
    }) => {
        const response = await queryAPI({
            method: "post",
            path: "/test/multifactorauth/recipeimplementation.getmfarequirementsforauth",
            input: input,
        });
        return response;
    },
};
