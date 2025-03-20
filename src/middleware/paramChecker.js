const Validator = require('fastest-validator');
const v = new Validator();

function check(schema, data) {
	if (!data) {
		throw new Error('schema is required');
	}

	try {
		const check = v.compile(schema);
		check(data);
	} catch (err) {
		console.error('API参数验证错误: ', err.message);
		throw new Error(err.message);
	}
}

module.exports = check;
