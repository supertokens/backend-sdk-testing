const { request } = require("../../../api-mock");

const createRegisterOptions = async (email = `${Math.random().toString().slice(2)}@supertokens.com`) => {
    let registerOptionsResponse = await new Promise((resolve, reject) =>
        request()
            .post("/auth/webauthn/options/register")
            .send({
                email,
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

    return registerOptionsResponse;
};

module.exports = createRegisterOptions;
