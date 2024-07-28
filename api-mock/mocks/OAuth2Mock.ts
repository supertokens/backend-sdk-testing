import OAuth2Provider from "supertokens-node/recipe/oauth2provider";
import { queryAPI } from "../fetcher";

export const OAuth2ProviderMock: Partial<typeof OAuth2Provider> = {
    init: (config) => {
        return {
            config: JSON.stringify({
                ...config,
            }),
            recipeId: "oauth2provider",
        } as any;
    },
    getOAuth2Clients: async (input, userContext) => {
        const response = await queryAPI({
            method: "post",
            path: "/test/oauth2provider/getoauth2clients",
            input: { input, userContext },
        });
        return {
            ...response,
        };
    },
    createOAuth2Client: async (input, userContext) => {
        const response = await queryAPI({
            method: "post",
            path: "/test/oauth2provider/createoauth2client",
            input: { input, userContext },
        });
        return {
            ...response,
        };
    },
    updateOAuth2Client: async (input, userContext) => {
        const response = await queryAPI({
            method: "post",
            path: "/test/oauth2provider/updateoauth2client",
            input: { input, userContext },
        });
        return {
            ...response,
        };
    },
    deleteOAuth2Client: async (input, userContext) => {
        const response = await queryAPI({
            method: "post",
            path: "/test/oauth2provider/deleteoauth2client",
            input: { input, userContext },
        });
        return {
            ...response,
        };
    },
};
