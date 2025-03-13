const createRegisterOptions = require("./createRegisterOptions");
const createSignInOptions = require("./createSignInOptions");

const { request } = require("../../../api-mock");

const getWebauthnLib = require("./getWebAuthnLib");

const createUser = async (rpId, rpName, origin) => {
    const email = `${Math.random().toString().slice(2)}@supertokens.com`;
    const registerOptionsResponse = await createRegisterOptions(email);
    const signInOptionsResponse = await createSignInOptions();

    const { createAndAssertCredential } = await getWebauthnLib();
    const credential = createAndAssertCredential(registerOptionsResponse, signInOptionsResponse, {
        rpId,
        rpName,
        origin,
        userNotPresent: false,
        userNotVerified: false,
    });

    let signUpResponse = await new Promise((resolve, reject) =>
        request()
            .post("/auth/webauthn/signup")
            .send({
                credential: credential.attestation,
                webauthnGeneratedOptionsId: registerOptionsResponse.webauthnGeneratedOptionsId,
                shouldTryLinkingWithSessionUser: false,
            })
            .expect(200)
            .end((err, res) => {
                if (err) {
                    console.log(err);
                    reject(err);
                } else {
                    resolve(JSON.parse(res.text));
                }
            })
    );

    return { email, signUpResponse, registerOptionsResponse, signInOptionsResponse, credential };
};

module.exports = createUser;
