import { body, createElement } from "./DOM.js";
import EventBUS from "./EventBUS.js";
import { Loop } from "./Loop.js";
import { MINMENUSIZE } from "./MenuGrafics.js";
const MAXDISTANCEFROMORIGIN = () => maxDistanceFactor * AU;
const MINMAXDISTANCEFACTOR = 0.1;
const MAXMAXDISTANCEFACTOR = 200;
const MAXDISTANCEFACTORGROWRATE = 0.005;
const INITIALMAXDISTANCEFACTOR = 65;
let maxDistanceFactor = INITIALMAXDISTANCEFACTOR;
const AU = 149597870e3;
const DBCLICKDISTANCE = 2e21;
let followedBody = null;
let paths = {};
let finishedPaths = [];
let bodies = [];
let updateScaleFlag = true;
let cameraCenter = { x: 0.5, y: 0.5 };
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
const c = createElement({ tag: "canvas" }, "mainSrceen");
const context = c.getContext("2d");
let scale = 1;
const setScale = () => {
    let size = Math.min(window.innerHeight, window.innerWidth);
    let menuOrientation;
    if (size === window.innerHeight) {
        menuOrientation = "width";
        if (window.innerWidth - size < 2 * MINMENUSIZE)
            size = window.innerWidth - 2 * MINMENUSIZE;
    }
    else {
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
const updateScale = () => {
    if (updateScaleFlag) {
        setScale();
        updateScaleFlag = false;
    }
};
const pointToScreenCoords = (pos) => {
    return [
        (pos.x + cameraCenter.x * MAXDISTANCEFROMORIGIN()) * scale,
        (pos.y + cameraCenter.y * MAXDISTANCEFROMORIGIN()) * scale,
    ];
};
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
const randomColor = () => {
    let color = "#";
    for (let i = 0; i < 3; i++) {
        color += Math.floor(Math.random() * 256).toString(16);
    }
    color.toUpperCase();
    return color;
};
const getBodyInfo = (body_index) => {
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
        name: bodyNames.at(body_index),
        color: bodyColors.at(body_index),
        moon: moonIndices.includes(body_index),
        simState: bodies.at(body_index),
    };
};
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
const setBodyName = (name, index = -1) => {
    if (index === -1)
        bodyNames.push(name);
    else
        bodyNames[index] = name;
};
let bodyColors = [
    "#E2F516",
    "#786D5F",
    "#3B2F2F",
    "#1F45FC",
    "#FBF6D9",
    "#7E3517",
    "#E6BF83",
    "#C9BE62",
    "#2B65EC",
    "#56A5EC",
];
const setBodyColor = (color, index = -1) => {
    if (index === -1)
        bodyColors.push(color);
    else
        bodyColors[index] = color;
};
const MOONRADIUS = 2;
const BODYRADIUSSCALE = 8;
const BODYRADIUSOFFSET = 6;
let moonIndices = [4];
const drawBodies = () => {
    const z = [...bodies];
    const zOrder = z.sort((a, b) => a.z - b.z).map((b) => bodies.indexOf(b));
    context.fillStyle = "black";
    context.strokeStyle = "black";
    context.lineWidth = 1;
    zOrder.forEach((i) => {
        const body = bodies[i];
        if (i < bodyColors.length)
            context.fillStyle = bodyColors[i];
        context.beginPath();
        context.arc(...pointToScreenCoords(body), moonIndices.includes(i)
            ? MOONRADIUS
            : Math.round(body.radius * scale * BODYRADIUSSCALE) + BODYRADIUSOFFSET, 0, 2 * Math.PI);
        context.fill();
        context.stroke();
    });
};
const drawPaths = () => {
    if (followedBody != null) {
        cameraCenter = {
            x: 0.5 - bodies[followedBody].x / MAXDISTANCEFROMORIGIN(),
            y: 0.5 - bodies[followedBody].y / MAXDISTANCEFROMORIGIN(),
        };
    }
    Object.values(paths).forEach((p, i) => {
        if (i < bodyColors.length)
            context.strokeStyle = bodyColors[i];
        context.lineWidth = 2;
        context.beginPath();
        p.forEach((point, k) => {
            if (k === 0)
                context.moveTo(...pointToScreenCoords(point));
            else
                context.lineTo(...pointToScreenCoords(point));
        });
        if (finishedPaths.includes(i))
            context.lineTo(...pointToScreenCoords(p[0]));
        context.stroke();
    });
};
const distance = (a, b) => {
    const x = b.x - a.x;
    const y = b.y - a.y;
    return x * x + y * y;
};
const distanceToBody = (pos, body) => {
    return distance(pos, { x: body.x, y: body.y });
};
const findNearestBody = (pos) => {
    const distances = bodies.map((body) => distanceToBody(pos, body));
    const min = Math.min(...distances);
    return { index: distances.indexOf(min), distance: min };
};
const zoom = (up) => {
    maxDistanceFactor +=
        MAXDISTANCEFACTORGROWRATE * maxDistanceFactor * (up ? -1 : 1);
    if (maxDistanceFactor < MINMAXDISTANCEFACTOR)
        maxDistanceFactor = MINMAXDISTANCEFACTOR;
    if (maxDistanceFactor > MAXMAXDISTANCEFACTOR)
        maxDistanceFactor = MAXMAXDISTANCEFACTOR;
    updateScaleFlag = true;
};
const distance3D = (a, b) => {
    let delta = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
    let dist = delta.x * delta.x + delta.y * delta.y + delta.z * delta.z;
    return Math.sqrt(dist);
};
const PATHADDINGFRACTION = 0.001;
const eventSource = new EventSource(`${window.location.href}simulation`);
const startSimulation = () => {
    body.append(c);
    setScale();
    window.addEventListener("resize", () => {
        updateScaleFlag = true;
    });
    c.addEventListener("wheel", (e) => {
        const up = e.deltaY < 0;
        zoom(up);
    }, { passive: true });
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
            x: (e.clientX - rect.x) / scale - cameraCenter.x * MAXDISTANCEFROMORIGIN(),
            y: (e.clientY - rect.y) / scale - cameraCenter.y * MAXDISTANCEFROMORIGIN(),
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
            if (finishedPaths.includes(i))
                return;
            if (!(i in paths))
                paths[i] = [];
            const pos = { x: b.x, y: b.y, z: b.z };
            if (i < oldPos.length &&
                distance3D({ x: oldPos[i].x, y: oldPos[i].y, z: oldPos[i].z }, pos) >
                    0.3 * AU)
                return;
            if (paths[i].length === 0) {
                paths[i].push(pos);
                return;
            }
            let r = distance3D(pos, { x: 0, y: 0, z: 0 });
            if (distance3D(pos, paths[i].at(-1)) <
                PATHADDINGFRACTION * r)
                return;
            if (distance3D(pos, paths[i][0]) < PATHADDINGFRACTION * r) {
                finishedPaths.push(i);
                return;
            }
            paths[i].push(pos);
        });
    });
    Loop.registerOnUpdate({ index: 0 }, updateScale, keyboardHandler, () => context.clearRect(0, 0, c.width, c.height), drawPaths, drawBodies);
    EventBUS.registerEventListener({ eventType: "dbclickedBody" }, (event) => {
        if (event.distance < DBCLICKDISTANCE) {
            followedBody = event.body_index;
            maxDistanceFactor = MINMAXDISTANCEFACTOR;
            updateScaleFlag = true;
        }
        else
            followedBody = null;
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
            if (index === e.body_index)
                return newObj;
            newObj[index >= e.body_index ? index - 1 : index] = path;
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
const toggleMoon = (index) => {
    if (moonIndices.includes(index)) {
        moonIndices = moonIndices.filter((v) => v !== index);
    }
    else {
        moonIndices.push(index);
    }
};
export { startSimulation, DBCLICKDISTANCE, getBodyInfo, setBodyColor, setBodyName, toggleMoon, };
