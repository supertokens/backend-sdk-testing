import {
    getOverrideParams,
    getOverrideLogs,
    mockExternalAPI,
    queryAPI,
    request,
    resetOverrideParams,
    API_PORT,
} from "./fetcher";
import { AccountLinkingMock, AccountLinkingRecipeMock } from "./mocks/AccountLinkingMock";
import { EmailPasswordMock } from "./mocks/EmailPasswordMock";
import { EmailVerificationMock, EmailVerificationRecipeMock } from "./mocks/EmailVerificationMock";
import { MultiFactorAuthMock } from "./mocks/MultiFactorAuth";
import { MultitenancyMock } from "./mocks/MultitenancyMock";
import { PasswordlessMock } from "./mocks/PasswordlessMock";
import { ProcessStateMock } from "./mocks/ProcessStateMock";
import { SessionMock, TestPrimitiveArrayClaim, TestPrimitiveClaim } from "./mocks/SessionMock";
import { SuperTokensMock } from "./mocks/SuperTokensMock";
import { TOTPMock } from "./mocks/TOTP";
import { ThirdPartyMock } from "./mocks/ThirdPartyMock";
import { UserMetadataMock } from "./mocks/UserMetadataMock";
import { OAuth2ProviderMock } from "./mocks/OAuth2ProviderMock";
import { OAuth2ClientMock } from "./mocks/OAuth2ClientMock";
import { randomString } from "./utils";

const recipesMock = {
    EmailPassword: EmailPasswordMock,
    AccountLinking: AccountLinkingMock,
    AccountLinkingRecipe: AccountLinkingRecipeMock,
    ThirdParty: ThirdPartyMock,
    Session: SessionMock,
    EmailVerification: EmailVerificationMock,
    EmailVerificationRecipe: EmailVerificationRecipeMock,
    supertokens: SuperTokensMock,
    ProcessState: ProcessStateMock,
    Multitenancy: MultitenancyMock,
    Passwordless: PasswordlessMock,
    MultiFactorAuth: MultiFactorAuthMock,
    UserMetadata: UserMetadataMock,
    TOTP: TOTPMock,
    OAuth2Provider: OAuth2ProviderMock,
    OAuth2Client: OAuth2ClientMock,
    TestPrimitiveClaim,
    TestPrimitiveArrayClaim,
};

export {
    getOverrideParams,
    getOverrideLogs,
    mockExternalAPI,
    queryAPI,
    randomString,
    recipesMock,
    request,
    resetOverrideParams,
    API_PORT,
};
