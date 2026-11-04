const http = require('node:http');
const models = [
	{
		id: 'text-model',
		input_modalities: ['text'],
		output_modalities: ['text'],
		supported_features: [],
		pricing: { output_token: 0.1 },
	},
	{
		id: 'tool-model',
		input_modalities: ['text', 'image'],
		output_modalities: ['text'],
		supported_features: ['tools', 'reasoning'],
	},
	{ id: 'image-model', input_modalities: ['text'], output_modalities: ['image'] },
];
const server = http.createServer(async (req, res) => {
	res.setHeader('Content-Type', 'application/json');
	if (req.url === '/v1/models' && req.method === 'GET')
		return res.end(JSON.stringify({ object: 'list', data: models }));
	if (req.url !== '/v1/chat/completions' || req.method !== 'POST') {
		res.statusCode = 501;
		return res.end('{}');
	}
	if (req.headers.authorization !== 'Bearer local-test-key') {
		res.statusCode = 401;
		return res.end(
			JSON.stringify({ error: { message: 'Unauthorized', type: 'authentication_error' } }),
		);
	}
	let raw = '';
	for await (const chunk of req) raw += chunk;
	const body = req.body ?? JSON.parse(raw);
	if (!models.some((m) => m.id === body.model && m.output_modalities.includes('text'))) {
		res.statusCode = 404;
		return res.end(JSON.stringify({ error: { message: 'Unknown model' } }));
	}
	if (!Array.isArray(body.messages) || !body.messages.length) {
		res.statusCode = 400;
		return res.end('{}');
	}
	if (body.model === 'text-model' && body.tools?.length) {
		res.statusCode = 400;
		return res.end(JSON.stringify({ error: { message: 'Tools unsupported' } }));
	}
	const toolCall = body.tools?.length && !body.messages.some((m) => m.role === 'tool');
	const message = toolCall
		? {
				role: 'assistant',
				content: null,
				tool_calls: [
					{
						id: 'call_1',
						type: 'function',
						function: { name: body.tools[0].function.name, arguments: '{"city":"Vienna"}' },
					},
				],
			}
		: { role: 'assistant', content: 'Hello from Cortecs' };
	if (body.stream) {
		res.setHeader('Content-Type', 'text/event-stream');
		for (const delta of [{ role: 'assistant', content: '' }, { content: 'Hello from Cortecs' }])
			res.write(
				`data: ${JSON.stringify({ id: 'chatcmpl-local', object: 'chat.completion.chunk', created: 1, model: body.model, choices: [{ index: 0, delta, finish_reason: null }] })}\n\n`,
			);
		res.write(
			`data: ${JSON.stringify({ id: 'chatcmpl-local', object: 'chat.completion.chunk', created: 1, model: body.model, choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] })}\n\n`,
		);
		return res.end('data: [DONE]\n\n');
	}
	res.end(
		JSON.stringify({
			id: 'chatcmpl-local',
			object: 'chat.completion',
			created: 1,
			model: body.model,
			choices: [{ index: 0, message, finish_reason: toolCall ? 'tool_calls' : 'stop' }],
			usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
		}),
	);
});
server.listen(process.env.PORT || 4500, '127.0.0.1', () => {
	if (process.send) process.send({ port: server.address().port });
});
