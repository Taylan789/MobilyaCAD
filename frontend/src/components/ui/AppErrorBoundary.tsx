import { Component, type ErrorInfo, type ReactNode } from "react";
import "./AppErrorBoundary.css";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  error: Error | null;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    return {
      error: error instanceof Error ? error : new Error("Beklenmeyen arayüz hatası."),
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[MobilyaCAD] Arayüz render hatası", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="mc-app-error" role="alert">
        <section className="mc-app-error__panel" aria-labelledby="mc-app-error-title">
          <div className="mc-app-error__mark" aria-hidden="true">
            <svg viewBox="0 0 48 48" fill="none">
              <path d="M8 13 24 5l16 8v22l-16 8L8 35V13Z" stroke="currentColor" strokeWidth="1.5" />
              <path d="M16 33V16l8 6 8-6v17" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              <path d="M24 29v-8M24 34v.1" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </div>
          <p className="mc-app-error__eyebrow">ÇALIŞMA ALANI DURDURULDU</p>
          <h1 id="mc-app-error-title">Arayüz beklenmeyen bir hatayla karşılaştı.</h1>
          <p className="mc-app-error__message">
            Açık modelin verilerine müdahale edilmedi. Uygulamayı yeniden yükleyerek tekrar deneyebilirsin.
          </p>
          <button
            className="mc-app-error__reload"
            type="button"
            onClick={() => window.location.reload()}
          >
            <svg viewBox="0 0 20 20" aria-hidden="true" fill="none">
              <path d="M16 9.5a6 6 0 1 1-1.7-4.2M16 3.5v3.8h-3.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Uygulamayı yeniden yükle
          </button>
          <details className="mc-app-error__details">
            <summary>Teknik hata mesajı</summary>
            <code>{this.state.error.message}</code>
          </details>
          <span className="mc-app-error__footnote">MOBİLYACAD · STUDIO</span>
        </section>
      </main>
    );
  }
}
