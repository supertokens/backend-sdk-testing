import debug from "debug";
import express = require("express");
import { errorHandler, middleware } from "supertokens-node/framework/express";
import STExpress from "supertokens-node/lib/build";
import { default as SessionRecipe } from "supertokens-node/lib/build/recipe/session/recipe";
import { TypeInput as SessionRecipeTypeInput } from "supertokens-node/lib/build/recipe/session/types";
import { default as AccountLinkingRecipe } from "supertokens-node/lib/build/recipe/accountlinking/recipe";
import { TypeInput as AccountLinkingTypeInput } from "supertokens-node/lib/build/recipe/accountlinking/types";
import { default as EmailVerificationRecipe } from "supertokens-node/lib/build/recipe/emailverification/recipe";
import { TypeInput as EmailVerificationTypeInput } from "supertokens-node/lib/build/recipe/emailverification/types";
import { default as EmailPasswordRecipe } from "supertokens-node/lib/build/recipe/emailpassword/recipe";
import { TypeInput as EmailPasswordTypeInput } from "supertokens-node/lib/build/recipe/emailpassword/types";
import { default as ThirdPartyRecipe } from "supertokens-node/lib/build/recipe/thirdparty/recipe";
import { TypeInput as ThirdPartyTypeInput } from "supertokens-node/lib/build/recipe/thirdparty/types";
import { default as MultitenancyRecipe } from "supertokens-node/lib/build/recipe/multitenancy/recipe";
import { default as UserMetadataRecipe } from "supertokens-node/lib/build/recipe/usermetadata/recipe";
import { default as SuperTokensRecipe } from "supertokens-node/lib/build/supertokens";
import { RecipeListFunction } from "supertokens-node/lib/build/types";
import AccountLinking from "supertokens-node/recipe/accountlinking";
import EmailPassword from "supertokens-node/recipe/emailpassword";
import Session from "supertokens-node/recipe/session";
import EmailVerification from "supertokens-node/recipe/emailverification";
import ThirdParty from "supertokens-node/recipe/thirdparty";

const log = debug("api-mock");
log.enabled = true;

type EmailpasswordMockConfig = {
    emailDelivery?: {
        sendEmail?: "copy-passwordResetLink";
    };
};

type AccountlinkingMockConfig = {
    shouldDoAutomaticAccountLinking?: {
        customFn?: "doesEmailPasswordUserExist" | "userContextDoNotLink";
        default: {
            shouldAutomaticallyLink: boolean;
            shouldRequireVerification: boolean;
        };
    };
};

type SessionMockConfig = {};

type ThirdpartyMockConfig = {
    signInAndUpFeature?: ThirdPartyTypeInput["signInAndUpFeature"];
};

type EmailVerificationMockConfig = {
    mode: EmailVerificationTypeInput["mode"];
};

type MockConfig = {
    connectionURI: string;
    recipes?: {
        emailpassword?: EmailpasswordMockConfig;
        session?: SessionMockConfig;
        accountlinking?: AccountlinkingMockConfig;
        thirdparty?: ThirdpartyMockConfig;
        emailverification?: EmailVerificationMockConfig;
    };
};

export type MockStartServer = (config: MockConfig) => Promise<number | undefined>;

const constrains = {
    tenantId: "public",
    defaultInit: {
        appInfo: {
            apiDomain: "api.supertokens.io",
            appName: "SuperTokens",
            origin: (input) => input.request?.getHeaderValue("origin") || "localhost:3000",
        },
        recipeList: [],
    },
};

const vars = {
    passwordResetLink: "",
};

function initST(config: MockConfig) {
    log("initST %j", config);
    EmailPasswordRecipe.reset();
    SessionRecipe.reset();
    MultitenancyRecipe.reset();
    UserMetadataRecipe.reset();
    AccountLinkingRecipe.reset();
    ThirdPartyRecipe.reset();
    EmailVerificationRecipe.reset();
    SuperTokensRecipe.reset();

    const recipeList: RecipeListFunction[] = [];

    if (config?.recipes?.session) {
        initSession(config.recipes.session, recipeList);
    }
    if (config?.recipes?.emailpassword) {
        initEmailPassword(config.recipes.emailpassword, recipeList);
    }
    if (config?.recipes?.accountlinking) {
        initAccountLinking(config.recipes.accountlinking, recipeList);
    }
    if (config?.recipes?.thirdparty) {
        initThirdParty(config.recipes.thirdparty, recipeList);
    }
    if (config?.recipes?.emailverification) {
        initEmailVerification(config.recipes.emailverification, recipeList);
    }

    STExpress.init({
        ...constrains.defaultInit,
        supertokens: {
            connectionURI: config.connectionURI,
        },
        recipeList,
    });
}

