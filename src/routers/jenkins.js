const { Router } = require('express');
const router = Router();
const jenkinsCtrl = require('../controllers/jenkins.controller');

// plugin
router.get('/plugin/list', jenkinsCtrl.getPluginList);

// build
router.get('/info', jenkinsCtrl.getJenkinsinfo);
router.get('/build/info', jenkinsCtrl.getBuildInfo);
router.post('/build/stop', jenkinsCtrl.stopBuild);
router.post('/build/term', jenkinsCtrl.termBuild);

// job
router.post('/job', jenkinsCtrl.createJob);
router.post('/job/build', jenkinsCtrl.jobBuild);
router.get('/job/list', jenkinsCtrl.getJobList);
router.get('/job/config/:name', jenkinsCtrl.getJobConfig);
router.get('/job/:name', jenkinsCtrl.getJobInfo);
router.get('/job/check/:name', jenkinsCtrl.checkExistsJob);
router.delete('/job/:name', jenkinsCtrl.deleteJob);
router.put('/job/:name', jenkinsCtrl.updateEnableJob);

// queue
router.get('/queue/list', jenkinsCtrl.getQueueList);
router.get('/queue/:id', jenkinsCtrl.getItemInfo);
router.delete('/queue/:id', jenkinsCtrl.cancelItem);

// view
router.get('/view/:name', jenkinsCtrl.getViewInfo);
router.get('/view/list', jenkinsCtrl.getViewList);

module.exports = router;
