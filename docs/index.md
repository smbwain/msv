
Main principles are:

- Abstraction.
  Services should not care about transport level. They just expose resources and use them. Depending on application configuration it's possible to use kafka, rabbitmq, socket-io, your own transport...
- Simplicity.
  There are two concepts to do inter-service communication: tasks and events
    - Events - implementation of pub-sub pattern. Event consists of name and payload.
      Service could subscribe events by their names.
      Service could emit events.
      Each emitted event will be brought to each subscribed service.
    - Tasks - some kind of RPC.
      Task consists of name and data payload. Task could be resolved with some result, or rejected with some error.
      Service could expose task handler.
      Service could run any task by its name. It may wait until task is completed, or not. If service waits, it will receive result.
- Scalability.
  You could run as many instances of each service, as you want.
  It's also possible to run few services in single node process as well as separate them into different applications.