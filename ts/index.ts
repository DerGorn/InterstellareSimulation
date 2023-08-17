import { startCommunication } from "./Communication.js";
import { Loop } from "./Loop.js";
import { startMenus } from "./MenuGrafics.js";
import { startSimulation } from "./SimulationGrafics.js";

//Start the simulation display. The order of operation is important. 'startMenus' registers an event listener on the
//'Rescale' event fired in 'startSimulation' to size itself properly. It also registers an event listener in the
//'togglePlay' event fired in 'Loop.start' to initialize the state correctly.
startMenus();
startSimulation();
startCommunication();
Loop.start();
