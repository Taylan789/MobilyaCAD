import { describe, expect, it } from "vitest";
import { HistoryStack } from "../history";
import type { HistoryEntry } from "../history";

function entry(
  label: string,
  furniture: unknown[],
  room: { width: number; length: number; height: number } = {
    width: 4000,
    length: 5000,
    height: 2800
  }
): HistoryEntry {
  return { label, room, furniture };
}

describe("history", () => {
  it("geri al ve yinele sırasını doğru işlemelidir", () => {
    const history = new HistoryStack(entry("başlangıç", [{ id: "a" }]));
    history.push(entry("ekle", [{ id: "a" }, { id: "b" }]));
    history.push(entry("boyutlandır", [{ id: "a" }, { id: "b", w: 900 }]));

    const undone = history.undo();
    expect(undone!.furniture).toEqual([{ id: "a" }, { id: "b" }]);
    expect(history.canUndo).toBe(true);

    const undone2 = history.undo();
    expect(undone2!.furniture).toEqual([{ id: "a" }]);
    expect(history.canUndo).toBe(false);

    const redone = history.redo();
    expect(redone!.furniture).toEqual([{ id: "a" }, { id: "b" }]);
    expect(history.canRedo).toBe(false);
  });

  it("yeni işlem geri al sonrası yinele yığınını temizlemelidir", () => {
    const history = new HistoryStack(entry("başlangıç", []));
    history.push(entry("a", [{ id: "a" }]));
    history.push(entry("b", [{ id: "a" }, { id: "b" }]));
    history.undo();
    history.push(entry("c", [{ id: "a" }, { id: "c" }]));
    expect(history.canRedo).toBe(false);
  });

  it("değişmeyen girişleri yığınlamamalıdır", () => {
    const history = new HistoryStack(entry("başlangıç", [{ id: "a" }]));
    history.push(entry("aynı", [{ id: "a" }]));
    expect(history.canUndo).toBe(false);
  });

  it("yığın sınırlamasına uymalıdır", () => {
    const history = new HistoryStack(entry("başlangıç", []));
    for (let i = 0; i < 80; i++) {
      history.push(entry(`işlem ${i}`, [{ id: String(i) }]));
    }
    expect(history.pastCount).toBeLessThanOrEqual(50);
  });

  it("oda boyutunu da geri almalıdır", () => {
    const history = new HistoryStack(entry("başlangıç", []));
    history.push(
      entry("oda büyüdü", [], { width: 5000, length: 5000, height: 2800 })
    );
    const undone = history.undo();
    expect(undone!.room.width).toBe(4000);
  });

  it("geri alım imkânsızken null dönmelidir", () => {
    const history = new HistoryStack(entry("başlangıç", []));
    expect(history.undo()).toBeNull();
    expect(history.redo()).toBeNull();
  });
});
