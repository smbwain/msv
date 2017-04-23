
import {QueueFrame, SimpleConsumer} from './queues';
import defer from 'defer-promise';

export default class LocalBridge {
    constructor() {
        this._tasks = {};
        this._events = {};
        this._started = false;
    }

    init() {}
    deinit() {}

    _getTaskQueue(taskName) {
        return this._tasks[taskName] || (this._tasks[taskName] = new QueueFrame({}));
    }

    _getEventQueue(eventName) {
        return this._events[eventName] || (this._events[eventName] = new QueueFrame({
//            deleteAfterConsumed: this._started
        }));
    }

    runTask(taskName, data) {
        const d = defer();
        this._getTaskQueue(taskName).push({
            payload: JSON.stringify(data),
            defer: d
        });
        return d.promise;
    }

    async sendMessage(eventName, data) {
        // this._ensureTaskQueue(eventName).push(JSON.stringify(data));
    }

    /*afterStarted() {
        this._started = true;
        for(const eventName in this._events) {
            this._events[eventName].deleteAfterConsumed(true);
        }
    }*/

    startListening(id, methods) {
        const {tasks = {}, events = {}} = methods;
        for(const eventName in events) {
            this._getEventQueue(eventName).addConsumer(id, SimpleConsumer, events[eventName].handler);
        }
        for(const taskName in tasks) {
            const handler = tasks[taskName].handler;
            this._getTaskQueue(taskName).addConsumer(id, SimpleConsumer, ({payload, defer}) => {
                return handler(JSON.parse(payload)).then(defer.resolve, defer.reject);
            });
        }
    }

    stopListening(id) {
        for(const taskName in this._tasks) {
            this._tasks[taskName].removeConsumer(id);
        }
        for(const eventName in this._events) {
            this._events[eventName].removeConsumer(id);
        }
    }
}