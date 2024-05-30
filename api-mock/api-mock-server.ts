import debug from "debug";
import { errorHandler, middleware } from "supertokens-node/framework/express";
import { User } from "supertokens-node/lib/build";
import { ProcessState } from "supertokens-node/lib/build/processState";
import AccountLinkingRecipe from "supertokens-node/lib/build/recipe/accountlinking/recipe";
import {
    TypeInput as AccountLinkingTypeInput,
    RecipeLevelUser,
} from "supertokens-node/lib/build/recipe/accountlinking/types";
import EmailPasswordRecipe from "supertokens-node/lib/build/recipe/emailpassword/recipe";
import { TypeInput as EmailPasswordTypeInput } from "supertokens-node/lib/build/recipe/emailpassword/types";
import EmailVerificationRecipe from "supertokens-node/lib/build/recipe/emailverification/recipe";
import { TypeInput as EmailVerificationTypeInput } from "supertokens-node/lib/build/recipe/emailverification/types";
import MultitenancyRecipe from "supertokens-node/lib/build/recipe/multitenancy/recipe";
import PasswordlessRecipe from "supertokens-node/lib/build/recipe/passwordless/recipe";
import { TypeInput as PasswordlessTypeInput } from "supertokens-node/lib/build/recipe/passwordless/types";
import SessionRecipe from "supertokens-node/lib/build/recipe/session/recipe";
import { TypeInput as SessionTypeInput } from "supertokens-node/lib/build/recipe/session/types";
import ThirdPartyRecipe from "supertokens-node/lib/build/recipe/thirdparty/recipe";
import { TypeInput as ThirdPartyTypeInput } from "supertokens-node/lib/build/recipe/thirdparty/types";
import UserMetadataRecipe from "supertokens-node/lib/build/recipe/usermetadata/recipe";
import SuperTokensRecipe from "supertokens-node/lib/build/supertokens";
import { RecipeListFunction } from "supertokens-node/lib/build/types";
import AccountLinking from "supertokens-node/recipe/accountlinking";
import EmailPassword from "supertokens-node/recipe/emailpassword";
import EmailVerification from "supertokens-node/recipe/emailverification";
import Multitenancy from "supertokens-node/recipe/multitenancy";
import Passwordless from "supertokens-node/recipe/passwordless";
import MultiFactorAuth from "supertokens-node/recipe/multifactorauth";
import MultiFactorAuthRecipe from "supertokens-node/lib/build/recipe/multifactorauth/recipe";
import TOTP from "supertokens-node/recipe/totp";
import TOTPRecipe from "supertokens-node/lib/build/recipe/totp/recipe";
import Session from "supertokens-node/recipe/session";
import { verifySession } from "supertokens-node/recipe/session/framework/express";
import ThirdParty from "supertokens-node/recipe/thirdparty";
import { setupAccountlinkingRoutes } from "./mock-server/accountlinking";
import { setupEmailpasswordRoutes } from "./mock-server/emailpassword";
import { setupEmailverificationRoutes } from "./mock-server/emailverification";
import { setupMultitenancyRoutes } from "./mock-server/multitenancy";
import { setupPasswordlessRoutes } from "./mock-server/passwordless";
import { getSessionVars, resetSessionVars, setupSessionRoutes } from "./mock-server/session";
import { setupSupertokensRoutes } from "./mock-server/supertokens";
import supertokens = require("supertokens-node/lib/build");
import express = require("express");
import nock = require("nock");
import { setupMultiFactorAuthRoutes } from "./mock-server/multifactorauth";
import { setupThirdPartyRoutes } from "./mock-server/thirdparty";
import { setupTOTPRoutes } from "./mock-server/totp";

const log = debug("api-mock");
log.enabled = true;

const defaultConfig = {
    appInfo: {
        apiDomain: "api.supertokens.io",
        appName: "SuperTokens",
        origin: (input) => input.request?.getHeaderValue("origin") || "localhost:3000",
    },
};

export type MockedVars = {
    sendEmailToUserId: string | undefined;
    token: string | undefined;
    userPostPasswordReset: User | undefined;
    emailPostPasswordReset: string | undefined;
    sendEmailCallbackCalled: boolean | undefined;
    sendEmailToUserEmail: string | undefined;
    sendEmailToRecipeUserId: any | undefined;
    userInCallback: { id: string; email: string; recipeUserId: supertokens.RecipeUserId } | undefined;
    email: string | undefined;
    newAccountInfoInCallback: RecipeLevelUser | undefined;
    primaryUserInCallback: User | undefined;
    userIdInCallback: string | undefined;
    recipeUserIdInCallback: supertokens.RecipeUserId | string | undefined;
    info: {
        coreCallCount: number;
    };
    store: any;
};

