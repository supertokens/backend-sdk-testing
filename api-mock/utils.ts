import { minify_sync } from "terser";
import fs = require("fs");
import { SessionClaim, SessionClaimValidator } from "supertokens-node/lib/build/recipe/session/types";

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
    // TODO: check if any conversions are needed
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
