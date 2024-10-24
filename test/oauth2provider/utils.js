const assert = require("assert");
const setCookieParser = require("set-cookie-parser");
const { recipesMock, API_PORT } = require("../../api-mock");
const { EmailPassword, Session } = recipesMock;

exports.createAuthorizationUrl = function ({
    apiDomain,
    clientId,
    redirectUri,
    state,
    scope,
    responseType,
    extraQueryParams = {},
}) {
    const queryParams = {
        ...(clientId !== undefined ? { client_id: clientId } : {}),
        ...(redirectUri !== undefined ? { redirect_uri: redirectUri } : {}),
        ...(responseType !== undefined ? { response_type: responseType } : {}),
        ...(scope !== undefined ? { scope } : {}),
        ...(state !== undefined ? { state } : {}),
        ...extraQueryParams,
    };

    return `${apiDomain}/auth/oauth/auth?${new URLSearchParams(queryParams)}`;
};

exports.testOAuthFlowAndGetAuthCode = async function ({
    apiDomain,
    websiteDomain,
    clientId,
    authorisationUrl,
    redirectUri,
    scope,
    state,
    responseType = "code",
    useSignIn = false,
    prevSetCookieHeaders = [],
    shouldHaveForceFreshAuth = false,
    skipLogin = false,
    session,
    expectError = false,
    expectSessionRefresh = false,
}) {
    // This will be used to store all Set-Cookie headers in the subsequent requests
    let allSetCookieHeaders = [...prevSetCookieHeaders];

    function saveCookies(res) {
        const cookieStr = setCookieParser.splitCookiesString(res.headers.get("Set-Cookie"));
        const newCookies = setCookieParser.parse(cookieStr);
        allSetCookieHeaders = allSetCookieHeaders.filter((cookie) => !newCookies.some((c) => c.name === cookie.name));
        allSetCookieHeaders.push(...newCookies);
    }

    function getCookieHeader() {
        return allSetCookieHeaders.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
    }

    // Start the OAuth Flow
    let res = await fetch(authorisationUrl, {
        method: "GET",
        redirect: "manual",
        headers: {
            Cookie: getCookieHeader(),
            Authorization: session !== undefined ? `Bearer ${session.getAccessToken()}` : undefined,
        },
    });
    saveCookies(res);

    nextUrl = res.headers.get("Location");
    if (expectSessionRefresh) {
        nextUrlObj = new URL(nextUrl);
        const loginChallenge = nextUrlObj.searchParams.get("loginChallenge");

        assert.strictEqual(nextUrlObj.origin + nextUrlObj.pathname, `${websiteDomain}/auth/try-refresh`);

        session = await Session.refreshSessionWithoutRequestResponse(
            session.getAllSessionTokensDangerously().refreshToken
        );

        res = await fetch(`${apiDomain}/auth/oauth/login?loginChallenge=${loginChallenge}`, {
            method: "GET",
            redirect: "manual",
            headers: {
                Authorization: `Bearer ${session.getAccessToken()}`,
                Cookie: getCookieHeader(),
            },
        });
        nextUrl = (await res.json()).frontendRedirectTo;

        saveCookies(res);
    }

    if (!skipLogin) {
        nextUrlObj = new URL(nextUrl);
        const loginChallenge = nextUrlObj.searchParams.get("loginChallenge");

        assert.strictEqual(nextUrlObj.origin + nextUrlObj.pathname, `${websiteDomain}/auth`);
        assert.strictEqual(nextUrlObj.searchParams.get("forceFreshAuth"), shouldHaveForceFreshAuth ? "true" : null);

        if (session === undefined || shouldHaveForceFreshAuth) {
            // We have been redirected to the frontend login page. We will create the session manually to simulate login.
            const createSessionUser = useSignIn
                ? await EmailPassword.signIn("public", "test@example.com", "password123")
                : await EmailPassword.signUp("public", "test@example.com", "password123");

            session = await Session.createNewSessionWithoutRequestResponse("public", createSessionUser.recipeUserId);
        }

        res = await fetch(`${apiDomain}/auth/oauth/login?loginChallenge=${loginChallenge}`, {
            method: "GET",
            redirect: "manual",
            headers: {
                Authorization: `Bearer ${session.getAccessToken()}`,
                Cookie: getCookieHeader(),
            },
        });

        nextUrl = (await res.json()).frontendRedirectTo;
        saveCookies(res);
    } else {
        if (shouldHaveForceFreshAuth) {
            throw new Error("Test error: skipLogin is true, but shouldHaveForceFreshAuth is true");
        }
    }

    nextUrlObj = new URL(nextUrl);
    const redirectUriObj = new URL(redirectUri);

    // Assert that all the search params in the original redirect URI are preserved in the redirected URL
    redirectUriObj.searchParams.forEach((value, key) => {
        assert.strictEqual(nextUrlObj.searchParams.get(key), value);
    });

    assert.strictEqual(nextUrlObj.origin + nextUrlObj.pathname, redirectUriObj.origin + redirectUriObj.pathname);

    if (expectError) {
        assert.notStrictEqual(nextUrlObj.searchParams.get("error"), null);
        return {
            error: nextUrlObj.searchParams.get("error"),
            errorDescription: nextUrlObj.searchParams.get("error_description"),
            setCookieHeaders: allSetCookieHeaders,
            session,
        };
    }

    if (responseType === "code") {
        const authorizationCode = nextUrlObj.searchParams.get("code");

        assert.strictEqual(nextUrlObj.searchParams.get("scope"), scope ?? "");

        if (state !== undefined) {
            assert.strictEqual(nextUrlObj.searchParams.get("state"), state);
        }

        return {
            authorizationCode,
            userId: session.getUserId(),
            sessionId: session.getHandle(),
            setCookieHeaders: allSetCookieHeaders,
            session,
        };
    } else if (responseType === "id_token") {
        const params = new URLSearchParams(nextUrlObj.hash.substring(1));

        const idToken = params.get("id_token");
        assert(idToken !== null);

        if (state !== undefined) {
            assert.strictEqual(params.get("state"), state);
        }

        return {
            idToken,
            userId: session.getUserId(),
            sessionId: session.getHandle(),
            setCookieHeaders: allSetCookieHeaders,
            session,
        };
    }

    throw new Error(`Unexpected response type ${responseType}`);
};

