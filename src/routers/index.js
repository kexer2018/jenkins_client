const express = require('express');
const router = express.Router();
const githubRouter = require('./github');
const jenkinsRouter = require('./jenkins');

router.use('/github', githubRouter);
router.use('/jenkins', jenkinsRouter);

module.exports = router;
