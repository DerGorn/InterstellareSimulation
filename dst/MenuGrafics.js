import { body, createElement } from "./DOM.js";
import EventBUS from "./EventBUS.js";
import LogSliderInput from "./LogSliderInput.js";
import { Loop } from "./Loop.js";
import { DBCLICKDISTANCE, getBodyInfo, setBodyColor, toggleMoon, } from "./SimulationGrafics.js";
const MINMENUSIZE = 200;
const settingsMenu = createElement({ id: "settingsMenu" }, "settingsMenu", "menu");
const playButton = createElement({}, "playButton");
const gravity = new LogSliderInput({
    text: "G: ",
    min: 1e-20,
    max: 1,
    id: "interaction-constant",
});
const time = new LogSliderInput({
    text: "t scale: ",
    min: 1,
    max: 1e10,
    id: "time-scaling",
});
const resetCam = createElement({}, "button");
resetCam.innerText = "Reset View";
resetCam.addEventListener("click", () => {
    EventBUS.fireEvent("resetCam", {});
});
const createBody = createElement({}, "button");
createBody.innerText = "Create Body";
createBody.addEventListener("click", () => {
    EventBUS.fireEvent("togglePlay", { play: false });
    const clickBlocker = createElement({}, "clickBlocker");
    populateDetailMenu(-1);
    const confirm = createElement({
        style: {
            position: "absolute",
            bottom: "20px",
            left: "50%",
            transform: "translate(-50%)",
        },
    }, "button");
    confirm.innerText = "Confirm";
    confirm.addEventListener("click", () => {
        clickBlocker.remove();
        body.append(detailMenu);
        EventBUS.fireEvent("togglePlay", { play: true });
    });
    clickBlocker.append(detailMenu, confirm);
    body.append(clickBlocker);
});
const help = createElement({}, "text", "help");
help.innerText = "Pause to modify the simulation";
settingsMenu.append(playButton, gravity, time, resetCam, createBody, help);
const detailMenu = createElement({ id: "detailMenu" }, "detailMenu", "menu");
detailMenu.append(createElement());
const scaleMenus = (event) => {
    if (event.menuOrientation === "width") {
        body.style.setProperty("--menuWidth", `${(window.innerWidth - event.size) / 2 - 4}px`);
        body.style.setProperty("--menuHeight", `${window.innerHeight}px`);
    }
    else {
        body.style.setProperty("--menuHeight", `${(window.innerHeight - event.size) / 2 - 4}px`);
        body.style.setProperty("--menuWidth", `${window.innerWidth}px`);
    }
};
let simValueSliders = [];
const populateDetailMenu = (body_index) => {
    const bodyInfo = getBodyInfo(body_index);
    if (detailMenu.firstChild)
        detailMenu.firstChild.remove();
    const detailMenuSacrifice = createElement({}, "sacrifice");
    const title = createElement({}, "title");
    title.innerText = bodyInfo.name;
    const color = createElement({ tag: "input" }, "colorPicker");
    color.addEventListener("input", () => {
        setBodyColor(color.value, body_index);
    });
    color.type = "color";
    color.value = bodyInfo.color;
    const moonCheck = createElement({ tag: "input" }, "checkBox");
    moonCheck.type = "checkbox";
    moonCheck.checked = bodyInfo.moon;
    moonCheck.addEventListener("input", () => {
        toggleMoon(body_index);
    });
    const moonLabel = createElement({ tag: "label" }, "text");
    moonLabel.innerText = "moon ";
    moonLabel.append(moonCheck);
    simValueSliders = Object.entries(bodyInfo.simState).map(([name, value]) => {
        const slider = new LogSliderInput({
            text: name,
            min: ["mass", "radius", "density"].includes(name) ? 0 : 0,
            max: 1e40,
            id: `${body_index}_${name}`,
        });
        slider.value = value;
        return slider;
    });
    const del = createElement({}, "button");
    del.innerText = "Delete";
    del.addEventListener("click", () => {
        EventBUS.fireEvent("requestRemoveBody", { body_index });
        detailMenuSacrifice.remove();
    });
    detailMenuSacrifice.append(title, color, moonLabel, ...simValueSliders, del);
    detailMenu.append(detailMenuSacrifice);
};
const updateDetailMenu = (simState) => {
    Object.values(simState).forEach((v, i) => {
        simValueSliders[i].value = v;
    });
};
const getMetaData = () => {
    return { interaction_constant: gravity.value, time_scaling: time.value };
};
let gravitationalConstant = 0;
let timeScale = 0;
const startMenus = () => {
    body.append(settingsMenu, detailMenu);
    playButton.addEventListener("click", () => {
        EventBUS.fireEvent("togglePlay", {
            play: playButton.classList.contains("pause"),
        });
    });
    EventBUS.registerEventListener({ eventType: "Rescale" }, scaleMenus);
    EventBUS.registerEventListener({ eventType: "togglePlay" }, (event) => {
        if (event.play) {
            help.innerText = "Pause to modify the simulation";
            playButton.classList.add("play");
            playButton.classList.remove("pause");
        }
        else {
            help.innerText = "";
            playButton.classList.remove("play");
            playButton.classList.add("pause");
        }
    });
    EventBUS.registerEventListener({ eventType: "metadata" }, (event) => {
        if (gravitationalConstant !== event.interaction_constant) {
            gravity.value = event.interaction_constant;
            gravitationalConstant = event.interaction_constant;
        }
        if (timeScale !== event.time_scaling && event.time_scaling !== 0) {
            time.value = event.time_scaling;
            timeScale = event.time_scaling;
        }
    });
    let populationTarget = null;
    EventBUS.registerEventListener({ eventType: "dbclickedBody" }, (e) => {
        if (e.distance < DBCLICKDISTANCE) {
            populationTarget = e.body_index;
            populateDetailMenu(populationTarget);
        }
        else
            populationTarget = null;
    });
    EventBUS.registerEventListener({ eventType: "removeBody" }, (e) => {
        if (e.body_index === populationTarget) {
            populationTarget = null;
            EventBUS.fireEvent("resetCam", {});
        }
    });
    Loop.registerOnUpdate({}, () => {
        if (populationTarget != null)
            updateDetailMenu(getBodyInfo(populationTarget).simState);
    });
};
export { startMenus, MINMENUSIZE, getMetaData };
