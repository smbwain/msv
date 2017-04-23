// import ExtendableError from 'extendable-error';

import Config from './config';
import { sublog } from './logs';
import { DepsTree, STATE_NAMES } from './deps-tree';

/*export class SchemeValidationError extends ExtendableError {
    constructor(errors, message = 'Validation Error') {
        super(message);
        this.validation = errors;
    }
}*/

export class App {
    constructor({services, modules, config = Config.simple(), bridges = {}}) {
        const shareConfig = config.sub('common');
        const appConfig = shareConfig.merge(config.sub(`app`));

        this.logger = sublog({
            level: parseInt(appConfig.get('logLevel', 4))
        });

        this._services = {};
        this._modules = {};

        const bridgeType = appConfig.get('bridge.type');
        let Bridge = bridges[bridgeType];
        if(!Bridge) {
            if(bridgeType == 'local') {
                Bridge = require('./local-bridge').default;
            } else {
                Bridge = require.main.require('msv-bridge-'+bridgeType).default;
            }
        }
        const bridgeConfig = shareConfig.merge(config.sub(`bridge.${bridgeType}`));
        const bridge = new Bridge({
            config: bridgeConfig,
            logger: this.logger.sub({
                tag: 'Bridge:'+bridgeType,
                level: parseInt(bridgeConfig.get('logLevel', 4))
            })
        });

        this._bridge = bridge;

        this.run = ::bridge.runTask;
        this.send = ::bridge.sendMessage;

        const treeElements = {};

        treeElements.bridge = {
            init: async() => {
                await this._bridge.init();
            },
            deinit: async() => {
                await this._bridge.deinit();
            }
        };

        for(const serviceName in services) {
            const {
                Class,
                use,
                config: serviceConfig = shareConfig.merge(config.sub(`service.${serviceName}`))
            } = services[serviceName];

            const modulesNamesMap = {};
            for(const moduleName in use) {
                modulesNamesMap[`module:${use[moduleName]}`] = moduleName;
            }
            treeElements[`service:${serviceName}`] = {
                needed: true,
                deps: Object.keys(modulesNamesMap).concat(['bridge']),
                init: async (deps) => {
                    const modules = {};
                    for(const depName in deps) {
                        if(modulesNamesMap[depName]) {
                            modules[modulesNamesMap[depName]] = deps[depName];
                        }
                    }
                    const service = this._services[serviceName] = new Class();
                    service.__initService({
                        config: serviceConfig,
                        app: this,
                        logger: this.logger.sub({
                            tag: `Service:${serviceName}`,
                            level: parseInt(serviceConfig.get('logLevel', 4))
                        }),
                        modules
                    });
                    if(service.init) {
                        await service.init();
                    }
                    await this._bridge.startListening(serviceName, service.__getExportedMethods());
                    return service;
                },
                deinit: async () => {
                    const service = this._services[serviceName];
                    delete this._services[serviceName];
                    await this._bridge.stopListening(serviceName);
                    if(service.deinit) {
                        await service.deinit();
                    }
                }
            };
        }

        for(const moduleName in modules) {
            const {
                Class,
                use,
                config: moduleConfig = shareConfig.merge(config.sub(`module.${moduleName}`))
            } = modules[moduleName];
            const modulesNamesMap = {};
            for(const moduleName in use) {
                modulesNamesMap[`module:${use[moduleName]}`] = moduleName;
            }
            treeElements[`module:${moduleName}`] = {
                deps: Object.keys(modulesNamesMap),
                init: async (deps) => {
                    const modules = {};
                    for(const depName in deps) {
                        modules[modulesNamesMap[depName]] = deps[depName];
                    }
                    const module = this._modules[moduleName] = new Class();
                    module.__initModule({
                        config: moduleConfig,
                        modules,
                        logger: this.logger.sub({
                            tag: `Module:${moduleName}`,
                            level: parseInt(moduleConfig.get('logLevel', 4))
                        })
                    });
                    if(module.init) {
                        await module.init();
                    }
                    return module;
                },
                deinit: async () => {
                    const module = this._modules[moduleName];
                    delete this._modules[moduleName];
                    if(module.deinit) {
                        await module.deinit();
                    }
                }
            };
        }

        const loaderLogger = this.logger.sub({tag: 'Loader'});

        this._depsTree = new DepsTree(treeElements);
        this._depsTree.on('module-state', (moduleName, state) => {
            switch(state) {
                case 2:
                case 4:
                case 5:
                    loaderLogger.log(`[${STATE_NAMES[state]}] ${moduleName}`);
            }
        });
        this._depsTree.on('state', (state) => {
            switch(state) {
                case 2:
                case 4:
                case 5:
                    loaderLogger.log(`[${STATE_NAMES[state]}] application`);
            }
        });
        this._depsTree.on('error', (err, module) => {
            loaderLogger.error(`#${module}`, err);
        });
    }

    service(serviceName) {
        if(!this._services[serviceName]) {
            throw new Error(`Unknown service ${serviceName}`);
        }
        return this._services[serviceName];
    }

    async start() {
        this.logger.log('Starting...');

        await this._depsTree.init();
    }

    async stop() {
        this.logger.log('Stopping...');

        await this._depsTree.deinit();
    }
}