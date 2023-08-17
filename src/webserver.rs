use get_if_addrs::{IfAddr, Interface};
use std::{
    collections::HashMap,
    fs,
    io::{prelude::*, BufReader},
    net::{TcpListener, TcpStream},
};
mod threadpool;
use interstellare_simulation::{Body, Res, SimMetaData};
use regex::Regex;
use threadpool::ThreadPool;

const DEBUG: bool = true;
const PORT: u16 = 8008;

/// Finds the first available IPv4 Interface on the host.
///
/// # Error
///
/// Fails if no Ipv4 Interface can be found.
fn find_interface() -> Res<Interface> {
    let iface = match get_if_addrs::get_if_addrs()?
        .into_iter()
        .filter(|i| match i.addr {
            IfAddr::V4(_) => true,
            _ => false,
        })
        .next()
    {
        Some(i) => i,
        None => {
            return Err("No network interface found. Cannot launch the server.".into());
        }
    };
    Ok(iface)
}

/// Spawns a new server listening to the Tcp stream of the first available IPv4Interface.
///
/// Automatically opens a Browser window with the servers address.
pub fn spawn(
    input_sender: crossbeam_channel::Sender<String>,
    simulation_receiver: crossbeam_channel::Receiver<(Vec<Body>, SimMetaData)>,
    remove_receiver: crossbeam_channel::Receiver<usize>,
    mut presentation_mode: bool,
) -> Res<()> {
    let ip = find_interface()?.ip();
    let mut url = format!("{}:{}", ip, &PORT);
    //start listening to the Tcp Stream on url
    let listener = TcpListener::bind(&url)?;
    url = format!("http://{}", &url);
    if presentation_mode {
        match fs::read("Final/present.html") {
            Ok(s) => {
                let s = String::from_utf8(s)?;
                let re = Regex::new("<iframe src=\"[^\"]*\" t").unwrap();
                let result = re.replace_all(s.as_str(), format!("<iframe src=\"{}\" t", &url));
                fs::write("Final/present.html", result.as_bytes())?;
            }
            Err(_) => {
                println!("No presentation found. Continuing normally.");
                presentation_mode = false;
            }
        }
    };
    //opens the url in the browser
    webbrowser::open(if presentation_mode {
        "Final/present.html"
    } else {
        &url
    })?;
    println!("Running server on: {}", &url);

    //initiate Threadpool to handle multiple Request to the server
    let pool = ThreadPool::new(24)?;

    for stream in listener.incoming() {
        let stream = stream?;

        let sr = simulation_receiver.clone();
        let rr = remove_receiver.clone();
        let is = input_sender.clone();
        pool.execute(|| {
            match handle_connection(stream, sr, rr, is) {
                _ => {}
            };
        })?;
    }

    Ok(())
}

/// Sends the simulation data
///
/// Keeps the incoming `stream` open as a event stream, allowing
/// Javasript to declare it as an Eventsource.
fn send_simulation(
    mut stream: TcpStream,
    simulation_receiver: crossbeam_channel::Receiver<(Vec<Body>, SimMetaData)>,
    remove_receiver: crossbeam_channel::Receiver<usize>,
    httpversion: &str,
) -> Res<()> {
    let response = format!(
        "{httpversion}\r\nContent-Type: text/event-stream\r\nCache-Control: no-cache\r\n\r\n"
    );
    stream.write_all(response.as_bytes())?;
    stream.flush()?;
    let mut id = 0;
    loop {
        match remove_receiver.try_recv() {
            Ok(removed_index) => {
                id += 1;
                let event = format!(
                    "id: {id}\r\nevent: removed\r\ndata: {{\"index\":{:?}}}\r\n\r\n",
                    removed_index
                );
                stream.write_all(event.as_bytes())?;
                stream.flush()?;
            }
            Err(e) => {
                if e == crossbeam_channel::TryRecvError::Disconnected {
                    return Err("Remove stream disconected. Ending simulation".into());
                }
            }
        }
        match simulation_receiver.try_recv() {
            Ok(simulation_state) => {
                id += 1;
                let event = format!(
                    "id: {id}\r\nevent: simulation\r\ndata: {{\"simstate\": {:?}, \"metadata\": {}}}\r\n\r\n",
                    simulation_state.0, simulation_state.1
                );
                stream.write_all(event.as_bytes())?;
                stream.flush()?;
            }
            Err(e) => {
                if e == crossbeam_channel::TryRecvError::Disconnected {
                    return Err("Simulation stream disconected. Ending simulation".into());
                }
            }
        }
    }
}

