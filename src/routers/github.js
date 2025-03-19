const express = require('express');
const { getUserRepos } = require('../api/github');

const router = express.Router();

// 获取 GitHub 仓库
router.get('/repos', async (req, res) => {
	try {
		const repos = await getUserRepos();
		res.json(repos);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

module.exports = router;