function initSession(_config: SessionMockConfig, recipeList: RecipeListFunction[]) {
    const sessionInit: SessionRecipeTypeInput = {};
    recipeList.push(Session.init(sessionInit));
    return;
}

function initThirdParty(config: ThirdpartyMockConfig, recipeList: RecipeListFunction[]) {
    const thirdpartyInit: ThirdPartyTypeInput = {};
    if (config.signInAndUpFeature) {
        thirdpartyInit.signInAndUpFeature = config.signInAndUpFeature;
    }
    recipeList.push(ThirdParty.init(thirdpartyInit));
    return;
}

function initAccountLinking(config: AccountlinkingMockConfig, recipeList: RecipeListFunction[]) {
    const accountlinkingInit: AccountLinkingTypeInput = {};
    if (config.shouldDoAutomaticAccountLinking) {
        accountlinkingInit.shouldDoAutomaticAccountLinking = async (
            newAccountInfo,
            _user,
            _session,
            _tenantId,
            userContext
        ) => {
            if (config.shouldDoAutomaticAccountLinking!.customFn === "doesEmailPasswordUserExist") {
                if (newAccountInfo.recipeId === "emailpassword") {
                    let existingUser = await STExpress.listUsersByAccountInfo("public", {
                        email: newAccountInfo.email,
                    });
                    let doesEmailPasswordUserExist = existingUser.length > 1;
                    if (!doesEmailPasswordUserExist) {
                        return {
                            shouldAutomaticallyLink: false,
                        };
                    }
                }
            }
            if (config.shouldDoAutomaticAccountLinking!.customFn === "userContextDoNotLink") {
                if (userContext.doNotLink) {
                    return {
                        shouldAutomaticallyLink: false,
                    };
                }
            }

            return {
                shouldAutomaticallyLink: config.shouldDoAutomaticAccountLinking!.default.shouldAutomaticallyLink,
                shouldRequireVerification: config.shouldDoAutomaticAccountLinking!.default.shouldRequireVerification,
            };
        };
    }
    recipeList.push(AccountLinking.init(accountlinkingInit));
    return;
}

function initEmailPassword(config: EmailpasswordMockConfig, recipeList: RecipeListFunction[]) {
    const emailpasswordInit: EmailPasswordTypeInput = {};
    if (config.emailDelivery?.sendEmail === "copy-passwordResetLink") {
        emailpasswordInit["emailDelivery"] = {
            override: (original) => {
                return {
                    ...original,
                    sendEmail: async (input) => {
                        vars.passwordResetLink = input.passwordResetLink;
                    },
                };
            },
        };
    }
    recipeList.push(EmailPassword.init(emailpasswordInit));
    return;
}

function initEmailVerification(config: EmailVerificationMockConfig, recipeList: RecipeListFunction[]) {
    const emailVerificationInit: EmailVerificationTypeInput = {
        mode: config.mode,
    };
    recipeList.push(EmailVerification.init(emailVerificationInit));
    return;
}

initST({
    connectionURI: "http://localhost:8080",
    recipes: {
        session: {},
    },
});

const app = express();
app.use(express.json());
app.use((req, res, next) => {
    log(req.method, req.path);
    next();
});
app.use(middleware());
app.use(errorHandler());
app.use((err, req, res, next) => {
    log(err);
    res.status(500).send("error");
});

app.get("/mock/ping", async (req, res, next) => {
    res.json({ ok: true });
});

app.post("/mock/reset", async (req, res, next) => {
    Object.keys(vars).forEach((key) => (vars[key] = ""));
    initST(req.body);
    res.json({ ok: true });
});

app.get("/mock/getmockedvalues", async (req, res, next) => {
    res.json(vars);
});

app.post("/mock/emailpassword/signup", async (req, res, next) => {
    try {
        log("EmailPassword:signup %j", req.body);
        let session = req.body.session && (await handleSession(req.body.session));
        const response = await EmailPassword.signUp(
            req.body.tenantId || constrains.tenantId,
            req.body.email,
            req.body.password,
            session,
            req.body.userContext
        );
        res.json(response);
    } catch (e) {
        log(e);
        next(e);
    }
});

app.post("/mock/emailpassword/signin", async (req, res, next) => {
    try {
        log("EmailPassword:signin %j", req.body);
        let session = req.body.session && (await handleSession(req.body.session));
        const response = await EmailPassword.signIn(
            req.body.tenantId || constrains.tenantId,
            req.body.email,
            req.body.password,
            session,
            req.body.userContext
        );
        res.json(response);
    } catch (e) {
        log(e);
        next(e);
    }
});

