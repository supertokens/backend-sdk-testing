const assert = require("assert");
const setCookieParser = require("set-cookie-parser");
const { request, recipesMock } = require("../../api-mock");
const { EmailPassword, Session } = recipesMock;

exports.getAuthorizationUrlFromAPI = async function ({ redirectUri, scope, state }) {
  const response = await new Promise((resolve) =>
    request()
      .get(`/auth/oauth2client/authorisationurl?redirectURIOnProviderDashboard=${redirectUri}`)
      .expect(200)
      .end((err, res) => {
        if (err) {
          resolve(undefined);
        } else {
          resolve(res);
        }
      })
  );
  assert(response !== undefined);
  const authUrl = new URL(response.body.urlWithQueryParams);

  let authUrlObj = new URL(authUrl);

  authUrlObj.searchParams.set("scope", scope);
  authUrlObj.searchParams.set("state", state);
  return authUrlObj.toString();
};

exports.createAuthorizationUrl = function ({ apiDomain, clientId, redirectUri, state, scope, extraQueryParams = {}}) {
  const queryParams = {
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope,
    state,
    ...extraQueryParams,
};

  return `${apiDomain}/auth/oauth2/auth?${new URLSearchParams(queryParams)}`;
}

exports.testOAuthFlowAndGetAuthCode = async function ({ apiDomain, websiteDomain, clientId, authorisationUrl, redirectUri, scope, state, useSignIn = false }) {
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

    let nextUrl = res.headers.get("Location");
    let nextUrlObj = new URL(nextUrl);
    const loginChallenge = nextUrlObj.searchParams.get("login_challenge");

    assert.strictEqual(nextUrlObj.origin + nextUrlObj.pathname, apiDomain + "/auth/oauth2/login");
    assert(loginChallenge !== null);

    res = await fetch(nextUrl, {
        method: "GET",
        redirect: "manual",
        headers: {
            Cookie: getCookieHeader(),
        },
    });

    saveCookies(res);

    nextUrl = res.headers.get("Location");
    nextUrlObj = new URL(nextUrl);

    assert.strictEqual(nextUrlObj.origin + nextUrlObj.pathname, `${websiteDomain}/auth`);
    assert.strictEqual(nextUrlObj.searchParams.get("loginChallenge"), loginChallenge);

    // We have been redirected to the frontend login page. We will create the session manually to simulate login.
    const createSessionUser = useSignIn ? await EmailPassword.signIn("public", "test@example.com", "password123") : await EmailPassword.signUp("public", "test@example.com", "password123");

    const session = await Session.createNewSessionWithoutRequestResponse("public", createSessionUser.recipeUserId);

    res = await fetch(`${apiDomain}/auth/oauth2/login?loginChallenge=${loginChallenge}`, {
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

    assert.strictEqual(nextUrlObj.origin + nextUrlObj.pathname, `${apiDomain}/auth/oauth2/auth`);
    assert.strictEqual(nextUrlObj.searchParams.get("client_id"), clientId);
    assert.strictEqual(nextUrlObj.searchParams.get("redirect_uri"), redirectUri);
    assert.strictEqual(nextUrlObj.searchParams.get("response_type"), "code");
    assert.strictEqual(nextUrlObj.searchParams.get("scope"), scope);
    assert.strictEqual(nextUrlObj.searchParams.get("state"), state);
    assert(nextUrlObj.searchParams.get("login_verifier") !== null);

    res = await fetch(nextUrl, {
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

    assert.strictEqual(nextUrlObj.origin + nextUrlObj.pathname, `${apiDomain}/auth/oauth2/auth`);
    assert.strictEqual(nextUrlObj.searchParams.get("client_id"), clientId);
    assert.strictEqual(nextUrlObj.searchParams.get("redirect_uri"), redirectUri);
    assert.strictEqual(nextUrlObj.searchParams.get("response_type"), "code");
    assert.strictEqual(nextUrlObj.searchParams.get("scope"), scope);
    assert.strictEqual(nextUrlObj.searchParams.get("state"), state);
    assert(nextUrlObj.searchParams.get("consent_verifier") !== null);

    res = await fetch(nextUrl, {
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
    const authorizationCode = nextUrlObj.searchParams.get("code");

    assert.strictEqual(nextUrlObj.origin + nextUrlObj.pathname, redirectUri);
    assert.strictEqual(nextUrlObj.searchParams.get("scope"), scope);
    assert.strictEqual(nextUrlObj.searchParams.get("state"), state);

    return { authorizationCode, userId: session.getUserId()};
}
