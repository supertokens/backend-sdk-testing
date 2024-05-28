import type { Debugger } from "debug";
import type { Express } from "express";
import EmailVerificationRecipe from "supertokens-node/lib/build/recipe/emailverification/recipe";
import SessionClass from "supertokens-node/lib/build/recipe/session/sessionClass";
import EmailVerification from "supertokens-node/recipe/emailverification";
import supertokens = require("supertokens-node/lib/build");

export function setupEmailverificationRoutes(app: Express, log: Debugger) {
    app.post("/mock/emailverification/isemailverified", async (req, res, next) => {
        try {
            log("EmailVerification:isEmailVerified %j", req.body);
            const recipeUserId = supertokens.convertToRecipeUserId(req.body.recipeUserId);
            const response = await EmailVerification.isEmailVerified(
                recipeUserId,
                req.body.email,
                req.body.userContext
            );
            res.json(response);
        } catch (e) {
            next(e);
        }
    });

    app.post("/mock/emailverification/createemailverificationtoken", async (req, res, next) => {
        try {
            log("EmailVerification:createEmailVerificationToken %j", req.body);
            const recipeUserId = supertokens.convertToRecipeUserId(req.body.recipeUserId);
            const response = await EmailVerification.createEmailVerificationToken(
                req.body.tenantId || "public",
                recipeUserId,
                req.body.email,
                req.body.userContext
            );
            res.json(response);
        } catch (e) {
            next(e);
        }
    });

    app.post("/mock/emailverification/verifyemailusingtoken", async (req, res, next) => {
        try {
            log("EmailVerification:verifyEmailUsingToken %j", req.body);
            const response = await EmailVerification.verifyEmailUsingToken(
                req.body.tenantId || "public",
                req.body.token,
                req.body.attemptAccountLinking,
                req.body.userContext
            );
            res.json(response);
        } catch (e) {
            next(e);
        }
    });

    app.post("/mock/emailverification/unverifyemail", async (req, res, next) => {
        try {
            log("EmailVerification:unverifyEmail %j", req.body);
            const recipeUserId = supertokens.convertToRecipeUserId(req.body.recipeUserId);
            const response = await EmailVerification.unverifyEmail(recipeUserId, req.body.email, req.body.userContext);
            res.json(response);
        } catch (e) {
            next(e);
        }
    });

    app.post("/mock/emailverification/updatesessionifrequiredpostemailverification", async (req, res, next) => {
        try {
            log("EmailVerificationRecipe:updateSessionIfRequiredPostEmailVerification %j", req.body);
            const recipeUserIdWhoseEmailGotVerified = supertokens.convertToRecipeUserId(
                req.body.recipeUserIdWhoseEmailGotVerified.recipeUserId || req.body.recipeUserIdWhoseEmailGotVerified
            );
            const sessionRaw = req.body.session;
            const session = sessionRaw
                ? new SessionClass(
                      sessionRaw.helpers,
                      sessionRaw.accessToken,
                      sessionRaw.frontToken,
                      sessionRaw.refreshToken,
                      sessionRaw.antiCsrfToken,
                      sessionRaw.sessionHandle,
                      sessionRaw.userId,
                      supertokens.convertToRecipeUserId(sessionRaw.recipeUserId.recipeUserId),
                      sessionRaw.userDataInAccessToken,
                      sessionRaw.reqResInfo,
                      sessionRaw.accessTokenUpdated,
                      sessionRaw.tenantId
                  )
                : sessionRaw;
            const response = await EmailVerificationRecipe.getInstance()?.updateSessionIfRequiredPostEmailVerification({
                ...req.body,
                session,
                recipeUserIdWhoseEmailGotVerified,
            });
            log("EmailVerificationRecipe:updateSessionIfRequiredPostEmailVerification response %j", response);
            res.json(response);
        } catch (e) {
            next(e);
        }
    });
}
