const Validator = require('fastest-validator');
const v = new Validator({ haltOnFirstError: true });

function check(schema, data) {
	if (!data || typeof data !== 'object') {
		throw new Error('data is required');
	}

	const checker = v.compile(schema);
	if (!checker || typeof checker !== 'function') {
		throw new Error('Schema compilation failed. Invalid schema.');
	}
	const result = checker(data);
	if (result !== true) {
		const errorMessage = (Array.isArray(result) && result[0]?.message) || 'Validation failed';
		throw new Error(errorMessage);
	}
}

module.exports = check;
