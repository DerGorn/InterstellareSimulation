import EventBUS from "./EventBUS.js";
import { Loop } from "./Loop.js";
import { getMetaData } from "./MenuGrafics.js";
import { Body, getBodyInfo } from "./SimulationGrafics.js";

/**
 * Keeps track of all Changes done to the simulation wihle paused. They will all be send to
 * the backend when unpaused.
 */
let updatesToSimulation: {
  [key: string | number]: number | { [key: string]: number } | "removed";
} = {};

/**
 * Listens to the logSliderUpdate Event to save the changes in updatesToSimulation.
 * @param e
 */
const handleUpdate = (e: { id: string; value: number }) => {
  if (Loop.isRunning()) return;
  const info = e.id.split("_");
  const body_index = Number(info[0]);
  if (isNaN(body_index)) {
    updatesToSimulation[info[0].replace("-", "_")] = e.value;
    return;
  }
  if (!(body_index in updatesToSimulation)) {
    updatesToSimulation[body_index] = {};
  }
  (updatesToSimulation[body_index] as { [key: string]: number })[info[1]] =
    e.value;
};

/**
 * Send a request with data to url.
 * @param data
 * @param url
 */
const request = async (data: { [keys: string]: any }, url = "") => {
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

/**
 * Send the updates saved in updatesToSimulation to the backend
 */
const sendUpdates = () => {
  if (Object.keys(updatesToSimulation).length === 0) return;
  const updates = { ...updatesToSimulation };
  Object.entries(updates).forEach(([key, value]) => {
    let eventType: string;
    let body: Object;
    if (key === "-1") {
      eventType = "Add";
      body = value as { [key: string]: number };
    } else if (!isNaN(Number(key))) {
      if (value === "removed") {
        eventType = "Remove";
        body = { [key]: key };
      } else {
        eventType = "Update";
        const info = getBodyInfo(Number(key)).simState;
        Object.entries(value).forEach(
          <K extends keyof Body>([prop, val]: [K, number]) => {
            info[prop] = val;
          }
        );
        body = { [key]: info };
      }
    } else {
      eventType = "Meta";
      body = getMetaData();
    }
    request({ eventType, body }, "/input");
  });
};

/**
 * Send a InputEvent::Meta to the backend. The time_scaling will be set to 0 to pause.
 * @param pause true if the simulation should be paused. false otherwise
 */
const sendPause = (pause: boolean) => {
  const eventType = "Meta";
  const body = getMetaData();
  if (pause) body.time_scaling = 0;
  if (Object.values(body).some((v) => v == null || v == undefined)) return;
  request({ eventType, body }, "/input");
};

/**
 * Initiate Communication over the EventBUS
 */
const startCommunication = () => {
  EventBUS.registerEventListener(
    {
      eventType: "logSliderUpdate",
    },
    handleUpdate
  );
  EventBUS.registerEventListener({ eventType: "requestRemoveBody" }, (e) => {
    updatesToSimulation[e.body_index] = "removed";
    sendUpdates();
    updatesToSimulation = {};
  });
  EventBUS.registerEventListener({ eventType: "togglePlay" }, (e) => {
    if (e.play) {
      sendUpdates();
      sendPause(false);
    } else {
      sendPause(true);
    }
    updatesToSimulation = {};
  });
};

export { startCommunication };
