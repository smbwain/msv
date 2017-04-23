
import {EventEmitter} from 'events';

class Queue extends EventEmitter {
    constructor() {
        super();
        this._offset = 0;
        this._msgs = [];
    }

    truncate(offset) {
        while(offset > this._offset) {
            this._msgs.pop();
            this._offset++;
        }
    }

    push(msg) {
        this._msgs.push(msg);
        this.emit('pushed');
    }

    get(offset) {
        return this._msgs[offset-this._offset];
    }

    get length() {
        return this._offset + this._msgs.length;
    }

    get offset() {
        return this._offset;
    }
}

export class QueueFrame extends EventEmitter {
    constructor({
        queue = new Queue(),
        deleteAfterConsumed
    }) {
        super();
        this._queue = queue;
        this._consumers = [];
        this._queue.on('pushed', () => {
            for(const consumer of this._consumers) {
                consumer.up();
            }
        });
        this._deleteAfterConsumed = deleteAfterConsumed;
    }

    cleanup() {
        if(!this._consumers.length) {
            return;
        }
        if(this._deleteAfterConsumed) {
            let minOffset = Infinity;
            for (const consumer of this._consumers) {
                if (consumer.offset < minOffset) {
                    minOffset = consumer.offset;
                }
            }
            this._queue.truncate(minOffset);
        }
    }

    set({deleteAfterConsumed}) {
        this._deleteAfterConsumed = deleteAfterConsumed;
    }

    push(task) {
        this._queue.push(task);
    }

    addConsumer(name, ConsumerClass, handler) {
        const consumer = new ConsumerClass({
            name,
            queue: this._queue,
            offset: this._queue.offset,
            handler
        });
        this._consumers.push(consumer);
        consumer.up();
    }

    removeConsumer(name) {
        this._consumers = this._consumers.filter(consumer => consumer.name != name);
    }
}

export class SimpleConsumer extends EventEmitter {
    constructor({name, offset, queue, handler}) {
        super();
        this.name = name;
        this._offset = offset;
        this._running = false;
        this._handler = handler.bind(null);
        this._queue = queue;
    }

    get offset() {
        return this._offset;
    }

    up() {
        if(this._running || this._queue.length <= this._offset) {
            return;
        }

        this._running = true;
        (async() => {
            try {
                await this._handler(this._queue.get(this._offset++));
            } catch (err) {
                console.error(err.stack);
            }
            this._running = false;
            this.up();
        })();
    }
}

/*export class MultiConsumer extends EventEmitter {
    constructor({offset, queue, concurrency = 2, handler}) {
        super();
        this._queue = queue;
        this._offset = offset;
        this._map = [];
        this._running = 0;
        this._concurrency = concurrency;
        this._handler = handler.bind(null);
    }

    up() {
        while(this._map.length && !this._map[0].running) {
            this._map.pop();
            this._offset++;
        }
        for(;;) {
            const newOffset = this._offset + this._map.length;
            if (this._running < this._concurrency && (newOffset < this._queue.length)) {
                // add one
                const obj = {
                    running: true
                };
                this._map.push(obj);
                this._running++;
                (async() => {
                    try {
                        try {
                            await this._handler(this._queue.get(newOffset));
                        } catch (err) {
                            console.error(err.stack);
                        }
                        obj.running = false;
                        this._running--;
                        this.up();
                    } catch(err) {
                        console.error(err.stack);
                    }
                })();
                continue;
            }
            break;
        }
    }
}*/