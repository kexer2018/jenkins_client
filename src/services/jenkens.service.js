const { EventEmitter } = require('events');
const Jenkins = require('jenkins');
const { JENKINS_SERVICE_URL } = require('../config/env');
const { JobGeneratorFactory, PluginManager, ScriptManager } = require('../utils/generator');

class JenkinsClient extends EventEmitter {
	constructor(URL = JENKINS_SERVICE_URL) {
		super();
		if (!URL) throw new Error('Jenkins URL is required');

		this.jenkins = new Jenkins({
			baseUrl: URL,
			crumbIssuer: true,
		});

		this.pluginManager = new PluginManager(this.jenkins);
	}

	/**
	 * 生成 XML 配置
	 * @param {string} type - 任务类型 (freestyle, flow, multibranch)
	 * @param {object} config - 任务配置
	 * @returns {Promise<string>} - 生成的 XML 字符串
	 */
	async generateJobXML(type, config) {
		const generator = JobGeneratorFactory.createGenerator(type, config, this.pluginManager);
		return await generator.generateXML();
	}

	async getJenkinsinfo() {
		return await this.jenkins.info();
	}

	async getJobLogs(name) {
		return await this.jenkins.build.log(name, 'lastBuild');
	}

	/**
	 *
	 * @param {object} opts
	 * @param {string} opts.name
	 * @param {number} opts.number
	 * @returns
	 */
	async getBuildInfo(opts) {
		return await this.jenkins.build.get(opts.name, opts.number);
	}

	async stopBuild(opts) {
		await this.jenkins.build.stop(opts.name, opts.number);
	}

	async termBuild(opts) {
		await this.jenkins.build.term(opts.name, opts.number);
	}

	async logStream(opts) {
		const logger = this.jenkins.build.logStream(opts.name, opts.number);

		logger.on('data', (text) => {
			console.log(`[LOG] ${text}`);
			this.emit('log', text);
		});

		logger.on('error', (err) => {
			console.error('[ERROR]', err);
			this.emit('error', err);
		});

		logger.on('end', () => {
			console.log('[END] Log Stream Ended');
			this.emit('end');
		});
		return logger;
	}

	async jobBuild(opts) {
		try {
			console.log(`Starting job: ${opts.name}`);
			await this.jenkins.job.build(opts);

			let buildNumber = null;
			while (!buildNumber) {
				await new Promise((resolve) => setTimeout(resolve, 1000));
				const jobInfo = await this.getJobInfo(opts.name);
				buildNumber = jobInfo.lastBuild?.number;
			}
			// 监听日志
			this.logStream({ name: opts.name, number: buildNumber });
		} catch (error) {
			console.error('Job Build Error:', error);
		}
	}

	async getJobConfig(name) {
		return await this.jenkins.job.config(name);
	}

	async getJobInfo(name) {
		return await this.jenkins.job.get(name);
	}

	async getJobList(name) {
		return name ? await this.jenkins.job.list(name) : await this.jenkins.job.list();
	}

	async createJob(opts) {
		const { name, type, config } = opts;
		// const scriptManager = new ScriptManager(config);
		// scriptManager.getConfig();
		const xml = await this.generateJobXML(type, config);
		await this.jenkins.job.create(name, xml);
	}

	async checkExistsJob(name) {
		return await this.jenkins.job.exists(name);
	}

	async deleteJob(name) {
		await this.jenkins.job.destroy(name);
	}

	async updateEnableJob(name, enable) {
		enable ? await this.jenkins.job.enable(name) : await this.jenkins.job.disable(name);
	}

	async queueList() {
		return await this.jenkins.queue.list();
	}

	async getItemInfo(id) {
		return await this.jenkins.queue.item(id);
	}

	async cancelItem(id) {
		await this.jenkins.queue.cancel(id);
	}

	async getViewInfo(name) {
		return await this.jenkins.view.get(name);
	}

	async getViewList() {
		return await this.jenkins.view.list();
	}
}

module.exports = {
	JenkinsClient,
	instance: new JenkinsClient(),
};
