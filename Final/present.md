---
marp: true
theme: buw
math: mathjax
---

<div class="title">
<h1>Interstellare Simulation</h1>
<h2>- ein Vielkörpersystem -</h2>
<h3>Dominik Schlothane</h3>
</div>

---

<!-- footer: "<div style='width: 20px;'></div><div class='foot'><span>Dominik Schlothane  |   16.05.2023<span/></div>" -->
<!-- paginate: true -->

## Das Ziel

- Interaktive echtzeit Simulation der Planeten im Sonnensystem
- Konkret:
    - Vielkörpersimulation mit Gravitationskraft
    - GUI:
        - Simulationsdaten darstellen
        - modifizierung der Simulationsparameter

---

<h1 style="font-size: 10rem; text-align: center; position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%)">Theorie</h1>

---

## Physik

- klassische Gravitation

$\vec{F_{ij}} = G\frac{m_im_j}{(\overline{\vec{r_j} - \vec{r_i}})^3}(\vec{r_j} - \vec{r_i})$

$\vec{a_{ij}} = G\frac{(\vec{r_j} - \vec{r_i})}{(\overline{\vec{r_j} - \vec{r_i}})^3}m_j$

$\vec{a_{i}} = \sum_{j\neq i} \vec{a_{ij}}$

---

## Numerik

- gesucht: $\vec{x_i}(t)\,\,\text{mit}\,\, \vec{a_i}(t) = \frac{d^2}{d_t^2}\vec{x_i}(t)$
- DGLs 1. Ordnung: $\vec{a_i}(t) = \frac{d}{d_t}\vec{v_i}(t),\,\, \vec{v_i}(t) = \frac{d}{d_t}\vec{x_i}(t)$
- Eulerverfahren:

$t_{n+1} = t_{n} + h$

$v(t_{n+1}) = v(t_n) + h\cdot a(t_{n})$

$x(t_{n+1}) = x(t_n) + h\cdot v(t_{n})$

---

<h1 style="font-size: 10rem; text-align: center; position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%)">Umsetzung</h1>

---

## Vorkennnisse

* Python geht bei echtzeit simulationen mit Grafik schnell in die Knie
* Simulation in Bytecode:
    * Meiste Erfahrung in Rust

* Grafik:
    * Meiste Erfahrung im Web (HTML + CSS + TypeScript)

---

## Kommunikation

<img src="Architektur.png" style="position: absolute; left: 0px; top: 70px; width: 1500px" />

---

<h1 style="font-size: 10rem; text-align: center; position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%)">Simulation</h1>

---

## Simulation - Struktur

```rust
use narlgebar::Vector3;

struct Body {
    mass: f64,
    pos: Vector3<f64>,
    vel: Vector3<f64>,
    acc: Vector3<f64>
};

struct Simulation {
    bodies: Vec<Body>,
    interaction_constant: f64
    time_scale: f64
};
```

---

## Simulation - Ablauf

<img src="simulation.png" style="position: absolute; top: 75px; left: 210px; height: 400px;"/>

---

## Simulation - time_step

```rust
impl Simulation {
    fn step(&mut self, h: f64) {
        for i in 0..self.bodies.len(){
            for k in i+1..self.bodies.len(){
                self.bodies[i].interact(&self.bodies[k]);
            }
        }
        for body in self.bodies{
            body.accelerate(h);
            body.movement(h);
        }
    }
}
```

---

<h1 style="font-size: 10rem; text-align: center; position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%)">Server</h1>

---

## Server - Aufbau

<img src="server.png" style="position: absolute; top: 190px; left: 15px; height: 170px;"/>

---

## Server - Endpoints

- GET /simulation: 
öffnet Verbindung, um SSE zu senden

+ POST /input {eventtype, event}:
    - Add: erzeuge neuen Body, `event = new Body`
    - Remove: entferne einen Body, `event = {index: index}`
    - Update: modifiziere eine Body, `event = {index: Body}`
    - Meta: modifiziere MetaData, `event = {time_scale, interaction_constant}`

---

<h1 style="font-size: 10rem; text-align: center; position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%)">GUI</h1>

---

<img src="GUIExample.png" style="position: absolute; top: 10px; left: 45px; height: 800px;"/>

---

<img src="GUIOverview.png" style="position: absolute; top: 10px; left: 120px; height: 800px;"/>

---

## GUI - SimulationGrafics

<img src="SimulationMenuExample.png" style="position: absolute; bottom: 40px; right: 40px; height: 250px;"/>

- Hört auf:
    - `simulation` SSE um aktuelle Position der Bodies zu zeichnen
    - `removed` SSE um Farben/Pfade der Bodies zu löschen
- Malt die aktuelle Position der Bodies
- Malt ihre zurückgelegten Pfade
- Steuert die Kamera

---

## GUI - MenuGrafics

- Sidebarmenus mit Slidern, um Simulation anzupassen
    - MetaData
    - BodyInfo des ausgewählten Bodies

---

## GUI - Loop

```typescript
const loop = (time: number) => {
  const delta = time - lastRender;
  if (delta >= 1000 / FPSTARGET) {
    updateFunctions.forEach((f) => f(delta));
    lastRender = time;
  }
  if (!end) window.requestAnimationFrame(loop);
};

const registerOnUpdate = (...onUpdate: ((delta: number) => any)[]) => {
  updateFunctions.push(...onUpdate);
};
```

---

## GUI - EventBUS

```ts

const eventTypes = ["togglePlay", "resetCam"] as const;
type Events = (typeof eventTypes)[number];
type EventDefinitions = {
  togglePlay: { play: boolean };
  resetCam: {};
};

const fireEvent = <K extends Events>(
  eventType: K,
  event: EventDefinitions[K]
) => {
  registeredFunctions[eventType].forEach((l) => l(event));
};
```

---

<iframe src="PLATZHALTERFORURL" title="Running Simulation" style="z-index: 1000; position: absolute; left: 0px; top: 0px; height: 100%; width: 100%; border: none; "></iframe>
