
import defer from 'defer-promise';
import {BridgeInterface, ServiceExportedMethods, TaskRunOptions, EventRunOptions} from "../types";

type Defer<T> = {
    promise: Promise<T>;
    resolve(res : T) : void;
    reject(err? : Error) : void;
};

export default class LocalBridge implements BridgeInterface {
    private _tasks : {
        [name: string]: {
            serviceName: string,
            handler: (taskPayLoad : any) => Promise<any>
        }
    } = {};
    private _events : {
        [name: string]: Array<{
            serviceName: string,
            handler: (eventPayLoad : any) => Promise<void>
        }>
    };
    private _tasksQueue : Array<[[string, any, TaskRunOptions], Defer<any>]> = [];
    private _eventsQueue : Array<[string, any, EventRunOptions]> = [];

    async init() : Promise<void> {}
    async deinit() : Promise<void> {}

    async run(taskName : string, taskPayLoad : any, taskRunOptions?: TaskRunOptions) : Promise<any> {
        if(!this._tasksQueue) {
            const def = defer();
            this._tasksQueue.push([[taskName, taskPayLoad, taskRunOptions], def]);
            return await def.promise;
        }

        const taskHandler = this._tasks[taskName];
        if(!taskHandler) {
            throw new Error(`No handler for task "${taskName}"`);
        }

        return await taskHandler.handler(taskPayLoad);
    }

    async send(eventName : string, eventPayLoad : any, eventRunOptions?: EventRunOptions) : Promise<void> {
        if(!this._eventsQueue) {
            this._eventsQueue.push([eventName, eventPayLoad, eventRunOptions]);
            return;
        }

        const events = this._events[eventName];
        if(!events) {
            console.warn(`No any listener on event "${eventName}"`);
            return;
        }

        for(const event of events) {
            // run it not waiting for promise
            // error handling is implemented inside
            event.handler(eventPayLoad);
        }
    }

    enable() : void {
        for(const event of this._eventsQueue) {
            this.send(event[0], event[1], event[2]); // ignore promise
        }
        for(const task of this._tasksQueue) {
            this.run(task[0][0], task[0][1], task[0][2]).then(task[1].resolve.bind(task[1]), task[1].reject.bind(task[1]));
        }
        this._eventsQueue = null;
        this._tasksQueue = null;
    }
    disable() : void {}

    async startListening(serviceName : string, exportedMethods: ServiceExportedMethods) : Promise<void> {
        for(const taskName in exportedMethods.tasks) {
            this._tasks[taskName] = {
                serviceName,
                handler: exportedMethods.tasks[taskName].handler
            };
        }
        for(const eventName in exportedMethods.events) {
            (this._events[eventName] || (this._events[eventName] = [])).push({
                serviceName,
                handler: this._events[eventName][serviceName] = exportedMethods.events[eventName].handler
            });
        }
    }

    async stopListening(serviceName : string) : Promise<void> {
        for(const taskName in this._tasks) {
            if(this._tasks[taskName].serviceName == serviceName) {
                delete this._tasks[taskName];
            }
        }
        for(const eventName in this._events) {
            this._events[eventName] = this._events[eventName].filter(event => event.serviceName != serviceName);
        }
    }
}