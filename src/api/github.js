const axios = require('axios');
const { GITHUB_TOKEN } = require('../config/env');

const githubApi = axios.create({
	baseURL: 'https://api.github.com',
	headers: { Authorization: `token ${GITHUB_TOKEN}` },
});

// 获取用户所有仓库
async function getUserRepos() {
	try {
		const response = await githubApi.get('/user/repos');
		return response.data.map((repo) => repo.name);
	} catch (error) {
		throw new Error(error.response?.data?.message || 'Failed to fetch GitHub repositories');
	}
}

module.exports = { getUserRepos };
