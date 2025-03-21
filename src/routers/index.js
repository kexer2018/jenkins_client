const { Router } = require('express');
const router = Router();
const gitRouter = require('./git');
const jenkinsRouter = require('./jenkins');
const userRouter = require('./user');
const testRouter = require('./test');

router.use('/git', gitRouter);
router.use('/jenkins', jenkinsRouter);
router.use('/user', userRouter);

router.use('/test', testRouter);

module.exports = router;
