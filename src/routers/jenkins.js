const express = require('express');
const { createJob, buildJob, getJobLogs } = require('../api/jenkins');

const router = express.Router();

// 创建 Jenkins Pipeline
router.post('/pipeline', async (req, res) => {
	const { jobName } = req.body;
	const jenkinsfile = `
pipeline {
    agent any
    stages {
        stage('Build') {
            steps { echo 'Building...' }
        }
        stage('Deploy') {
            steps { echo 'Deploying...' }
        }
    }
}`;

	try {
		await createJob(jobName, jenkinsfile);
		res.json({ message: 'Pipeline created' });
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

// 触发 Jenkins Job
router.post('/pipeline/:jobName/build', async (req, res) => {
	const { jobName } = req.params;
	try {
		await buildJob(jobName);
		res.json({ message: 'Build triggered' });
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

// 获取 Jenkins 日志
router.get('/pipeline/:jobName/logs', async (req, res) => {
	const { jobName } = req.params;
	try {
		const log = await getJobLogs(jobName);
		res.send(log);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

module.exports = router;
