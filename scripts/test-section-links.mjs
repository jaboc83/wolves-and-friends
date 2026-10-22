import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";
const require = createRequire(import.meta.url);
function load(file) {
  const loadedModule = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  new Function("require", "module", "exports", source)(
    (name) =>
      name.startsWith(".")
        ? load(path.resolve(path.dirname(file), name + ".ts"))
        : require(name),
    loadedModule,
    loadedModule.exports,
  );
  return loadedModule.exports;
}
const Links = load(path.resolve("components/section-links.tsx")).default;
const links = (active) => Links({ active }).props.children;
assert.deepEqual(
  links("palace").map((a) => a.props.children[0]),
  ["Calendar", "Squad", "Table"],
);
assert.equal(links("disc").length, 2);
assert.deepEqual(
  links("all").map((a) => a.props.children[0]),
  ["Calendar"],
);
let focused = false,
  scrolled,
  prevented = false,
  reduce = false;
globalThis.HTMLDetailsElement = class {
  open = false;
  querySelector() {
    return {
      focus: () => {
        focused = true;
      },
    };
  }
  scrollIntoView(options) {
    assert.equal(this.open, true);
    scrolled = options;
  }
};
const panel = new HTMLDetailsElement();
globalThis.document = {
  getElementById: (id) => {
    assert.equal(id, "event-calendar");
    return panel;
  },
};
globalThis.window = { matchMedia: () => ({ matches: reduce }) };
const click = links("wolves")[0].props.onClick;
click({
  preventDefault() {
    prevented = true;
  },
});
assert.ok(panel.open && focused && prevented);
assert.equal(scrolled.behavior, "smooth");
panel.open = false;
reduce = true;
click({ preventDefault() {} });
assert.equal(scrolled.behavior, "instant");
assert.ok(panel.open);
console.log(
  "Section links: vocabulary, destinations, expansion, focus, scrolling and reduced motion passed.",
);
