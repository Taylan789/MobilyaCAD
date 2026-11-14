// Geri al / yinele geçmiş yığını.
// Her kayıt sahne anlık görüntüsüdür; geçmiş uzunluğu sınırlıdır.

export interface HistoryStack<T> {
  past: T[];
  future: T[];
}

export function createHistory<T>(): HistoryStack<T> {
  return { past: [], future: [] };
}

// Yeni bir değişiklik kaydettiğinde geçmişe anlık görüntü eklenir
// ve "yinele" zinciri sıfırlanır.
export function recordChange<T>(
  stack: HistoryStack<T>,
  current: T,
  limit = 50
): HistoryStack<T> {
  if (limit < 1) {
    throw new Error("Geçmiş sınırı en az 1 olmalıdır.");
  }

  const trimmed = stack.past.slice(-(limit - 1));

  return {
    past: [...trimmed, current],
    future: []
  };
}

// Geri al işlemi: önceki anlık görüntüyü döndürür.
export function undoChange<T>(
  stack: HistoryStack<T>,
  current: T
): { stack: HistoryStack<T>; state: T } | null {
  if (stack.past.length === 0) return null;

  const previous = stack.past[stack.past.length - 1];

  return {
    stack: {
      past: stack.past.slice(0, -1),
      future: [current, ...stack.future]
    },
    state: previous
  };
}

// Yinele işlemi: sonraki anlık görüntüyü döndürür.
export function redoChange<T>(
  stack: HistoryStack<T>,
  current: T
): { stack: HistoryStack<T>; state: T } | null {
  if (stack.future.length === 0) return null;

  const next = stack.future[0];

  return {
    stack: {
      past: [...stack.past, current],
      future: stack.future.slice(1)
    },
    state: next
  };
}

export function canUndo<T>(stack: HistoryStack<T>): boolean {
  return stack.past.length > 0;
}

export function canRedo<T>(stack: HistoryStack<T>): boolean {
  return stack.future.length > 0;
}
