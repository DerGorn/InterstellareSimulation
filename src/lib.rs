extern crate nalgebra as na;
use std::fmt::Display;
use std::{f64::consts::PI, fmt::Debug};

use na::Rotation3;
use na::Vector3;

pub type Res<T> = Result<T, Box<dyn std::error::Error>>;

const AU: f64 = 149597870700.0;
const EXTREME_ACC: f64 = 1e6;

#[derive(Debug)]
///Categorises the Inputs from the client
pub enum InputEvent {
    Add,
    Remove(usize),
    Update(usize),
    Meta,
}

#[derive(Clone)]
pub struct Body {
    mass: f64,
    density: f64,
    radius: f64,
    pos: Vector3<f64>,
    vel: Vector3<f64>,
    acc: Vector3<f64>,
}

impl Debug for Body {
    ///Basically str(Body)
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{{\"mass\": {}, \"density\": {}, \"radius\": {}, \"x\": {}, \"y\": {}, \"z\": {}, \"vx\": {}, \"vy\": {}, \"vz\": {}}}", self.mass, self.density, self.radius, self.pos.x, self.pos.y, self.pos.z, self.vel.x, self.vel.y, self.vel.z)
    }
}

impl Body {
    pub fn new(mass: f64, density: f64) -> Body {
        Body {
            mass,
            density,
            radius: Body::radius(mass, density),
            pos: Vector3::zeros(),
            vel: Vector3::zeros(),
            acc: Vector3::zeros(),
        }
    }

    pub fn sun() -> Body {
        Body::new(1.98847e30, 1410.0)
    }

    pub fn earth() -> Body {
        Body::new(5.9722e24, 5515.0)
            .set_position(
                // Rotation3::from_axis_angle(&Vector3::y_axis(), PI / 2.0)
                //     * Vector3::from_vec(vec![1.017 * AU, 0.0, 0.0]),
                Vector3::from_vec(vec![1.017 * AU, 0.0, 0.0]),
            )
            .set_velocity(Vector3::from_vec(vec![0.0, 29780.0, 0.0]))
    }

    pub fn mercury() -> Body {
        Body::new(3.285e23, 5430.0)
            .set_position(Vector3::from_vec(vec![0.4667 * AU, 0.0, 0.0]))
            .set_velocity(Vector3::from_vec(vec![0.0, 47360.0, 0.0]))
    }

    pub fn venus() -> Body {
        Body::new(4.875e24, 5243.0)
            .set_position(Vector3::from_vec(vec![0.728 * AU, 0.0, 0.0]))
            .set_velocity(Vector3::from_vec(vec![0.0, 35020.0, 0.0]))
    }

    pub fn moon() -> Body {
        Body::new(7.34767309e22, 3344.0)
            .set_position(Vector3::from_vec(vec![1.017 * AU, 0.00271862 * AU, 0.0]))
            .set_velocity(Vector3::from_vec(vec![1022.0, 29780.0, 0.0]))
    }

    pub fn mars() -> Body {
        Body::new(6.417e23, 3933.0)
            .set_position(Vector3::from_vec(vec![1.666 * AU, 0.0, 0.0]))
            .set_velocity(Vector3::from_vec(vec![0.0, 24070.0, 0.0]))
    }

    pub fn jupiter() -> Body {
        Body::new(1.899e27, 1326.0)
            .set_position(Vector3::from_vec(vec![5.459 * AU, 0.0, 0.0]))
            .set_velocity(Vector3::from_vec(vec![0.0, 13060.0, 0.0]))
    }

    pub fn saturn() -> Body {
        Body::new(5.683e26, 687.0)
            .set_position(Vector3::from_vec(vec![10.124 * AU, 0.0, 0.0]))
            .set_velocity(Vector3::from_vec(vec![0.0, 9680.0, 0.0]))
    }

    pub fn uranus() -> Body {
        Body::new(8.681e25, 1271.0)
            .set_position(Vector3::from_vec(vec![20.078 * AU, 0.0, 0.0]))
            .set_velocity(Vector3::from_vec(vec![0.0, 6810.0, 0.0]))
    }

    pub fn neptun() -> Body {
        Body::new(1024e26, 1638.0)
            .set_position(Vector3::from_vec(vec![30.385 * AU, 0.0, 0.0]))
            .set_velocity(Vector3::from_vec(vec![0.0, 5430.0, 0.0]))
    }

    pub fn from_string(body_str: &str) -> Res<Body> {
        let mut body = Body::new(0.0, 0.0);
        for kv in body_str
            .trim()
            .strip_prefix("{")
            .unwrap()
            .strip_suffix("}")
            .unwrap()
            .split(",")
        {
            let (k, v) = kv.split_once(":").unwrap();
            match k.strip_prefix("\"").unwrap().strip_suffix("\"").unwrap() {
                "mass" => body.mass = v.parse()?,
                "density" => body.density = v.parse()?,
                "radius" => body.radius = v.parse()?,
                "x" => body.pos.x = v.parse()?,
                "y" => body.pos.y = v.parse()?,
                "z" => body.pos.z = v.parse()?,
                "vx" => body.vel.x = v.parse()?,
                "vy" => body.vel.y = v.parse()?,
                "vz" => body.vel.z = v.parse()?,
                _ => {
                    return Err(format!(
                        "Invalid string. The parameter '{}' does not exist on type 'Body'.",
                        k
                    )
                    .into())
                }
            }
            body.radius = Body::radius(body.mass, body.density);
        }
        Ok(body)
    }

