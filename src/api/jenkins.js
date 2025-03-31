const axios = require('axios');
const FormData = require('form-data');
const { JENKINS_URL, JENKINS_USER, JENKINS_PASSWORD } = require('../config/env');

const jenkinsApi = axios.create({
	baseURL: JENKINS_URL,
	auth: {
		username: JENKINS_USER,
		password: JENKINS_PASSWORD,
	},
});

const JsonUrl = '/pipeline-model-converter/toJson';

async function convertPipelineToJson(groovyScript) {
	const form = new FormData();
	form.append('jenkinsfile', groovyScript);
	const response = await jenkinsApi.post(JsonUrl, form, {
		headers: {
			...form.getHeaders(),
		},
	});

	return response.data;
}

module.exports = {
	convertPipelineToJson,
};
