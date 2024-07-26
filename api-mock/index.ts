import {
    getOverrideParams,
    getOverrideLogs,
    mockExternalAPI,
    queryAPI,
    request,
    resetOverrideParams,
    API_PORT,
} from "./fetcher";
import { EmailPasswordMock } from "./mocks/EmailPasswordMock";
import { EmailVerificationMock, EmailVerificationRecipeMock } from "./mocks/EmailVerificationMock";
import { MultitenancyMock } from "./mocks/MultitenancyMock";
import { PasswordlessMock } from "./mocks/PasswordlessMock";
import { ProcessStateMock } from "./mocks/ProcessStateMock";
import { SessionMock, TestPrimitiveArrayClaim, TestPrimitiveClaim } from "./mocks/SessionMock";
import { SuperTokensMock } from "./mocks/SuperTokensMock";
import { ThirdPartyMock } from "./mocks/ThirdPartyMock";
import { UserMetadataMock } from "./mocks/UserMetadataMock";
import { randomString } from "./utils";

const recipesMock = {
    EmailPassword: EmailPasswordMock,
    ThirdParty: ThirdPartyMock,
    Session: SessionMock,
    EmailVerification: EmailVerificationMock,
    EmailVerificationRecipe: EmailVerificationRecipeMock,
    supertokens: SuperTokensMock,
    ProcessState: ProcessStateMock,
    Multitenancy: MultitenancyMock,
    Passwordless: PasswordlessMock,
    UserMetadata: UserMetadataMock,
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
