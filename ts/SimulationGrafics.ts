import { body, createElement } from "./DOM.js";
import EventBUS from "./EventBUS.js";
import { Loop } from "./Loop.js";
import { MINMENUSIZE } from "./MenuGrafics.js";

/**Used to scale the simulation view. The current size of the view is given by
  'MAXDISTANCEFROMORIGIN'. The 'maxDistanceFactor' is clamped by [MINMAXDISTANCEFACTOR, MAXMAXDISTANCFACTOR].
  The scroll speed is given by 'MAXDISTANCEGROWTHRATE'.*/
const MAXDISTANCEFROMORIGIN = () => maxDistanceFactor * AU;
const MINMAXDISTANCEFACTOR = 0.1;
const MAXMAXDISTANCEFACTOR = 200;
const MAXDISTANCEFACTORGROWRATE = 0.005;
const INITIALMAXDISTANCEFACTOR = 65;
let maxDistanceFactor = INITIALMAXDISTANCEFACTOR;
const AU = 149597870e3;

/**Max distance at wich a double click target will be evaluated as the nearest body instead of the void.*/
const DBCLICKDISTANCE = 2e21;

type Body = {
  x: number;
  y: number;
  z: number;
  radius: number;
  mass: number;
  density: number;
  vx: number;
  vy: number;
  vz: number;
};

/**If a body is double clicked the camera will follow it. To remember wich body to follow it`s index is saved*/
let followedBody: number | null = null;

/**The paths of the bodies, that will be drawn behind them*/
let paths: { [keys: number]: Position3D[] } = {};
let finishedPaths: number[] = [];

let bodies: Body[] = [];

/**Indicates the necessity to rescale the view*/
let updateScaleFlag = true;

/**Camera center position given in percent of the maximum view size.*/
let cameraCenter = { x: 0.5, y: 0.5 };

/**
 * Keyboard input. On a 'keydown' event the key will be added to the set, on a 'keyup' event removed.
 */
let pressedKeys = new Set();

const keyboardHandler = () => {
  if (pressedKeys.has("+")) {
    zoom(true);
  }
  if (pressedKeys.has("-")) {
    zoom(false);
  }
  if (pressedKeys.has("w")) {
    cameraCenter.y += 1 / c.height;
  }
  if (pressedKeys.has("s")) {
    cameraCenter.y -= 1 / c.height;
  }
  if (pressedKeys.has("d")) {
    cameraCenter.x -= 1 / c.height;
  }
  if (pressedKeys.has("a")) {
    cameraCenter.x += 1 / c.height;
  }
};

/**
 * Main canvas used for drawing the simulation.
 */
const c = createElement({ tag: "canvas" }, "mainSrceen") as HTMLCanvasElement;
/**
 * 2D context of the main canvas
 */
const context = c.getContext("2d") as CanvasRenderingContext2D;
let scale = 1;
/**
 * Rescale the drawing area. This happens on DOM 'resize' events and every time the zoom ('maxDistanceFactor') changes.
 * It also calculates the 'size' and 'menuOrientation' used to scale the menu bars at the side. The communication with
 * the menu bars is handled over the EventBUS.
 */
const setScale = () => {
  let size = Math.min(window.innerHeight, window.innerWidth);
  let menuOrientation: "width" | "height";
  if (size === window.innerHeight) {
    menuOrientation = "width";
    if (window.innerWidth - size < 2 * MINMENUSIZE)
      size = window.innerWidth - 2 * MINMENUSIZE;
  } else {
    menuOrientation = "height";
    if (window.innerHeight - size < 2 * MINMENUSIZE) {
      size = window.innerHeight - 2 * MINMENUSIZE;
    }
  }
  scale = size / MAXDISTANCEFROMORIGIN();
  c.width = size;
  c.height = size;
  c.style.width = `${c.width}px`;
  c.style.height = `${c.height}px`;
  EventBUS.fireEvent("Rescale", { menuOrientation, size });
};
/**
 * Calls 'setScale' when the 'updateScaleFlag' is set. This function will be registered in the 'Loop', so it runs
 * every frame. By calling it every frame smooth zooming can be realised. Because calling 'setScale' every frame would be
 * very slow, the 'updateScaleFlag' secures performance
 */
