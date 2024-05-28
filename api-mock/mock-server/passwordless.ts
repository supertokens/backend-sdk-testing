import type { Debugger } from "debug";
import type { Express } from "express";
import Passwordless from "supertokens-node/recipe/passwordless";
import { handleSession } from "./utils/handleSession";

export function setupPasswordlessRoutes(app: Express, log: Debugger) {
    app.post("/mock/passwordless/signinup", async (req, res, next) => {
        try {
            log("Passwordless:signInUp %j", req.body);
            const response = await Passwordless.signInUp({
                ...(req.body.email
                    ? {
                          email: req.body.email,
                      }
                    : {
                          phoneNumber: req.body.phoneNumber,
                      }),
                tenantId: req.body.tenantId || "public",
                session: req.body.session && (await handleSession(req.body.session)),
                userContext: req.body.userContext,
            });
            res.json({
                ...response,
                ...("user" in response
                    ? {
                          user: response.user.toJson(),
                      }
                    : {}),
                ...("recipeUserId" in response
                    ? {
                          recipeUserId: response.recipeUserId.getAsString(),
                      }
                    : {}),
            });
        } catch (e) {
            next(e);
        }
    });

    app.post("/mock/passwordless/createcode", async (req, res, next) => {
        try {
            log("Passwordless:createCode %j", req.body);
            const response = await Passwordless.createCode({
                email: req.body.email,
                phoneNumber: req.body.phoneNumber,
                tenantId: req.body.tenantId || "public",
                session: req.body.session && (await handleSession(req.body.session)),
                userContext: req.body.userContext,
                userInputCode: req.body.userInputCode,
            });
            res.json(response);
        } catch (e) {
            next(e);
        }
    });
    app.post("/mock/passwordless/consumecode", async (req, res, next) => {
        try {
            log("Passwordless:consumeCode %j", req.body);
            const response = await Passwordless.consumeCode({
                deviceId: req.body.deviceId,
                linkCode: req.body.linkCode,
                preAuthSessionId: req.body.preAuthSessionId,
                tenantId: req.body.tenantId || "public",
                userInputCode: req.body.userInputCode,
                session: req.body.session && (await handleSession(req.body.session)),
                userContext: req.body.userContext,
            });
            res.json({
                ...response,
                ...("user" in response ? { user: response.user.toJson() } : {}),
                ...("recipeUserId" in response ? { recipeUserId: response.recipeUserId.getAsString() } : {}),
            });
        } catch (e) {
            next(e);
        }
    });
}
