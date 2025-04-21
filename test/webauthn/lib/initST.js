const { recipesMock } = require("../../../api-mock");
const { Session, supertokens, WebAuthn } = recipesMock;
let assert = require("assert");
const { createCoreApplication } = require("../../utils");

const _origin = "https://supertokens.io";
const _rpId = "supertokens.io";
const _rpName = "SuperTokens";

const initST = async ({ origin = true, rpId = true, rpName = true, functions, apis } = {}) => {
    const connectionURI = await createCoreApplication();

    const config = {
        override: {
            ...(functions ? { functions } : {}),
            ...(apis ? { apis } : {}),
            // functions: (originalImplementation) => {
            //     return {
            //         ...originalImplementation,
            //         ...(signInTimeout === true
            //             ? {
            //                   signInOptions: async (input) => {
            //                       return originalImplementation.signInOptions({
            //                           ...input,
            //                           timeout: 10000,
            //                       });
            //                   },
            //               }
            //             : signInTimeout === "low"
            //             ? {
            //                   signInOptions: async (input) => {
            //                       return originalImplementation.signInOptions({
            //                           ...input,
            //                           timeout: 500,
            //                       });
            //                   },
            //               }
            //             : {}),
            //         ...(registerTimeout === true
            //             ? {
            //                   registerOptions: async (input) => {
            //                       return originalImplementation.registerOptions({
            //                           ...input,
            //                           timeout: 10000,
            //                       });
            //                   },
            //               }
            //             : registerTimeout === "low"
            //             ? {
            //                   registerOptions: async (input) => {
            //                       return originalImplementation.registerOptions({
            //                           ...input,
            //                           timeout: 500,
            //                       });
            //                   },
            //               }
            //             : {}),
            //     };
            // },
        },
        ...(origin
            ? {
                  getOrigin: async () => {
                      return "https://supertokens.io";
                  },
              }
            : {
                  getOrigin: async () => {
                      return "https://api.supertokens.io"; // set it like this because the default value would actually use the origin and it would not match the default relying party id
                  },
              }),
        ...(rpId
            ? {
                  getRelyingPartyId: async () => {
                      return "supertokens.io";
                  },
              }
            : {}),
        ...(rpName
            ? {
                  getRelyingPartyName: async () => {
                      return "SuperTokens";
                  },
              }
            : {}),
    };

    // these need to be the same as _rpId, _rpName, _origin as they are hardcoded,
    // because the minification of the method and passing it over wire won't preserve the context
    if (rpId) {
        assert.equal(await config.getRelyingPartyId(), _rpId);
    }
    if (rpName) {
        assert.equal(await config.getRelyingPartyName(), _rpName);
    }
    if (origin) {
        assert.equal(await config.getOrigin(), _origin);
    }

    supertokens.init({
        supertokens: {
            connectionURI,
        },
        appInfo: {
            apiDomain: "api.supertokens.io",
            appName: "SuperTokens",
            websiteDomain: "supertokens.io",
        },
        recipeList: [Session.init(), WebAuthn.init(config)],
    });
};

module.exports = { initST, origin: _origin, rpId: _rpId, rpName: _rpName };
