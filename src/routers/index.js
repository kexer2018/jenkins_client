const { Router } = require('express');
const router = Router();
const githubRouter = require('./github');
const jenkinsRouter = require('./jenkins');
const userRouter = require('./user');

router.use('/github', githubRouter);
router.use('/jenkins', jenkinsRouter);
router.use('/user', userRouter);

module.exports = router;
