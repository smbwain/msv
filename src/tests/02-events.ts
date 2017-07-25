import 'source-map-support/register';

import * as assert from 'assert';

import {Service, event, schema, Application, config, localBridge} from '../..';
import * as Joi from 'joi';

// -

function wait(interval = 1000) {
    return new Promise(resolve => {
        setTimeout(resolve, interval);
    })
}

class TestService extends Service {
    @event
    @schema(Joi.object().required().keys({
        num: Joi.number().required()
    }))
    async test({
        num
    }, {
        logger: {
            debug
        }
    }) {
        debug(`Start: ${num}`);
        await wait();
        debug(`Stop: ${num}`);
    }
}

describe('call-event', () => {

    let app;

    it('should start', async function () {

        app = new Application({
            config: config({
                app: {
                    bridge: 'local'
                }
            }),
            bridges: {
                local: localBridge()
            },
            services: {
                test: options => new TestService(options)
            }
        });
        await app.start();

    });

    it('should run task', async function () {

        await app.send('test', {num: 13});

    });

    it('should run task 3 times', async function () {

        this.timeout(7000);

        await Promise.all([
            app.send('test', {num: 1}),
            app.send('test', {num: 2}),
            app.send('test', {num: 3})
        ]);

    });

    it('should stop', async function() {

        await app.stop();

    });

});