    pub fn radius(mass: f64, density: f64) -> f64 {
        (0.75 * mass / (PI * density)).cbrt()
    }

    pub fn mass(density: f64, radius: f64) -> f64 {
        1.25 * PI * radius.powi(3) * density
    }

    pub fn density(mass: f64, radius: f64) -> f64 {
        mass / (0.75 * PI * radius.powi(3))
    }

    pub fn set_position(mut self, pos: Vector3<f64>) -> Body {
        self.pos = pos;
        self
    }

    pub fn set_velocity(mut self, vel: Vector3<f64>) -> Body {
        self.vel = vel;
        self
    }

    pub fn set_accuracy(mut self, acc: Vector3<f64>) -> Body {
        self.acc = acc;
        self
    }

    ///Move the body according to its speed
    fn movement(&mut self, time_delta: f64) {
        self.pos += self.vel * time_delta
    }

    ///Changes the speed of the body according to its acceleration. Resets the acceleration to 0
    fn accelerate(&mut self, time_delta: f64) -> Res<()> {
        if self.acc.norm() > EXTREME_ACC {
            return Err("Extreme acceleration".into());
        }
        self.vel += self.acc * time_delta;
        self.acc = Vector3::zeros();
        Ok(())
    }

    // /Performs one time step consisting of acceleration and movement
    // pub fn movement_step(&mut self, time_delta: f64) {
    //     self.accelerate(time_delta);
    //     self.movement(time_delta);
    // }
}

#[derive(Clone)]
pub struct SimMetaData {
    interaction_constant: f64,
    time_scaling: f64,
}

impl Display for SimMetaData {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "{{\"interaction_constant\": {}, \"time_scaling\": {}}}",
            self.interaction_constant, self.time_scaling
        )
    }
}

impl SimMetaData {
    pub fn from_string(meta_str: &str) -> Res<SimMetaData> {
        let mut meta = SimMetaData {
            interaction_constant: 0.0,
            time_scaling: 0.0,
        };
        for kv in meta_str
            .trim()
            .strip_prefix("{")
            .unwrap()
            .strip_suffix("}")
            .unwrap()
            .split(",")
        {
            let (k, v) = kv.split_once(":").unwrap();
            match k.strip_prefix("\"").unwrap().strip_suffix("\"").unwrap() {
                "interaction_constant" => meta.interaction_constant = v.parse()?,
                "time_scaling" => meta.time_scaling = v.parse()?,
                _ => {
                    return Err(format!(
                        "Invalid string. The parameter '{}' does not exist on type 'SimMetaData'.",
                        k
                    )
                    .into())
                }
            }
        }
        Ok(meta)
    }
}

///The Main simulation
pub struct SimState {
    pub bodies: Vec<Body>,
    pub metadata: SimMetaData,
    pub target_time_per_step_s: f64,
}

impl SimState {
    ///The standard simulation consist of the sun, luna and 8 planets of the solar system
    pub fn new(target_time_per_step_s: f64, time_scaling: f64) -> SimState {
        SimState {
            bodies: vec![
                Body::sun(),
                Body::mercury(),
                Body::venus(),
                Body::earth(),
                Body::moon(),
                Body::mars(),
                Body::jupiter(),
                Body::saturn(),
                Body::uranus(),
                Body::neptun(),
            ],
            metadata: SimMetaData {
                interaction_constant: 6.67430e-11,
                time_scaling,
            },
            target_time_per_step_s,
        }
    }

    ///Calculate the Force accting between a pair of bodies at position `i` and `k` and the resulting acceleration
    fn interact(&mut self, i: usize, k: usize) {
        let m1 = self.bodies[i].mass;
        let m2 = self.bodies[k].mass;
        let r = self.bodies[k].pos - self.bodies[i].pos;
        let a = self.metadata.interaction_constant * r / r.norm().powi(3);
        self.bodies[i].acc += a * m2;
        self.bodies[k].acc += -a * m1;
    }

    ///Performs a time step by calculating the acceleration on each body and then moving them.
    pub fn time_step(
        &mut self,
        time_delta: f64,
        remove_sender: crossbeam_channel::Sender<usize>,
    ) -> Vec<usize> {
        for i in 0..self.bodies.len() {
            for k in i + 1..self.bodies.len() {
                self.interact(i, k);
            }
        }
        let mut removes: Vec<usize> = vec![];
        for i in 0..self.bodies.len() {
            let body = &mut self.bodies[i];
            match body.accelerate(time_delta * self.metadata.time_scaling) {
                Err(_) => removes.push(i),
                _ => body.movement(time_delta * self.metadata.time_scaling),
            }
        }
        removes.reverse();
        for r in &removes {
            self.handle_input(InputEvent::Remove(*r), None, remove_sender.clone())
        }
        return removes;
    }

    pub fn handle_input(
        &mut self,
        event_type: InputEvent,
        new_body: Option<Body>,
        remove_sender: crossbeam_channel::Sender<usize>,
    ) {
        match event_type {
            InputEvent::Add => self
                .bodies
                .push(new_body.expect("No Body was provided with 'InputEvent::Add'.")),
            InputEvent::Remove(target) => {
                self.bodies.remove(target);
                remove_sender.send(target).unwrap();
            }
            InputEvent::Update(target) => {
                let update = new_body.expect("No Body was provided with 'InputEvent::Update'.");
                self.bodies[target] = update;
            }
            InputEvent::Meta => {}
        }
    }

    pub fn handle_meta_input(&mut self, meta_state: SimMetaData) {
        self.metadata = meta_state
    }
}
