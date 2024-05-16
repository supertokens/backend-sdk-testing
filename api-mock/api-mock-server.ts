import debug from "debug";
import express from "express";
import { errorHandler, middleware } from "supertokens-node/framework/express";
import STExpress from "supertokens-node/lib/build";
import { default as AccountLinkingRecipe } from "supertokens-node/lib/build/recipe/accountlinking/recipe";
import { default as EmailPasswordRecipe } from "supertokens-node/lib/build/recipe/emailpassword/recipe";
import { TypeInput as EmailPasswordTypeInput } from "supertokens-node/lib/build/recipe/emailpassword/types";
import { default as MultitenancyRecipe } from "supertokens-node/lib/build/recipe/multitenancy/recipe";
import { default as SessionRecipe } from "supertokens-node/lib/build/recipe/session/recipe";
import { default as UserMetadataRecipe } from "supertokens-node/lib/build/recipe/usermetadata/recipe";
import { default as SuperTokensRecipe } from "supertokens-node/lib/build/supertokens";
import { RecipeListFunction } from "supertokens-node/lib/build/types";
import AccountLinking from "supertokens-node/recipe/accountlinking";
import EmailPassword from "supertokens-node/recipe/emailpassword";
import Session from "supertokens-node/recipe/session";

const log = debug("api-mock");
log.enabled = true;

type MockConfig = {
    connectionURI: string;
    recipes?: {
        emailpassword?: {
            overrides?: {
                "emailDelivery.sendEmail": "copy-passwordResetLink";
            };
        };
        session?: {};
    };
};

export type MockStartServer = (pid: number, config: MockConfig) => Promise<number | undefined>;

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
    SuperTokensRecipe.reset();

    const recipeList: RecipeListFunction[] = [];

    if (config?.recipes?.emailpassword) {
        initEmailPassword(config, recipeList);
    }
    if (config?.recipes?.session) {
        recipeList.push(Session.init());
    }

    STExpress.init({
        ...constrains.defaultInit,
        supertokens: {
            connectionURI: config.connectionURI,
        },
        recipeList,
    });
}

function initEmailPassword(config: MockConfig, recipeList: RecipeListFunction[]) {
    if (!config.recipes?.emailpassword?.overrides) {
        recipeList.push(EmailPassword.init());
        return;
    }
    const emailpasswordInit: EmailPasswordTypeInput = {};
    if (config.recipes?.emailpassword?.overrides?.["emailDelivery.sendEmail"]) {
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

app.post("/mock/reset", async (req, res, next) => {
    Object.keys(vars).forEach((key) => (vars[key] = ""));
    initST(req.body);
    res.json({ ok: true });
});

app.get("/mock/getMockedValues", async (req, res, next) => {
    res.json(vars);
});

app.post("/mock/EmailPassword/signup", async (req, res, next) => {
    try {
        log("EmailPassword:signup %j", req.body);
        const response = await EmailPassword.signUp(
            req.body.tenantId || constrains.tenantId,
            req.body.email,
            req.body.password,
            req.body.session,
            req.body.userContext
        );
        res.json(response);
    } catch (e) {
        log(e);
        next(e);
    }
});

app.post("/mock/EmailPassword/createResetPasswordLink", async (req, res, next) => {
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

app.post("/mock/AccountLinking/createPrimaryUser", async (req, res, next) => {
    try {
        log("AccountLinking:createPrimaryUser %j", req.body);
        const recipeUserId = STExpress.convertToRecipeUserId(req.body.recipeUserId);
        const response = await AccountLinking.createPrimaryUser(recipeUserId, req.body.userContext);
        res.json(response);
    } catch (e) {
        next(e);
    }
});

app.get("/mock/ping", async (req, res, next) => {
    res.json({ ok: true });
});

const port = Number(process.argv[2] || 3030);
app.listen(port, "0.0.0.0", () => {
    log(`api-mock-server started on 0.0.0.0:${port}`);
});
