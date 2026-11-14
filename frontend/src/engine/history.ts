// Geri al / yinele geçmiş servisi.
// Komut tabanlı değil, sınırlı snapshot tabanlı bir mimari kullanır:
// sahne durumu (oda + mobilya listesi) küçük düz JSON olduğundan snapshot'lar
// güvenli ve basittir. Aynı girişler üst üste yazılmaz; uzun oturumlar için
// yığın 50 girişle sınırlıdır.

export interface HistoryEntry {
  label: string;
  room: { width: number; length: number; height: number };
  furniture: unknown[];
}

export class HistoryStack {
  private past: HistoryEntry[] = [];
  private future: HistoryEntry[] = [];
  private readonly limit = 50;

  constructor(initial: HistoryEntry) {
    this.past.push(initial);
  }

  get canUndo(): boolean {
    return this.past.length > 1;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }

  get pastCount(): number {
    return this.past.length;
  }

  get futureCount(): number {
    return this.future.length;
  }

  get undoLabel(): string | null {
    return this.canUndo ? this.past[this.past.length - 1].label : null;
  }

  get redoLabel(): string | null {
    return this.canRedo ? this.future[this.future.length - 1].label : null;
  }

  // Yeni bir durum ekler; önceki durum geri alabilir hâle gelir.
  push(entry: HistoryEntry): void {
    const last = this.past[this.past.length - 1];
    if (
      last &&
      JSON.stringify(last.room) === JSON.stringify(entry.room) &&
      JSON.stringify(last.furniture) === JSON.stringify(entry.furniture)
    ) {
      return;
    }

    this.past.push(entry);
    if (this.past.length > this.limit) {
      this.past.shift();
    }
    this.future = [];
  }

  // Bir önceki durumu döndürür; geri alınamazsa null.
  undo(): HistoryEntry | null {
    if (!this.canUndo) return null;
    const current = this.past.pop() as HistoryEntry;
    this.future.push(current);
    return this.past[this.past.length - 1];
  }

  // Bir sonraki durumu döndürür; yinelenemezse null.
  redo(): HistoryEntry | null {
    if (!this.canRedo) return null;
    const entry = this.future.pop() as HistoryEntry;
    this.past.push(entry);
    return entry;
  }

  clear(initial: HistoryEntry): void {
    this.past = [initial];
    this.future = [];
  }
}
