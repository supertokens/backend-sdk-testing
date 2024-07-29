import SuperTokens from "supertokens-node";
import { queryAPI, setMockStatus, setSTConfig } from "../fetcher";
import { minify } from "../utils";

export const SuperTokensMock: Partial<typeof SuperTokens> = {
    init: (config) => {
        setSTConfig(
            JSON.stringify({
                ...config,
                // @ts-ignore
                ...(config.supertokens?.networkInterceptor
                    ? {
                          supertokens: {
                              ...config.supertokens,
                              networkInterceptor: minify(
                                  "supertokens.init.supertokens.networkInterceptor",
                                  // @ts-ignore
                                  config.supertokens.networkInterceptor.toString()
                              ),
                          },
                      }
                    : {}),
            })
        );
        setMockStatus("NOT_READY");
    },
    deleteUser: async (userId) => {
        return await queryAPI({
            method: "post",
            path: "/test/supertokens/deleteuser",
            input: {
                userId,
            },
        });
    },
    getUsersNewestFirst: async (input) => {
        return await queryAPI({
            method: "post",
            path: "/test/supertokens/getusersnewestfirst",
            input,
        });
    },
    getUsersOldestFirst: async (input) => {
        return await queryAPI({
            method: "post",
            path: "/test/supertokens/getusersoldestfirst",
            input,
        });
    },
};
