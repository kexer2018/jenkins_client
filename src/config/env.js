require('dotenv').config();

module.exports = {
	JENKINS_URL: process.env.JENKINS_URL,
	JENKINS_USER: process.env.JENKINS_USER,
	JENKINS_TOKEN: process.env.JENKINS_TOKEN,
	GITHUB_TOKEN: process.env.GITHUB_TOKEN,
};
