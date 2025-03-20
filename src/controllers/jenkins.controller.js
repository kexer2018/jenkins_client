const { instance: jenkinsSer } = require('../services/jenkens.service');
const check = require('../middleware/paramChecker');
const { defaultXml } = require('../utils/xml');

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
	check(schema, opts);
	try {
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
	check(schema, opts);
	try {
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
	check(schema, opts);
	try {
		await jenkinsSer.termBuild(opts);
		res.json({});
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
}
async function createJob(req, res) {
	const schema = {
		name: { type: 'string' },
		xml: { type: 'string' },
	};
	const opts = req.body;
	if (!opts.xml) {
		opts.xml = defaultXml;
	}
	check(schema, opts);
	try {
		await jenkinsSer.createJob(opts);
		res.json({});
	} catch (err) {
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
	check(schema, opts);
	try {
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
	check(schema, name);
	try {
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
	check(schema, name);
	try {
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
	const name = req.params;
	check(schema, name);
	try {
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
	check(schema, name);
	try {
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
	check(schema, name);
	try {
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
	check(schema, { name, enable });
	try {
		await jenkinsSer.updateEnableJob(name, enable);
		res.json({});
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
};
