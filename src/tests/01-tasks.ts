import 'source-map-support/register';

import * as assert from 'assert';

import {Application, Service, task, schema, config, localBridge} from '../..';
// import * as Joi from 'joi';

// -

function wait(interval = 1000) {
    return new Promise(resolve => {
        setTimeout(resolve, interval);
    })
}

class TestService extends Service {

    /*@schema(Joi.object().required().keys({
        num: Joi.number().required()
    }))*/
    @task
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
        return 45;
    }
}


describe('call-task', () => {

    let app : Application;

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
                test: (options) => new TestService(options)
            }
        });
        await app.start();

    });

    it('should run task', async function () {

        const res = await app.run('test', {num: 13});

        assert.equal(res, 45);

    });

    it('should run task 3 times', async function () {

        this.timeout(7000);

        await Promise.all([
            app.run('test', {num: 1}),
            app.run('test', {num: 2}),
            app.run('test', {num: 3})
        ]);

    });

    it('should stop', async function() {

        await app.stop();

    });

});