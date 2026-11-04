import {
	analyzePackage,
	SOURCE_FILE_PATTERNS,
} from '@n8n/scan-community-package/scanner/scanner.mjs';
import { resolve } from 'node:path';
for (const [name, directory, patterns] of [
	['source', process.cwd(), SOURCE_FILE_PATTERNS],
	['distribution', resolve('dist'), ['**/*.js']],
]) {
	const result = await analyzePackage(directory, patterns);
	console.log(`${name}: ${result.passed ? 'PASS' : 'FAIL'}`);
	if (!result.passed) {
		console.error(result.details ?? result.message);
		process.exitCode = 1;
	}
}
