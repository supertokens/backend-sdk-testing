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
            path: "/test/multitenancy/createorupdatetenant",
            input: { tenantId, config, userContext },
        });
    },
    getTenant: async (tenantId, userContext) => {
        return await queryAPI({
            method: "post",
            path: "/test/multitenancy/gettenant",
            input: { tenantId, userContext },
        });
    },
    associateUserToTenant: async (tenantId, recipeUserId, userContext) => {
        return await queryAPI({
            method: "post",
            path: "/test/multitenancy/associateusertotenant",
            input: { tenantId, recipeUserId: recipeUserId.getAsString(), userContext },
        });
    },
    deleteTenant: async (tenantId, userContext) => {
        return await queryAPI({
            method: "post",
            path: "/test/multitenancy/deletetenant",
            input: { tenantId, userContext },
        });
    },
    listAllTenants: async (userContext) => {
        return await queryAPI({
            method: "post",
            path: "/test/multitenancy/listalltenants",
            input: { userContext },
        });
    },
    createOrUpdateThirdPartyConfig: async (tenantId, config, skipValidation, userContext) => {
        return await queryAPI({
            method: "post",
            path: "/test/multitenancy/createorupdatethirdpartyconfig",
            input: { tenantId, config, skipValidation, userContext },
        });
    },
    deleteThirdPartyConfig: async (tenantId, thirdPartyId, userContext) => {
        return await queryAPI({
            method: "post",
            path: "/test/multitenancy/deletethirdpartyconfig",
            input: { tenantId, thirdPartyId, userContext },
        });
    },
    disassociateUserFromTenant: async (tenantId, recipeUserId, userContext) => {
        return await queryAPI({
            method: "post",
            path: "/test/multitenancy/disassociateuserfromtenant",
            input: { tenantId, recipeUserId: recipeUserId.getAsString(), userContext },
        });
    },
};
