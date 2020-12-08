import * as uvu from 'uvu';
import * as assert from 'uvu/assert';
import * as acorn from 'acorn';
import { analyze, extract_identifiers, extract_names } from '../src/index';
import { Node } from 'estree';
import { walk } from 'estree-walker';

const parse = str => acorn.parse(str, {
	ecmaVersion: 2019,
	sourceType: 'module'
});

function describe(name, fn) {
	const suite = uvu.suite(name);
	fn(suite);
	suite.run();
}

function pojo(obj) {
	return JSON.parse(JSON.stringify(obj));
}

describe('analyze', it => {
	it('analyzes a program', () => {
		const program = parse(`
			const a = b;
		`);

		const { map, globals, scope } = analyze(program as Node);

		assert.equal(globals.size, 1);
		assert.ok(globals.has('b'));

		assert.equal(scope.declarations.size, 1);
		assert.ok(scope.declarations.has('a'));

		assert.equal(scope.references.size, 2);
		assert.ok(scope.references.has('a'));
		assert.ok(scope.references.has('b'));

		const a = scope.declarations.get('a');
		assert.equal(pojo(a), {
			type: 'VariableDeclaration',
			start: 4,
			end: 16,
			kind: 'const',
			declarations: [
				{
					type: 'VariableDeclarator',
					start: 10,
					end: 15,
					id: {
						type: 'Identifier',
						name: 'a',
						start: 10,
						end: 11
					},
					init: {
						type: 'Identifier',
						name: 'b',
						start: 14,
						end: 15
					}
				}
			]
		});
	});

	it('extracts all references', () => {
		const program = parse(`
			function foo() {
				const bar = 1;
				baz();
			}
		`);

		const { scope } = analyze(program as Node);

		assert.equal(scope.references, new Set(['foo', 'bar', 'baz']))
	});

	it('tracks all scopes', () => {
		const program = parse(`
			function foo() {}
			const bar = function bar() {};
			const baz = () => {};
			for (let i = 0; i < 10; ++i) {}
			for (let k in obj) {}
			for (let v of obj) {}
			try {} catch (e) {}
		`) as Node;

		const { map } = analyze(program);
		const scopes: Node[] = [];

		walk(program, {
			enter(node) {
				if (map.has(node)) {
					scopes.push(node);
				}
			}
		});

		assert.equal(scopes.length, 15);
	});
});

describe('extract_identifiers', it => {
	it('extracts identifier nodes', () => {
		const program: any = parse(`
			function foo({ a, b: [c, d] = e }) {
				return a + c + d;
			}
		`);

		const param = program.body[0].params[0];

		assert.equal(pojo(extract_identifiers(param)), [
			{ type: 'Identifier', name: 'a', start: 19, end: 20 },
			{ type: 'Identifier', name: 'c', start: 26, end: 27 },
			{ type: 'Identifier', name: 'd', start: 29, end: 30 }
		]);
	});
});

describe('extract_names', it => {
	it('extracts identifier nodes', () => {
		const program: any = parse(`
			function foo({ a, b: [c, d] = e }) {
				return a + c + d;
			}
		`);

		const param = program.body[0].params[0];

		assert.equal(extract_names(param), ['a', 'c', 'd']);
	});
});

describe('extract_globals', it => {
	it('extract globals correctly', () => {
		const program = parse(`
			const a = b;
			c;
		`);

		const { globals } = analyze(program);
		assert.equal(globals.size, 2);
		assert.ok(globals.has('b'));
		assert.ok(globals.has('c'));
	});

	it('understand block scope', () => {
		const program = parse(`
			const a = b + c;
			let b;
			{
				h;
			}
			let h;
			function foo(d) {
				const g = d + e + f;
				let e;
			}
		`);

		const { globals } = analyze(program);
		assert.equal(globals.size, 2);
		assert.ok(globals.has('f'));
		assert.ok(globals.has('c'));
	});
});
