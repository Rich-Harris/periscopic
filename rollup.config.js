import sucrase from 'rollup-plugin-sucrase';
import pkg from './package.json';

export default {
	input: 'src/index.ts',
	output: [
		{ file: pkg.main, format: 'cjs', name: 'periscopic' },
		{ file: pkg.module, format: 'esm' }
	],
	external: Object.keys(pkg.dependencies),
	plugins: [
		sucrase({
			transforms: ['typescript']
		})
	]
};
