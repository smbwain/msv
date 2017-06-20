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