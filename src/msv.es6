
import {App} from './app';
export {default as Config} from './config';

export {App};

function wrapFunction(func, handler) {
    const newFunc = handler(func);
    for(const i of Object.keys(func)) {
        newFunc[i] = func[i];
    }
    return newFunc;
}

function wrapDecorator(f) {
    return function(first, ...rest) {
        if(typeof first == 'function' || rest.length) {
            return f()(first, ...rest);
        } else {
            return f(first);
        }
    }
}

function getAllPropertyNames(obj) {
    const methods = {};
    while(obj) {
        for(const name of Object.getOwnPropertyNames(obj)) {
            methods[name] = 1;
        }
        obj = Object.getPrototypeOf(obj);
    }
    return Object.keys(methods);
}

function checkUses(obj) {
    const uses = obj.__uses || new Set();
    for(const moduleName of uses) {
        if(!obj.modules[moduleName]) {
            throw new Error(`Module "${moduleName}" should be passed`);
        }
    }
    for(const moduleName in obj.modules) {
        if(!uses.has(moduleName)) {
            this.logger.warn(`Passed module "${moduleName}" isn't used`);
        }
    }
}

export function runApp(options) {
    const app = new App(options);
    async function term(code) {
        try {
            if(code) {
                app.logger.log(`Signal ${code} has been caught`);
            }
            await app.stop();
        } catch (err) {
            app.logger.error(err);
        }
        process.exit();
    }
    (async () => {
        try {
            process.on('SIGINT', term.bind(null, 'SIGINT')).on('SIGTERM', term.bind(null, 'SIGTERM'));
            await app.start();
        } catch (err) {
            app.logger.error(err);
            await term();
        }
    })();
}

/**
 * @decorator
 */
export const service = wrapDecorator((options = {}) => {
    return function(target) {
        target.prototype.__initService = function({config, app, logger, modules}) {
            this.config = config;
            this.run = ::app.run;
            this.send = ::app.send;
            this.app = app;
            this.logger = logger;
            this.modules = modules;
            checkUses(this);
        };
        target.prototype.__getExportedMethods = function() {
            const exportedMethods = {
                tasks: {},
                events: {}
            };
            // find tasks & events
            for (const propName of getAllPropertyNames(this)) {
                const prop = this[propName];
                if (typeof prop != 'function' || propName[0] == '_') {
                    continue;
                }
                if (prop._task) {
                    const {concurrency = 10, timeout = 60000} = prop._task;
                    const logger = this.logger.sub({
                        tag: `Task:${propName}`
                    });
                    exportedMethods.tasks[propName] = {
                        options: {
                            concurrency,
                            timeout
                        },
                        handler: async data => {
                            try {
                                return await this[propName](data, { logger });
                            } catch (err) {
                                // log error to logger and throw error to client service
                                logger.error(err);
                                err.message = `Task "${propName}" failed: ${err.message}`;
                                throw err;
                            }
                        }
                    };
                } else if (prop._event) {
                    const {concurrency = 10, timeout = 60000} = prop._event;
                    const logger = this.logger.sub({
                        tag: `Event:${propName}`
                    });
                    exportedMethods.events[propName] = {
                        options: {
                            concurrency,
                            timeout
                        },
                        handler: async data => {
                            try {
                                await this[propName](data, { logger });
                            } catch (err) {
                                logger.error(err, [`Event: ${propName}`]);
                            }
                        }
                    };
                }
            }
            return exportedMethods;
        }
    }
});

/**
 * @decorator
 * @param {object} options
 * @param {object} options.schema
 * @param {object} options.concurrency
 */
export const task = wrapDecorator((options = {}) => {
    return function(target, key, descriptor) {
        descriptor.value._task = options;
        return {
            ...descriptor
        };
    }
});

export const event = wrapDecorator((options = {}) => {
    return function(target, key, descriptor) {
        descriptor.value._event = options;
        return {
            ...descriptor
        };
    }
});

export const module = wrapDecorator((options = {}) => {
    return function(target) {
        target.prototype.__initModule = function({config, logger, modules}) {
            this.modules = modules;
            this.config = config;
            this.logger = logger;
            checkUses(this);
        };
    }
});

export function schema(schema) {
    return (target, key, descriptor) => {
        let newFunction;
        if(schema.isJoi) {
            const Joi = require.main.require('joi');
            newFunction = f => async function(data) {
                await new Promise((resolve, reject) => {
                    Joi.validate(data, schema, {
                        allowUnknown: true
                    }, err => {
                        err ? reject(err) : resolve();
                    });
                });
                return await f.apply(this, arguments);
            };
        } else {
            const tv4 = require.main.require('tv4');
            newFunction = f => function(data) {
                const validationResult = tv4.validateResult(data, schema);
                if (!validationResult.valid) {
                    throw validationResult.error;
                }
                return f.apply(this, arguments);
            }
        }
        return {
            ...descriptor,
            value: wrapFunction(descriptor.value, newFunction)
        }
    };
}

export function uses(...modules) {
    return (target) => {
        target.prototype.__uses = target.prototype.__uses || new Set();
        modules.forEach(module => target.prototype.__uses.add(module));
    };
}

export function sends(...events) {
    return function(target, key, descriptor) {
        target.prototype.__sends = target.prototype.__sends || new Set();
        events.forEach(event => target.prototype.__sends.add(event));
    }
}

export function runs(...tasks) {
    return function(target, key, descriptor) {
        target.prototype.__runs = target.prototype.__runs || new Set();
        tasks.forEach(task => target.prototype.__runs.add(task));
    }
}