import { minify_sync } from "terser";
import fs = require("fs");
import SuperTokens from "supertokens-node";
import { User as UserClass } from "supertokens-node/lib/build/user";
import { SessionClaim, SessionClaimValidator } from "supertokens-node/lib/build/recipe/session/types";
import { UserContext } from "supertokens-node/lib/build/types";
import { JSONObject } from "supertokens-node/recipe/usermetadata";
import { API_PORT, request } from "./fetcher";

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
                recipeUserId: typeof lm.recipeUserId === "string" ? lm.recipeUserId : lm.recipeUserId.recipeUserId,
            })),
        } as any);
    }
    if (vars.userInCallback) {
        vars.userInCallback = {
            ...vars.userInCallback,
            loginMethods:
                vars.userInCallback.loginMethods !== undefined &&
                vars.userInCallback.loginMethods.map((lm) => ({
                    email: undefined, // this is there cause the user object json adds them as undefined as opposed to omitting it entirely
                    thirdParty: undefined,
                    phoneNumber: undefined,
                    ...lm,
                    recipeUserId: typeof lm.recipeUserId === "string" ? lm.recipeUserId : lm.recipeUserId.recipeUserId,
                })),
            recipeUserId:
                typeof vars.userInCallback.recipeUserId === "string"
                    ? vars.userInCallback.recipeUserId
                    : vars.userInCallback.recipeUserId?.recipeUserId && vars.userInCallback.recipeUserId.recipeUserId,
        };
        if (vars.userInCallback.recipeUserId === undefined) {
            delete vars.userInCallback.recipeUserId;
        }
    }
    if (vars.primaryUserInCallback) {
        vars.primaryUserInCallback = new UserClass(vars.primaryUserInCallback as any);
    }
    if (typeof vars.recipeUserIdInCallback === "string") {
        vars.recipeUserIdInCallback = SuperTokens.convertToRecipeUserId(vars.recipeUserIdInCallback);
    }
    return vars;
}

export function makeBuiltInClaimSerializable<
    T extends SessionClaim<any> & {
        validators: { [ind: string]: ((...args: any[]) => SessionClaimValidator) | undefined };
    }
>(origClaim: T): T {
    const serializableClaim = {
        ...origClaim,
    };

    for (const validatorName in origClaim.validators) {
        serializableClaim.validators[validatorName] = (...args: any[]) =>
            ({
                key: origClaim.key,
                validatorName,
                args,
            } as any);
    }

    return serializableClaim;
}

export async function hasFeatureFlag(featureFlag: string) {
    const response = await fetch(`http://localhost:${API_PORT}/test/featureflag`);

    const flags = await response.json();
    return flags.includes(featureFlag);
}
