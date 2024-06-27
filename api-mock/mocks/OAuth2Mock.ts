import OAuth2 from "supertokens-node/recipe/oauth2";
import { queryAPI } from "../fetcher";

export const OAuth2Mock: Partial<typeof OAuth2> = {
    init: (config) => {
        return {
            config: JSON.stringify({
                ...config,
            }),
            recipeId: "oauth2",
        } as any;
    },
    getOAuth2Clients: async (input, userContext) => {
        const response = await queryAPI({
            method: "post",
            path: "/test/oauth2/getoauth2clients",
            input: { input, userContext },
        });
        return {
            ...response,
        };
    },
    createOAuth2Client: async (input, userContext) => {
        const response = await queryAPI({
            method: "post",
            path: "/test/oauth2/createoauth2client",
            input: { input, userContext },
        });
        return {
            ...response,
        };
    },
    updateOAuth2Client: async (input, userContext) => {
        const response = await queryAPI({
            method: "post",
            path: "/test/oauth2/updateoauth2client",
            input: { input, userContext },
        });
        return {
            ...response,
        };
    },
    deleteOAuth2Client: async (input, userContext) => {
        const response = await queryAPI({
            method: "post",
            path: "/test/oauth2/deleteoauth2client",
            input: { input, userContext },
        });
        return {
            ...response,
        };
    },
};
