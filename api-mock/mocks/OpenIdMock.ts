import OpenId from "supertokens-node/recipe/openid";

export const OpenIdMock: Partial<typeof OpenId> = {
    init: (config) => {
        return {
            config: JSON.stringify({
                ...config,
            }),
            recipeId: "openid",
        } as any;
    },
};
