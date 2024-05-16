const assert = require("assert");

const { printPath, setupST, startST, killAllST, cleanST, areArraysEqual } = require("../utils");
const STExpress = require("supertokens-node");
const { ProcessState } = require("supertokens-node/lib/build/processState");
const UserRolesRecipe = require("supertokens-node/lib/build/recipe/userroles").default;
const { Querier } = require("supertokens-node/lib/build/querier");
const { maxVersion } = require("supertokens-node/lib/build/utils");
const { default: SessionRecipe } = require("supertokens-node/lib/build/recipe/session/recipe");

describe(`removeUserRoleTest: ${printPath("[test/userroles/removeUserRole.test.js]")}`, function () {
    beforeEach(async function () {
        await killAllST();
        await setupST();
        ProcessState.getInstance().reset();
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    describe("removeUserRole", () => {
        it("remove role from user", async function () {
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
                recipeList: [SessionRecipe.init(), UserRolesRecipe.init()],
            });

            // Only run for version >= 2.14
            let querier = Querier.getNewInstanceOrThrowError(undefined);
            let apiVersion = await querier.getAPIVersion();
            if (maxVersion(apiVersion, "2.13") === "2.13") {
                return this.skip();
            }

            const userId = "userId";
            const role = "role";

            // create a new role
            {
                const result = await UserRolesRecipe.createNewRoleOrAddPermissions(role, []);
                assert.strictEqual(result.status, "OK");
                assert(result.createdNewRole);
            }

            // add the role to a user
            {
                const result = await UserRolesRecipe.addRoleToUser("public", userId, role);
                assert.strictEqual(result.status, "OK");
                assert(!result.didUserAlreadyHaveRole);
            }

            // check that user has role
            {
                const result = await UserRolesRecipe.getRolesForUser("public", userId);
                assert.strictEqual(result.status, "OK");
                assert.strictEqual(result.roles.length, 1);
                assert.strictEqual(result.roles[0], role);
            }

            // remove role from user
            {
                const result = await UserRolesRecipe.removeUserRole("public", userId, role);
                assert.strictEqual(result.status, "OK");
                assert(result.didUserHaveRole);
            }

            // check that the user does not have the role
            {
                const result = await UserRolesRecipe.getRolesForUser("public", userId);
                assert.strictEqual(result.status, "OK");
                assert.strictEqual(result.roles.length, 0);
            }
        });

        it("remove a role the user does not have", async function () {
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
                recipeList: [SessionRecipe.init(), UserRolesRecipe.init()],
            });

            // Only run for version >= 2.14
            let querier = Querier.getNewInstanceOrThrowError(undefined);
            let apiVersion = await querier.getAPIVersion();
            if (maxVersion(apiVersion, "2.13") === "2.13") {
                return this.skip();
            }

            const userId = "userId";
            const role = "role";

            // create a new role
            {
                const result = await UserRolesRecipe.createNewRoleOrAddPermissions(role, []);
                assert.strictEqual(result.status, "OK");
                assert(result.createdNewRole);
            }

            // remove role from user
            {
                const result = await UserRolesRecipe.removeUserRole("public", userId, role);
                assert.strictEqual(result.status, "OK");
                assert(!result.didUserHaveRole);
            }
        });

        it("remove an unknown role from the user", async function () {
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
                recipeList: [SessionRecipe.init(), UserRolesRecipe.init()],
            });

            // Only run for version >= 2.14
            let querier = Querier.getNewInstanceOrThrowError(undefined);
            let apiVersion = await querier.getAPIVersion();
            if (maxVersion(apiVersion, "2.13") === "2.13") {
                return this.skip();
            }

            const userId = "userId";
            const role = "unknownRole";

            // remove an unknown role from user
            const result = await UserRolesRecipe.removeUserRole("public", userId, role);
            assert.strictEqual(result.status, "UNKNOWN_ROLE_ERROR");
        });
    });
});
