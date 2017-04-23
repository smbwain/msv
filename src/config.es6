export default class Config {
    constructor({data = {}} = {}) {
        this._data = data;
    }

    static fromObject(object) {
        return new Config().mergeObject(object);
    }

    static simple({envVarNamePrefix = 'APP_'} = {}) {
        const {join} = require('path');
        const NODE_ENV = process.env.NODE_ENV || 'development';
        const NODE_CONFIG_DIR = process.env.NODE_CONFIG_DIR || join(process.cwd(), 'config');
        return new Config()
            .mergeFileSync(join(NODE_CONFIG_DIR, `default.yml`))
            .mergeFileSync(join(NODE_CONFIG_DIR, `${NODE_ENV}.yml`))
            .mergeEnv({varNamePrefix: envVarNamePrefix});
    }

    merge(config) {
        return new Config({data: {...this._data, ...config._data}});
    }

    mergeObject(raw, { addPrefix = '' } = {}) {
        const data = {...this._data};
        function addRaw(raw, rawPrefix) {
            if(typeof raw == 'object' && raw) {
                for(const i in raw) {
                    if(raw.hasOwnProperty(i)) {
                        addRaw(raw[i], (rawPrefix ? rawPrefix+'.' : '')+i);
                    }
                }
                return;
            }
            data[(addPrefix+rawPrefix).toUpperCase()] = raw;
        }
        addRaw(raw, '');
        return new Config({data});
    }

    mergeEnv({ varNamePrefix = '', env = process.env } = {}) {
        const data = {...this._data};
        for(let i in env) {
            const name = i.toUpperCase();
            if(name.startsWith(varNamePrefix)) {
                data[name.slice(varNamePrefix.length).replace(/_/g, '.')] = env[i];
            }
        }
        return new Config({data});
    }

    mergeString(str, type) {
        switch(type) {
            case 'json':
                return this.mergeObject(JSON.parse(str));
            case 'yaml':
            case 'yml':
                const loadYaml = require.main.require('js-yaml').safeLoad;
                return this.mergeObject(loadYaml(str));
            default:
                throw new Error('Unknown config type');
        }
    }

    mergeFileSync(filename, type) {
        const fs = require('fs');
        return this.mergeString(fs.readFileSync(filename), type || filename.match(/\.([a-z0-9]+)$/)[1]);
    }

    get(confName, defaultValue) {
        confName = confName.toUpperCase();
        if(!(confName in this._data)) {
            if(arguments.length >= 2) {
                return defaultValue;
            }
            throw new Error(`No config "${confName}"`);
        }

        return this._data[confName];
    }

    has(confName) {
        return confName.toUpperCase() in this._data;
    }

    sub(prefix) {
        prefix = prefix.toUpperCase()+'.';
        const data = {};
        for(const i in this._data) {
            if(this._data.hasOwnProperty(i) && i.startsWith(prefix)) {
                data[i.slice(prefix.length)] = this._data[i];
            }
        }
        return new Config({data});
    }
}