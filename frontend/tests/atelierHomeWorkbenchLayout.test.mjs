
test("short desktop launcher compacts the existing project actions without changing their behavior", () => {
  assert.match(css, /@media \(min-width: 1101px\) and \(min-height: 720px\) and \(max-height: 820px\)/);
  assert.match(css, /\.atelier-welcome \{\s*padding: 20px 22px !important;/);
  assert.match(css, /\.atelier-start-card \{\s*min-height: 144px !important;\s*padding: 10px !important;/);
  assert.match(css, /\.atelier-card-visual \{\s*min-height: 58px !important;/);
  assert.match(css, /\.atelier-empty-project \{\s*min-height: 60px !important;/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /@media \(forced-colors: active\)/);
});
