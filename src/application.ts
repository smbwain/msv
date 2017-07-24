// import ExtendableError from 'extendable-error';

import {ConfigInterface, config, basicConfig} from 'msv-config';
import {default as logger, LoggerInterface} from 'msv-logger';
import {default as depsTree, DepsTree as DepsTree, State as DepsTreeState, ModulesMap as DepsModulesMap } from 'deps-tree';
import {
    ApplicationOptions, ApplicationInterface, RunMethod, SendMethod, ServiceInterface, BridgeInterface,
    ServiceFactory, ModuleFactory, ModuleInterface, BridgeOptions, BridgeFactory
} from "../types";

/*export class SchemeValidationError extends ExtendableError {
    constructor(errors, message = 'Validation Error') {
        super(message);
        this.validation = errors;
    }
}*/

export class Application implements ApplicationInterface {
    public readonly logger : LoggerInterface;
    public readonly config : ConfigInterface;
    // private shareConfig : ConfigInterface;
    // private serviceFactories : {
    //     [name: string] : ServiceFactory
    // };
    // private bridgeFactory : BridgeFactory;
    private services : {
        [name : string] : ServiceInterface
    } = {};
    // private moduleFactories : {
    //     [name : string] : ModuleFactory
    // };
    private modules : {
        [name : string] : ModuleInterface
    } = {};
    // private bridge : BridgeInterface;
    public readonly run : RunMethod;
    public readonly send : SendMethod;
    private depsTree : DepsTree;

    constructor(options : ApplicationOptions) {
        const conf = config({
            common: {
                logLevel: '4'
            }
        }).merge(options.config || basicConfig());
        const shareConfig = conf.sub('common');
        this.config = shareConfig.merge(conf.sub(`app`));

        this.logger = options.logger || logger({
            level: parseInt(this.config.get('logLevel'))
        });

        // const services = {};
        // const modules = {};

        // this.serviceFactories = options.services;
        // this.moduleFactories = options.modules;

        /*const bridgeConfig = shareConfig.merge(conf.sub(`bridge.${bridgeType}`));
        const bridge = new Bridge({
            config: bridgeConfig,
            logger: this.logger.sub({
                tag: 'Bridge:'+bridgeType,
                level: parseInt(bridgeConfig.get('logLevel', '4'))
            })
        });

        this._bridge = bridge;

        this.run = bridge.runTask.bind(this);
        this.send = bridge.sendMessage.bind(this);*/

        const treeElements : DepsModulesMap = {};

        // bridge

        const bridgeType = this.config.get('bridge');
        const bridgeConf = shareConfig.merge(conf.sub(`bridge.${bridgeType}`));
        const bridgeFactory : BridgeFactory= options.bridges[bridgeType];
        const bridge : BridgeInterface = bridgeFactory({
            config: bridgeConf,
            logger: this.logger.sub({
                tag: 'Bridge:'+bridgeType,
                level: parseInt(bridgeConf.get('logLevel'))
            }),
            shadowMode: options.shadowMode
        });
        treeElements.bridge = {
            init: async() => {
                await bridge.init();
            },
            deinit: async() => {
                await bridge.deinit();
            },
            data: bridge,
            needed: true
        };

        // services

        for(const serviceName in options.services) {
            const serviceDescription = options.services[serviceName];

            const modulesNamesMap = {};
            if(Array.isArray(serviceDescription)) {
                for (const name of serviceDescription[0]) {
                    const names = name.split(':');
                    modulesNamesMap[`module:${names[1] || names[0]}`] = names[0];
                }
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
                    const serviceConf = shareConfig.merge(conf.sub(`service.${serviceName}`));
                    const service = this.services[serviceName] = (Array.isArray(serviceDescription) ? serviceDescription[1] : serviceDescription)({
                        config: serviceConf,
                        logger: this.logger.sub({
                            tag: `Service:${serviceName}`,
                            level: parseInt(serviceConf.get('logLevel'))
                        }),
                        modules,
                        shadowMode: options.shadowMode,
                        run: deps.bridge.run.bind(deps.bridge),
                        send: deps.bridge.send.bind(deps.bridge)
                    });

                    if(service.init) {
                        await service.init();
                    }
                    if(!options.shadowMode) {
                        await bridge.startListening(serviceName, service.__getExportedMethods());
                    }
                    return service;
                },
                deinit: async () => {
                    const service = this.services[serviceName];
                    delete this.services[serviceName];
                    if(!options.shadowMode) {
                        await bridge.stopListening(serviceName);
                    }
                    if(service.deinit) {
                        await service.deinit();
                    }
                }
            };
        }

        for(const moduleName in options.modules) {
            const moduleDescription = options.modules[moduleName];

            const modulesNamesMap = {};
            if(Array.isArray(moduleDescription)) {
                for (const name of moduleDescription[0]) {
                    const names = name.split(':');
                    modulesNamesMap[`module:${names[1] || names[0]}`] = names[0];
                }
            }

            treeElements[`module:${moduleName}`] = {
                deps: Object.keys(modulesNamesMap),
                init: async (deps) => {
                    const modules = {};
                    for(const depName in deps) {
                        if(modulesNamesMap[depName]) {
                            modules[modulesNamesMap[depName]] = deps[depName];
                        }
                    }
                    const moduleConf = shareConfig.merge(conf.sub(`module.${moduleName}`));
                    const module = this.modules[moduleName] = (Array.isArray(moduleDescription) ? moduleDescription[1] : moduleDescription)({
                        config: moduleConf,
                        logger: this.logger.sub({
                            tag: `Module:${moduleName}`,
                            level: parseInt(moduleConf.get('logLevel'))
                        }),
                        modules
                    });

                    if(module.init) {
                        await module.init();
                    }
                    return module;
                },
                deinit: async () => {
                    const module = this.modules[moduleName];
                    delete this.modules[moduleName];
                    if(module.deinit) {
                        await module.deinit();
                    }
                }
            };
        }

        const loaderLogger = this.logger.sub({tag: 'Loader'});

        this.depsTree = new DepsTree(treeElements);
        this.depsTree.on('module-state', (moduleName, state) => {
            switch(state) {
                case 2:
                case 4:
                case 5:
                    loaderLogger.log(`[${DepsTreeState[state]}] ${moduleName}`);
            }
        });
        this.depsTree.on('state', (state) => {
            switch(state) {
                case 2:
                case 4:
                case 5:
                    loaderLogger.log(`[${DepsTreeState[state]}] application`);
            }
        });
        this.depsTree.on('error', (err, module) => {
            loaderLogger.error(`#${module}`, err);
        });
    }

    service(serviceName) {
        if(!this.services[serviceName]) {
            throw new Error(`Unknown service ${serviceName}`);
        }
        return this.services[serviceName];
    }

    async start() : Promise<void> {
        this.logger.log('Starting...');

        await this.depsTree.init();
    }

    async stop() : Promise<void> {
        this.logger.log('Stopping...');

        await this.depsTree.deinit();
    }
}