import Multitenancy from "supertokens-node/recipe/multitenancy";
import { queryAPI } from "../fetcher";

export const MultitenancyMock: Partial<typeof Multitenancy> = {
    init: (config) => {
        return {
            config: JSON.stringify(config),
            recipeId: "multitenancy",
        } as any;
    },
    createOrUpdateTenant: async (tenantId, config, userContext) => {
        return await queryAPI({
            method: "post",
            path: "/mock/multitenancy/createorupdatetenant",
            input: { tenantId, config, userContext },
        });
    },
    associateUserToTenant: async (tenantId, recipeUserId, userContext) => {
        return await queryAPI({
            method: "post",
            path: "/mock/multitenancy/associateusertotenant",
            input: { tenantId, recipeUserId: recipeUserId.getAsString(), userContext },
        });
    },
};
