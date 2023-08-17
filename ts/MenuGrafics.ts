import { body, createElement } from "./DOM.js";
import EventBUS from "./EventBUS.js";
import LogSliderInput from "./LogSliderInput.js";
import { Loop } from "./Loop.js";
import {
  Body,
  DBCLICKDISTANCE,
  getBodyInfo,
  setBodyColor,
  toggleMoon,
} from "./SimulationGrafics.js";

const MINMENUSIZE = 200;

/**
 * Menu used for changing the metadata of the simulation
 */
const settingsMenu = createElement(
  { id: "settingsMenu" },
  "settingsMenu",
  "menu"
);
const playButton = createElement({}, "playButton");
/**
 * Slider that allows the change of the interaction constant
 */
const gravity = new LogSliderInput({
  text: "G: ",
  min: 1e-20,
  max: 1,
  id: "interaction-constant",
});
/**
 * Slider that allows the change of the time scaling of the simulation
 */
const time = new LogSliderInput({
  text: "t scale: ",
  min: 1,
  max: 1e10,
  id: "time-scaling",
});
/**
 * Button to reset the camera to the default position
 */
const resetCam = createElement({}, "button");
resetCam.innerText = "Reset View";
resetCam.addEventListener("click", () => {
  EventBUS.fireEvent("resetCam", {});
});
/**
 * Button to create a new Body
 */
const createBody = createElement({}, "button");
createBody.innerText = "Create Body";
createBody.addEventListener("click", () => {
  // Because all changes have to be made, wihle the simulation is paused start by pausing
  EventBUS.fireEvent("togglePlay", { play: false });
  // To prevent accidents block input to the screen with a blocking layer
  const clickBlocker = createElement({}, "clickBlocker");
  // Populate the detailMenu with a new body
  populateDetailMenu(-1);
  /**
   * Button to confirm the creation of the body
   */
  const confirm = createElement(
    {
      style: {
        position: "absolute",
        bottom: "20px",
        left: "50%",
        transform: "translate(-50%)",
      },
    },
    "button"
  );
  confirm.innerText = "Confirm";
  confirm.addEventListener("click", () => {
    //Clean up after confrim click
    clickBlocker.remove();
    body.append(detailMenu);
    EventBUS.fireEvent("togglePlay", { play: true });
  });
  clickBlocker.append(detailMenu, confirm);
  body.append(clickBlocker);
});
/**
 * Message to tell the user to pause if modifications are wanted
 */
const help = createElement({}, "text", "help");
help.innerText = "Pause to modify the simulation";
settingsMenu.append(playButton, gravity, time, resetCam, createBody, help);

/**
 * Menu to show the informations of the selected body
 */
const detailMenu = createElement({ id: "detailMenu" }, "detailMenu", "menu");
detailMenu.append(createElement());

/**
 * Positions the menus on the rigth axis and sets their size
 * @param event Rescale event
 */
const scaleMenus = (event: {
  menuOrientation: "width" | "height";
  size: number;
}) => {
  if (event.menuOrientation === "width") {
    body.style.setProperty(
      "--menuWidth",
      `${(window.innerWidth - event.size) / 2 - 4}px`
    );
    body.style.setProperty("--menuHeight", `${window.innerHeight}px`);
  } else {
    body.style.setProperty(
      "--menuHeight",
      `${(window.innerHeight - event.size) / 2 - 4}px`
    );
    body.style.setProperty("--menuWidth", `${window.innerWidth}px`);
  }
};

/**
 * All the sliders used in the detailMenu to display and change the simulation data
 */
let simValueSliders: LogSliderInput[] = [];
/**
 * Populate the detailMenu with the informations of the selected body
 * @param body_index the selected bodies index
 */
const populateDetailMenu = (body_index: number) => {
  const bodyInfo = getBodyInfo(body_index);
  if (detailMenu.firstChild) detailMenu.firstChild.remove();
  //To get rid of previous informations create a div that holds all the menus content
  const detailMenuSacrifice = createElement({}, "sacrifice");
  /**
   * Diplay the bodies Name
   */
  const title = createElement({}, "title");
  title.innerText = bodyInfo.name;
  /**
   * colorPicker to modify the bodies color
   */
  const color = createElement(
    { tag: "input" },
    "colorPicker"
  ) as HTMLInputElement;
  color.addEventListener("input", () => {
    setBodyColor(color.value, body_index);
  });
  color.type = "color";
  color.value = bodyInfo.color;
  /**
   * checkBox to toggle the bodies moon status
   */
  const moonCheck = createElement(
    { tag: "input" },
    "checkBox"
  ) as HTMLInputElement;
  moonCheck.type = "checkbox";
  moonCheck.checked = bodyInfo.moon;
  moonCheck.addEventListener("input", () => {
    toggleMoon(body_index);
  });
  const moonLabel = createElement({ tag: "label" }, "text") as HTMLLabelElement;
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
  /**
   * Button to delete the body
   */
  const del = createElement({}, "button");
  del.innerText = "Delete";
  del.addEventListener("click", () => {
    EventBUS.fireEvent("requestRemoveBody", { body_index });
    detailMenuSacrifice.remove();
  });
  detailMenuSacrifice.append(title, color, moonLabel, ...simValueSliders, del);
  detailMenu.append(detailMenuSacrifice);
};

/**
 * INstead of repopulating the detailmenu every time simulation data arrives just update the Sliders
 * @param simState new data from the simulation
 */
const updateDetailMenu = (simState: Body) => {
  Object.values(simState).forEach((v, i) => {
    simValueSliders[i].value = v;
  });
};

/**
 *
 * @returns Simulation metadata
 */
const getMetaData = () => {
  return { interaction_constant: gravity.value, time_scaling: time.value };
};

let gravitationalConstant = 0;
let timeScale = 0;
/**
 * Setup the communication over the EventBUS
 */
const startMenus = () => {
  body.append(settingsMenu, detailMenu);
  playButton.addEventListener("click", () => {
    EventBUS.fireEvent("togglePlay", {
      play: playButton.classList.contains("pause"),
    });
  });
  EventBUS.registerEventListener({ eventType: "Rescale" }, scaleMenus);
  EventBUS.registerEventListener(
    { eventType: "togglePlay" },
    (event: { play: boolean }) => {
      if (event.play) {
        help.innerText = "Pause to modify the simulation";
        playButton.classList.add("play");
        playButton.classList.remove("pause");
      } else {
        help.innerText = "";
        playButton.classList.remove("play");
        playButton.classList.add("pause");
      }
    }
  );
  EventBUS.registerEventListener(
    { eventType: "metadata" },
    (event: { interaction_constant: number; time_scaling: number }) => {
      if (gravitationalConstant !== event.interaction_constant) {
        gravity.value = event.interaction_constant;
        gravitationalConstant = event.interaction_constant;
      }
      if (timeScale !== event.time_scaling && event.time_scaling !== 0) {
        time.value = event.time_scaling;
        timeScale = event.time_scaling;
      }
    }
  );
  let populationTarget: null | number = null;
  EventBUS.registerEventListener({ eventType: "dbclickedBody" }, (e) => {
    if (e.distance < DBCLICKDISTANCE) {
      populationTarget = e.body_index;
      populateDetailMenu(populationTarget);
    } else populationTarget = null;
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
