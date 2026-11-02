// node mods/custom-brand/sized.test.mjs
import assert from "node:assert/strict";
import { sizeSvg } from "./sized.js";

const wide = '<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="500" viewBox="0 0 200 50"><rect/></svg>';
assert.equal(sizeSvg(wide, 24), '<svg width="96" height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 50"><rect/></svg>');
// No width/height at all: from the viewBox (commas allowed).
assert.equal(sizeSvg('<svg viewBox="0,0,40,100"></svg>', 30), '<svg width="12" height="30" viewBox="0,0,40,100"></svg>');
// No viewBox: the old size becomes one, so the drawing still fits.
assert.equal(sizeSvg("<svg width='64px' height='64px'><g/></svg>", 24), '<svg width="24" height="24" viewBox="0 0 64 64"><g/></svg>');
// An XML prolog before the tag, and a stroke-width that must stay.
assert.equal(sizeSvg('<?xml version="1.0"?>\n<svg viewBox="0 0 10 10" stroke-width="2">', 20), '<?xml version="1.0"?>\n<svg width="20" height="20" viewBox="0 0 10 10" stroke-width="2">');
// Nothing to go by.
assert.equal(sizeSvg("<svg></svg>", 24), null);
assert.equal(sizeSvg("not svg", 24), null);
assert.equal(sizeSvg('<svg width="100%" height="100%"></svg>', 24), null);
console.log("sized: ok");
