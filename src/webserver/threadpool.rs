use interstellare_simulation::Res;
use std::{
    sync::{mpsc, Arc, Mutex},
    thread,
};

/// Collection of Workers to asyncroniously handle tasks.
///
/// # Example
///
/// To execute functions in another thread
///
/// ```rust
/// use ThreadPool;
///
/// let pool = ThreadPool::new(1);
/// pool.execute(|| println!("Running in another Thread."))
/// ```
pub struct ThreadPool {
    workers: Vec<Worker>,
    sender: Option<mpsc::Sender<Job>>,
}

type Job = Box<dyn FnOnce() + Send + 'static>;

impl ThreadPool {
    /// Create a new ThreadPool.
    ///
    /// The size is the number of threads in the pool.
    ///
    /// # Error
    ///
    /// The `new` function will fail if the `size` is zero.
    pub fn new(size: usize) -> Res<ThreadPool> {
        if size == 0 {
            return Err("Cannot create an empty ThreadPool. 'size' is set to 0.".into());
        }

        let (sender, receiver) = mpsc::channel();

        let receiver = Arc::new(Mutex::new(receiver));

        let mut workers = Vec::with_capacity(size);

        for id in 0..size {
            workers.push(Worker::new(id, Arc::clone(&receiver)))
        }

        Ok(ThreadPool {
            workers,
            sender: Some(sender),
        })
    }

    /// Execute the given function `f` asynchroniously.
    ///
    /// The execution is handled by any of the available Workers.
    ///
    /// # Example
    ///
    /// To execute functions in another thread
    ///
    /// ```rust
    /// use ThreadPool;
    ///
    /// let pool = ThreadPool::new(1);
    /// pool.execute(|| prontln!("Running in another Thread."))
    /// ```
    pub fn execute<F>(&self, f: F) -> Res<()>
    where
        F: FnOnce() + Send + 'static,
    {
        let job = Box::new(f);

        self.sender.as_ref().unwrap().send(job)?;
        Ok(())
    }
}

struct Worker {
    id: usize,
    thread: Option<thread::JoinHandle<()>>,
}

impl Worker {
    fn new(id: usize, receiver: Arc<Mutex<mpsc::Receiver<Job>>>) -> Worker {
        let thread = thread::spawn(move || loop {
            let message = receiver.lock().unwrap().recv();

            match message {
                Ok(job) => {
                    job();
                }
                Err(_) => {
                    println!("Worker {id} disconnected; shutting down.");
                    break;
                }
            }
        });

        Worker {
            id,
            thread: Some(thread),
        }
    }
}

impl Drop for ThreadPool {
    fn drop(&mut self) {
        drop(self.sender.take());

        for worker in &mut self.workers {
            println!("Shutting down worker {}", worker.id);

            if let Some(thread) = worker.thread.take() {
                thread.join().unwrap();
            }
        }
    }
}