const updateScale = () => {
  if (updateScaleFlag) {
    setScale();
    updateScaleFlag = false;
  }
};

/**
 * Converts a point in Simulation space to coordinates, that can be displayed on the screen
 * @param pos Simulation Position
 * @returns Screen Corrdinates
 */
const pointToScreenCoords = (pos: {
  x: number;
  y: number;
  z: number;
}): [number, number] => {
  return [
    (pos.x + cameraCenter.x * MAXDISTANCEFROMORIGIN()) * scale,
    (pos.y + cameraCenter.y * MAXDISTANCEFROMORIGIN()) * scale,
  ];
};

/**
 * Picks a random name from the biggest Asteroids in the solar system.
 */
const randomName = () => {
  const names = [
    "1 Ceres",
    "4 Vesta",
    "2 Pallas",
    "10 Hygiea",
    "704 Interamnia",
    "15 Eunomia",
    "3 Juno",
    "511 Davida",
    "52 Europa",
    "16 Psyche",
    "532 Herculina",
    "32 Euphrosyne",
    "65 Cybele",
    "87 Sylvia",
    "7 Iris",
    "29 Amphitrite",
    "6 Hebe",
    "88 Thisbe",
    "107 Camila",
    "324 Bamberga",
  ];
  return names[Math.floor(Math.random() * names.length)];
};

/**
 * Generates a random Color
 * @returns The generated Color in Hex
 */
const randomColor = () => {
  let color = "#";
  for (let i = 0; i < 3; i++) {
    color += Math.floor(Math.random() * 256).toString(16);
  }
  color.toUpperCase();
  return color;
};

/**
 * Request all infos of the body given by body_index. If body_index === -1 a new body will be created
 * @param body_index Index of the requested body in the simulation data
 * @returns All infos of the body
 */
const getBodyInfo = (body_index: number) => {
  if (body_index === -1) {
    setBodyName(randomName());
    setBodyColor(randomColor());
    bodies.push({
      mass: 1,
      density: 1,
      radius: 1,
      x: 1,
      y: 1,
      z: 1,
      vx: 1,
      vy: 1,
      vz: 1,
    });
  }
  return {
    name: bodyNames.at(body_index) as string,
    color: bodyColors.at(body_index) as string,
    moon: moonIndices.includes(body_index),
    simState: bodies.at(body_index) as Body,
  };
};

/**
 * Default list of bodies in the simulation
 */
let bodyNames = [
  "Sol",
  "Mercury",
  "Venus",
  "Terra",
  "Luna",
  "Mars",
  "Jupiter",
  "Saturn",
  "Uranus",
  "Neptun",
];
/**
 * Used to change the Name of the body given by index. If index === -1 a new entry will be made
 * @param name The name to be included in 'bodyNames'
 * @param index The position in wich to include the name. The default value of -1 pushes the name
 * to the end, every other will overwrite the specified position
 */
const setBodyName = (name: string, index = -1) => {
  if (index === -1) bodyNames.push(name);
  else bodyNames[index] = name;
};
/**
 * Default colors of the default bodies in the simulation
 */
let bodyColors = [
  "#E2F516", //sun
  "#786D5F", //mercury
  "#3B2F2F", //venus
  "#1F45FC", //earth
  "#FBF6D9", //luna,
  "#7E3517", //mars
  "#E6BF83", //jupiter
  "#C9BE62", //saturn
  "#2B65EC", //uranus
  "#56A5EC", //neptun
];
/**
 * Used to change the Color of the body given by index. If index === -1 a new entry will be made
 * @param color The color to be included in 'bodyColors'
 * @param index The position in wich to include the color. The default value of -1 pushes the color
 * to the end, every other will overwrite the specified position
 */
const setBodyColor = (color: string, index = -1) => {
  if (index === -1) bodyColors.push(color);
  else bodyColors[index] = color;
};
const MOONRADIUS = 2;
const BODYRADIUSSCALE = 8;
const BODYRADIUSOFFSET = 6;
/**
 * Keeeps track of all the bodies, that are moons. By default it is only luna.
 */
