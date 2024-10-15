import Session from "supertokens-node/recipe/session";
import { queryAPI } from "../fetcher";
import { minify } from "../utils";
import SuperTokens from "supertokens-node";
import {
    ClaimValidationResult,
    RecipeInterface,
    ReqResInfo,
    SessionClaim,
    SessionClaimValidator,
    SessionContainerInterface,
    TokenInfo,
} from "supertokens-node/lib/build/recipe/session/types";
import { JSONObject } from "supertokens-node/recipe/usermetadata";

type SerializedSession = {
    accessToken: string;
    frontToken: string;
    refreshToken: TokenInfo | undefined;
    antiCsrfToken: string | undefined;
    sessionHandle: string;
    userId: string;
    recipeUserId: { recipeUserId: string };
    userDataInAccessToken: any;
    reqResInfo: ReqResInfo | undefined;
    accessTokenUpdated: boolean;
    tenantId: string;
};

class RemoteSessionObject implements SessionContainerInterface {
    accessToken: string;
    frontToken: string;
    refreshToken: TokenInfo | undefined;
    antiCsrfToken: string | undefined;

    constructor(private data: SerializedSession) {
        this.accessToken = data.accessToken;
        this.frontToken = data.frontToken;
        this.refreshToken = data.refreshToken;
        this.antiCsrfToken = data.antiCsrfToken;
    }

    async revokeSession(userContext?: Record<string, any> | undefined): Promise<void> {
        const { updatedSession } = await queryAPI({
            method: "post",
            path: "/test/session/sessionobject/revokesession",
            input: {
                session: this.data,
                userContext,
            },
        });
        Object.assign(this.data, updatedSession);
    }
    async getSessionDataFromDatabase(userContext?: Record<string, any> | undefined): Promise<any> {
        const { retVal, updatedSession } = await queryAPI({
            method: "post",
            path: "/test/session/sessionobject/getsessiondatafromdatabase",
            input: {
                session: this.data,
                userContext,
            },
        });
        Object.assign(this.data, updatedSession);
        return retVal;
    }
    async updateSessionDataInDatabase(
        newSessionData: any,
        userContext?: Record<string, any> | undefined
    ): Promise<any> {
        const { retVal, updatedSession } = await queryAPI({
            method: "post",
            path: "/test/session/sessionobject/updatesessiondataindatabase",
            input: {
                session: this.data,
                newSessionData,
                userContext,
            },
        });
        Object.assign(this.data, updatedSession);
        return retVal;
    }
    getUserId(userContext?: Record<string, any> | undefined): string {
        return this.data.userId;
    }
    getRecipeUserId(userContext?: Record<string, any> | undefined): SuperTokens.RecipeUserId {
        return SuperTokens.convertToRecipeUserId(this.data.recipeUserId.recipeUserId);
    }
    getTenantId(userContext?: Record<string, any> | undefined): string {
        return this.data.tenantId;
    }
    getAccessTokenPayload(userContext?: Record<string, any> | undefined) {
        return this.data.userDataInAccessToken;
    }
    getHandle(userContext?: Record<string, any> | undefined): string {
        return this.data.sessionHandle;
    }
    getAllSessionTokensDangerously(
        userContext?: Record<string, any> | undefined
    ): {
        accessToken: string;
        refreshToken: string | undefined;
        antiCsrfToken: string | undefined;
        frontToken: string;
        accessAndFrontTokenUpdated: boolean;
    } {
        return {
            accessAndFrontTokenUpdated: this.data.accessTokenUpdated,
            accessToken: this.data.accessToken,
            antiCsrfToken: this.data.antiCsrfToken,
            frontToken: this.data.frontToken,
            refreshToken: this.data.refreshToken?.token,
        };
    }
    getAccessToken(userContext?: Record<string, any> | undefined): string {
        return this.data.accessToken;
    }
    async mergeIntoAccessTokenPayload(
        accessTokenPayloadUpdate: JSONObject,
        userContext?: Record<string, any> | undefined
    ): Promise<void> {
        const { updatedSession } = await queryAPI({
            method: "post",
            path: "/test/session/sessionobject/mergeintoaccesstokenpayload",
            input: {
                session: this.data,
                accessTokenPayloadUpdate,
                userContext,
            },
        });
        Object.assign(this.data, updatedSession);
    }
    async getTimeCreated(userContext?: Record<string, any> | undefined): Promise<number> {
        return this.data.userDataInAccessToken.eat;
    }
    async getExpiry(userContext?: Record<string, any> | undefined): Promise<number> {
        return queryAPI({
            method: "post",
            path: "/test/session/sessionobject/getexpiry",
            input: {
                session: this.data,
                userContext,
            },
        });
    }
    async assertClaims(
        claimValidators: Session.SessionClaimValidator[],
        userContext?: Record<string, any> | undefined
    ): Promise<void> {
        const { updatedSession } = await queryAPI({
            method: "post",
            path: "/test/session/sessionobject/assertclaims",
            input: {
                session: this.data,
                claimValidators,
                userContext,
            },
        });
        Object.assign(this.data, updatedSession);
    }
    async fetchAndSetClaim<T>(claim: SessionClaim<T>, userContext?: Record<string, any> | undefined): Promise<void> {
        const { updatedSession } = await queryAPI({
            method: "post",
            path: "/test/session/sessionobject/fetchandsetclaim",
            input: {
                session: this.data,
                claim,
                userContext,
            },
        });
        Object.assign(this.data, updatedSession);
    }
    async setClaimValue<T>(
        claim: SessionClaim<T>,
        value: T,
        userContext?: Record<string, any> | undefined
    ): Promise<void> {
        const { updatedSession } = await queryAPI({
            method: "post",
            path: "/test/session/sessionobject/setclaimvalue",
            input: {
                session: this.data,
                claim,
                value,
                userContext,
            },
        });
        Object.assign(this.data, updatedSession);
    }
    async getClaimValue<T>(
        claim: SessionClaim<T>,
        userContext?: Record<string, any> | undefined
    ): Promise<T | undefined> {
        const { retVal, updatedSession } = await queryAPI({
            method: "post",
            path: "/test/session/sessionobject/getclaimvalue",
            input: {
                session: this.data,
                claim,
                userContext,
            },
        });
        Object.assign(this.data, updatedSession);
        return retVal;
    }
    async removeClaim(claim: SessionClaim<any>, userContext?: Record<string, any> | undefined): Promise<void> {
        const { updatedSession } = await queryAPI({
            method: "post",
            path: "/test/session/sessionobject/removeclaim",
            input: {
                session: this.data,
                claim,
                userContext,
            },
        });
        Object.assign(this.data, updatedSession);
    }
    attachToRequestResponse(
        reqResInfo: ReqResInfo,
        userContext?: Record<string, any> | undefined
    ): void | Promise<void> {
        throw new Error("Not implemented");
    }
}

