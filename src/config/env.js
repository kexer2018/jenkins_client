const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// const env = process.env.NODE_ENV || 'development';
const jenkensURL = `http://${process.env.JENKINS_HOST}:${process.env.JENKINS_PORT}`;
const jenkinsServiceURL = `http://${process.env.JENKINS_USER}:${process.env.JENKINS_PASSWORD}@${process.env.JENKINS_HOST}:${process.env.JENKINS_PORT}`;
module.exports = {
	JENKINS_URL: jenkensURL,
	JENKINS_SERVICE_URL: jenkinsServiceURL,
	JENKINS_USER: process.env.JENKINS_USER,
	JENKINS_PASSWORD: process.env.JENKINS_PASSWORD,
	GIT_TOKEN: process.env.GIT_TOKEN,
	GIT_REGISTRY: process.env.GIT_REGISTRY,
};
