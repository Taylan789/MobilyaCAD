import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const component = readFileSync(new URL("../src/components/production/DrawerBoxConfigurator.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/components/production/DrawerBoxConfigurator.css", import.meta.url), "utf8");

test("optional drawer material, edge-band and grain settings start collapsed", () => {
  assert.match(component, /<details className="cad-drawer-config-disclosure cad-drawer-config-disclosure--materials">\s*<summary>Panel grubu malzeme atamaları<\/summary>/);
  assert.match(component, /<details className="cad-drawer-config-disclosure cad-drawer-config-disclosure--edges">\s*<summary>Kenar bantlama<\/summary>/);
  assert.match(component, /<details className="cad-drawer-config-disclosure cad-drawer-config-disclosure--grain">\s*<summary>Damar yönü<\/summary>/);
  assert.doesNotMatch(component, /<details[^>]*\sopen(?:=|\s|>)/);
  assert.match(component, /import "\.\/DrawerBoxConfigurator\.css";/);
});

test("advanced controls retain existing draft, validation and production calculation wiring", () => {
  assert.match(component, /draft\.panelMaterialIds\[group\.key\]/);
  assert.match(component, /draft\.edgeBanding\[group\.key\]\[edge\.key\]/);
  assert.match(component, /draft\.grainDirection\[group\.key\]/);
  assert.match(component, /function saveConfig\(/);
  assert.match(component, /calculateDrawerBoxParts\(/);
  assert.match(component, /onChange\(/);
});

test("disclosures remain keyboard-visible, responsive and accessible in reduced-motion/high-contrast modes", () => {
  assert.match(styles, /summary:focus-visible/);
  assert.match(styles, /@media \(max-width: 600px\)/);
  assert.match(styles, /@media \(forced-colors: active\)/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(styles, /grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
});
