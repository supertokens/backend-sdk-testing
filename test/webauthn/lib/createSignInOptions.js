const { request } = require("../../../api-mock");

const createSignInOptions = async () => {
    let signInOptionsResponse = await new Promise((resolve, reject) =>
        request()
            .post("/auth/webauthn/options/signin")
            .send({})
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

    return signInOptionsResponse;
};

module.exports = createSignInOptions;
