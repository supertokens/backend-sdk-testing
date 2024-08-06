const assert = require("assert");
const setCookieParser = require("set-cookie-parser");
const { recipesMock } = require("../../api-mock");
const { EmailPassword, Session } = recipesMock;

exports.createAuthorizationUrl = function ({
    apiDomain,
    clientId,
    redirectUri,
    state,
    scope,
    responseType = "code",
    extraQueryParams = {},
}) {
    const queryParams = {
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: responseType,
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
}) {
    // This will be used to store all Set-Cookie headers in the subsequent requests
    const allSetCookieHeaders = [];

    function saveCookies(res) {
        const cookieStr = setCookieParser.splitCookiesString(res.headers.get("Set-Cookie"));
        const cookies = setCookieParser.parse(cookieStr);
        allSetCookieHeaders.push(...cookies);
    }

    function getCookieHeader() {
        return allSetCookieHeaders.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
    }

    // Start the OAuth Flow
    let res = await fetch(authorisationUrl, { method: "GET", redirect: "manual" });
    saveCookies(res);

    nextUrl = res.headers.get("Location");
    nextUrlObj = new URL(nextUrl);
    const loginChallenge = nextUrlObj.searchParams.get("loginChallenge");

    assert.strictEqual(nextUrlObj.origin + nextUrlObj.pathname, `${websiteDomain}/auth`);

    // We have been redirected to the frontend login page. We will create the session manually to simulate login.
    const createSessionUser = useSignIn
        ? await EmailPassword.signIn("public", "test@example.com", "password123")
        : await EmailPassword.signUp("public", "test@example.com", "password123");

    const session = await Session.createNewSessionWithoutRequestResponse("public", createSessionUser.recipeUserId);

    res = await fetch(`${apiDomain}/auth/oauth/login?loginChallenge=${loginChallenge}`, {
        method: "GET",
        redirect: "manual",
        headers: {
            Authorization: `Bearer ${session.getAccessToken()}`,
            Cookie: getCookieHeader(),
        },
    });

    saveCookies(res);

    nextUrl = res.headers.get("Location");
    nextUrlObj = new URL(nextUrl);
    const redirectUriObj = new URL(redirectUri);

    // Assert that all the search params in the original redirect URI are preserved in the redirected URL
    redirectUriObj.searchParams.forEach((value, key) => {
        assert.strictEqual(nextUrlObj.searchParams.get(key), value);
    });

    assert.strictEqual(nextUrlObj.origin + nextUrlObj.pathname, redirectUriObj.origin + redirectUriObj.pathname);

    if (responseType === "code") {
        const authorizationCode = nextUrlObj.searchParams.get("code");

        assert.strictEqual(nextUrlObj.searchParams.get("scope"), scope);

        if (state !== undefined) {
            assert.strictEqual(nextUrlObj.searchParams.get("state"), state);
        }

        return { authorizationCode, userId: session.getUserId() };
    } else if (responseType === "id_token") {
        const params = new URLSearchParams(nextUrlObj.hash.substring(1));

        const idToken = params.get("id_token");
        assert(idToken !== null);

        if (state !== undefined) {
            assert.strictEqual(params.get("state"), state);
        }

        return { idToken, userId: session.getUserId() };
    }

    throw new Error(`Unexpected response type ${responseType}`);
};
