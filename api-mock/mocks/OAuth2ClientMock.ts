import OAuth2Client from "supertokens-node/recipe/oauth2client";

export const OAuth2ClientMock: Partial<typeof OAuth2Client> = {
    init: (config) => {
        return {
            config: JSON.stringify({
                ...config,
            }),
            recipeId: "oauth2client",
        } as any;
    },
};
