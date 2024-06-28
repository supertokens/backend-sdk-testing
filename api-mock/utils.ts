import { minify_sync } from "terser";
import fs = require("fs");
import SuperTokens from "supertokens-node";
import { User as UserClass } from "supertokens-node/lib/build/user";

const uniqueFn = new Map<string, string>();

export function minify(funcName: string, code: string) {
    const result = minify_sync(code, {
        compress: {
            drop_console: true,
            expression: true,
            keep_fnames: true,
        },
    });

    let mCode = funcName + ":" + result.code;

    if (mCode && !uniqueFn.has(mCode)) {
        uniqueFn.set(mCode, code);
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
    return mCode;
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

export function deserializeOverrideParams(vars) {
    if (vars.sendEmailToRecipeUserId) {
        vars.sendEmailToRecipeUserId = SuperTokens.convertToRecipeUserId(vars.sendEmailToRecipeUserId.recipeUserId);
    }
    if (vars.userPostPasswordReset) {
        vars.userPostPasswordReset = new UserClass({
            ...vars.userPostPasswordReset,
            // @ts-ignore
            loginMethods: vars.userPostPasswordReset.loginMethods.map((lm) => ({
                ...lm,
                // @ts-ignore
                recipeUserId: lm.recipeUserId.recipeUserId,
            })),
        } as any);
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
