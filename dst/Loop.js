import EventBUS from "./EventBUS.js";
const FPSTARGET = 30;
const updateFunctions = [];
let end = false;
let lastRender = 0;
const loop = (time) => {
    const delta = time - lastRender;
    if (delta >= 1000 / FPSTARGET) {
        update(delta);
        lastRender = time;
    }
    if (!end)
        window.requestAnimationFrame(loop);
};
const update = (delta) => {
    updateFunctions.forEach((f) => f(delta));
};
let firststart = true;
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
                if (!e.play)
                    Loop.pause();
                else
                    Loop.start();
            });
        }
    },
    pause: () => {
        end = true;
        EventBUS.fireEvent("togglePlay", { play: false });
    },
    isRunning: () => !end,
    registerOnUpdate: ({ index = -1 } = { index: -1 }, ...onUpdate) => {
        if (index == -1)
            updateFunctions.push(...onUpdate);
        else {
            updateFunctions.splice(index, 0, ...onUpdate);
        }
    },
};
export { Loop };
