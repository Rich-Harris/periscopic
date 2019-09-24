import * as assert from 'assert';
import * as acorn from 'acorn';
import { analyze, extract_identifiers, extract_names } from '../src/index';

const parse = str => acorn.parse(str, {
	ecmaVersion: 2019,
	sourceType: 'module'
});

describe('analyze', () => {
	it('analyzes a program', () => {
		const program = parse(`
			const a = b;
		`);

		const { map, globals, scope } = analyze(program);

		assert.equal(globals.size, 1);
		assert.ok(globals.has('b'));

		assert.equal(scope.declarations.size, 1);
		assert.ok(scope.declarations.has('a'));

		assert.equal(scope.references.size, 2);
		assert.ok(scope.references.has('a'));
		assert.ok(scope.references.has('b'));

		const a = scope.declarations.get('a');
		assert.equal(a.type, 'VariableDeclarator');
		assert.equal(a.id.name, 'a');
	});
});

describe('extract_identifiers', () => {
	it('extracts identifier nodes', () => {
		const program: any = parse(`
			function foo({ a, b: [c, d] = e }) {
				return a + c + d;
			}
		`);

		const param = program.body[0].params[0];

		assert.deepEqual(extract_identifiers(param), [
			{ type: 'Identifier', name: 'a', start: 19, end: 20 },
			{ type: 'Identifier', name: 'c', start: 26, end: 27 },
			{ type: 'Identifier', name: 'd', start: 29, end: 30 }
		]);
	});
});

describe('extract_names', () => {
	it('extracts identifier nodes', () => {
		const program: any = parse(`
			function foo({ a, b: [c, d] = e }) {
				return a + c + d;
			}
		`);

		const param = program.body[0].params[0];

		assert.deepEqual(extract_names(param), ['a', 'c', 'd']);
	});
});
