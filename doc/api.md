API
===

runApp(options)
---------------

Start application.
Passes options to App constructor. Application will be stopped on SIGINT/SIGTERM interruptions.

```
import {runApp} from 'msv';
import {MyService} from './services/my-service';

runApp({
    services: {
        MyService
    }
});
```

@service
--------

Decorator for services classes

```
import {service} from 'msv';

@service
export class MyService {
    // ...
}
```

@task
-----

Decorator to expose task from your service

```
import {service, task} from 'msv';

@service
export class MyService {
    
    @task
    async myTask(data) {
        // ...
    }
    
}
```

@event
------

Decorator to set listener to some event

```
import {service, event} from 'msv';

@service
export class MyService {
    
    @event
    async someEvent(data) {
        // ...
    }
    
}
```

@module
-------

Decorator for module class

```
import {module} from 'msv';

@module
export class MyModule {
    // ...
}
```

@schema
-------

Decorator to check function arguments

```
import {service, event, schema} from 'msv';
import Joi from 'joi';

@service
export class MyService {
    
    @event
    @schema(Joi.object().keys({
        myVariable: Joi.number().required()
    }))
    async someEvent({myVariable}) {
        // ...
    }
    
}
```

App
---

Config
------
