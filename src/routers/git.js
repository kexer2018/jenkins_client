const { Router } = require('express');
const router = Router();

const { getUserRepos, getBranches } = require('../api/git');

// 获取 GitHub 仓库
router.get('/repos', getUserRepos);
router.get('/branch', getBranches);
module.exports = router;
