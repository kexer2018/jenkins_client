const axios = require('axios');
const { GIT_TOKEN, GIT_REGISTRY } = require('../config/env');

const githubApi = axios.create({
	baseURL: GIT_REGISTRY,
	headers: { Authorization: `Bearer ${GIT_TOKEN}` },
});

// 获取用户所有仓库
async function getUserRepos() {
	try {
		const response = await githubApi.get('/user/repos');
		return response.data.map((repo) => repo.name);
	} catch (error) {
		throw new Error(error.response?.data?.message || 'Failed to fetch Git repositories');
	}
}

module.exports = { getUserRepos };
