import SuperTokens from "supertokens-node";
import { User as UserClass } from "supertokens-node/lib/build/user";
import { queryAPI, setMockStatus, setSTConfig } from "../fetcher";
import { minify } from "../utils";

export const SuperTokensMock: Partial<typeof SuperTokens> = {
    init: (config) => {
        setSTConfig(
            JSON.stringify({
                ...config,
                ...(config.supertokens?.networkInterceptor
                    ? {
                          supertokens: {
                              ...config.supertokens,
                              networkInterceptor: minify(config.supertokens.networkInterceptor.toString()),
                          },
                      }
                    : {}),
            })
        );
        setMockStatus("NOT_READY");
    },
    convertToRecipeUserId: SuperTokens.convertToRecipeUserId,
    getUser: async (userId, userContext) => {
        const user = await queryAPI({
            method: "post",
            path: "/mock/supertokens/getuser",
            input: {
                userId,
                userContext,
            },
        });
        return user ? new UserClass(user) : user;
    },
    deleteUser: async (userId, removeAllLinkedAccounts, userContext) => {
        return await queryAPI({
            method: "post",
            path: "/mock/supertokens/deleteuser",
            input: {
                userId,
                removeAllLinkedAccounts,
                userContext,
            },
        });
    },
    listUsersByAccountInfo: async (tenantId, accountInfo, doUnionOfAccountInfo, userContext) => {
        return await queryAPI({
            method: "post",
            path: "/mock/supertokens/listusersbyaccountinfo",
            input: {
                tenantId,
                accountInfo,
                doUnionOfAccountInfo,
                userContext,
            },
        });
    },
    getUsersNewestFirst: async (input) => {
        return await queryAPI({
            method: "post",
            path: "/mock/supertokens/getusersnewestfirst",
            input,
        });
    },
};
