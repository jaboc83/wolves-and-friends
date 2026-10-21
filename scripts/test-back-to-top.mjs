import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

const source = fs.readFileSync("lib/page-scroll.ts", "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const loadedModule = { exports: {} };
new Function("loadedModule", "exports", compiled)(
  loadedModule,
  loadedModule.exports,
);
const { pageScrollTop } = loadedModule.exports;

assert.equal(pageScrollTop(0, 0, { scrollTop: 800 }, 0, 0), 800);
assert.equal(pageScrollTop(0, 0, null, 600, 0), 600);
assert.equal(pageScrollTop(0, 500, { scrollTop: 300 }, 0, 0), 500);

const component = fs.readFileSync("components/back-to-top.tsx", "utf8");
const styles = fs.readFileSync("app/globals.css", "utf8");
assert.ok(
  component.includes("createPortal(") && component.includes("document.body"),
);
assert.ok(component.includes('document.addEventListener("scroll"'));
assert.ok(component.includes('visualViewport?.addEventListener("scroll"'));
assert.ok(component.includes("document.scrollingElement?.scrollTo"));
assert.ok(styles.includes("z-index: 2147483000"));

console.log("Back-to-top scroll-root handling and body portal passed.");
