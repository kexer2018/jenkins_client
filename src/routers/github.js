const { Router } = require('express');
const router = Router();

const { getUserRepos } = require('../api/github');

// 获取 GitHub 仓库
router.get('/repos', getUserRepos);
module.exports = router;
