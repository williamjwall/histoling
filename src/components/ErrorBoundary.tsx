import { Component, type ReactNode } from 'react';

/** If the app ever crashes, start it again rather than leave a broken screen. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error(error);
    window.setTimeout(() => window.location.reload(), 2500);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="desktop-only">
        <div className="desktop-only-name">
          Histo<em>Ling</em>
        </div>
        <p>Restarting…</p>
      </main>
    );
  }
}
