msv
===

!!!Under construction

Short overview
==============

App
---
```
import {runApp, Config} from 'msv';
import {MyService} from './my-service';
import {readFileSync} from 'fs'; 

runApp({
    services: [ MyService ],
    config: new Config().mergeYaml(readFileSync('./config.yml')).mergeEnv()
});
```

Config
------

Config object allows you to load configurations from files and environment variables, merge them and pass to appropriate places of applications (services, modules).
All configurations of your application should be loaded as one objects tree. The root of this tree should look like:

```yaml
common:
    ...
module:
    moduleName1:
        ...
    moduleName2:
        ...
service:
    ServiceName1:
        ...
    ServiceName2:
        ...
bridge:
    BridgeName:
        ...
```

msv merges configs from ```common.*``` and ```module.moduleName.*``` and passes them to each modules. As well as ```common.*``` and ```service.serviceName.*``` to services.

API
===

Service
-------

To create service, you should define your own class using decorator ___service___.
To define tasks and events of your service (which will be automatically subscribed as handlers), use decorators ___task___ and ___event___.

```
import {service, task, event} from 'msv';

@service
export class MyService {
    @task
    async moveSomething({from, to}) {
        // ...
    }
    
    @event
    async handleSomeEvent({someData}) {
        // ...
    }
}
```

To send events or run tasks, you should make 2 steps:

+ add decorator ___sends___/___runs___ to your service
+ use method ___send___/___run___ inside your service where you want

```
import {service, task, event, sends, runs} from 'msv';

@service
@sends('somethingMoved')
@runs('someOtherTask')
export class MyService {
    @task
    async moveSomething({from, to}) {
        // ...
        await this.send('somethingMoved', {from, to})
    }
    
    @event
    async handleSomeEvent({someData}) {
        // ...
        await this.run('someOtherTask', {someOtherData})
    }
}
```

To make some async initialization/deinitialization of your service, use methods init/deinit in your service

```
import {service, task, event} from 'msv';

@service
export class MyService {
    async init() {
        // ...
    }
    
    async deinit() {
        // ...
    }
}
```

Application
-----------

To run one or more services you should have application.
You should also have configuration and bridge.

The simplest way is to use method runApp inside your main script.

```
import {runApp, simpleConfig} from 'msv';
import {MemoryBridge} from 'msv/bridge/memory';
import {WebServerService} from './services/web-server';
import {ApiServerService} from './services/api-server';

runApp({
    config: simpleConfig(__dirname+'/config.yml'),
    bridge: MemoryBridge,
    services: {
        webServer: {
            Class: WebServerService
        },
        ApiServerService: {
            Class: ApiServerService
        }
    }
});

```

Modules
-------

Sometimes you want to share some piece of logic between services. It could be e.g. some db layer or layer for connect to some external api.
Let's call it module.

To create module, define your own class with ___module___ decorator.

```
import {module} from 'msv';

@module
export class MyModule {
    // ...
}
```

If you need initialize/deinitialize your module asynchronously, use init/deinit methods in module class.
  
```
import {module} from 'msv';

@module
export class MyModule {
    async init() {
        // ...
    }
    
    async deinit() {
        // ...
    }
    
    // ...
}
```

To use module in your service or in another module, you should do 3 steps:

+ add ___uses___ decoration to service/modules which depends on your module   
+ add module to your application
+ in the place where you add service to your application, add property ___use___ with a map of uses services

```es6
// ./modules/mongo-data-storage.js

@module
export class MongoDataStorage {
    async find(collection) {
        // ...
    }
}
```

```es6
// ./services/users.js

import {service, uses, task, event} from 'msv';

@service
@uses('dataStorage')
export class UsersService {
    @task
    async readUsersList() {
        return await this.modules.dataStorage.find('users');
    }
}
```

```es6
// ./index.js

import {runApp, simpleConfig} from 'msv';
import {MemoryBridge} from 'msv/bridge/memory';
import {MongoDataStorage} from './modules/mongo-data-storage';
import {UsersService} from './services/users';

runApp({
    config: simpleConfig(__dirname+'/config.yml'),
    bridge: MemoryBridge,
    modules: {
        mongoDataStorage: {
            Class: MongoDataStorage
        }
    },
    services: {
        usersService: {
            Class: UsersService,
            use: {
                dataStorage: 'mongoDataStorage'
            }
        }
    }
});
```

Bridge
------

Config
------
