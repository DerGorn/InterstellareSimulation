---
marp: true
theme: buw
math: mathjax
---

<div class="title">
<h1>Praktische Informatik</h1>
<h2>- eine Vielkörpersimulation -</h2>
<h3>Dominik Schlothane</h3>
</div>

---

<!-- footer: "<div style='width: 20px;'></div><div class='foot'><span style='font-weight: bold'>Praktische Informatik - eine Vielkörpersimulation</span><span>Dominik Schlothane  |   16.05.2023<span/></div>" -->
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

## Vorkenntnisse

- Python geht bei echtzeit Simulationen mit Grafik schnell in die Knie
- Grafik: Meiste Erfahrung im Web (HTML + CSS + TypeScript)
- Simulation in Rust


---

## Kommunikation

<img src="Architektur.png" style="position: absolute; left: 0px; top: 70px; width: 1500px" />

---

<h1 style="font-size: 10rem; text-align: center; position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%)">Simulation</h1>

---

## Simulation - Struktur


<img src="SimulationAufbau.png" style="position: absolute; top: 75px; left: 85px; height: 400px;"/>

---

## Simulation - Ablauf

<img src="simulation.png" style="position: absolute; top: 75px; left: 210px; height: 400px;"/>

---

## Simulation - step


<img src="time_step.png" style="position: absolute; top: 75px; left: 130px; height: 400px;"/>

---

<h1 style="font-size: 10rem; text-align: center; position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%)">Server</h1>

---

## Server - Ablauf

<img src="server.png" style="position: absolute; top: 190px; left: 0px; height: 170px;"/>

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

## Server - handle_connection

<img src="request.png" style="position: absolute; top: 75px; left: 0px; height: 400px;"/>

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
    - `w/s/a/d` zum bewegen
    - `+/-/mouseWheel` zum zoomen

---

## GUI - Simulationsparameter modifizieren

- Slider zeigen aktuellen Wert der Simulationsparameter
$\Rightarrow$ pausiere GUI, um parameter zu ändern
- Problem: 1 Loop $\Rightarrow$ zeichnen wird auch pausiert 
$\Rightarrow$ unschöner Sprung
- 2 Lösungen:
    - Simulation pausieren
    - 2 Loops: einer zum Zeichnen, der andere für Parameter

---

## GUI - Umlaufbahnen

- Speichere Regelmäßig Position
um die Flugbahn zu zeichnen
- Problem: 
    - ewige Datenspeicherung
    - Speicher läuft voll
    - Grafik stürzt ab
<img src="AufgrundVonLeistungNichtZeichenbareSchwankungenDerBahnen.png" style="position: absolute; bottom: 40px; right: 10px; height: 440px;"/>

---

## GUI - Pfad Optimisation

- Pollingrate proportional zum Radius
$\Rightarrow$ Weniger Datenpunkte für äußere Planeten, z.B. Neptun
- Pfad schließen, wenn er sich dem Anfang nähert
$\Rightarrow$ Gesamtmenge an Datenpunkten beschränkt
- Problem: Beschleunigter Drift nach rechts
$\Rightarrow$ Pfade lassen sich nur zu Beginn der Simulation schließen

---

## A Second Sun - The Aftermath

- zweite Sonne
- beide Sonnen, Merkur,
Venus weg geschleudert
- Mars, die Erde und der 
Mond umkreisen die 
zweite Sonne
- Jupiter stürzt ins Zentrum

<img src="IntroducedAnotherSunWith6e32kgMassItDestroyedEverything.png" style="position: absolute; bottom: 40px; right: 40px; height: 440px;"/>

---

<iframe src="PLATZHALTERFORURL" title="Running Simulation" style="z-index: 1000; position: absolute; left: 0px; top: 0px; height: 100%; width: 100%; border: none; "></iframe>

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
