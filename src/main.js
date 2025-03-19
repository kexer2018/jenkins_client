const express = require('express');
const http = require('node:http');

const router = require('./routers');

const setupLogger = require('./utils/logger');
const app = express();

app.use(express.json());

async function appInit() {
	const server = http.createServer(app);
	setupLogger(server);

	app.use('/api', router);
}

appInit()
	.then(() => {
		app.listen(3000, () => {
			console.log('Server started on port 3000');
		});
	})
	.catch((err) => {
		console.error(err);
	});

process.on('uncaughtException', (err) => {
	console.error(err);
	process.exit(1);
});

process.on('unhandledRejection', (err) => {
	console.error(err);
	process.exit(1);
});
