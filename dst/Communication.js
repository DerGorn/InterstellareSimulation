import EventBUS from "./EventBUS.js";
import { Loop } from "./Loop.js";
import { getMetaData } from "./MenuGrafics.js";
import { getBodyInfo } from "./SimulationGrafics.js";
let updatesToSimulation = {};
const handleUpdate = (e) => {
    if (Loop.isRunning())
        return;
    const info = e.id.split("_");
    const body_index = Number(info[0]);
    if (isNaN(body_index)) {
        updatesToSimulation[info[0].replace("-", "_")] = e.value;
        return;
    }
    if (!(body_index in updatesToSimulation)) {
        updatesToSimulation[body_index] = {};
    }
    updatesToSimulation[body_index][info[1]] =
        e.value;
};
const request = async (data, url = "") => {
    console.log("Requesting", data, "at", url);
    let method = "GET";
    if (Object.keys(data).length !== 0) {
        method = "POST";
    }
    const response = await fetch(url, {
        method,
        mode: "cors",
        cache: "no-cache",
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json",
        },
        redirect: "follow",
        referrerPolicy: "no-referrer",
        body: JSON.stringify(data),
    });
    return await response.json();
};
const sendUpdates = () => {
    if (Object.keys(updatesToSimulation).length === 0)
        return;
    Object.entries(updatesToSimulation).forEach(([key, value]) => {
        let eventType;
        let body;
        if (key === "-1") {
            eventType = "Add";
            body = value;
        }
        else if (!isNaN(Number(key))) {
            if (value === "removed") {
                eventType = "Remove";
                body = { [key]: key };
            }
            else {
                eventType = "Update";
                const info = getBodyInfo(Number(key)).simState;
                Object.entries(value).forEach(([prop, val]) => {
                    info[prop] = val;
                });
                body = { [key]: info };
            }
        }
        else {
            eventType = "Meta";
            body = getMetaData();
        }
        request({ eventType, body }, "/input");
    });
};
const sendPause = (pause) => {
    const eventType = "Meta";
    const body = getMetaData();
    if (pause)
        body.time_scaling = 0;
    if (Object.values(body).some((v) => v == null || v == undefined))
        return;
    request({ eventType, body }, "/input");
};
const startCommunication = () => {
    EventBUS.registerEventListener({
        eventType: "logSliderUpdate",
    }, handleUpdate);
    EventBUS.registerEventListener({ eventType: "requestRemoveBody" }, (e) => {
        updatesToSimulation[e.body_index] = "removed";
        sendUpdates();
        updatesToSimulation = {};
    });
    EventBUS.registerEventListener({ eventType: "togglePlay" }, (e) => {
        if (e.play) {
            sendUpdates();
            sendPause(false);
        }
        else {
            sendPause(true);
        }
        updatesToSimulation = {};
    });
};
export { startCommunication };
