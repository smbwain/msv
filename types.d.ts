
import {ConfigInterface} from 'msv-config';
import {Logger} from 'msv-logger';
import {ModuleDescription as DepsTreeModuleDescription} from 'deps-tree';

export * from 'msv-config/types';

export type SyncOrAsync<T> = T | Promise<T>;

export function runApp(options: ApplicationOptions) : void;
export function shadowApp(options : ApplicationOptions, handler : (app: ApplicationInterface) => SyncOrAsync<void>) : Promise<void>;

// --- application

export type ApplicationOptions = {
    config? : ConfigInterface;
    logger? : Logger;
    services? : {
        [name : string] : ServiceDescription
    };
    modules? : {
        [name : string] : ModuleDescription
    };
    bridges? : {
        [name : string] : BridgeFactory
    };
    shadowMode?: boolean;
};

export interface ApplicationInterface {
    start(): Promise<void>;
    stop(): Promise<void>;
    run: RunMethod;
    send: SendMethod;
}

export class Application implements ApplicationInterface {
    constructor(options: ApplicationOptions);
    start(): Promise<void>;
    stop(): Promise<void>;
    run: RunMethod;
    send: SendMethod;
}

// --- services

export type ServiceDescription = ServiceFactory | [string[], ServiceFactory];

export type ServiceFactory = (options: ServiceOptions) => ServiceInterface;

export type ServiceOptions = {
    run: RunMethod;
    send: SendMethod;
    config: ConfigInterface;
    logger: Logger
    shadowMode: boolean;
    modules: {
        [name: string]: any;
    }
}

export interface ServiceInterface {
    __getExportedMethods(): ServiceExportedMethods;
    init(): SyncOrAsync<void>;
    deinit(): SyncOrAsync<void>;
    enable() : void;
    disable() : void;
    // asdTaskSchema
}

export abstract class Service implements ServiceInterface {
    constructor(options: ServiceOptions);
    __getExportedMethods(): ServiceExportedMethods;
    init(): SyncOrAsync<void>;
    deinit(): SyncOrAsync<void>;
    enable() : void;
    disable() : void;
    public enabled : boolean;
    public config : ConfigInterface;
    public run : RunMethod;
    public send : SendMethod;
    public logger : Logger;
    public shadowMode : boolean;
    public modules : {
        [name: string]: any
    };
}

export type ServiceExportedMethods = {
    tasks: {
        [name: string]: {
            options: {
                concurrency?: number
            },
            handler: (taskPayLoad : any) => Promise<any>
        }
    },
    events: {
        [name: string]: {
            options: {
                concurrency?: number
            },
            handler: (eventPayLoad : any) => Promise<void>
        }
    }
}

// --- modules

export type ModuleDescription = ModuleFactory | [string[], ModuleFactory];

export type ModuleOptions = {
    config: ConfigInterface;
    logger: Logger;
    modules: {
        [name: string]: any;
    }
}

export type ModuleFactory = (options: ModuleOptions) => ModuleInterface;

export interface ModuleInterface {
    init?(): SyncOrAsync<any>;
    deinit?(): SyncOrAsync<void>;
    cancel?(): SyncOrAsync<void>;
    data?: any
}

// --- bridges

export type BridgeOptions = {
    config: ConfigInterface;
    logger: Logger;
    shadowMode: boolean;
}

export type BridgeFactory = (options: BridgeOptions) => BridgeInterface;

export interface BridgeInterface {
    init: () => Promise<void>;
    deinit: () => Promise<void>;
    startListening: (serviceName : string, exportedMethods: ServiceExportedMethods) => Promise<void>;
    stopListening: (serviceName : string) => Promise<void>;
    run: RunMethod;
    send: SendMethod;
    enable() : void;
    disable() : void;
}

// --- common

export type TaskRunOptions = {
    wait?: number | boolean
}

export type EventRunOptions = {

}

export type RunMethod = (taskName : string, taskPayLoad : any, taskRunOptions?: TaskRunOptions) => Promise<any>;
export type SendMethod = (eventName : string, eventPayLoad : any, eventRunOptions?: EventRunOptions) => Promise<void>;

// -- exports

export type TaskDeclarationOptions = {
    // schema: any
};

export function task(options: TaskDeclarationOptions) : (target: any, propertyKey: string, descriptor: PropertyDescriptor) => void;
export function task(target: any, propertyKey: string, descriptor: PropertyDescriptor) : void;

export type EventDeclarationOptions = {
    // schema: any
};

export function event(options: EventDeclarationOptions) : (target: any, propertyKey: string, descriptor: PropertyDescriptor) => void;
export function event(target: any, propertyKey: string, descriptor: PropertyDescriptor) : void;

/*export type ScriptDeclarationOptions = {
    // schema: any
};

export function script(options: ScriptDeclarationOptions) : (target: any, propertyKey: string, descriptor: PropertyDescriptor) => void;
export function script(target: any, propertyKey: string, descriptor: PropertyDescriptor) : void;*/

export function schema(schema: any) : (target: any, propertyKey: string, descriptor: PropertyDescriptor) => void;

// functions

export function localBridge() : BridgeFactory;