import pkg from './package.json';

export default {
	input: 'src/index.js',
	output: [
		{ file: pkg.main, format: 'cjs', name: 'periscopic' },
		{ file: pkg.module, format: 'esm' }
	],
	external: Object.keys(pkg.dependencies)
};
