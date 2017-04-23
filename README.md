msv
===

!!!Under construction

Microservices are not just about splitting big application into physically separated processes.
Microservices are more about splitting an application into logically independent parts with clear understanding what they do.

This library is being written with that idea in mind.

Main purposes are:

- Abstraction.
  Services should not care about transport level. They just expose resources and use them. Depending on application configuration it's possible to use kafka, rabbitmq, restFul, socket-io, your own transport...
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
  It's possible to run few services in single node process as well as separate them into different applications. Or run many instances of the same service.

Getting started
===============

./index.es6
```es6
import {runApp} from 'msv';

import {ApiGateway} from './services/api-gateway';
import {Emailer} from './services/emailer';

runApp({
    services: {
        apiGateway: ApiGateway,
        emailer: Emailer
    }
});
```

./services/api-gateway.es6
```es6
import {service} from 'msv';
import express from 'express';
import asyncMW from 'async-mw';

@service
export class ApiGateway {

    async init() {
        // ...init express application
        const app = express();
        app.get('/send-email', asyncMW(async (req, res) => {
            const success = await this.run('sendMail', {/* ...data */});
            return {
                success
            };
        }));
    }
    
}
```

./services/emailer.es6
```es6
import {service, task} from 'msv';

@service
export class Emailer {

    @task
    async sendMail() {
        // ...send mail
        return true;
    }
    
}
```