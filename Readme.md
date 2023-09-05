# Interstellare Simulation
## Introduction
This program is a simulation of a many body system with newtonian gravitation. The simulation happens in a native executable written in rust. Its standard configuration is the solar system. Each body is assumed to be a point mass. Nevertheless they are assigned a homogenous density and therefore a radius. This is only used for rendering.  
The simulation data will be displayed in a web GUI. The GUI is also capable of modifiing the simulation during runtime. Possible modifications include adding new bodies, removing or modifiing existing bodies and changing the gravitational constant.  
On start up the simulation spawns a seperate thread with a server for serving the GUI and communication between the two. A browser tab with the GUI will automaticaly be opened.

## Setup
The GUI is written in TypeScript and comes pretranspiled into JavaScript. If one wants to change the GUI they should modify the TypeScript files and transpile again. TypeScript needs a Node.js environment and can be installed via npm. It can also be installed globally, this means that the `tsc` command can be used anywhere in the terminal https://www.typescriptlang.org/download.  
For development the watch mode `tsc -w` is pretty helpfull. In watch mode TypeScript watches the files specified in the './tsconfig.json' and transpiles automatically.

Used TypeScript version: 4.7.4. Higher versions should still be compatible but are not guranteed to work properly

The main programm is written in rust and needs to be compiled. For compilation the rust compiler `rustc` is necessary and the external crates must be managed, best done with `cargo`. The easiest way of installing both is via `rustup`, which sets up the whole tool chain for information on its installation see:  
https://doc.rust-lang.org/book/ch01-01-installation.html  
https://www.rust-lang.org/tools/install  
For a quick compilation during development use `cargo run`. The command builds an unoptimised version and executes it. For an optimised build use `cargo run -r` for autostart or `cargo build -r` and run the executable in './target/release' yourself.

Used versions:
    - rustup: 1.25.1        // version controll tool  
    - cargo: 1.66.1         // build system and package manager  
    - rustc: 1.66.1         // rust compiler  
Higher versions should still be compatible but are not guranteed to work properly  


## Presentation
This repository also includes a presentation about the program in the './Final' directory. The presentation is included as an HTML file and as a PDF file. While the PDF is more convenient, the HTML version has some extra features. Notably the posibility to include the GUI at the end.  
To include the GUI run the program exutable with the `-p` flag. It will overwrite the `URLPLACEHOLDER` in the 'present.html' to be the url of the GUI and open the presentation in a browser tab.