
import {RunMethod, SendMethod, ServiceExportedMethods, ServiceOptions} from "../types";
import {LoggerInterface} from 'msv-logger';
import {ConfigInterface} from "msv-config";

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

export abstract class Service {
    protected config : ConfigInterface;
    protected run : RunMethod;
    protected send : SendMethod;
    protected logger : LoggerInterface;
    protected shadowMode : boolean;
    protected modules : {
        [name: string]: any
    };

    constructor({config, run, send, logger, shadowMode, modules}: ServiceOptions) {
        this.modules = modules;
        this.config = config;
        this.run = run;
        this.send = send;
        this.logger = logger;
        this.shadowMode = shadowMode;
    }

    async init() : Promise<void> {};
    async deinit() : Promise<void> {};

    protected enabled : boolean = false;
    enable() : void {
        this.enabled = true;
    };
    disable() : void {
        this.enabled = false;
    };

    __getExportedMethods() : ServiceExportedMethods {
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

            const taskMatch = propName.match('/^(.+)Task$/');
            if (taskMatch) {
                const taskName = taskMatch[1];
                // const {concurrency = 10, timeout = 60000} = this[`${propName}Options`]._task;
                const logger = this.logger.sub({
                    tag: `Task:${taskName}`
                });
                exportedMethods.tasks[taskName] = {
                    options: {
                        // concurrency,
                        // timeout
                    },
                    handler: async data => {
                        try {
                            return await this[propName](data, { logger });
                        } catch (err) {
                            // log error to logger and throw error to client service
                            logger.error(err);
                            err.message = `Task "${taskName}" failed: ${err.message}`;
                            throw err;
                        }
                    }
                };
                continue;
            }

            const eventMatch = propName.match('/^(.+)Event$/');
            if (eventMatch) {
                const eventName = eventMatch[1];
                // const {concurrency = 10, timeout = 60000} = prop._event;
                const logger = this.logger.sub({
                    tag: `Event:${eventName}`
                });
                exportedMethods.events[eventName] = {
                    options: {
                        // concurrency,
                        // timeout
                    },
                    handler: async data => {
                        try {
                            await this[propName](data, { logger });
                        } catch (err) {
                            logger.error(err, [`Event: ${eventName}`]);
                        }
                    }
                };
            }
        }
        return exportedMethods;
    }
}