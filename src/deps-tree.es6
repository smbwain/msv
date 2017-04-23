const STATE_OFF = 0;
const STATE_INITIALIZING = 1;
const STATE_UP = 2;
const STATE_DEINITIALIZING = 3;
const STATE_DOWN = 4;
const STATE_ERROR = 5;

export const STATE_NAMES = ['off', 'initializing', 'up', 'deinitializing', 'down', 'error'];

import {EventEmitter} from 'events';
import defer from 'defer-promise';

export class DepsTree extends EventEmitter {
    /**
     * @param {{deps: [string], init, deinit, cancel, needed: boolean}} modules
     */
    constructor(modules) {
        super();
        this.state = STATE_OFF;
        this.errors = [];
        this.modules = {};
        this._modulesToUnload = 0;
        for (const name in modules) {
            const dependencies = modules[name].deps || [];
            this.modules[name] = {
                ...modules[name],
                dependencies,
                dependenciesToLoad: dependencies.length,
                dependants: [],
                state: STATE_OFF,
                dependantsToUnload: 0
            }
        }
        for (const moduleName in this.modules) {
            for (const depName of this.modules[moduleName].dependencies) {
                const dependency = this.modules[depName];
                if (!dependency) {
                    throw new Error(`Broken dependency "${depName}"`);
                }
                dependency.dependants.push(moduleName);
            }
        }
        const fillNeeded = module => {
            module.needed = true;
            for(const dependencyName of module.dependencies) {
                const dependency = this.modules[dependencyName];
                if(!dependency.needed) {
                    fillNeeded(dependency);
                }
            }
        };
        for (const moduleName in this.modules) {
            if(this.modules[moduleName].needed) {
                fillNeeded(this.modules[moduleName]);
            }
        }
    }

    _changeModuleState(name, state) {
        this.modules[name].state = state;
        this.emit('module-state', name, state);
    }

    _changeState(state) {
        this.state = state;
        this.emit('state', state);
    }

    _initModule(name) {
        const module = this.modules[name];
        this._changeModuleState(name, STATE_INITIALIZING);
        this._modulesToUnload++;
        (async() => {
            try {
                try {
                    const dependenciesObject = {};
                    for (const dependencyName of module.dependencies) {
                        dependenciesObject[dependencyName] = this.modules[dependencyName].data;
                    }
                    module.data = await module.init(dependenciesObject);
                } catch (err) {
                    this._modulesToUnload--;
                    this._changeModuleState(name, STATE_ERROR);
                    module.error = err;
                    this._error(err, name);
                    return;
                }
                this._moduleInited(name);
            } catch(err) {
                console.error(err.stack);
            }
        })();
    }

    _moduleInited(name) {
        switch (this.state) {
            case STATE_INITIALIZING:
                const module = this.modules[name];
                this._changeModuleState(name, STATE_UP);
                for(const dependencyName of module.dependencies) {
                    this.modules[dependencyName].dependantsToUnload++;
                }
                if (--this._modulesToLoad == 0) {
                    this._initDefer.resolve();
                    this._changeState(STATE_UP);
                    this.emit('started');
                    return;
                }
                for (const depentantName of module.dependants) {
                    if (--this.modules[depentantName].dependenciesToLoad == 0) {
                        this._initModule(depentantName);
                    }
                }
                break;
            case STATE_DEINITIALIZING:
                this._deinitModule(name);
                break;
            default:
                throw new Error('State error');
        }
    }

    _deinitModule(name) {
        const module = this.modules[name];

        (async() => {
            try {
                this._changeModuleState(name, STATE_DEINITIALIZING);
                try {
                    await module.deinit();
                    this._changeModuleState(name, STATE_DOWN);
                } catch (err) {
                    this._changeModuleState(name, STATE_ERROR);
                    module.error = err;
                    this._error(err, name);
                }
                if (--this._modulesToUnload <= 0) {
                    this._deinitDefer.resolve();
                    this._changeState(STATE_DOWN);
                    this.emit('stopped');
                    return;
                }
                for (const dependencyName of module.dependencies) {
                    if (--this.modules[dependencyName].dependantsToUnload <= 0) {
                        this._deinitModule(dependencyName);
                    }
                }
            } catch (err) {
                console.error(err.stack);
            }
        })();
    }

    _error(err, name) {
        try {
            if(this.listenerCount('error')) {
                this.emit('error', err, name || '')
            } else {
                console.error(err.stack);
            }
            this.errors.push(err);
            this.deinit();
        } catch (err) {
            console.error(err.stack || err);
        }
    }

    /**
     * Run this method to init all needed modules and their dependencies
     * If you run this method on initializing tree, you'd get the same promise, as for first call
     * If you run it on initialized and working tree, init would be resolved immediately
     * If the state of tree is deinitializing, down or error, it rejects error
     */
    init() {
        switch (this.state) {
            case STATE_OFF:
                this._changeState(STATE_INITIALIZING);
                this._initDefer = defer();
                this._modulesToLoad = 0;
                Promise.resolve().then(() => {
                    for (const name in this.modules) {
                        const module = this.modules[name];
                        if (module.needed) {
                            this._modulesToLoad++;
                            if (!module.dependenciesToLoad) {
                                this._initModule(name);
                            }
                        }
                    }
                }).catch(err => {
                    this._error(err);
                });
            /* falls through */
            case STATE_INITIALIZING:
                return this._initDefer.promise;
            case STATE_UP:
                return Promise.resolve();
            default:
                throw new Error('I can\'t init tree');
        }
    }

    deinit() {
        switch (this.state) {
            case STATE_OFF:
                this._changeState(STATE_DOWN);
            /* falls through */
            case STATE_ERROR:
            /* falls through */
            case STATE_DOWN:
                return Promise.resolve();
            case STATE_INITIALIZING:
            case STATE_UP:
                this._changeState(STATE_DEINITIALIZING);
                this._deinitDefer = defer();
                for(const moduleName in this.modules) {
                    const module = this.modules[moduleName];
                    if(module.state == STATE_UP && !module.dependantsToUnload) {
                        this._deinitModule(moduleName);
                    }
                }
            /* falls through */
            case STATE_DEINITIALIZING:
                return this._deinitDefer.promise;
        }
    }
}