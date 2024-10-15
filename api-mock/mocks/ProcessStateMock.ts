import { PROCESS_STATE } from "supertokens-node/lib/build/processState";
import { waitForProcessState } from "../fetcher";

export const ProcessStateMock = {
    getInstance: () => ProcessStateMock,
    waitForEvent: async (eventName: PROCESS_STATE) => {
        let resp = await waitForProcessState(eventName);
        return resp === undefined || resp === null ? undefined : resp;
    },
};
