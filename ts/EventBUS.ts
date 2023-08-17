import { Body } from "./SimulationGrafics";
//  * Main form of communication between different parts of the code.
//  * It works similar to the updateFunctions in the Loop. Instead of
//  * firing the events every frame they can be fired over the EventBUS
//  * anywhere in the code.
//  * With some Typescript shenanigans the Events are type safe and provide
//  * Autocomplete in VSCode

/**
 * List of all possible Events. Basic stepping stone for the type safety
 */
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
] as const;
/**
 * Converts the eventTypes JavaScript array into a TypeScript type.
 */
type Events = (typeof eventTypes)[number];

/**
 * Each Event has its own array of regisered functions. The functions are defined as
 * generic functions (e: any) => void. The correct typing for each event is guaranteed
 * with registerEventListener, hence a generic function type is ok here.
 */
const registeredFunctions: { [key in Events]: ((e: any) => void)[] } = {
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

/**
 * Bundle the Typesignature of each event into one Object. By doing this it can be
 * accessed with a generic Type in registerEventListener and fireEvent
 */
type EventDefinitions = {
  Rescale: {
    menuOrientation: "width" | "height";
    size: number;
  };
  togglePlay: {
    play: boolean;
  };
  metadata: {
    interaction_constant: number;
    time_scaling: number;
  };
  dbclickedBody: { body_index: number; distance: number };
  resetCam: {};
  simData: { bodies: Body[] };
  logSliderUpdate: { id: string; value: number };
  removeBody: { body_index: number };
  requestRemoveBody: { body_index: number };
};

/**
 * Register a variable amount of eventListener for an event.
 * @param index = -1. Optional to specify where in the registeredFunctions array to insert the functions. Defaults to -1, the end of the array
 * @param eventType
 * @param listener
 */
const registerEventListener = <K extends Events>(
  { index = -1, eventType }: { index?: number; eventType: K },
  ...listener: ((event: EventDefinitions[K]) => void)[]
) => {
  if (index == -1) registeredFunctions[eventType].push(...listener);
  else {
    registeredFunctions[eventType].splice(index, 0, ...listener);
  }
};

/**
 * Fires the given event of the given eventType which results in calling all registered Events.
 * @param eventType
 * @param event
 */
const fireEvent = async <K extends Events>(
  eventType: K,
  event: EventDefinitions[K]
) => {
  registeredFunctions[eventType].forEach((l) => l(event));
};

/**
 * Main form of communication between different parts of the code.
 * It works similar to the updateFunctions in the Loop. Instead of
 * firing the events every frame they can be fired over the EventBUS
 * anywhere in the code.
 */
const EventBUS = {
  registerEventListener,
  fireEvent,
};

export default EventBUS;