let sendEmailToUserId = undefined;
let token = undefined;
let userPostPasswordReset = undefined;
let emailPostPasswordReset = undefined;
let sendEmailCallbackCalled = false;
let sendEmailToUserEmail = undefined;
let sendEmailToRecipeUserId = undefined;
let userInCallback = undefined;
let email = undefined;
let primaryUserInCallback;
let newAccountInfoInCallback;
let userIdInCallback;
let recipeUserIdInCallback;
const info = {
    coreCallCount: 0,
};
let store;

function resetVars() {
    sendEmailToUserId = undefined;
    token = undefined;
    userPostPasswordReset = undefined;
    emailPostPasswordReset = undefined;
    sendEmailCallbackCalled = false;
    sendEmailToUserEmail = undefined;
    sendEmailToRecipeUserId = undefined;
    userInCallback = undefined;
    email = undefined;
    newAccountInfoInCallback = undefined;
    primaryUserInCallback = undefined;
    userIdInCallback = undefined;
    recipeUserIdInCallback = undefined;
    info.coreCallCount = 0;
    store = undefined;
    resetSessionVars();
}

function STReset() {
    resetVars();

    EmailPasswordRecipe.reset();
    SessionRecipe.reset();
    MultitenancyRecipe.reset();
    UserMetadataRecipe.reset();
    AccountLinkingRecipe.reset();
    ThirdPartyRecipe.reset();
    EmailVerificationRecipe.reset();
    PasswordlessRecipe.reset();
    ProcessState.getInstance().reset();
    MultiFactorAuthRecipe.reset();
    TOTPRecipe.reset();
    SuperTokensRecipe.reset();
}

function initST(config: any) {
    STReset();

    const recipeList: RecipeListFunction[] = [];

    const settings = JSON.parse(config);
    log("initST %j", settings);

    settings.recipeList.forEach((recipe) => {
        const config = recipe.config ? JSON.parse(recipe.config) : undefined;
        if (recipe.recipeId === "emailpassword") {
            let init: EmailPasswordTypeInput = {
                ...config,
            };

            if (config?.override?.apis) {
                init.override = {
                    ...init.override,
                    apis: eval(`${config?.override.apis}`),
                };
            }

            if (config?.emailDelivery?.override) {
                init.emailDelivery = {
                    ...config?.emailDelivery,
                    override: eval(`${config?.emailDelivery.override}`),
                };
            }

            recipeList.push(EmailPassword.init(init));
        }
        if (recipe.recipeId === "session") {
            let init: SessionTypeInput = {
                ...config,
            };
            if (config?.override?.functions) {
                init.override = {
                    ...init.override,
                    functions: eval(`${config?.override.functions}`),
                };
            }
            recipeList.push(Session.init(init));
        }
        if (recipe.recipeId === "accountlinking") {
            let init: AccountLinkingTypeInput = {
                ...config,
            };
            if (config?.shouldDoAutomaticAccountLinking) {
                init.shouldDoAutomaticAccountLinking = eval(`${config.shouldDoAutomaticAccountLinking}`);
            }
            if (config?.onAccountLinked) {
                init.onAccountLinked = eval(`${config.onAccountLinked}`);
            }
            recipeList.push(AccountLinking.init(init));
        }
        if (recipe.recipeId === "thirdparty") {
            let init: ThirdPartyTypeInput = {
                ...config,
            };
            if (config?.signInAndUpFeature) {
                init.signInAndUpFeature = {
                    ...config.signInAndUpFeature,
                    providers: config.signInAndUpFeature.providers.map((p) => ({
                        ...p,
                        ...(p.override ? { override: eval(`${p.override}`) } : {}),
                    })),
                };
            }
            if (config?.override?.apis) {
                init.override = {
                    ...init.override,
                    ...(config?.override.apis ? { apis: eval(`${config?.override.apis}`) } : {}),
                };
            }

            recipeList.push(ThirdParty.init(init));
        }
        if (recipe.recipeId === "emailverification") {
            let init: EmailVerificationTypeInput = {
                ...config,
            };
            if (config?.emailDelivery?.override) {
                init.emailDelivery = {
                    ...config?.emailDelivery,
                    override: eval(`${config?.emailDelivery.override}`),
                };
            }
            if (config?.getEmailForRecipeUserId) {
                init.getEmailForRecipeUserId = eval(`${config?.getEmailForRecipeUserId}`);
            }
            if (config?.override?.functions) {
                init.override = {
                    ...init.override,
                    functions: eval(`${config?.override.functions}`),
                };
            }
            recipeList.push(EmailVerification.init(init));
        }
        if (recipe.recipeId === "multitenancy") {
            recipeList.push(Multitenancy.init(config));
        }
        if (recipe.recipeId === "passwordless") {
            let init: PasswordlessTypeInput = {
                ...config,
            };

            if (config?.emailDelivery?.service?.sendEmail) {
                init.emailDelivery = {
                    ...config?.emailDelivery,
                    service: {
                        ...config?.emailDelivery?.service,
                        sendEmail: eval(`${config?.emailDelivery?.service?.sendEmail}`),
                    },
                };
            }
            recipeList.push(Passwordless.init(init));
        }
        if (recipe.recipeId === "multifactorauth") {
            recipeList.push(MultiFactorAuth.init(config));
        }
        if (recipe.recipeId === "totp") {
            recipeList.push(TOTP.init(config));
        }
    });

    settings.recipeList = recipeList;

    if (settings.supertokens?.networkInterceptor) {
        settings.supertokens.networkInterceptor = eval(`${settings.supertokens.networkInterceptor}`);
    }

    supertokens.init(settings);
}

