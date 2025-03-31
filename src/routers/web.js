/**
 * Copyright (c) 2025 SylixOS Team.
 * All rights reserved.
 *
 * Author : ZhangXiao <zhangxiao@acoinfo.com>
 * File   : xxx
 * Desc   : 前端界面点击选择配置,更新配置项,然后生成配置文件
 */

const { Router } = require('express');
const router = Router();

router.post('/config', (req, res) => {
    // 增加任务,更新任务,给某个stage下添加一个step
    // 现在能做的是已经可以解析出stage和step的部分
});

router.post('/param', (req, res) => {});

module.exports = router;
