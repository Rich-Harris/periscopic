import { walk } from 'estree-walker';
import { Node, VariableDeclaration, ClassDeclaration, VariableDeclarator, Property, RestElement, Identifier } from 'estree';
import is_reference from 'is-reference';

export function analyze(expression: Node) {
	const map: WeakMap<Node, Scope> = new WeakMap();
	const globals: Map<string, Node> = new Map();
	const scope = new Scope(null, false);

	const references = [] as [Scope, Identifier][];
	let current_scope = scope;

	walk(expression, {
		enter(node: Node, parent: Node) {
			switch (node.type) {
				case 'Identifier':
					if (is_reference(node, parent)) {
						references.push([current_scope, node]);
					}
					break;

				case 'ImportDeclaration':
					node.specifiers.forEach((specifier: any) => {
						current_scope.declarations.set(specifier.local.name, specifier);
					});
					break;

				case 'FunctionExpression':
				case 'FunctionDeclaration':
				case 'ArrowFunctionExpression':
					if (node.type === 'FunctionDeclaration') {
						if (node.id) {
							current_scope.declarations.set(node.id.name, node);
						}

						map.set(node, current_scope = new Scope(current_scope, false));
					} else {
						map.set(node, current_scope = new Scope(current_scope, false));

						if (node.type === 'FunctionExpression' && node.id) {
							current_scope.declarations.set(node.id.name, node);
						}
					}

					node.params.forEach(param => {
						extract_names(param).forEach(name => {
							current_scope.declarations.set(name, node);
						});
					});
					break;

				case 'ForInStatement':
				case 'ForOfStatement':
					map.set(node, current_scope = new Scope(current_scope, true));
					break;

				case 'BlockStatement':
					map.set(node, current_scope = new Scope(current_scope, true));
					break;

				case 'ClassDeclaration':
				case 'VariableDeclaration':
					current_scope.add_declaration(node);
					break;

				case 'CatchClause':
					map.set(node, current_scope = new Scope(current_scope, true));

					if (node.param) {
						extract_names(node.param).forEach(name => {
							current_scope.declarations.set(name, node.param);
						});
					}
					break;
			}
		},

		leave(node: Node) {
			if (map.has(node)) {
				current_scope = current_scope.parent as Scope;
			}
		}
	});

	for (let i = references.length - 1; i >= 0; --i) {
		const [scope, reference] = references[i];

		if (!scope.references.has(reference.name)) {
			add_reference(scope, reference.name);

			if (!scope.find_owner(reference.name)) {
				globals.set(reference.name, reference);
			}
		}
	}

	return { map, scope, globals };
}

function add_reference(scope: Scope, name: string) {
	scope.references.add(name);
	if (scope.parent) add_reference(scope.parent, name);
}

export class Scope {
	parent: Scope | null;
	block: boolean;
	declarations: Map<string, Node> = new Map();
	initialised_declarations: Set<string> = new Set();
	references: Set<string> = new Set();

	constructor(parent: Scope | null, block: boolean) {
		this.parent = parent;
		this.block = block;
	}

	add_declaration(node: VariableDeclaration | ClassDeclaration) {
		if (node.type === 'VariableDeclaration') {
			if (node.kind === 'var' && this.block && this.parent) {
				this.parent.add_declaration(node);
			} else {
				node.declarations.forEach((declarator: VariableDeclarator) => {
					extract_names(declarator.id).forEach(name => {
						this.declarations.set(name, node);
						if (declarator.init) this.initialised_declarations.add(name);
					});
				});
			}
		} else if (node.id) {
			this.declarations.set(node.id.name, node);
		}
	}

	find_owner(name: string): Scope | null {
		if (this.declarations.has(name)) return this;
		return this.parent && this.parent.find_owner(name);
	}

	has(name: string): boolean {
		return (
			this.declarations.has(name) || (!!this.parent && this.parent.has(name))
		);
	}
}

export function extract_names(param: Node): string[] {
	return extract_identifiers(param).map(node => node.name);
}

export function extract_identifiers(param: Node, nodes = [] as Identifier[]): Identifier[] {
	switch (param.type) {
		case 'Identifier':
			nodes.push(param);
			break;

		case 'MemberExpression':
			let object: any = param;
			while (object.type === 'MemberExpression') object = object.object;
			nodes.push(object);
			break;

		case 'ObjectPattern':
			param.properties.forEach((prop: Property | RestElement) => {
				if (prop.type === 'RestElement') {
					extract_identifiers(prop.argument, nodes);
				} else {
					extract_identifiers(prop.value, nodes);
				}
			});
			break;

		case 'ArrayPattern':
			param.elements.forEach((element: Node) => {
				if (element) extract_identifiers(element, nodes);
			});
			break;

		case 'RestElement':
			extract_identifiers(param.argument, nodes);
			break;

		case 'AssignmentPattern':
			extract_identifiers(param.left, nodes);
			break;
	}

	return nodes;
}
