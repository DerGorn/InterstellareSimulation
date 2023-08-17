import EventBUS from "./EventBUS.js";

const FPSTARGET = 30;

/**
 * All the functions that were registered to run every frame
 */
const updateFunctions: ((delta: number) => any)[] = [];

let end = false;
let lastRender = 0;
/**
 * Main loop to continously update the application. It uses window.requestAnimationFrame to
 * sync the updates with the browsers frame rendering. By using requestAnimationFrame a smooth
 * experience can be guaranteed without any stutters
 * @param time time since application start, supplied by window.requestAnimationFrame
 */
const loop = (time: number) => {
  const delta = time - lastRender;
  if (delta >= 1000 / FPSTARGET) {
    update(delta);
    lastRender = time;
  }
  if (!end) window.requestAnimationFrame(loop);
};

const update = (delta: number) => {
  updateFunctions.forEach((f) => f(delta));
};

/**
 * Indicates a fresh reload of the site. Used to setup the togglePlay Event listener on the loop
 */
let firststart = true;
/**
 * Main Loop controller.
 */
const Loop = {
  start: async () => {
    end = false;
    lastRender = 0;
    window.requestAnimationFrame(loop);
    await EventBUS.fireEvent("togglePlay", { play: true });
    if (firststart) {
      firststart = false;
      let called = false;
      EventBUS.registerEventListener({ eventType: "togglePlay" }, (e) => {
        if (called) {
          called = false;
          return;
        }
        called = true;
        if (!e.play) Loop.pause();
        else Loop.start();
      });
    }
  },
  pause: () => {
    end = true;
    EventBUS.fireEvent("togglePlay", { play: false });
  },
  isRunning: () => !end,
  /**
   * Adds a variable amount of functions to the updateFunctions.
   * Optionally the index can be supplied at wich to add the functions.
   * @param index By default the Index is -1 wich represent the end of updateFunctions
   * @param onUpdate
   */
  registerOnUpdate: (
    { index = -1 } = { index: -1 },
    ...onUpdate: ((delta: number) => any)[]
  ) => {
    if (index == -1) updateFunctions.push(...onUpdate);
    else {
      updateFunctions.splice(index, 0, ...onUpdate);
    }
  },
};

export { Loop };
