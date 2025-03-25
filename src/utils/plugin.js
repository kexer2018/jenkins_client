const { EventEmitter } = require('events');

// 一个类收集和整理的模块,去获取系统中的插件的信息,提供插件信息和检查,如果xml中提供的plugin的版本不对或不存在,可以从这里报错
class PluginManager extends EventEmitter {
	constructor() {
		super();
	}
}

module.exports = new PluginManager();
