let shouldDoAutomaticAccountLinkingOverride = {
    automaticallyLinkIfVerified: (accountInfo, user, session, tenantId, userContext) => {
        if (userContext.DO_NOT_LINK) {
            return { shouldAutomaticallyLink: false };
        }
        if (userContext.DO_LINK_WITHOUT_VERIFICATION) {
            return {
                shouldAutomaticallyLink: true,
                shouldRequireVerification: false,
            };
        }
        return {
            shouldAutomaticallyLink: true,
            shouldRequireVerification: true,
        };
    },
    automaticallyLinkDisabled: (accountInfo, user, session, tenantId, userContext) => {
        if (userContext.DO_LINK) {
            return {
                shouldAutomaticallyLink: true,
                shouldRequireVerification: true,
            };
        }
        return { shouldAutomaticallyLink: false };
    },
    automaticallyLinkNoVerify: (accountInfo, user, session, tenantId, userContext) => {
        if (userContext.DO_NOT_LINK) {
            return { shouldAutomaticallyLink: false };
        }
        return {
            shouldAutomaticallyLink: true,
            shouldRequireVerification: false,
        };
    },
    noLinkingWhenUserEqualsSessionUser: (accountInfo, user, session, tenantId, userContext) => {
        if (userContext.DO_NOT_LINK) {
            return { shouldAutomaticallyLink: false };
        }
        if (user !== undefined && user.id === session.getUserId()) {
            return { shouldAutomaticallyLink: false };
        }
        return {
            shouldAutomaticallyLink: true,
            shouldRequireVerification: false,
        };
    },
    noLinkingWhenUserEqualsSessionUserDefaultRequireVerification: (
        accountInfo,
        user,
        session,
        tenantId,
        userContext
    ) => {
        if (userContext.DO_NOT_LINK) {
            return { shouldAutomaticallyLink: false };
        }
        if (user !== undefined && user.id === session.getUserId()) {
            return { shouldAutomaticallyLink: false };
        }
        return {
            shouldAutomaticallyLink: true,
            shouldRequireVerification: true,
        };
    },
    linkingIfVerifyExceptWhenEmailMatchTest: (accountInfo, user, session, tenantId, userContext) => {
        if (userContext.DO_NOT_LINK) {
            return { shouldAutomaticallyLink: false };
        }
        if (accountInfo.email === "test2@example.com" && user === undefined) {
            return {
                shouldAutomaticallyLink: false,
            };
        }
        return {
            shouldAutomaticallyLink: true,
            shouldRequireVerification: false,
        };
    },
    linkingNoVerifyExceptWhenEmailMatchTest: (accountInfo, user, session, tenantId, userContext) => {
        if (userContext.DO_NOT_LINK) {
            return { shouldAutomaticallyLink: false };
        }
        if (accountInfo.email === "test2@example.com" && user === undefined) {
            return {
                shouldAutomaticallyLink: false,
            };
        }
        return {
            shouldAutomaticallyLink: true,
            shouldRequireVerification: true,
        };
    },
    linkingNoVerifyExceptEmailPasswordExist: async (newAccountInfo, user) => {
        if (newAccountInfo.recipeId === "emailpassword") {
            let existingUser = await supertokens.listUsersByAccountInfo("public", {
                email: newAccountInfo.email,
            });
            let doesEmailPasswordUserExist = existingUser.length > 1;
            if (!doesEmailPasswordUserExist) {
                return {
                    shouldAutomaticallyLink: false,
                };
            }
        }
        return {
            shouldAutomaticallyLink: true,
            shouldRequireVerification: true,
        };
    },
};
exports.shouldDoAutomaticAccountLinkingOverride = shouldDoAutomaticAccountLinkingOverride;
