
import Queue from '../queue';

export class QueuedBridge {
    async open({tasks, events}) {
        for(const taskName in tasks) {
            const {handler, options: { concurrency }} = tasks[taskName];
            this._tasks = new Queue(handler, { concurrency });
        }
        for(const eventName in events) {
            const queues = [];
            for(const serviceName in events[eventName]) {
                const {handler, options: { concurrency }} = events[eventName][serviceName];
                queues.push(new Queue(handler, { concurrency }));
            }
            this._events[eventName] = queues;
        }
        this._unknownQueues = new Set();
    }

    async runTask(taskName, data) {
        const queue = this._tasks[taskName];
        if(!queue) {
            throw new Error(`No task "${eventName}" found`);
        }
        return await queue.push(JSON.parse(JSON.stringify(data)));
    }

    async sendMessage(eventName, data) {
        const queues = this._events[eventName];
        if(!queues) {
            if(!this._unknownQueues.has(eventName)) {
                this._unknownQueues.add(eventName);
                console.warn(`No handlers for event event "${eventName}"`);
            }
            return;
        }
        data = JSON.stringify(data);
        for(const queue of queues) {
            queue.push(JSON.parse(data)).catch(err => console.error(err.stack));
        }
    }
}