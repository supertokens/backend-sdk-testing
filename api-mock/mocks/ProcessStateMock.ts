import { PROCESS_STATE } from "supertokens-node/lib/build/processState";
import { waitForProcessState } from "../fetcher";

export const ProcessStateMock = {
    getInstance: () => ProcessStateMock,
    waitForEvent: async (eventName: PROCESS_STATE) => {
        return await waitForProcessState(eventName);
    },
};
