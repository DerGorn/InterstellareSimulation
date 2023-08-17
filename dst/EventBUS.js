const eventTypes = [
    "Rescale",
    "togglePlay",
    "metadata",
    "dbclickedBody",
    "resetCam",
    "simData",
    "logSliderUpdate",
    "removeBody",
    "requestRemoveBody",
];
const registeredFunctions = {
    Rescale: [],
    togglePlay: [],
    metadata: [],
    dbclickedBody: [],
    resetCam: [],
    simData: [],
    logSliderUpdate: [],
    removeBody: [],
    requestRemoveBody: [],
};
const registerEventListener = ({ index = -1, eventType }, ...listener) => {
    if (index == -1)
        registeredFunctions[eventType].push(...listener);
    else {
        registeredFunctions[eventType].splice(index, 0, ...listener);
    }
};
const fireEvent = async (eventType, event) => {
    registeredFunctions[eventType].forEach((l) => l(event));
};
const EventBUS = {
    registerEventListener,
    fireEvent,
};
export default EventBUS;
