import { minify_sync } from "terser";
import fs = require("fs");
import SuperTokens from "supertokens-node";
import { OverrideParamsType } from "supertokens-node/test/test-server";
import { User as UserClass } from "supertokens-node/lib/build/user";

const uniqueFn = new Map<string, string>();

export function minify(code: string) {
    const result = minify_sync(code, {
        compress: {
            drop_console: true,
            expression: true,
            keep_fnames: true,
        },
    });

    // TODO: remove this once we have all functions that we need to handle
    if (result.code && !uniqueFn.has(result.code)) {
        uniqueFn.set(result.code, code);
        fs.writeFileSync(
            "overridesFn.txt",
            Array.from(uniqueFn.entries())
                .sort()
                .map(([key, value]) => value)
                .join("\n\n---------\n\n")
        );
        fs.writeFileSync(
            "overridesFn.json",
            JSON.stringify(
                Array.from(uniqueFn.entries())
                    .sort()
                    .map(([key, value]) => key),
                null,
                2
            )
        );
    }
    return result.code;
}

export function randomString(length = 30) {
    let result = "";
    let characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

export function deserializeOverrideParams(vars: OverrideParamsType) {
    if (vars.sendEmailToRecipeUserId) {
        vars.sendEmailToRecipeUserId = SuperTokens.convertToRecipeUserId(vars.sendEmailToRecipeUserId.recipeUserId);
    }
    if (vars.userPostPasswordReset?.loginMethods.length) {
        vars.userPostPasswordReset = {
            ...vars.userPostPasswordReset,
            // @ts-ignore
            loginMethods: vars.userPostPasswordReset.loginMethods.map((lm) => ({
                ...lm,
                // @ts-ignore
                recipeUserId: SuperTokens.convertToRecipeUserId(lm.recipeUserId.recipeUserId),
            })),
        };
    }
    if (vars.userInCallback) {
        vars.userInCallback = {
            ...vars.userInCallback,
            recipeUserId:
                // @ts-ignore
                vars.userInCallback.recipeUserId?.recipeUserId &&
                // @ts-ignore
                SuperTokens.convertToRecipeUserId(vars.userInCallback.recipeUserId.recipeUserId),
        };
    }
    if (vars.primaryUserInCallback) {
        vars.primaryUserInCallback = new UserClass(vars.primaryUserInCallback as any);
    }
    if (typeof vars.recipeUserIdInCallback === "string") {
        vars.recipeUserIdInCallback = SuperTokens.convertToRecipeUserId(vars.recipeUserIdInCallback);
    }
    return vars;
}
