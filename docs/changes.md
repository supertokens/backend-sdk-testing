### capturing data from overrides

```js
// ...
// override example
ThirdParty.init({
    override: {
        apis: (oI) => {
            return {
                ...oI,
                signInUpPOST: async function (input) {
                    let response = await oI.signInUpPOST(input);
                    if (response.status === "OK") {
                        // value that will be assert later
                        userInCallback = response.user;
                    }
                    return response;
                },
            };
        },
    },
});
// this is how we get the value
let mocked = await getMockedValues();
userInCallback = mocked.userInCallback;
// ...

// there is also a helper to reset the values
await resetMockedValues();
```

### nock - mocking external API

```js
// current
nock("https://test.com").post("/oauth/token").reply(200, {});
// new way to mock the call
await mockExternalAPI("https://test.com").post("/oauth/token").reply(200, {});
```

### express and internal API requests

```js
// express app is not need anymore, should be removed
const app = express();
app.use(middleware());
app.use(errorHandler());

// ...
// request mock function will handle the API call
let response = await new Promise((resolve) =>
    // request(app)
    request() // request must be initialize without args
        .get("/auth/user/email/verify")
        .set("Cookie", ["sAccessToken=" + session.getAccessToken()])
        .expect(200)
        .end((err, res) => {
            if (err) {
                resolve(undefined);
            } else {
                resolve(res);
            }
        })
);
// ...
```

### request mock

```js
// current request mock only works with Promise wrapper, awaitable must be replaced
// snippets like this must be replaced
let consumeCodeResponse = await request(app).post("/auth/signinup/code/consume").send({
    preAuthSessionId: code.preAuthSessionId,
    deviceId: code.deviceId,
    userInputCode: code.userInputCode,
});

// it must be replaced by this
let consumeCodeResponse = await new Promise((resolve) =>
    request()
        .post("/auth/signinup/code/consume")
        .send({
            preAuthSessionId: code.preAuthSessionId,
            deviceId: code.deviceId,
            userInputCode: code.userInputCode,
        })
        .expect(200)
        .end((err, res) => {
            if (err) {
                resolve(undefined);
            } else {
                resolve(res);
            }
        })
);
```

### functions override must not be anonymous

```js
// ...
// for instance
shouldDoAutomaticAccountLinking: async function (_, __, _tenantId, userContext) {
    return {
        shouldAutomaticallyLink: true,
        shouldRequireVerification: true,
    };
},
// ...

// must be replaced by
shouldDoAutomaticAccountLinking: async (_, __, _tenantId, userContext) => {
    return {
        shouldAutomaticallyLink: true,
        shouldRequireVerification: true,
    };
},
// ...
```

### improve tests speed

```js
// instead of reset and initialize the ST core on each test, we're using new tenants instead
let globalConnectionURI;

// we mock the current call just to avoid making changes in all tests
const startSTWithMultitenancyAndAccountLinking = async () => {
    return createTenant(globalConnectionURI, randomString());
};

// replacing beforeEach for before (running only once by test file)
before(async function () {
    await killAllST();
    await setupST();
    globalConnectionURI = await globalStartSTWithMultitenancyAndAccountLinking();
});

after(async function () {
    await killAllST();
    await cleanST();
});
```