supertokens.init({
    ...defaultConfig,
    supertokens: {
        connectionURI: process.env.ST_CONNECTION_URI || "http://localhost:8080",
    },
    recipeList: [Session.init()],
});

const app = express();
app.use(express.json());
app.use((req, res, next) => {
    log(req.method, req.path);
    next();
});
app.use(middleware());
app.use(errorHandler());

app.get("/mock/ping", async (req, res, next) => {
    res.json({ ok: true });
});

app.post("/mock/init", async (req, res, next) => {
    initST(req.body.config);
    res.json({ ok: true });
});

app.get("/mock/mockedvalues", async (req, res, next) => {
    let sessionVars = getSessionVars();
    const vars: MockedVars = {
        sendEmailToUserId,
        token,
        userPostPasswordReset,
        emailPostPasswordReset,
        sendEmailCallbackCalled,
        sendEmailToUserEmail,
        sendEmailToRecipeUserId,
        userInCallback,
        email,
        newAccountInfoInCallback,
        primaryUserInCallback: primaryUserInCallback?.toJson(),
        userIdInCallback: userIdInCallback ?? sessionVars.userIdInCallback,
        recipeUserIdInCallback:
            recipeUserIdInCallback?.getAsString() ??
            recipeUserIdInCallback ??
            sessionVars.recipeUserIdInCallback?.getAsString(),
        info,
        store,
    };
    res.json(vars);
});

app.post("/mock/setmockedvalues", async (req, res, next) => {
    store = {
        ...store,
        ...req.body.store,
    };
    res.json({ ok: true });
});

app.post("/mock/resetmockedvalues", async (req, res, next) => {
    resetVars();
    res.json({ ok: true });
});

app.post("/mock/mockexternalapi", async (req, res, next) => {
    const { url, status, body, path, method } = req.body;
    nock(url)[method](path).reply(status, body);
    res.json({ ok: true });
});

app.get("/mock/waitforevent", async (req, res, next) => {
    try {
        log("ProcessState:waitForEvent %j", req.query);
        const instance = ProcessState.getInstance();
        const eventEnum = req.query.event ? Number(req.query.event) : null;
        const event = eventEnum ? await instance.waitForEvent(eventEnum) : undefined;
        res.json(event);
    } catch (e) {
        next(e);
    }
});

setupSupertokensRoutes(app, log);
setupEmailpasswordRoutes(app, log);
setupAccountlinkingRoutes(app, log);
setupSessionRoutes(app, log);
setupEmailverificationRoutes(app, log);
setupMultitenancyRoutes(app, log);
setupPasswordlessRoutes(app, log);
setupMultiFactorAuthRoutes(app, log);
setupThirdPartyRoutes(app, log);
setupTOTPRoutes(app, log);

// *** Custom routes to help with session tests ***
app.post("/create", async (req, res, next) => {
    try {
        let recipeUserId = supertokens.convertToRecipeUserId(req.body.recipeUserId);
        await Session.createNewSession(req, res, "public", recipeUserId, {}, {});
        res.status(200).send("");
    } catch (error) {
        next(error);
    }
});
app.post("/getsession", async (req, res, next) => {
    try {
        let session = await Session.getSession(req, res);
        res.status(200).json({
            userId: session.getUserId(),
            recipeUserId: session.getRecipeUserId().getAsString(),
        });
    } catch (error) {
        next(error);
    }
});
app.post("/refreshsession", async (req, res, next) => {
    try {
        let session = await Session.refreshSession(req, res);
        res.status(200).json({
            userId: session.getUserId(),
            recipeUserId: session.getRecipeUserId().getAsString(),
        });
    } catch (error) {
        next(error);
    }
});
app.get("/verify", verifySession(), (req, res) => res.send({ status: "OK" }));
// *** End of custom routes ***

app.use((err, req, res, next) => {
    log(err);
    res.status(500).json({ ...err, message: err.message });
});

app.use((req, res, next) => {
    res.status(404).send(`api-mock: route not found ${req.method} ${req.path}`);
    throw new Error(`api-mock: route not found ${req.method} ${req.path}`);
});

app.listen(3030, "localhost", () => {
    log(`api-mock-server started on localhost:3030`);
});
