
import {RunMethod, SendMethod, ServiceExportedMethods, ServiceOptions} from "../types";
import {Logger} from 'msv-logger';
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
    public config : ConfigInterface;
    public run : RunMethod;
    public send : SendMethod;
    public logger : Logger;
    public shadowMode : boolean;
    public modules : {
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

            let taskName, taskOptions;
            {
                const match = propName.match('/^(.+)Task$/');
                if(match) {
                    taskName = match[1];
                    taskOptions = this[`${propName}Options`] || {};
                } else if(this[propName]._task) {
                    taskName = propName;
                    taskOptions = this[propName]._task;
                }
            }

            if (taskName) {
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

            let eventName, eventOptions;
            {
                const match = propName.match('/^(.+)Event/');
                if(match) {
                    eventName = match[1];
                    eventOptions = this[`${propName}Options`] || {};
                } else if(this[propName]._event) {
                    eventName = propName;
                    eventOptions = this[propName]._event;
                }
            }

            if (eventName) {
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