const { printPath, setupST, startST, killAllST, cleanST } = require("../utils");
const { ProcessState } = require("supertokens-node/lib/build/processState");
const STExpress = require("supertokens-node");
const UserMetadataRecipe = require("supertokens-node/lib/build/recipe/usermetadata/recipe").default;
const { Querier } = require("supertokens-node/lib/build/querier");
const { maxVersion } = require("supertokens-node/lib/build/utils");

describe(`configTest: ${printPath("[test/usermetadata/config.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    describe("recipe init", () => {
        it("should work fine without config", async function () {
            const connectionURI = await startST();
            STExpress.init({
                supertokens: {
                    connectionURI,
                },
                appInfo: {
                    apiDomain: "api.supertokens.io",
                    appName: "SuperTokens",
                    websiteDomain: "supertokens.io",
                },
                recipeList: [UserMetadataRecipe.init()],
            });

            // Only run for version >= 2.13
            const querier = Querier.getNewInstanceOrThrowError(undefined);
            const apiVersion = await querier.getAPIVersion();
            if (maxVersion(apiVersion, "2.12") === "2.12") {
                return this.skip();
            }

            await UserMetadataRecipe.getInstanceOrThrowError();
        });
    });
});
