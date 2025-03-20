const { Router } = require('express');
const router = Router();
const gitRouter = require('./git');
const jenkinsRouter = require('./jenkins');
const userRouter = require('./user');

router.use('/git', gitRouter);
router.use('/jenkins', jenkinsRouter);
router.use('/user', userRouter);

module.exports = router;