const jose = require("jose");

exports.validateIdToken = async function (token, requirements) {
    const payload = (
        await jose.jwtVerify(token, jose.createRemoteJWKSet(new URL(`http://localhost:${API_PORT}/auth/jwt/jwks.json`)))
    ).payload;

    const expectedIssuer = appInfo.apiDomain.getAsStringDangerous() + appInfo.apiBasePath.getAsStringDangerous();
    if (payload.iss !== expectedIssuer) {
        throw new Error("Issuer mismatch: this token was likely issued by another application or spoofed");
    }
    if (payload.stt !== 2) {
        throw new Error("Wrong token type");
    }

    if (requirements?.clientId !== undefined && payload.client_id !== requirements.clientId) {
        throw new Error("The token doesn't belong to the specified client");
    }

    if (requirements?.scopes !== undefined && requirements.scopes.some((scope) => !payload.scp.includes(scope))) {
        throw new Error("The token is missing some required scopes");
    }

    const aud = payload.aud instanceof Array ? payload.aud : payload.aud?.split(" ") ?? [];
    if (requirements?.audience !== undefined && !aud.includes(requirements.audience)) {
        throw new Error("The token doesn't belong to the specified audience");
    }

    return { status: "OK", payload: payload };
};

exports.createEndSessionUrl = function ({ apiDomain, idToken, postLogoutRedirectUri, clientId, state }) {
    const endSessionEndpoint = new URL(`${apiDomain}/auth/oauth/end_session`);
    if (idToken !== undefined) {
        endSessionEndpoint.searchParams.set("id_token_hint", idToken);
    }
    if (clientId !== undefined) {
        endSessionEndpoint.searchParams.set("client_id", clientId);
    }
    if (postLogoutRedirectUri !== undefined) {
        endSessionEndpoint.searchParams.set("post_logout_redirect_uri", postLogoutRedirectUri);
    }
    if (state !== undefined) {
        endSessionEndpoint.searchParams.set("state", state);
    }
    return endSessionEndpoint.toString();
};

exports.getBasicAuthHeader = function ({ clientId, clientSecret }) {
    return "Basic " + Buffer.from(`${encodeURIComponent(clientId)}:${clientSecret}`).toString("base64");
};