let moonIndices = [4];
/**
 * Draws all Bodies sorted by their z-Position. The z-Axis comes out of the Screen, so that
 * the bodies with the biggest z-Position are drawn on top.
 */
const drawBodies = () => {
  const z = [...bodies];
  const zOrder = z.sort((a, b) => a.z - b.z).map((b) => bodies.indexOf(b));
  context.fillStyle = "black";
  context.strokeStyle = "black";
  context.lineWidth = 1;
  zOrder.forEach((i) => {
    const body = bodies[i];
    if (i < bodyColors.length) context.fillStyle = bodyColors[i];
    context.beginPath();
    context.arc(
      ...pointToScreenCoords(body),
      moonIndices.includes(i)
        ? MOONRADIUS
        : Math.round(body.radius * scale * BODYRADIUSSCALE) + BODYRADIUSOFFSET,
      0,
      2 * Math.PI
    );
    context.fill();
    context.stroke();
  });
};

/**
 * Draw the Paths the bodies have taken.
 */
const drawPaths = () => {
  if (followedBody != null) {
    cameraCenter = {
      x: 0.5 - bodies[followedBody].x / MAXDISTANCEFROMORIGIN(),
      y: 0.5 - bodies[followedBody].y / MAXDISTANCEFROMORIGIN(),
    };
  }
  Object.values(paths).forEach((p, i) => {
    if (i < bodyColors.length) context.strokeStyle = bodyColors[i];
    context.lineWidth = 2;
    context.beginPath();
    p.forEach((point, k) => {
      if (k === 0) context.moveTo(...pointToScreenCoords(point));
      else context.lineTo(...pointToScreenCoords(point));
    });
    if (finishedPaths.includes(i)) context.lineTo(...pointToScreenCoords(p[0]));
    context.stroke();
  });
};

type Position = { x: number; y: number };
/**
 * Calculate the 2D distance between two point in the x-y-plane
 */
const distance = (a: Position, b: Position) => {
  const x = b.x - a.x;
  const y = b.y - a.y;
  return x * x + y * y;
};

/**
 * Calculate the distance from a given body to the position.
 */
const distanceToBody = (pos: Position, body: Body) => {
  return distance(pos, { x: body.x, y: body.y });
};

/**
 * @param pos Target Position
 * @returns index and distance to the nearest body
 */
const findNearestBody = (pos: Position) => {
  const distances = bodies.map((body) => distanceToBody(pos, body));
  const min = Math.min(...distances);
  return { index: distances.indexOf(min), distance: min };
};

const zoom = (up: boolean) => {
  maxDistanceFactor +=
    MAXDISTANCEFACTORGROWRATE * maxDistanceFactor * (up ? -1 : 1);
  if (maxDistanceFactor < MINMAXDISTANCEFACTOR)
    maxDistanceFactor = MINMAXDISTANCEFACTOR;
  if (maxDistanceFactor > MAXMAXDISTANCEFACTOR)
    maxDistanceFactor = MAXMAXDISTANCEFACTOR;
  updateScaleFlag = true;
};

type Position3D = { x: number; y: number; z: number };
/**
 * Calculate the 3D distance between two point in the x-y-z-space
 */
const distance3D = (a: Position3D, b: Position3D) => {
  let delta = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  let dist = delta.x * delta.x + delta.y * delta.y + delta.z * delta.z;
  return Math.sqrt(dist);
};

const PATHADDINGFRACTION = 0.001;
const eventSource = new EventSource(`${window.location.href}simulation`);
/**
 * Setup Communication over the EventBUS and with the simulation Server over events.
 */
