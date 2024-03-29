# periscopic changelog

## 4.0.2

- Fix bugs

## 4.0.1

- Bump deps

## 4.0.0

- Switch from `estree-walker` to `zimmerframe` ([#20](https://github.com/Rich-Harris/periscopic/pull/20))
- Create scope for `SwitchStatement` ([#18](https://github.com/Rich-Harris/periscopic/pull/18))
- Expose `default` key in `pkg.exports` rather than `import` ([#17](https://github.com/Rich-Harris/periscopic/pull/17))
- Don't treat `export-from` specifiers as global references ([#16](https://github.com/Rich-Harris/periscopic/pull/16))

## 3.1.0

- Add `types` export ([#19](https://github.com/Rich-Harris/periscopic/pull/19))
- Promote `@types/estree` to `dependencies` ([#19](https://github.com/Rich-Harris/periscopic/pull/19))
- Update dependencies

## 3.0.4

- Update `is-reference` ([#15](https://github.com/Rich-Harris/periscopic/pull/15))
- Work around broken `eslintplugin-import` ([#14](https://github.com/Rich-Harris/periscopic/pull/14))

## 3.0.3

- Fix global detection ([#12](https://github.com/Rich-Harris/periscopic/pull/12))

## 3.0.2

- Tidy up types

## 3.0.1

- Update `estree-walker` to 3.0.0 to solve transitive dependency issues ([#11](https://github.com/Rich-Harris/periscopic/pull/11))

## 3.0.0

- Remove CommonJS vestiges

## 2.0.3

- Convert to JavaScript

## 2.0.2

- Performance improvements ([#5](https://github.com/Rich-Harris/periscopic/pull/5))

## 2.0.1

- Fix reference extraction

## 2.0.0

- Match API used by Svelte's internal helpers ([#4](https://github.com/Rich-Harris/periscopic/pull/4))
  - Change `globals` to a `Map<string, Node>`
  - Change value of `scope.declarations` to the variable declaration, not declarator

## 1.1.0

- Add `add_declaration` method and `initialised_declarations` set to `Scope` ([#2](https://github.com/Rich-Harris/periscopic/pull/2))
- Fix false positive global detection ([#1](https://github.com/Rich-Harris/periscopic/pull/1))

## 1.0.2

- Handle parameter-less catch clauses

## 1.0.1

- Only attach scope-creating nodes to the scope map

## 1.0.0

- First release
