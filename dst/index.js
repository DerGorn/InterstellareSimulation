import { startCommunication } from "./Communication.js";
import { Loop } from "./Loop.js";
import { startMenus } from "./MenuGrafics.js";
import { startSimulation } from "./SimulationGrafics.js";
startMenus();
startSimulation();
startCommunication();
Loop.start();
