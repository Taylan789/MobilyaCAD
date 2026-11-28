import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const studioCss = readFileSync(new URL("../src/styles/cad-studio-refinement.css", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");

test("1440px desktop keeps the full technical docks and a flexible 3D viewport", () => {
  const root = studioCss.match(/:root\s*\{([^}]*)\}/)?.[1] ?? "";
  const viewport = studioCss.match(/\.cad-viewport\s*\{([^}]*)\}/)?.[1] ?? "";
  const mainArea = studioCss.match(/\.cad-main-area\s*\{([^}]*)\}/)?.[1] ?? "";

  assert.match(root, /--cad-dock-left:\s*248px;/);
  assert.match(root, /--cad-dock-right:\s*316px;/);
  assert.match(viewport, /flex:\s*1 1 0% !important;/);
  assert.match(viewport, /min-width:\s*0 !important;/);
  assert.match(mainArea, /grid-template-rows:\s*32px 52px minmax\(0, 1fr\) 164px !important;/);
});

test("1280px desktop compacts the docks while preserving the viewport row", () => {
  const compactDesktop = studioCss.match(
    /@media \(min-width: 761px\) and \(max-width: 1360px\)\s*\{([\s\S]*?)\n\}/,
  )?.[1] ?? "";

  assert.match(compactDesktop, /--cad-dock-left:\s*226px;\s*--cad-dock-right:\s*292px;/);
  assert.match(
    compactDesktop,
    /\.cad-main-area\s*\{[^}]*grid-template-rows:\s*30px 49px minmax\(0, 1fr\) 154px !important;/s,
  );
});

test("desktop refinement retains reduced-motion support", () => {
  assert.match(
    studioCss,
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*?transition-duration:\s*\.01ms !important;/,
  );
});


test("1280px command bar keeps primary actions labeled and secondary actions accessible", () => {
  const compactCommandBar = studioCss.match(
    /@media \(min-width: 761px\) and \(max-width: 1280px\)\s*\{([\s\S]*?)\n\}/,
  )?.[1] ?? "";

  assert.match(compactCommandBar, /\.cad-top-right \.cad-home-button[\s\S]*?width:\s*34px !important;/);
  assert.match(compactCommandBar, /\.cad-top-right \.cad-new-project-button[\s\S]*?width:\s*34px !important;/);
  assert.match(compactCommandBar, /\.cad-top-right \.cad-open-project-button[\s\S]*?width:\s*34px !important;/);
  assert.match(compactCommandBar, /\.cad-top-right \.cad-open-project-button span\s*\{\s*display:\s*none !important;/);

  assert.match(appSource, /className="cad-home-button"[^>]*aria-label="Stüdyoya dön"/s);
  assert.match(appSource, /className="cad-new-project-button"[^>]*aria-label="Yeni proje oluştur"/s);
  assert.match(appSource, /className="cad-open-project-button"[^>]*aria-label="JSON proje dosyası aç"/s);
  assert.match(appSource, /className="cad-save-button"[\s\S]*?<span>Projeyi İndir<\/span>/);
});
