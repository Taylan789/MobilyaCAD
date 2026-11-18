import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("../src/components/workspace/FurnitureTransformFields.tsx", import.meta.url),
  "utf8"
);

test("mobilya konum eksenleri erişilebilir bir milimetre grubu olarak tanımlanır", () => {
  assert.match(
    source,
    /role="group" aria-label="Mobilya konumu, milimetre"/
  );
  assert.match(source, /aria-describedby="furniture-position-help"/);
  assert.match(source, /id="furniture-position-help"/);
  assert.match(
    source,
    /aria-label=\{\x60\$\{axis\.label\} ekseni konumu, milimetre\x60\}/
  );
});

test("dönüş alanı mevcut 0–359 derece sınırını ve açıklamasını erişilebilir sunar", () => {
  assert.match(source, /min="0"\s+max="359"/);
  assert.match(source, /aria-label="Dönüş açısı, derece"/);
  assert.match(source, /aria-describedby="furniture-rotation-help"/);
  assert.match(source, /id="furniture-rotation-help"/);
  assert.match(source, /Dönüş açısı 0–359° aralığında derece olarak uygulanır\./);
});

test("erişilebilirlik düzenlemesi mm dönüşüm hassasiyetini ve commit davranışını korur", () => {
  assert.match(source, /meters \* 1000\)\.toFixed\(1\)/);
  assert.match(source, /nextPosition\[index\] = parsedValue \/ 1000/);
  assert.match(source, /onPositionCommit\(nextPosition\)/);
  assert.match(source, /onRotationCommit\(parsedValue\)/);
  assert.match(source, /if \(event\.key === "Enter"\) event\.currentTarget\.blur\(\);/);
});
