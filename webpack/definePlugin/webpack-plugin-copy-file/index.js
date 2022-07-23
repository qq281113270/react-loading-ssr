/*
 * @Date: 2022-04-28 10:55:26
 * @Author: Yao guan shou
 * @LastEditors: Yao guan shou
 * @LastEditTime: 2022-07-04 13:36:09
 * @FilePath: /webpack-cli/user-webpack-config/definePlugin/MyExampleWebpackPlugin.js
 * @Description:
 */
const fs = require('fs');
const path = require('path');
const { copyFile, watchFile } = require('../../utils/index');
const ResolveAlias = require('../webpack-plugin-resolve-alias');

class WebpackPluginCopyFile {
    constructor(paths = [], options = {}) {
        this.options = options;
        this.paths = paths;
        if (options.resolve) {
            this.ResolveAlias = new ResolveAlias({
                resolve: this.options.resolve,
            });
        }
    }
    // 节流函数
    throttle(time, callback = () => {}) {
        let nowTime = new Date().getTime();
        if (!this.startTime || nowTime - this.startTime > time) {
            this.startTime = nowTime;
            if (callback && callback instanceof Function) {
                callback();
            }
        }
    }
    // 转换路径
    transformPath(path) {
        let reg = /(\\\\)|(\\)/g;
        return path.replace(reg, '/');
    }
    watchFile() {
        for (let item of this.paths) {
            const { from } = item;
            from = this.transformPath(from);
            let reg1 = /\*\*/;
            let reg2 = /\*/;
            let prefixFrom = '';
            if (reg1.test(from)) {
                prefixFrom = from.match(/[\w\W]+(?=\/\*\*)/g)[0];
            } else if (reg2.test(from)) {
                prefixFrom = from.match(/[\w\W]+(?=\/\*)/g)[0];
            }
            new watchFile(prefixFrom, (path, message) => {
                // console.log('path===', path);

                this.copyFile(message);
            });
        }
    }
    copyFile(message = '') {
        this.throttle(500, () => {
            message && console.log(message);
            for (let item of this.paths) {
                const { from, to, transform = (data) => data } = item;
                copyFile(from, to, (content, absoluteFrom) => {
                    if (this.ResolveAlias) {
                        let reg = /.jsx|.js$/g;
                        if (reg.test(absoluteFrom)) {
                            content = this.ResolveAlias.alias(
                                content.toString()
                            );
                        }
                    }
                    return transform(content, absoluteFrom);
                });
            }
        });
    }

    // // 做兼容
    hook(compiler, hookName, pluginName, fn) {
        if (arguments.length === 3) {
            fn = pluginName;
            pluginName = hookName;
        }
        if (compiler.hooks) {
            compiler.hooks[hookName].tap(pluginName, fn);
        } else {
            compiler.plugin(pluginName, fn);
        }
    }

    apply(compiler) {
        // // 开始编译 只会调用一次
        // this.hook(compiler, 'afterPlugins', () => {
        //     console.log('afterPlugins======== 开始');
        //     this.watchFile();
        // });

        compiler.hooks.emit.tapAsync(
            'afterPlugins',
            (compilation, callback) => {
                this.watchFile();
                callback();
            }
        );
        compiler.hooks.emit.tapAsync('done', (compilation, callback) => {
            this.copyFile();
            callback();
        });

        // //   编译完成
        // this.hook(compiler, 'done', () => {
        //     console.log('done:编译完成');
        //     this.copyFile();
        // });
    }
}

module.exports = WebpackPluginCopyFile;
