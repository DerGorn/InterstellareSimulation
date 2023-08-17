mod webserver;
use interstellare_simulation::{Body, InputEvent, Res, SimMetaData, SimState};
use std::env;

fn main() -> Res<()> {
    let args: Vec<String> = env::args().collect();
    let presentation_mode = args.len() > 1 && args[1] == "-p";
    println!("{:?}", args);
    //crossbeam_channel are used to communicate between the simulation thread and the server thread.
    let (input_sender, input_receiver) = crossbeam_channel::unbounded::<String>();
    let (simulation_sender, simulation_receiver) =
        crossbeam_channel::unbounded::<(Vec<Body>, SimMetaData)>();

    let (remove_sender, remove_receiver) = crossbeam_channel::unbounded::<usize>();

    std::thread::spawn(move || {
        webserver::spawn(
            input_sender,
            simulation_receiver,
            remove_receiver,
            presentation_mode,
        )
        .unwrap();
    });

    simulation(input_receiver, simulation_sender, remove_sender)
}

///Takes the `input` from the Client and updates `sim` accordingly.
///
/// # Panic
/// Panics when the input is in an invalid form.
fn handle_input(
    sim: &mut SimState,
    input: String,
    remove_sender: crossbeam_channel::Sender<usize>,
) -> Res<()> {
    let trimed = input
        .trim()
        .strip_prefix("{")
        .unwrap()
        .strip_suffix("}")
        .unwrap()
        .trim();
    let (target, trimed) = trimed.split_once(",").unwrap();
    let mut trimed = trimed.to_string();
    let event_type = match target
        .split_once(":")
        .unwrap()
        .1
        .strip_prefix("\"")
        .unwrap()
        .strip_suffix("\"")
        .unwrap()
    {
        "Add" => {
            trimed = trimed.strip_prefix("\"body\":").unwrap().to_string();
            InputEvent::Add
        }
        x if x == "Remove" || x == "Update" => {
            trimed = trimed
                .strip_prefix("\"body\":{\"")
                .unwrap()
                .strip_suffix("}")
                .unwrap()
                .to_string();
            let after_index = trimed.find(":").unwrap();
            let target = trimed
                .drain(..after_index + 1)
                .collect::<String>()
                .strip_suffix("\":")
                .unwrap()
                .parse::<usize>()?;
            match x {
                "Remove" => InputEvent::Remove(target),
                "Update" => InputEvent::Update(target),
                _ => return Err("Unreachable. Something went wrong.".into()),
            }
        }
        "Meta" => InputEvent::Meta,
        x => {
            return Err(format!(
                "Invalid 'event_type'. Expected 'Add', 'Remove', 'Meta' or 'Update', but found {x}."
            )
            .into());
        }
    };
    let new_body = match event_type {
        InputEvent::Remove(_) => None,
        InputEvent::Meta => None,
        _ => Some(Body::from_string(&trimed)?),
    };
    match event_type {
        InputEvent::Meta => {
            sim.handle_meta_input(SimMetaData::from_string(trimed.split_once(":").unwrap().1)?)
        }
        _ => sim.handle_input(event_type, new_body, remove_sender),
    }
    Ok(())
}

/// The main loop of the simulation. It reads the input from the client and sends each simulation step
///
fn simulation(
    input_receiver: crossbeam_channel::Receiver<String>,
    simulation_sender: crossbeam_channel::Sender<(Vec<Body>, SimMetaData)>,
    remove_sender: crossbeam_channel::Sender<usize>,
) -> Res<()> {
    let mut sim = SimState::new(0.01, 300000.0);
    let mut last_send = std::time::Instant::now();
    let mut last_sim = std::time::Instant::now();
    loop {
        //unblocking read of the input_receiver. So if no input is there the loop can continue
        match input_receiver.try_recv() {
            Ok(i) => handle_input(&mut sim, i, remove_sender.clone())?,
            Err(e) => {
                if e == crossbeam_channel::TryRecvError::Disconnected {
                    return Err("Input disconected. Ending simulation".into());
                }
            }
        }
        let time_delta = last_sim.elapsed().as_secs_f64();

        sim.time_step(time_delta, remove_sender.clone());

        last_sim = std::time::Instant::now();

        // If to many events are send to the client it may cause performance issues.
        // To not overwhelm the client a minimum amount of time has to pass before sending new data
        if last_send.elapsed().as_secs_f64() > sim.target_time_per_step_s {
            simulation_sender.send((sim.bodies.clone(), sim.metadata.clone()))?;
            last_send = std::time::Instant::now();
        }
    }
}
