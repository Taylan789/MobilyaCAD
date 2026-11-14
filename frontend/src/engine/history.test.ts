import { describe, it, expect } from "vitest";
import {
  createHistory,
  recordChange,
  undoChange,
  redoChange,
  canUndo,
  canRedo
} from "./history";

describe("history", () => {
  it("ilk durumda geri al/yinele yoktur", () => {
    const stack = createHistory<number>();
    expect(canUndo(stack)).toBe(false);
    expect(canRedo(stack)).toBe(false);
  });

  it("değişiklik kaydettiğinde geri al yapılabilir", () => {
    // Durum 1'den 2'ye, sonra 2'den 3'e değişir.
    let stack = createHistory<number>();
    stack = recordChange(stack, 1);
    stack = recordChange(stack, 2);

    expect(canUndo(stack)).toBe(true);
    expect(canRedo(stack)).toBe(false);

    const first = undoChange(stack, 3)!;
    expect(first.state).toBe(2);
    expect(canRedo(first.stack)).toBe(true);
  });

  it("geri aldıktan sonra yinele eskimişi sonraya döndürür", () => {
    let stack = createHistory<number>();
    stack = recordChange(stack, 1);
    stack = recordChange(stack, 2);

    const undone = undoChange(stack, 3)!;
    const redone = redoChange(undone.stack, 2)!;

    expect(redone.state).toBe(3);
    expect(canUndo(redone.stack)).toBe(true);
    expect(canRedo(redone.stack)).toBe(false);
  });

  it("yeni değişiklik yinele zincirini sıfırlar", () => {
    let stack = createHistory<number>();
    stack = recordChange(stack, 1);
    stack = recordChange(stack, 2);

    const undone = undoChange(stack, 3)!;
    // Geri alındıktan sonra yeni bir değişiklik yapılır.
    const rebased = recordChange(undone.stack, 2);

    expect(canRedo(rebased)).toBe(false);
    expect(canUndo(rebased)).toBe(true);
  });

  it("geçersiz geri al/yinele null döndürür", () => {
    const stack = createHistory<number>();
    expect(undoChange(stack, 1)).toBeNull();
    expect(redoChange(stack, 1)).toBeNull();
  });

  it("geçmiş uzunluğu sınırlıdır", () => {
    let stack = createHistory<number>();
    for (let i = 1; i <= 10; i++) {
      stack = recordChange(stack, i, 3);
    }

    expect(stack.past.length).toBeLessThanOrEqual(3);
    expect(stack.past[stack.past.length - 1]).toBe(10);
  });

  it("sınır en az 1 olmalıdır", () => {
    expect(() => recordChange(createHistory(), 1, 0)).toThrow();
  });

  it("birden fazla geri al sırayla önceki durumlara döner", () => {
    let stack = createHistory<string>();
    stack = recordChange(stack, "a");
    stack = recordChange(stack, "b");

    const u1 = undoChange(stack, "c")!;
    expect(u1.state).toBe("b");

    const u2 = undoChange(u1.stack, "b")!;
    expect(u2.state).toBe("a");

    expect(canUndo(u2.stack)).toBe(false);
    expect(canRedo(u2.stack)).toBe(true);
  });
});
