const axios = require('axios');
const { GIT_TOKEN, GIT_REGISTRY } = require('../config/env');
const check = require('../utils/param-check');

const githubApi = axios.create({
	baseURL: GIT_REGISTRY,
	headers: { Authorization: `Bearer ${GIT_TOKEN}` },
});

// 获取用户所有仓库
async function getUserRepos(req, res) {
	const perPage = parseInt(req.query.per_page, 10) || 100;
	let repos = [];
	let page = 1;
	try {
		while (true) {
			const response = await githubApi.get('/user/repos', {
				params: { per_page: perPage, page },
			});

			if (response.data.length === 0) break;
			repos.push(...response.data);
			page++;
		}

		res.json(repos);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
}

// 获取仓库分支
async function getBranches(req, res) {
	const schema = {
		repo: { type: 'string' },
		owner: { type: 'string' },
	};
	const { repo, owner } = req.query;
	check(schema, { repo, owner });

	const perPage = parseInt(req.query.per_page, 10) || 100;
	const page = parseInt(req.query.page, 10) || 1;

	try {
		const response = await githubApi.get(`/repos/${owner}/${repo}/branches`, {
			params: { per_page: perPage, page },
		});
		res.json(response.data);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
}

module.exports = {
	getUserRepos,
	getBranches,
};
