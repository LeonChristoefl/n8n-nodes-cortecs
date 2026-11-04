const { spawn } = require('node:child_process');
const { resolve } = require('node:path');
const { once } = require('node:events');
(async () => {
	const server = spawn(process.execPath, [resolve(__dirname, 'fixtures/cortecs-server.cjs')], {
		env: { ...process.env, PORT: '0' },
		stdio: ['ignore', 'pipe', 'inherit', 'ipc'],
	});
	try {
		const [{ port }] = await Promise.race([
			once(server, 'message'),
			once(server, 'exit').then(() => {
				throw new Error('Local mock exited before startup');
			}),
			new Promise((_, reject) => {
				setTimeout(() => reject(new Error('Local mock startup timed out')), 10000).unref();
			}),
		]);
		const runner = spawn(process.execPath, ['--test', 'tests/node.test.cjs'], {
			stdio: 'inherit',
			env: { ...process.env, CORTECS_TEST_BASE_URL: `http://127.0.0.1:${port}` },
		});
		const [code] = await once(runner, 'exit');
		process.exitCode = code ?? 1;
	} finally {
		server.kill();
	}
})().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
