const { recipesMock } = require("../../../api-mock");
const { WebAuthn } = recipesMock;

const getWebAuthnRecipe = () => {
    const recipe = WebAuthn;
    return recipe;
};

module.exports = getWebAuthnRecipe;
