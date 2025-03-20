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

	async jobBuild(opts) {
		await this.jenkins.job.build(opts);
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
}

module.exports = {
	JenkinsClient,
	instance: new JenkinsClient(),
};
