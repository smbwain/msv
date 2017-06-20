# 3.1. API Structure

# 3.2. Services

## 3.2.1. @service

Decorator for services classes

```
import {service} from 'msv';

@service
export class MyService {
    // ...
}
```

## 3.2.2. @event

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

## 3.2.3. @task

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

## 3.2.4. @schema

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

# 3.3. Module

## 3.2.1. @module

Decorator for module class

```
import {module} from 'msv';

@module
export class MyModule {
    // ...
}
```

# 3.4. App

## 3.4.1. Creating

### app.constructor

### runApp

```
runApp(options)
```

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

### shadowApp

## 3.4.2. app.start
## 3.4.2. app.stop
## 3.4.2. app.service

# 3.5. Config

## 3.5.1. Creating

### 3.5.1.1. config.constructor

### 3.5.1.2. Config.fromObject

### 3.5.1.3. Config.basic

## 3.5.2. config.get

```
config.get(name, [defaultValue])
```

Get config variable by its name.
If there isn't config with given name, defaultValue is used. error is thrown, if there isn't config with such name and defaultValue is absent.

```
config.get('paypal.apiKey')
```

## 3.5.3. config.has

Check if there is config with given name.

```
config.has(name)
```

## 3.5.4. config.sub

Create new Config instance which is subset of current config.

```
config.sub(prefix)
```

E.g.

```yml
# config.yml
appName: test
cache:
  ttl: 3600
  server: 127.0.0.1:11211
```

```
const config = Config.fromFileSync('config.yml');

// config has 3 vars:
//   APPNAME        test
//   CACHE.TTL      3600
//   CACHE.SERVER   127.0.0.1:11211

config.get('cache.ttl') // 3600

const config2 = config.sub('cache');

// config2 has 2 vars:
//   TTL            3600
//   SERVER         127.0.0.1:11211
  
config2.get('ttl') // 3600
```

# 3.6. Logger
 
## 3.6. Methods
 
### 3.6.1. error(...msg)
### 3.6.2. warn(...msg)
### 3.6.3. log(...msg)
### 3.6.4. debug(...msg) {
### 3.6.5. sub({tag: newTag = [], level: newLevel})
