const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// const env = process.env.NODE_ENV || 'development';
const jenkinsURL = `http://${process.env.JENKINS_USER}:${process.env.JENKINS_TOKEN}@${process.env.JENKINS_URL}`;
module.exports = {
	JENKINS_URL: jenkinsURL,
	GIT_TOKEN: process.env.GIT_TOKEN,
	GIT_REGISTRY: process.env.GIT_REGISTRY,
};
