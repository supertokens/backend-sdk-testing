import Session from "supertokens-node/recipe/session";

export async function handleSession(
    session: { [key: string]: any } | undefined
): Promise<Session.SessionContainer | undefined> {
    if (session !== undefined) {
        // TODO: review this workaround
        return await Session.getSessionWithoutRequestResponse(
            session.accessToken,
            session.userDataInAccessToken?.antiCsrfToken
        );
    }
    return session;
}
