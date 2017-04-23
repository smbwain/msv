import colors from 'colors/safe';

function pad2(n) {
    return (n < 10 ? '0' : '') + n;
}

function pad3(n) {
    return (n < 10 ? '00' : n < 100 ? '0' : '') + n;
}

function time() {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

function mtime() {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}.${pad3(d.getMilliseconds())}`;
}

export function sublog({tag = [], level} = {}) {
    if (!Array.isArray(tag)) {
        tag = [tag];
    }
    if (level == null) {
        level = 4;
    }

    return {
        error(...msg) {
            if(level >= 1) {
                let err = msg.pop();
                if (typeof err == 'object' && err && err.name && err.message && err.stack) {
                    err = `{${err.name}} ${err.message}\n${err.stack && err.stack.split('\n').slice(1).join('\n')}`;
                }
                console.error(colors.red(`[${time()}] ERROR${tag.map(tag => ' #' + tag).join('')}`), ...msg, err);
            }
        },
        warn(...msg) {
            if (level >= 2) {
                console.log(colors.magenta(`[${time()}] WARNING${tag.map(tag => ' #' + tag).join('')}`), ...msg);
            }
        },
        log(...msg) {
            if (level >= 3) {
                console.log(colors.gray(`[${time()}] LOG${tag.map(tag => ' #' + tag).join('')}`), ...msg);
            }
        },
        debug(...msg) {
            if (level >= 4) {
                console.log(colors.blue(`[${time()}] DEBUG${tag.map(tag => ' #' + tag).join('')}`), ...msg);
            }
        },
        sub({tag: newTag = [], level: newLevel}) {
            return sublog({
                tag: [...tag, ...(Array.isArray(newTag) ? newTag : [newTag])],
                level: newLevel != null ? newLevel : level
            })
        },
        profiler(label1) {
            if (level >= 5) {
                return (label2) => {
                    console.log(colors.white(`[${mtime()}] PROFILE${tag.map(tag => ' #' + tag).join('')} #profile:${label1}`)+' '+label2);
                };
            } else {
                return () => {};
            }
        }
    };
}