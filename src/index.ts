import { walk } from 'estree-walker';
import { Node, VariableDeclaration, ClassDeclaration, VariableDeclarator, ObjectPattern, Property, RestElement, ArrayPattern, Identifier, AssignmentPattern } from 'estree';
import is_reference from 'is-reference';

export function analyze(expression: Node) {
	const map: WeakMap<Node, Scope> = new WeakMap();

	let scope = new Scope(null, false);

	walk(expression, {
		enter(node: any, parent: any) {
			if (node.type === 'ImportDeclaration') {
				node.specifiers.forEach((specifier: any) => {
					scope.declarations.set(specifier.local.name, specifier);
				});
			} else if (/(Function(Declaration|Expression)|ArrowFunctionExpression)/.test(node.type)) {
				if (node.type === 'FunctionDeclaration') {
					scope.declarations.set(node.id.name, node);
					map.set(node, scope = new Scope(scope, false));
				} else {
					map.set(node, scope = new Scope(scope, false));
					if (node.type === 'FunctionExpression' && node.id) scope.declarations.set(node.id.name, node);
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
				scope.add_declaration(node);
			} else if (node.type === 'CatchClause') {
				map.set(node, scope = new Scope(scope, true));

				if (node.param) {
					extract_names(node.param).forEach(name => {
						scope.declarations.set(name, node.param);
					});
				}
			}
		},

		leave(node: any) {
			if (map.has(node)) {
				scope = scope.parent;
			}
		}
	});

	const globals: Map<string, Node> = new Map();

	walk(expression, {
		enter(node: any, parent: any) {
			if (map.has(node)) scope = map.get(node);

			if (node.type === 'Identifier' && is_reference(node, parent)) {
				const owner = scope.find_owner(node.name);
				if (!owner) globals.set(node.name, node);

				add_reference(scope, node.name);
			}
		},
		leave(node: any) {
			if (map.has(node)) {
				scope = scope.parent;
			}
		}
	});

	return { map, scope, globals };
}

function add_reference(scope: Scope, name: string) {
	scope.references.add(name);
	if (scope.parent) add_reference(scope.parent, name);
}

export class Scope {
	parent: Scope;
	block: boolean;
	declarations: Map<string, Node> = new Map();
	initialised_declarations: Set<string> = new Set();
	references: Set<string> = new Set();

	constructor(parent: Scope, block: boolean) {
		this.parent = parent;
		this.block = block;
	}


	add_declaration(node: VariableDeclaration | ClassDeclaration) {
		if (node.type === 'VariableDeclaration') {
			if (node.kind === 'var' && this.block && this.parent) {
				this.parent.add_declaration(node);
			} else if (node.type === 'VariableDeclaration') {
				node.declarations.forEach((declarator: VariableDeclarator) => {
					extract_names(declarator.id).forEach(name => {
						this.declarations.set(name, node);
						if (declarator.init) this.initialised_declarations.add(name);
					});
				});
			}
		} else {
			this.declarations.set(node.id.name, node);
		}
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

export function extract_names(param: Node): string[] {
	return extract_identifiers(param).map(node => node.name);
}

export function extract_identifiers(param: Node): Identifier[] {
	const nodes: any[] = [];
	extractors[param.type] && extractors[param.type](nodes, param);
	return nodes;
}

const extractors: Record<string, (nodes: Node[], param: Node) => void> = {
	Identifier(nodes: Node[], param: Node) {
		nodes.push(param);
	},

	MemberExpression(nodes: Node[], param: Node) {
		let object = param;
		while (object.type === 'MemberExpression') object = object.object;
		nodes.push(object);
	},

	ObjectPattern(nodes: Node[], param: ObjectPattern) {
		param.properties.forEach((prop: Property | RestElement) => {
			if (prop.type === 'RestElement') {
				nodes.push(prop.argument);
			} else {
				extractors[prop.value.type](nodes, prop.value);
			}
		});
	},

	ArrayPattern(nodes: Node[], param: ArrayPattern) {
		param.elements.forEach((element: Node) => {
			if (element) extractors[element.type](nodes, element);
		});
	},

	RestElement(nodes: Node[], param: RestElement) {
		extractors[param.argument.type](nodes, param.argument);
	},

	AssignmentPattern(nodes: Node[], param: AssignmentPattern) {
		extractors[param.left.type](nodes, param.left);
	}
};
