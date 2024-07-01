import { fetch } from "cross-fetch";
import { PROCESS_STATE } from "supertokens-node/lib/build/processState";
import { deserializeOverrideParams } from "./utils";

export const API_PORT = Number(process.env.API_PORT || 3030);

let apiStatus: "NOT_READY" | "OK" = "NOT_READY";
let stConfig: string;

type Callback = (
    error: any | null,
    success: null | {
        body: any;
        status: number;
        headers: Record<string, string | undefined>;
        text: string;
    }
) => void;
interface ChainedRequest {
    post: (path: string) => ChainedRequest;
    put: (path: string) => ChainedRequest;
    get: (path: string) => ChainedRequest;
    set: (header: string, value: string) => ChainedRequest;
    send: (data: any) => ChainedRequest;
    expect: (status: number, cb?: Callback) => ChainedRequest;
    end: (cb: Callback) => void;
}

export function request(): ChainedRequest {
    let path: string = "";
    let method: "get" | "post" | "put" = "get";
    let headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    let input: any = null;
    let callback: Callback | null = null;
    let expectedStatus: number | null = null;

    async function executeRequest(): Promise<void> {
        try {
            if (apiStatus === "NOT_READY") {
                await initApp();
            }
            const response = await fetch(`http://localhost:${API_PORT}${path}`, {
                method,
                headers,
                body: input ? JSON.stringify(input) : undefined,
            });
            if (expectedStatus !== null && response.status !== expectedStatus) {
                throw new Error(`Expected status ${expectedStatus} but received ${response.status}`);
            }

            if (response.ok === false) {
                throw {
                    status: response.status,
                    body: await response.json(),
                };
            }
            const body = await response.json().catch(() => undefined);
            const text = await response.text().catch(() => JSON.stringify(body));

            const responseHeaders: Record<string, string | undefined> = {};

            response.headers.forEach((_, key) => {
                responseHeaders[key] = response.headers.get?.(key) || undefined;
            });

            callback?.(null, {
                body,
                status: response.status,
                headers: responseHeaders,
                text,
            });
        } catch (error) {
            callback?.(error, null);
        }
    }

    function post(pathValue: string): ChainedRequest {
        path = pathValue;
        method = "post";
        return this;
    }

    function put(pathValue: string): ChainedRequest {
        path = pathValue;
        method = "put";
        return this;
    }

    function get(pathValue: string): ChainedRequest {
        path = pathValue;
        method = "get";
        return this;
    }

    function set(header: string, value: string): ChainedRequest {
        headers[header] = value;
        return this;
    }

    function send(data: any): ChainedRequest {
        input = data;
        return this;
    }

    function expect(status: number, cb?: Callback): ChainedRequest {
        expectedStatus = status;
        if (cb !== undefined) {
            this.end(cb);
        }
        return this;
    }

    function end(cb: Callback) {
        callback = cb;
        executeRequest();
    }

    return {
        post,
        put,
        get,
        set,
        send,
        expect,
        end,
    };
}

export async function queryAPI({
    method,
    path,
    input,
    headers,
    returnResponse,
    skipInit,
}: {
    method: "post" | "get" | "delete" | "put";
    path: string;
    input?: object;
    headers?: Record<string, string>;
    returnResponse?: boolean;
    skipInit?: boolean;
}) {
    if (!skipInit && apiStatus === "NOT_READY") {
        await initApp();
    }
    try {
        let response = await fetch(`http://localhost:${API_PORT}${path}`, {
            method,
            headers: {
                "Content-Type": "application/json",
                ...headers,
            },
            body: JSON.stringify(input),
        });

        if (returnResponse) {
            return response;
        }

        if (!response.ok) {
            throw response;
        }

        return await response.json().catch(() => undefined);
    } catch (error) {
        throw await error.json().catch(() => undefined);
    }
}

export function setMockStatus(newStatus: "NOT_READY" | "OK") {
    apiStatus = newStatus;
}

export function setSTConfig(config) {
    stConfig = config;
}

export async function initApp() {
    await queryAPI({
        method: "post",
        path: "/test/init",
        skipInit: true,
        input: { config: stConfig },
    });
    setMockStatus("OK");
}

export async function getOverrideParams() {
    const overrideParams = await queryAPI({
        method: "get",
        path: "/test/overrideparams",
    });
    return deserializeOverrideParams(overrideParams);
}

export async function resetOverrideParams() {
    await queryAPI({
        method: "post",
        path: "/test/resetoverrideparams",
    });
}

export async function waitForProcessState(eventName: PROCESS_STATE) {
    return await queryAPI({
        method: "get",
        path: `/test/waitforevent?event=${eventName}`,
    });
}

export function mockExternalAPI(url: string) {
    let path;
    let method;

    async function reply(status: number, body: any) {
        return await queryAPI({
            method: "post",
            path: `/test/mockexternalapi`,
            input: {
                url,
                status,
                body,
                path,
                method,
            },
        });
    }
    function post(path: string) {
        path = path;
        method = "post";
        return this;
    }
    return {
        post,
        reply,
    };
}
