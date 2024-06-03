import json
from typing import Optional, Dict, TypedDict, Any
from fastapi import FastAPI, Body
from supertokens_python import init, Supertokens as SuperTokensRecipe, InputAppInfo, SupertokensConfig, get_all_cors_headers
from supertokens_python.recipe import session, emailpassword
from supertokens_python.recipe.session import SessionRecipe
from supertokens_python.recipe.multitenancy.recipe import MultitenancyRecipe
from supertokens_python.recipe.usermetadata import UserMetadataRecipe
from supertokens_python.recipe.emailpassword import asyncio as emailpasswordAsyncio, EmailPasswordRecipe
from starlette.middleware.cors import CORSMiddleware
from supertokens_python.framework.fastapi import get_middleware
from supertokens_python.framework import BaseRequest

MockConfig = TypedDict('MockConfig', {
    'connectionURI': str,
    'recipes': Optional[Dict[str, Dict[str, Dict[str, str]]]],
})

vars: dict = {
    "passwordResetLink": "",
}

constrains = {
    "tenantId": "public"
}


class EmailpasswordOverridePasswordResetLink(
    emailpassword.EmailDeliveryInterface[emailpassword.EmailTemplateVars]
):
    async def send_email(
        self,
        template_vars: emailpassword.EmailTemplateVars,
        user_context: Dict[str, Any],
    ) -> None:
        vars["passwordResetLink"] = template_vars.password_reset_link


def get_origin(req: Optional[BaseRequest], _: Optional[Dict[str, Any]]) -> str:
    if req is not None:
        value = req.get_header("origin")
        if value is not None:
            return value
    return "localhost:3000"


def initST(config: MockConfig):
    SessionRecipe.reset()
    EmailPasswordRecipe.reset()
    SessionRecipe.reset()
    MultitenancyRecipe.reset()
    UserMetadataRecipe.reset()
    SuperTokensRecipe.reset()

    connection_uri = config['connectionURI']
    recipe_list = []
    if 'recipes' in config:
        for recipe_name, recipe_config in config['recipes'].items():
            if recipe_name == 'session':
                recipe_list.append(session.init())

            if recipe_name == 'emailpassword':
                emailpassword_EmailDeliveryConfig_override = None
                if 'overrides' in recipe_config:
                    if 'emailDelivery.sendEmail' in recipe_config['overrides']:
                        if recipe_config['overrides']['emailDelivery.sendEmail'] == 'copy-passwordResetLink':
                            emailpassword_EmailDeliveryConfig_override = emailpassword.EmailDeliveryConfig(
                                EmailpasswordOverridePasswordResetLink())

                recipe_list.append(emailpassword.init(
                    email_delivery=emailpassword_EmailDeliveryConfig_override
                ))

    init(
        app_info=InputAppInfo(
            app_name="SuperTokens",
            api_domain="api.supertokens.io",
            origin=get_origin
        ),
        supertokens_config=SupertokensConfig(
            connection_uri=connection_uri
        ),
        framework='fastapi',
        recipe_list=recipe_list,
        mode='asgi'
    )


initST({'connectionURI': 'http://localhost:8080', 'recipes': {'session': {}}})

app = FastAPI(docs_url=None, redoc_url=None)
app.add_middleware(get_middleware())


@app.get("/test/ping")
async def mockPing():
    return {"ok": True}


@app.post("/test/reset")
async def mockReset(config: MockConfig = Body(None)):
    print('mockReset:', config)
    vars.clear()
    initST(config)
    return {"ok": True}


@app.get("/test/getMockedValues")
async def getMockedValues():
    return vars


@app.post("/test/EmailPassword/signup")
async def mockEmailPasswordSignup(body: dict = Body(None)):
    print("EmailPassword:signup:", body)
    return await emailpasswordAsyncio.sign_up(
        body.get('tenantId', constrains['tenantId']),
        body.get('email', None),
        body.get('password', None),
        # FIXME: node-sdk expect session field
        body.get('userContext', None)
    )


@app.post("/test/EmailPassword/createResetPasswordLink")
async def mockEmailPasswordCreateResetPasswordLink(body: dict = Body(None)):
    print("EmailPassword:createResetPasswordLink:", body)
    return await emailpasswordAsyncio.create_reset_password_link(
        body.get('tenantId', constrains['tenantId']),
        body.get('userId', None),
        body.get('email', None),  # FIXME: node-sdk allow email field
        body.get('userContext', None)
    )


# app.post("/test/AccountLinking/createPrimaryUser", async (req, res, next)= > {
#     try {
#         log("AccountLinking:createPrimaryUser %j", req.body)
#         const recipeUserId= STExpress.convertToRecipeUserId(req.body.recipeUserId)
#         const response= await AccountLinking.createPrimaryUser(recipeUserId, req.body.userContext)
#         res.json(response)
#     } catch(e) {
#         next(e)
#     }
# });


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "*"
    ],
    allow_credentials=True,
    allow_methods=["GET", "PUT", "POST", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Content-Type"] + get_all_cors_headers(),
)
