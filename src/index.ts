import { walk } from 'estree-walker';
import is_reference from 'is-reference';

export function analyze(expression: any) {
	const map: WeakMap<any, Scope> = new WeakMap();

	let scope = new Scope(null, false);

	let stack: Scope[] = [];

	walk(expression, {
		enter(node: any, parent: any) {
			if (node.type === 'ImportDeclaration') {
				node.specifiers.forEach((specifier: any) => {
					scope.declarations.set(specifier.local.name, specifier);
				});
			} else if (/Function/.test(node.type)) {
				if (node.type === 'FunctionDeclaration') {
					scope.declarations.set(node.id.name, node);
					map.set(node, scope = new Scope(scope, false));
				} else {
					map.set(node, scope = new Scope(scope, false));
					if (node.id) scope.declarations.set(node.id.name, node);
				}

				node.params.forEach((param: any) => {
					extract_names(param).forEach(name => {
						scope.declarations.set(name, node);
					});
				});
			} else if (/For(?:In|Of)?Statement/.test(node.type)) {
				map.set(node, scope = new Scope(scope, true));
			} else if (node.type === 'BlockStatement') {
				map.set(node, scope = new Scope(scope, true));
			} else if (/(Class|Variable)Declaration/.test(node.type)) {
				add_declaration(scope, node);
			} else if (node.type === 'CatchClause') {
				map.set(node, scope = new Scope(scope, true));

				extract_names(node.param).forEach(name => {
					scope.declarations.set(name, node.param);
				});
			} else if (node.type === 'Identifier' && is_reference(node, parent)) {
				add_reference(scope, node.name);
			}
		},

		leave(node: any) {
			if (map.has(node)) {
				scope = scope.parent;
			}
		}
	});

	const globals: Set<string> = new Set();

	scope.references.forEach(name => {
		if (!scope.declarations.has(name)) {
			globals.add(name);
		}
	});

	return { map, scope, globals };
}

function add_declaration(scope: Scope, node: any) {
	if (node.kind === 'var' && scope.block && scope.parent) {
		add_declaration(scope.parent, node);
	} else if (node.type === 'VariableDeclaration') {
		node.declarations.forEach((declarator: any) => {
			extract_names(declarator.id).forEach(name => {
				scope.declarations.set(name, declarator);
			});
		});
	} else {
		scope.declarations.set(node.id.name, node);
	}
}

function add_reference(scope: Scope, name: string) {
	scope.references.add(name);
	if (scope.parent) add_reference(scope.parent, name);
}

export class Scope {
	parent: Scope;
	block: boolean;
	declarations: Map<string, any> = new Map();
	references: Set<string> = new Set();

	constructor(parent: Scope, block: boolean) {
		this.parent = parent;
		this.block = block;
	}

	find_owner(name: string): Scope {
		if (this.declarations.has(name)) return this;
		return this.parent && this.parent.find_owner(name);
	}

	has(name: string): boolean {
		return (
			this.declarations.has(name) || (this.parent && this.parent.has(name))
		);
	}
}

export function extract_names(param: any) {
	return extract_identifiers(param).map(node => node.name);
}

export function extract_identifiers(param: any) {
	const nodes: any[] = [];
	extractors[param.type] && extractors[param.type](nodes, param);
	return nodes;
}

const extractors: Record<string, (nodes: any[], param: any) => void> = {
	Identifier(nodes: any[], param: any) {
		nodes.push(param);
	},

	MemberExpression(nodes: any[], param: any) {
		let object = param;
		while (object.type === 'MemberExpression') object = object.object;
		nodes.push(object);
	},

	ObjectPattern(nodes: any[], param: any) {
		param.properties.forEach((prop: any) => {
			if (prop.type === 'RestElement') {
				nodes.push(prop.argument);
			} else {
				extractors[prop.value.type](nodes, prop.value);
			}
		});
	},

	ArrayPattern(nodes: any[], param: any) {
		param.elements.forEach((element: any) => {
			if (element) extractors[element.type](nodes, element);
		});
	},

	RestElement(nodes: any[], param: any) {
		extractors[param.argument.type](nodes, param.argument);
	},

	AssignmentPattern(nodes: any[], param: any) {
		extractors[param.left.type](nodes, param.left);
	}
};
