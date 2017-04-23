import 'source-map-support/register';

import assert from 'assert';

import {service, task, schema, App, Config} from '../..';
import Joi from 'joi';

// -

function wait(interval = 1000) {
    return new Promise(resolve => {
        setTimeout(resolve, interval);
    })
}

@service
class TestService {
    @task
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
        return 45;
    }
}

describe('call-task', () => {

    let app;

    it('should start', async function () {

        app = new App({
            config: Config.fromObject({
                app: {
                    bridge: {
                        type: 'local'
                    }
                }
            }),
            services: {
                test: {
                    Class: TestService
                }
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