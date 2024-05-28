import TOTP from "supertokens-node/recipe/totp";
import { queryAPI } from "../fetcher";

export const TOTPMock: Partial<typeof TOTP> = {
    init: (config) => {
        return {
            config: JSON.stringify({
                ...config,
            }),
            recipeId: "totp",
        } as any;
    },
    createDevice: async (userId, userIdentifierInfo, deviceName, skew, period, userContext) => {
        const response = await queryAPI({
            method: "post",
            path: "/mock/totp/createdevice",
            input: { userId, userIdentifierInfo, deviceName, skew, period, userContext },
        });
        return {
            ...response,
        };
    },
    verifyDevice: async (tenantId, userId, deviceName, totp, userContext) => {
        const response = await queryAPI({
            method: "post",
            path: "/mock/totp/verifydevice",
            input: { tenantId, userId, deviceName, totp, userContext },
        });
        return {
            ...response,
        };
    },
};
