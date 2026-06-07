import { Component } from 'react';
import type { ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { erro: boolean; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { erro: false };

  static getDerivedStateFromError() { return { erro: true }; }

  componentDidCatch(error: Error) {
    console.error('[ErrorBoundary]', error);
  }

  render() {
    if (this.state.erro) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-center space-y-4">
            <p className="font-mono text-[10px] tracking-[0.5em] text-[#FFD700]/40 uppercase">
              Erro ao carregar
            </p>
            <button
              onClick={() => { this.setState({ erro: false }); window.location.reload(); }}
              className="font-mono text-[10px] tracking-widest text-white/40 border border-white/10 px-4 py-2 hover:border-white/30 transition-colors"
            >
              TENTAR NOVAMENTE
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
