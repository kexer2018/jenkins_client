const fsPromises = require('node:fs/promises');
const path = require('node:path');
const { EventEmitter } = require('events');

class TemplateGenerator extends EventEmitter {
	constructor({ type } = { type: 'flow' }) {
		super();
		this.type = type;

		this.on('error', (err) => {
			console.log(err.message);
		});
	}

	async pick(type) {
		if (!type) {
			throw new Error('type is required');
		}
		let item = type;
		if (type === 'freestyle') {
			item = 'frees-tyle';
		}
		if (type === 'multibranch') {
			item = 'multi-branch';
		}
		const templatePath = path.resolve(__dirname, `./projects/${item}.xml`);
		return await fsPromises.readFile(templatePath, 'utf-8');
	}

    
}

module.exports = TemplateGenerator;