app.post("/mock/emailpassword/createresetpasswordlink", async (req, res, next) => {
    try {
        log("EmailPassword:createResetPasswordLink %j", req.body);
        const response = await EmailPassword.createResetPasswordLink(
            req.body.tenantId || constrains.tenantId,
            req.body.userId,
            req.body.email,
            req.body.userContext
        );
        res.json(response);
    } catch (e) {
        log(e);
        next(e);
    }
});

app.post("/mock/emailpassword/updateemailorpassword", async (req, res, next) => {
    try {
        log("EmailPassword:updateEmailOrPassword %j", req.body);
        const recipeUserId = STExpress.convertToRecipeUserId(req.body.recipeUserId);
        const response = await EmailPassword.updateEmailOrPassword({
            recipeUserId,
            email: req.body.email,
            password: req.body.password,
            userContext: req.body.userContext,
            applyPasswordPolicy: req.body.applyPasswordPolicy,
            tenantIdForPasswordPolicy: req.body.tenantIdForPasswordPolicy,
        });
        res.json(response);
    } catch (e) {
        log(e);
        next(e);
    }
});

app.post("/mock/accountlinking/createprimaryuser", async (req, res, next) => {
    try {
        log("AccountLinking:createPrimaryUser %j", req.body);
        const recipeUserId = STExpress.convertToRecipeUserId(req.body.recipeUserId);
        const response = await AccountLinking.createPrimaryUser(recipeUserId, req.body.userContext);
        res.json(response);
    } catch (e) {
        log(e);
        next(e);
    }
});

app.post("/mock/accountlinking/linkaccounts", async (req, res, next) => {
    try {
        log("AccountLinking:linkAccounts %j", req.body);
        const recipeUserId = STExpress.convertToRecipeUserId(req.body.recipeUserId);
        const response = await AccountLinking.linkAccounts(recipeUserId, req.body.primaryUserId, req.body.userContext);
        res.json(response);
    } catch (e) {
        log(e);
        next(e);
    }
});

app.post("/mock/accountlinking/isemailchangeallowed", async (req, res, next) => {
    try {
        log("AccountLinking:isEmailChangeAllowed %j", req.body);
        const recipeUserId = STExpress.convertToRecipeUserId(req.body.recipeUserId);
        const response = await AccountLinking.isEmailChangeAllowed(
            recipeUserId,
            req.body.newEmail,
            req.body.isVerified,
            req.body.session,
            req.body.userContext
        );
        res.json(response);
    } catch (e) {
        log(e);
        next(e);
    }
});

app.post("/mock/thirdparty/manuallycreateorupdateuser", async (req, res, next) => {
    try {
        log("ThirdParty:manuallyCreateOrUpdateUser %j", req.body);
        let session = req.body.session && (await handleSession(req.body.session));
        const response = await ThirdParty.manuallyCreateOrUpdateUser(
            req.body.tenantId || constrains.tenantId,
            req.body.thirdPartyId,
            req.body.thirdPartyUserId,
            req.body.email,
            req.body.isVerified,
            session,
            req.body.userContext
        );
        res.json(response);
    } catch (e) {
        log(e);
        next(e);
    }
});

app.post("/mock/session/createnewsessionwithoutrequestresponse", async (req, res, next) => {
    try {
        log("Session.createNewSessionWithoutRequestResponse %j", req.body);
        const recipeUserId = STExpress.convertToRecipeUserId(req.body.recipeUserId);
        const response = await Session.createNewSessionWithoutRequestResponse(
            req.body.tenantId || constrains.tenantId,
            recipeUserId,
            req.body.accessTokenPayload,
            req.body.sessionDataInDatabase,
            req.body.disableAntiCsrf,
            req.body.userContext
        );
        res.json(response);
    } catch (e) {
        log(e);
        next(e);
    }
});

app.post("/mock/emailverification/isemailverified", async (req, res, next) => {
    try {
        log("EmailVerification:isEmailVerified %j", req.body);
        const recipeUserId = STExpress.convertToRecipeUserId(req.body.recipeUserId);
        const response = await EmailVerification.isEmailVerified(recipeUserId, req.body.email, req.body.userContext);
        res.json(response);
    } catch (e) {
        log(e);
        next(e);
    }
});

app.listen(3030, "localhost", () => {
    log(`api-mock-server started on localhost:3030`);
});

async function handleSession(
    session: { [key: string]: any } | undefined
): Promise<Session.SessionContainer | undefined> {
    if (session !== undefined) {
        // TODO: review this workaround
        return await Session.getSessionWithoutRequestResponse(
            session.accessToken,
            session.userDataInAccessToken?.antiCsrfToken
        );
    }
    return session;
}
