import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { analyze } from '../src/index.js';

const __filename = fileURLToPath(import.meta.url);
const ast = JSON.parse(
	readFileSync(join(__filename, '../svelte-compiler-3.15.0.json'))
);

const runs = [];
const ms = 1e6;

const start = process.hrtime.bigint();

while (process.hrtime.bigint() - start < 1000 * ms) {
	const run_start = process.hrtime.bigint();

	analyze(ast);

	runs.push(process.hrtime.bigint() - run_start);
}

const total = runs.reduce((total, t) => total + t, BigInt(0));
const avg = Number(total / BigInt(runs.length));

console.log(`avg. elapsed time: ${avg / ms}ms over ${runs.length} runs`)