/// Reads the request from `stream` and sends the corresponding response.
fn handle_connection(
    mut stream: TcpStream,
    simulation_receiver: crossbeam_channel::Receiver<(Vec<Body>, SimMetaData)>,
    remove_receiver: crossbeam_channel::Receiver<usize>,
    input_sender: crossbeam_channel::Sender<String>,
) -> Res<()> {
    let mut buf_reader = BufReader::new(&mut stream);
    //Read the HTTP-Request
    let mut request_line = String::from("");
    buf_reader.read_line(&mut request_line)?;
    let splits: Vec<&str> = request_line.split_ascii_whitespace().collect();
    let request_type = splits[0];
    let request_location = splits[1];
    let httpversion = splits[2];

    //Read the request header
    let mut header: HashMap<String, String> = HashMap::new();
    loop {
        let mut line = String::from("");
        buf_reader.read_line(&mut line)?;
        if line.len() == 2 {
            break;
        }
        let (key, value) = line.split_once(": ").unwrap();
        header.insert(
            key.split("\r\n").next().unwrap().to_owned(),
            value.split("\r\n").next().unwrap().to_owned(),
        );
    }

    println!("Request: {}", &request_line);
    if DEBUG {
        println!(
            "Header:\n -----------------------------\n{:?}\n----------------------------",
            header
        );
    }

    let mut response: Vec<u8>;
    match request_type {
        "GET" => {
            let filename = match request_location {
                //Requests to the "/simulation" endpoint, open the SSE connection
                "/simulation" => {
                    send_simulation(stream, simulation_receiver, remove_receiver, httpversion)?;
                    return Ok(());
                }
                //Other GET-Request get the data of the endpoints file
                "/" => "index.html",
                _ => request_location.trim_start_matches('/'),
            };
            let status_line;
            let mut contents = match fs::read(filename) {
                Ok(s) => {
                    status_line = "200 OK";
                    s
                }
                Err(_) => {
                    status_line = "404 NOT FOUND";
                    fs::read("404.html")?
                }
            };
            let length = contents.len();
            // the extra string is used to add extra information to the response header. In this case it is
            // the MIME type of JavaScript files. The MIME type is necessary to use JavaScript Modules.
            let mut extra = "";
            if filename.ends_with(".js") {
                extra = "\r\ncontent-type: application/javascript; charset=UTF-8";
            }
            response =
                format!("{httpversion} {status_line}{extra}\r\nContent-length: {length}\r\n\r\n")
                    .as_bytes()
                    .to_vec();
            response.append(&mut contents)
        }
        "POST" => {
            //Read the body. By the nature of reading from the TcpStream directly it is important to read
            //the exact amount of bytes. If to many bytes are read, the stream blocks while waiting for more
            //bytes from the client, that will never come. If to vew bytes are read difficulties with sending
            //a response may arise.
            let mut body_buf: Vec<u8> = vec![0; header["Content-Length"].parse::<usize>()?];
            buf_reader.read_exact(&mut body_buf)?;
            let body = String::from_utf8(body_buf)?;
            if DEBUG {
                println!("Body: {:?}", body);
            }
            let status_line;
            let contents = match request_location {
                //All Inputs from the Client go into the same input. They will be told apart by the event type specified in the request
                "/input" => {
                    input_sender.send(body)?;
                    status_line = "200 OK";
                    String::from("{}")
                }
                _ => {
                    status_line = "404 NOT FOUND";
                    String::from("{}")
                }
            };
            let length = contents.len();

            response = format!(
                "{httpversion} {status_line}\r\nContent-length: {length}\r\n\r\n{contents}"
            )
            .as_bytes()
            .to_vec();
        }
        _ => {
            let contents = fs::read_to_string("404.html")?;
            let length = contents.len();

            response = format!(
                "{httpversion} 404 NOT FOUND\r\nContent-length: {length}\r\n\r\n{contents}"
            )
            .as_bytes()
            .to_vec();
        }
    };

    stream.write_all(&response)?;
    Ok(())
}
