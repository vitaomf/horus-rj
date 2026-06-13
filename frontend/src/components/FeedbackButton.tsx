import { useState, useEffect } from 'react';
import { MessageSquarePlus, Bug, Lightbulb, Send, X } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { useToast } from './Toast';

type Tipo = 'erro' | 'melhoria';

export function FeedbackButton() {
  const { toast } = useToast();
  const [aberto, setAberto] = useState(false);
  const [tipo, setTipo] = useState<Tipo>('erro');
  const [mensagem, setMensagem] = useState('');
  const [contato, setContato] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Fecha no Esc
  useEffect(() => {
    if (!aberto) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setAberto(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [aberto]);

  const fechar = () => { if (!enviando) setAberto(false); };

  const enviar = async () => {
    const msg = mensagem.trim();
    if (msg.length === 0) { toast('Escreva sua mensagem antes de enviar.', 'error'); return; }
    setEnviando(true);
    try {
      await axios.post(`${API_BASE_URL}/api/feedback`, {
        tipo,
        mensagem: msg,
        pagina: window.location.pathname + window.location.search,
        contato: contato.trim(),
      });
      toast('Obrigado! Recebemos seu relato.', 'success');
      setMensagem(''); setContato(''); setTipo('erro'); setAberto(false);
    } catch {
      toast('Não foi possível enviar. Tente de novo.', 'error');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      {/* FAB — canto inferior esquerdo (direito é ocupado por BackToTop/Favoritos) */}
      <button
        onClick={() => setAberto(true)}
        className="fixed bottom-6 left-6 z-50 flex items-center gap-2 bg-black border border-[#FFD700]/40 text-[#FFD700] hover:bg-[#FFD700]/10 hover:border-[#FFD700] transition-all shadow-[0_4px_20px_rgba(0,0,0,0.8)] pl-3 pr-3.5 py-2.5 group"
        aria-label="Reportar erro ou sugerir melhoria"
      >
        <MessageSquarePlus className="w-4 h-4 shrink-0" />
        <span className="font-bebas tracking-[0.2em] text-xs hidden sm:inline">REPORTAR</span>
      </button>

      {aberto && (
        <>
          <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm animate-in fade-in duration-150" onClick={fechar} />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Reportar erro ou sugestão"
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[201] w-[calc(100vw-2rem)] max-w-md bg-[#0a0a0a] border border-[#FFD700]/20 shadow-[0_20px_60px_rgba(0,0,0,0.9)] animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="absolute top-0 left-0 w-1 h-full bg-[#FFD700]" />

            {/* Cabeçalho */}
            <div className="flex items-start justify-between gap-4 border-b border-[#1a1a1a] px-6 py-4">
              <div>
                <p className="font-bebas text-[#FFD700] text-xl tracking-widest leading-none">REPORTAR</p>
                <p className="font-mono text-[9px] tracking-[0.25em] text-gray-500 uppercase mt-1.5">
                  Achou um erro ou tem uma sugestão? Conta pra gente.
                </p>
              </div>
              <button onClick={fechar} aria-label="Fechar" className="text-gray-600 hover:text-white transition-colors shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Tipo */}
              <div className="grid grid-cols-2 gap-px bg-[#1a1a1a]">
                {([
                  { v: 'erro' as Tipo, label: 'ERRO', Icon: Bug },
                  { v: 'melhoria' as Tipo, label: 'MELHORIA', Icon: Lightbulb },
                ]).map(({ v, label, Icon }) => {
                  const ativo = tipo === v;
                  return (
                    <button key={v} onClick={() => setTipo(v)}
                      className={`flex items-center justify-center gap-2 py-2.5 font-bebas tracking-widest text-sm transition-colors ${
                        ativo ? 'bg-[#FFD700] text-black' : 'bg-black text-gray-400 hover:text-white'
                      }`}>
                      <Icon className="w-4 h-4" /> {label}
                    </button>
                  );
                })}
              </div>

              {/* Mensagem */}
              <div>
                <textarea
                  value={mensagem}
                  onChange={e => setMensagem(e.target.value.slice(0, 2000))}
                  rows={5}
                  autoFocus
                  placeholder={tipo === 'erro'
                    ? 'Descreva o erro: o que esperava ver e o que apareceu?'
                    : 'Qual sua sugestão para melhorar o site?'}
                  className="w-full bg-black border border-[#2a2a2a] focus:border-[#FFD700]/50 text-gray-200 text-sm font-sans px-3 py-2.5 outline-none transition-colors resize-none placeholder:text-gray-700"
                />
                <p className="font-mono text-[8px] tracking-widest text-gray-700 text-right mt-1">{mensagem.length}/2000</p>
              </div>

              {/* Contato opcional */}
              <input
                value={contato}
                onChange={e => setContato(e.target.value.slice(0, 200))}
                placeholder="E-mail ou contato (opcional, p/ retorno)"
                className="w-full bg-black border border-[#2a2a2a] focus:border-[#FFD700]/50 text-gray-200 text-sm font-sans px-3 py-2.5 outline-none transition-colors placeholder:text-gray-700"
              />

              {/* Página */}
              <p className="font-mono text-[8px] tracking-widest text-gray-700 truncate">
                PÁGINA: {window.location.pathname}
              </p>

              {/* Enviar */}
              <button
                onClick={enviar}
                disabled={enviando || mensagem.trim().length === 0}
                className="w-full flex items-center justify-center gap-2 bg-[#FFD700] text-black font-bebas tracking-widest text-base py-3 hover:bg-yellow-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {enviando ? 'ENVIANDO…' : (<><Send className="w-4 h-4" /> ENVIAR</>)}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
