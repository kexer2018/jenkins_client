const { instance: jenkinsSer } = require('../services/jenkens.service');
const check = require('../utils/param-check');

async function getJenkinsinfo(req, res) {
	try {
		const info = await jenkinsSer.getJenkinsinfo();
		res.json(info);
	} catch (error) {
		console.error('error', error.stack);
		res.status(500).json({ error: error.message });
	}
}

async function getBuildInfo(req, res) {
	const schema = {
		name: { type: 'string' },
		number: { type: 'number', integer: true },
	};
	const opts = req.query;
	try {
		check(schema, opts);
		const buildInfo = await jenkinsSer.getBuildInfo(opts);
		res.json(buildInfo);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
}

async function stopBuild(req, res) {
	const schema = {
		name: { type: 'string' },
		number: { type: 'number', integer: true },
	};
	const opts = req.body;
	try {
		check(schema, opts);
		await jenkinsSer.stopBuild(opts);
		res.json({});
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
}

async function termBuild(req, res) {
	const schema = {
		name: { type: 'string' },
		number: { type: 'number', integer: true },
	};
	const opts = req.body;
	try {
		check(schema, opts);
		await jenkinsSer.termBuild(opts);
		res.json({});
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
}
async function createJob(req, res) {
	const schema = {
		name: { type: 'string' },
		type: { type: 'enum', values: ['flow', 'freestyle', 'matrix', 'multibranch'] },
		config: { type: 'object' },
	};
	const opts = req.body;

	try {
		check(schema, opts);
		await jenkinsSer.createJob(opts);
		res.json({});
	} catch (err) {
		console.error('error', err.stack);
		res.status(500).json({ error: err.message });
	}
}

async function jobBuild(req, res) {
	const schema = {
		name: { type: 'string' },
		parameters: { type: 'object', optional: true },
		token: { type: 'string', optional: true },
	};
	const opts = req.body;
	try {
		check(schema, opts);
		const { name, parameters = {}, token = '' } = opts;
		await jenkinsSer.jobBuild({ name, parameters, token });
		res.json({});
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
}

async function getJobConfig(req, res) {
	const schema = {
		name: { type: 'string' },
	};
	const name = req.params;
	try {
		check(schema, name);
		const config = await jenkinsSer.getJobConfig(name);
		res.json(config);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
}

async function getJobList(req, res) {
	const schema = {
		name: { type: 'string', optional: true },
	};
	const name = req.params;
	try {
		check(schema, name);
		const list = await jenkinsSer.getJobList(name);
		res.json(list);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
}

async function getJobInfo(req, res) {
	const schema = {
		name: { type: 'string' },
	};
	const { name } = req.params;
	try {
		check(schema, { name });
		const config = await jenkinsSer.getJobInfo(name);
		res.json(config);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
}

async function checkExistsJob(req, res) {
	const schema = {
		name: { type: 'string' },
	};
	const name = req.params;
	try {
		check(schema, name);
		const exists = await jenkinsSer.checkExistsJob(name);
		res.json(exists);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
}

async function deleteJob(req, res) {
	const schema = {
		name: { type: 'string' },
	};
	const name = req.params;
	try {
		check(schema, name);
		await jenkinsSer.deleteJob(name);
		res.json({});
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
}

async function updateEnableJob(req, res) {
	const schema = {
		name: { type: 'string' },
		enable: { type: 'boolean' },
	};
	const name = req.params;
	const { enable } = req.body;
	try {
		check(schema, { name, enable });
		await jenkinsSer.updateEnableJob(name, enable);
		res.json({});
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
}

async function getQueueList(req, res) {
	try {
		const list = await jenkinsSer.queueList();
		res.json(list);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
}

async function getItemInfo(req, res) {
	const schema = {
		id: { type: 'number' },
	};
	const { id } = req.params;
	try {
		check(schema, { id });
		const itemInfo = await jenkinsSer.getItemInfo(id);
		res.json(itemInfo);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
}

async function cancelItem(req, res) {
	const schema = {
		id: { type: 'number' },
	};
	const { id } = req.params;
	try {
		check(schema, { id });
		await jenkinsSer.cancelItem(id);
		res.json({});
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
}

async function getViewInfo(req, res) {
	const schema = {
		name: { type: 'string' },
	};
	const { name } = req.params;
	try {
		check(schema, { name });
		const viewInfo = await jenkinsSer.getViewInfo(name);
		res.json(viewInfo);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
}

async function getViewList(req, res) {
	try {
		const list = await jenkinsSer.getViewList();
		res.json(list);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
}

module.exports = {
	getJenkinsinfo,
	getBuildInfo,
	stopBuild,
	termBuild,
	jobBuild,
	getJobConfig,
	getJobInfo,
	createJob,
	getJobList,
	checkExistsJob,
	deleteJob,
	updateEnableJob,
	getQueueList,
	getItemInfo,
	cancelItem,
	getViewInfo,
	getViewList,
};