const startSimulation = () => {
  body.append(c);
  setScale();
  window.addEventListener("resize", () => {
    updateScaleFlag = true;
  });
  c.addEventListener(
    "wheel",
    (e) => {
      const up = e.deltaY < 0;
      zoom(up);
    },
    { passive: true }
  );
  window.addEventListener("keydown", (e) => {
    pressedKeys.add(e.key);
    if (pressedKeys.has(" ")) {
      EventBUS.fireEvent("togglePlay", { play: !Loop.isRunning() });
      pressedKeys.delete(" ");
    }
  });
  window.addEventListener("keyup", (e) => {
    pressedKeys.delete(e.key);
  });
  c.addEventListener("dblclick", (e) => {
    const rect = c.getBoundingClientRect();
    const pos = {
      x:
        (e.clientX - rect.x) / scale - cameraCenter.x * MAXDISTANCEFROMORIGIN(),
      y:
        (e.clientY - rect.y) / scale - cameraCenter.y * MAXDISTANCEFROMORIGIN(),
    };
    const { index, distance } = findNearestBody(pos);
    EventBUS.fireEvent("dbclickedBody", { body_index: index, distance });
  });
  eventSource.addEventListener("removed", (e) => {
    const d = JSON.parse(e.data);
    console.log(d);
    EventBUS.fireEvent("removeBody", { body_index: d.index });
  });
  eventSource.addEventListener("simulation", (e) => {
    const d = JSON.parse(e.data);
    EventBUS.fireEvent("metadata", d.metadata);
    const oldPos = [...bodies];
    bodies = d.simstate;
    bodies.forEach((b, i) => {
      if (finishedPaths.includes(i)) return;
      if (!(i in paths)) paths[i] = [];
      const pos = { x: b.x, y: b.y, z: b.z };
      if (
        i < oldPos.length &&
        distance3D({ x: oldPos[i].x, y: oldPos[i].y, z: oldPos[i].z }, pos) >
          0.3 * AU
      )
        return;
      if (paths[i].length === 0) {
        paths[i].push(pos);
        return;
      }
      let r = distance3D(pos, { x: 0, y: 0, z: 0 });
      if (
        distance3D(pos, paths[i].at(-1) as Position3D) <
        PATHADDINGFRACTION * r
      )
        return;
      if (distance3D(pos, paths[i][0]) < PATHADDINGFRACTION * r) {
        finishedPaths.push(i);
        return;
      }
      paths[i].push(pos);
    });
  });
  Loop.registerOnUpdate(
    { index: 0 },
    updateScale,
    keyboardHandler,
    () => context.clearRect(0, 0, c.width, c.height),
    drawPaths,
    drawBodies
  );
  EventBUS.registerEventListener({ eventType: "dbclickedBody" }, (event) => {
    if (event.distance < DBCLICKDISTANCE) {
      followedBody = event.body_index;
      maxDistanceFactor = MINMAXDISTANCEFACTOR;
      updateScaleFlag = true;
    } else followedBody = null;
  });
  EventBUS.registerEventListener({ eventType: "resetCam" }, () => {
    maxDistanceFactor = INITIALMAXDISTANCEFACTOR;
    followedBody = null;
    cameraCenter = { x: 0.5, y: 0.5 };
    updateScaleFlag = true;
  });
  EventBUS.registerEventListener({ eventType: "removeBody" }, (e) => {
    paths = Object.entries(paths).reduce((newObj, [i, path]) => {
      const index = Number(i);
      if (index === e.body_index) return newObj;
      (newObj as { [key: number]: Position3D[] })[
        index >= e.body_index ? index - 1 : index
      ] = path;
      return newObj;
    }, {});
    bodyColors = bodyColors.filter((_, i) => i !== e.body_index);
    bodyNames = bodyNames.filter((_, i) => i !== e.body_index);
    moonIndices = moonIndices
      .filter((i) => i !== e.body_index)
      .map((i) => (i >= e.body_index ? i - 1 : i));
    bodies = bodies.filter((_, i) => i !== e.body_index);
  });
};

/**
 * Toggles the moon status of a body given by its index.
 * @param index The index of the body
 */
const toggleMoon = (index: number) => {
  if (moonIndices.includes(index)) {
    moonIndices = moonIndices.filter((v) => v !== index);
  } else {
    moonIndices.push(index);
  }
};

export {
  startSimulation,
  Body,
  DBCLICKDISTANCE,
  getBodyInfo,
  setBodyColor,
  setBodyName,
  toggleMoon,
};
// TODO: Entkopple Simulation und Datenverarbeitung
