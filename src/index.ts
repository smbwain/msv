
import {Application} from './application';
import {
    ApplicationOptions, ApplicationInterface, SyncOrAsync, BridgeOptions, BridgeFactory,
    ServiceOptions
} from "../types";
import LocalBridge from './local-bridge';

export * from 'msv-config';
export {Service} from './service';

export {Application};

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

/*function checkUses(obj) {
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
}*/

export function runApp(options: ApplicationOptions) : void {
    const app = new Application(options);
    async function term(code? : string) {
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

export async function shadowApp(options : ApplicationOptions, handler : (app: ApplicationInterface) => SyncOrAsync<void>) : Promise<void> {
    const app = new Application({
        ...options,
        shadowMode: true
    });
    try {
        await app.start();
        await handler(app);
    } catch(err) {
        app.logger.error(err);
    } finally {
        try {
            await app.stop();
        } catch(err) {
            app.logger.error(err);
        }
    }
}

/*export const service = wrapDecorator(({uses = []} = {}) => {
    return function(target) {
        const constructor = function(options: ServiceOptions) : void {
            if(!(this instanceof Service)) {
                return new constructor(options);
            }
        };
        const F = function() {};
        F.prototype = Service.prototype;
        constructor.prototype = new F();
        for(const propName of target.prototype) {
            constructor.prototype[propName] = target.prototype[propName];
        }
        return target;
    };
});*/

/**
 * @decorator
 * @param {object} options
 * @param {object} options.schema
 * @param {object} options.concurrency
 */
export const task = wrapDecorator((options = {}) => {
    return function(target, key, descriptor) {
        descriptor.value._task = options;
        return descriptor;
    };
});

export const event = wrapDecorator((options = {}) => {
    return function(target, key, descriptor) {
        descriptor.value._event = options;
        return descriptor;
    }
});

/*export const script = wrapDecorator((options = {}) => {
    return function(target, key, descriptor) {
        descriptor.value._script = options;
        return descriptor;
    }
});*/

/*export const module = wrapDecorator(({uses = []} = {}) => {
    return function(target) {
        target.prototype.__uses = new Set(uses);
        target.prototype.__initModule = function({config, logger, modules}) {
            this.modules = modules;
            this.config = config;
            this.logger = logger;
            // checkUses(this);
        };
    }
});*/

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

export function localBridge() : BridgeFactory {
    return (options : BridgeOptions) => new LocalBridge();
}