const Jenkins = require('jenkins');
const { JENKINS_URL, JENKINS_USER, JENKINS_TOKEN } = require('../config/env');

const jenkins = new Jenkins({
	baseUrl: `http://${JENKINS_USER}:${JENKINS_TOKEN}@${JENKINS_URL}`,
	crumbIssuer: true,
});

// 创建 Jenkins Job
async function createJob(jobName, jenkinsfile) {
	const xmlConfig = `<project>
        <builders>
            <hudson.tasks.Shell>
                <command>${jenkinsfile}</command>
            </hudson.tasks.Shell>
        </builders>
    </project>`;

	await jenkins.job.create(jobName, xmlConfig);
}

// 触发 Jenkins Job 构建
async function buildJob(jobName) {
	await jenkins.job.build(jobName);
}

// 获取 Jenkins Job 构建日志
async function getJobLogs(jobName) {
	return await jenkins.build.log(jobName, 'lastBuild');
}

module.exports = { createJob, buildJob, getJobLogs };
