import Session from "supertokens-node/recipe/session";
import { queryAPI } from "../fetcher";
import { minify } from "../utils";
import SuperTokens from "supertokens-node";
import { RecipeInterface } from "supertokens-node/lib/build/recipe/session/types";
import SessionClass from "supertokens-node/lib/build/recipe/session/sessionClass";

function deserializeSession(session) {
    if (!session) return session;
    return new SessionClass(
        { ...session.helpers, getRecipeImpl: () => SessionRecipeMock },
        session.accessToken,
        session.frontToken,
        session.refreshToken,
        session.antiCsrfToken,
        session.sessionHandle,
        session.userId,
        SuperTokens.convertToRecipeUserId(session.recipeUserId.recipeUserId),
        session.userDataInAccessToken,
        session.reqResInfo,
        session.accessTokenUpdated,
        session.tenantId
    );
}

export const SessionMock: Partial<typeof Session> = {
    init: (config) => {
        return {
            config: JSON.stringify({
                ...config,
                ...(config?.override
                    ? {
                          override: {
                              ...config.override,
                              ...(config.override.functions
                                  ? {
                                        functions: minify(config.override.functions.toString()),
                                    }
                                  : {}),
                          },
                      }
                    : {}),
            }),
            recipeId: "session",
        } as any;
    },
    createNewSessionWithoutRequestResponse: async (
        tenantId,
        recipeUserId,
        accessTokenPayload,
        sessionDataInDatabase,
        disableAntiCsrf,
        userContext
    ) => {
        const response = await queryAPI({
            method: "post",
            path: "/mock/session/createnewsessionwithoutrequestresponse",
            input: {
                tenantId,
                recipeUserId: recipeUserId.getAsString(),
                accessTokenPayload,
                sessionDataInDatabase,
                disableAntiCsrf,
                userContext,
            },
        });
        return deserializeSession(response);
    },
    getSessionWithoutRequestResponse: async (
        accessToken: string,
        antiCsrfToken?: string,
        options?: Session.VerifySessionOptions,
        userContext?: Record<string, any>
    ) => {
        const response = await queryAPI({
            method: "post",
            path: "/mock/session/getsessionwithoutrequestresponse",
            input: {
                accessToken,
                antiCsrfToken,
                options,
                userContext,
            },
        });
        return deserializeSession(response);
    },
    getSessionInformation: async (sessionHandle, userContext) => {
        const response = await queryAPI({
            method: "post",
            path: "/mock/session/getsessioninformation",
            input: {
                sessionHandle,
                userContext,
            },
        });
        return deserializeSession(response);
    },
    getAllSessionHandlesForUser: async (userId, fetchSessionsForAllLinkedAccounts, tenantId, userContext) => {
        const response = await queryAPI({
            method: "post",
            path: "/mock/session/getallsessionhandlesforuser",
            input: {
                userId,
                fetchSessionsForAllLinkedAccounts,
                tenantId,
                userContext,
            },
        });
        return response;
    },
    refreshSessionWithoutRequestResponse: async (refreshToken, disableAntiCsrf, antiCsrfToken, userContext) => {
        try {
            const response = await queryAPI({
                method: "post",
                path: "/mock/session/refreshsessionwithoutrequestresponse",
                input: {
                    refreshToken,
                    disableAntiCsrf,
                    antiCsrfToken,
                    userContext,
                },
            });
            return deserializeSession(response);
        } catch (error) {
            if (error?.payload?.recipeUserId?.recipeUserId) {
                error.payload.recipeUserId = SuperTokens.convertToRecipeUserId(error.payload.recipeUserId.recipeUserId);
            }
            throw error;
        }
    },
    revokeAllSessionsForUser: async (userId, revokeSessionsForLinkedAccounts, tenantId, userContext) => {
        const response = await queryAPI({
            method: "post",
            path: "/mock/session/revokeallsessionsforuser",
            input: {
                userId,
                revokeSessionsForLinkedAccounts,
                tenantId,
                userContext,
            },
        });
        return response;
    },
    mergeIntoAccessTokenPayload: async (sessionHandle, accessTokenPayloadUpdate, userContext) => {
        const response = await queryAPI({
            method: "post",
            path: "/mock/session/mergeintoaccesspayload",
            input: {
                sessionHandle,
                accessTokenPayloadUpdate,
                userContext,
            },
        });
        return response;
    },
    fetchAndSetClaim: async (sessionHandle, claim, userContext) => {
        // @ts-ignore
        claim.fetchValue = minify(claim.fetchValue.toString());

        const response = await queryAPI({
            method: "post",
            path: "/mock/session/fetchandsetclaim",
            input: {
                sessionHandle,
                claim,
                userContext,
            },
        });
        return response;
    },
    validateClaimsForSessionHandle: async (sessionHandle, overrideGlobalClaimValidators, userContext) => {
        const response = await queryAPI({
            method: "post",
            path: "/mock/session/validateclaimsforsessionhandle",
            input: {
                sessionHandle,
                overrideGlobalClaimValidators: overrideGlobalClaimValidators
                    ? minify(overrideGlobalClaimValidators?.toString())
                    : undefined,
                userContext,
            },
        });
        return response;
    },
};

export const SessionRecipeMock: Partial<RecipeInterface> = {
    regenerateAccessToken: async (input) => {
        const response = await queryAPI({
            method: "post",
            path: "/mock/session/regenerateaccesstoken",
            input,
        });
        return response;
    },
};
