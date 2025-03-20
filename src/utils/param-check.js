const Validator = require('fastest-validator');
const v = new Validator({ haltOnFirstError: true });

function check(schema, data) {
	if (!data || typeof data !== 'object') {
		throw new Error('data is required');
	}

	try {
		const checker = v.compile(schema);
		const result = checker(data);
		if (!result) {
			throw new Error(result[0].message);
		}
	} catch (err) {
		console.error('API参数验证错误: ', err.message);
		throw new Error(err.message);
	}
}

module.exports = check;
