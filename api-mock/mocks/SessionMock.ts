import Session from "supertokens-node/recipe/session";
import { queryAPI } from "../fetcher";
import { minify } from "../utils";
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
import { convertToRecipeUserId, RecipeUserId } from "supertokens-node";

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
    constructor(private data: SerializedSession) {}

    async revokeSession(userContext?: any): Promise<void> {
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

    async getSessionDataFromDatabase(userContext?: any): Promise<any> {
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

    async updateSessionDataInDatabase(newSessionData: any, userContext?: any): Promise<any> {
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

    getRecipeUserId(userContext?: any): RecipeUserId {
        return convertToRecipeUserId(this.data.recipeUserId.recipeUserId);
    }

    getUserId(userContext?: any): string {
        return this.data.userId;
    }

    getTenantId(userContext?: any): string {
        return this.data.tenantId;
    }

    getAccessTokenPayload(userContext?: any): any {
        return this.data.userDataInAccessToken;
    }

    getHandle(userContext?: any): string {
        return this.data.sessionHandle;
    }

    getAllSessionTokensDangerously(): {
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

    getAccessToken(userContext?: any): string {
        return this.data.accessToken;
    }

    async mergeIntoAccessTokenPayload(accessTokenPayloadUpdate: JSONObject, userContext?: any): Promise<void> {
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

    async getTimeCreated(userContext?: any): Promise<number> {
        return this.data.userDataInAccessToken.eat;
    }

    async getExpiry(userContext?: any): Promise<number> {
        return queryAPI({
            method: "post",
            path: "/test/session/sessionobject/getexpiry",
            input: {
                session: this.data,
                userContext,
            },
        });
    }

    async assertClaims(claimValidators: SessionClaimValidator[], userContext?: any): Promise<void> {
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

    async fetchAndSetClaim<T>(claim: SessionClaim<T>, userContext?: any): Promise<void> {
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

    async setClaimValue<T>(claim: SessionClaim<T>, value: T, userContext?: any): Promise<void> {
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

    async getClaimValue<T>(claim: SessionClaim<T>, userContext?: any): Promise<T | undefined> {
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

    async removeClaim(claim: SessionClaim<any>, userContext?: any): Promise<void> {
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

    attachToRequestResponse(reqResInfo: ReqResInfo): Promise<void> | void {
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
                recipeUserId,
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
        return response;
    },
    getAllSessionHandlesForUser: async (userId, tenantId, userContext) => {
        const response = await queryAPI({
            method: "post",
            path: "/test/session/getallsessionhandlesforuser",
            input: {
                userId,
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
            throw error;
        }
    },
    revokeAllSessionsForUser: async (userId, tenantId, userContext) => {
        const response = await queryAPI({
            method: "post",
            path: "/test/session/revokeallsessionsforuser",
            input: {
                userId,
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