function deserializeSession(session) {
    if (!session) return session;
    return new RemoteSessionObject(session);
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
                                        functions: minify(
                                            "session.override.functions",
                                            config.override.functions.toString()
                                        ),
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
            path: "/test/session/createnewsessionwithoutrequestresponse",
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
            path: "/test/session/getsessionwithoutrequestresponse",
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
            path: "/test/session/getsessioninformation",
            input: {
                sessionHandle,
                userContext,
            },
        });
        if (response === null) {
            return undefined;
        }
        if (response) {
            response.recipeUserId = SuperTokens.convertToRecipeUserId(
                response.recipeUserId.recipeUserId ?? response.recipeUserId
            );
        }
        return response;
    },
    getAllSessionHandlesForUser: async (userId, fetchSessionsForAllLinkedAccounts, tenantId, userContext) => {
        const response = await queryAPI({
            method: "post",
            path: "/test/session/getallsessionhandlesforuser",
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
                path: "/test/session/refreshsessionwithoutrequestresponse",
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
            path: "/test/session/revokeallsessionsforuser",
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
            path: "/test/session/mergeintoaccesspayload",
            input: {
                sessionHandle,
                accessTokenPayloadUpdate,
                userContext,
            },
        });
        return response;
    },
    fetchAndSetClaim: async (sessionHandle, claim, userContext) => {
        const response = await queryAPI({
            method: "post",
            path: "/test/session/fetchandsetclaim",
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
            path: "/test/session/validateclaimsforsessionhandle",
            input: {
                sessionHandle,
                overrideGlobalClaimValidators: overrideGlobalClaimValidators
                    ? minify("getSession.overrideGlobalClaimValidators", overrideGlobalClaimValidators?.toString())
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
            path: "/test/session/regenerateaccesstoken",
            input,
        });
        return response;
    },
};

export class TestPrimitiveClaim<T> {
    key: string;
    validators: {
        withMockValues: (
            shouldRefetchRes: boolean[] | boolean,
            validateRes: ClaimValidationResult | ClaimValidationResult[]
        ) => {
            key: string;
            shouldRefetchRes: boolean | boolean[];
            validateRes: ClaimValidationResult | ClaimValidationResult[];
        };
        hasValue: (...args: any[]) => { key: string; validatorName: string; args: any[] };
    };
    constructor(key: string, public values: T[] | T) {
        this.key = `st-stub-${key}`;
        this.validators = {
            withMockValues: (
                shouldRefetchRes: boolean[] | boolean,
                validateRes: ClaimValidationResult | ClaimValidationResult[]
            ) => {
                return {
                    key: this.key,
                    shouldRefetchRes,
                    validateRes,
                };
            },
            hasValue: (...args) => {
                return {
                    key: this.key,
                    validatorName: "hasValue",
                    args,
                };
            },
        };
    }
}

export class TestPrimitiveArrayClaim<T> {
    key: string;
    validators: {
        withMockValues: (
            shouldRefetchRes: boolean[] | boolean,
            validateRes: ClaimValidationResult | ClaimValidationResult[]
        ) => {
            key: string;
            shouldRefetchRes: boolean | boolean[];
            validateRes: ClaimValidationResult | ClaimValidationResult[];
        };
        includes: (val: T, maxAgeInSeconds?: number | undefined, id?: string | undefined) => SessionClaimValidator;
        excludes: (val: T, maxAgeInSeconds?: number | undefined, id?: string | undefined) => SessionClaimValidator;
        includesAll: (val: T[], maxAgeInSeconds?: number | undefined, id?: string | undefined) => SessionClaimValidator;
        includesAny: (val: T[], maxAgeInSeconds?: number | undefined, id?: string | undefined) => SessionClaimValidator;
        excludesAll: (val: T[], maxAgeInSeconds?: number | undefined, id?: string | undefined) => SessionClaimValidator;
    };
    constructor(key: string, public values: T[] | T) {
        this.key = `st-stub-${key}`;
        this.validators = {
            withMockValues: (
                shouldRefetchRes: boolean[] | boolean,
                validateRes: ClaimValidationResult | ClaimValidationResult[]
            ) => {
                return {
                    key: this.key,
                    shouldRefetchRes,
                    validateRes,
                };
            },
        } as any;
        for (const name in ["includes", "excludes", "includesAll", "includesAny", "excludesAll"]) {
            this.validators[name] = (...args) => {
                return {
                    key: this.key,
                    validatorName: name,
                    args,
                };
            };
        }
    }
}
