import {
    getMockedValues,
    mockExternalAPI,
    queryAPI,
    request,
    resetApp,
    resetMockedValues,
    setMockedValues,
} from "./fetcher";
import { AccountLinkingMock, AccountLinkingRecipeMock } from "./mocks/AccountLinkingMock";
import { EmailPasswordMock } from "./mocks/EmailPasswordMock";
import { EmailVerificationMock, EmailVerificationRecipeMock } from "./mocks/EmailVerificationMock";
import { MultiFactorAuthMock } from "./mocks/MultiFactorAuth";
import { MultitenancyMock } from "./mocks/MultitenancyMock";
import { PasswordlessMock } from "./mocks/PasswordlessMock";
import { ProcessStateMock } from "./mocks/ProcessStateMock";
import { SessionMock } from "./mocks/SessionMock";
import { SuperTokensMock } from "./mocks/SuperTokensMock";
import { TOTPMock } from "./mocks/TOTP";
import { ThirdPartyMock } from "./mocks/ThirdPartyMock";
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
    TOTP: TOTPMock,
};

export {
    getMockedValues,
    mockExternalAPI,
    queryAPI,
    randomString,
    recipesMock,
    request,
    resetApp,
    setMockedValues,
    resetMockedValues,
};
