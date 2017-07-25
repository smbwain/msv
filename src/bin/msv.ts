#!/usr/bin/env node
import 'source-map-support/register';

import {shadowApp, basicConfig} from '../..';
import {join} from 'path';
import program from 'commander';
import * as streamToPromise from 'stream-to-promise';
import {Level} from 'msv-logger';

let pro = program.version('0.0.1');

export function run({configFile}, handler) {
    const options = require(join(process.cwd(), configFile)).project;
    shadowApp(options, handler);
}

pro.command('describe')
    .option('-f, --config-file <filePath>', 'Path to config file', 'dist/app.js')
    .action((options) => {
        /*const services = {};
        const project = require(join(process.cwd(), options.configFile)).project;
        project.bridges = {
            ...project.bridges || {},
            spy: () => ({
                // init: () => {}
            })
        };
        project.config = (project.config || basicConfig()).mergeObject({
            app: {
                bridge: 'spy'
            }
        });
        shadowApp(project, async () => {
            for(const serviceName in services) {
                const service = this.service
                process.stdout.write(`Service: ${serviceName}`);
                for(const taskName in services) {

                }
            }
        });*/
    });

pro.command('task <taskName>')
    .option('-i, --input <jsonString>', 'Input string')
    .option('-I, --stdin', 'Use stdin as json input')
    .option('-w, --wait <number>', 'Microseconds to wait')
    .option('-f, --config-file <filePath>', 'Path to config file', 'dist/app.js')
    .action((taskName, options) => {
        run(
            options,
            async app => {
                await app.run(
                    taskName,
                    JSON.stringify(options.stdin
                        ? await streamToPromise(process.stdin)
                        : (options.input || '{}')
                    ),
                    {
                        wait: options.wait ? parseInt(options.wait) : undefined
                    }
                );
            }
        );
    });