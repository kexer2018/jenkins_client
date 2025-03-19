const WebSocket = require('ws');
module.exports = function setupLogger(server) {
	const wss = new WebSocket.Server({ server });
	console.log('----------->log');

	// wss.on('connection', (ws, req) => {
	// 	const jobName = req.url.split('/').pop();
	// 	const stream = jenkins.build.logStream(jobName, 'lastBuild');

	// 	stream.on('data', (text) => ws.send(text));
	// 	stream.on('error', () => ws.close());
	// });
};
