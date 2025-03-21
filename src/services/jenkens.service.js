const { EventEmitter } = require('events');
const Jenkins = require('jenkins');
const { JENKINS_URL } = require('../config/env');

class JenkinsClient extends EventEmitter {
	constructor(url = JENKINS_URL) {
		super();
		if (!url) {
			throw new Error('Jenkins URL is required');
		}

		this.jenkins = new Jenkins({
			baseUrl: url,
			crumbIssuer: true,
		});
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
		await this.jenkins.job.create(opts.name, opts.xml);
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
}

module.exports = {
	JenkinsClient,
	instance: new JenkinsClient(),
};
