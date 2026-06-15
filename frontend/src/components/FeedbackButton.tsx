import { useState, useEffect } from 'react';
import { MessageSquarePlus, Bug, Lightbulb, Send, X, Flag, ImagePlus } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { useToast } from './Toast';

type Tipo = 'erro' | 'melhoria';
type Pill = { x: number; y: number; text: string } | null;

const MAX_IMG = 5 * 1024 * 1024; // 5MB

export function FeedbackButton() {
  const { toast } = useToast();
  const [aberto, setAberto] = useState(false);
  const [tipo, setTipo] = useState<Tipo>('erro');
  const [mensagem, setMensagem] = useState('');
  const [contato, setContato] = useState('');
  const [trecho, setTrecho] = useState('');
  const [imagem, setImagem] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [pill, setPill] = useState<Pill>(null);

  // Fecha no Esc
  useEffect(() => {
    if (!aberto) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setAberto(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [aberto]);

  // Seleção de texto → balão "Reportar trecho"
  useEffect(() => {
    const onUp = (e: MouseEvent | TouchEvent) => {
      if (aberto) return;
      const alvo = e.target as Element | null;
      if (alvo?.closest?.('[data-fb-pill]')) return;
      const sel = window.getSelection();
      const text = (sel?.toString() ?? '').trim();
      if (text.length < 3 || !sel || sel.rangeCount === 0) { setPill(null); return; }
      const anchor = sel.anchorNode;
      const el = anchor && (anchor.nodeType === 1 ? (anchor as Element) : anchor.parentElement);
      if (el?.closest('input, textarea, [data-fb-modal]')) { setPill(null); return; }
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) { setPill(null); return; }
      setPill({ x: rect.left + rect.width / 2, y: rect.top, text: text.slice(0, 2000) });
    };
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchend', onUp);
    return () => {
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchend', onUp);
    };
  }, [aberto]);

  // Some o balão ao rolar/redimensionar
  useEffect(() => {
    const hide = () => setPill(null);
    document.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    return () => {
      document.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
    };
  }, []);

  const abrir = () => {
    const sel = (window.getSelection()?.toString() ?? '').trim();
    if (sel.length >= 3) setTrecho(sel.slice(0, 2000));
    setPill(null);
    setAberto(true);
  };

  const reportarTrecho = () => {
    if (!pill) return;
    setTrecho(pill.text);
    setTipo('erro');
    setPill(null);
    setAberto(true);
  };

  const fechar = () => { if (!enviando) setAberto(false); };

  const carregarImagem = (file: File) => {
    if (!file.type.startsWith('image/')) { toast('Anexe uma imagem (PNG, JPG ou WEBP).', 'error'); return; }
    if (file.size > MAX_IMG) { toast('Imagem maior que 5MB. Recorte uma área menor.', 'error'); return; }
    const reader = new FileReader();
    reader.onload = () => setImagem(String(reader.result));
    reader.onerror = () => toast('Não consegui ler a imagem.', 'error');
    reader.readAsDataURL(file);
  };

  const onPaste = (e: React.ClipboardEvent) => {
    const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'));
    const file = item?.getAsFile();
    if (file) { e.preventDefault(); carregarImagem(file); }
  };

  const enviar = async () => {
    const msg = mensagem.trim() || (trecho ? 'Trecho reportado.' : (imagem ? 'Print anexado.' : ''));
    if (msg.length === 0) { toast('Escreva, selecione um trecho ou anexe um print.', 'error'); return; }
    setEnviando(true);
    try {
      await axios.post(`${API_BASE_URL}/api/feedback`, {
        tipo,
        mensagem: msg,
        pagina: window.location.pathname + window.location.search,
        contato: contato.trim(),
        trecho,
        imagem,
      });
      toast('Obrigado! Recebemos seu relato.', 'success');
      setMensagem(''); setContato(''); setTrecho(''); setImagem(''); setTipo('erro'); setAberto(false);
    } catch {
      toast('Não foi possível enviar. Tente de novo.', 'error');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      {/* Balão de seleção — aparece ao selecionar texto na página */}
      {pill && !aberto && (
        <button
          data-fb-pill
          onClick={reportarTrecho}
          style={{ left: pill.x, top: pill.y }}
          className="fixed -translate-x-1/2 -translate-y-[calc(100%+8px)] z-[150] flex items-center gap-1.5 bg-[#FFD700] text-black font-bebas tracking-[0.18em] text-xs px-3 py-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.6)] hover:bg-yellow-400 transition-colors animate-in fade-in zoom-in-95 duration-100 whitespace-nowrap"
        >
          <Flag className="w-3.5 h-3.5" /> REPORTAR TRECHO
        </button>
      )}

      {/* FAB — canto inferior esquerdo (direito é ocupado por BackToTop/Favoritos) */}
      <button
        onClick={abrir}
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
            data-fb-modal
            onPaste={onPaste}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[201] w-[calc(100vw-2rem)] max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto bg-[#0a0a0a] border border-[#FFD700]/20 shadow-[0_20px_60px_rgba(0,0,0,0.9)] animate-in fade-in zoom-in-95 duration-150"
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

              {/* Trecho selecionado */}
              {trecho && (
                <div className="border border-[#FFD700]/30 bg-[#FFD700]/5 px-3 py-2">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-mono text-[8px] tracking-[0.25em] text-[#FFD700]/70 uppercase flex items-center gap-1.5">
                      <Flag className="w-3 h-3" /> Trecho reportado
                    </span>
                    <button onClick={() => setTrecho('')} aria-label="Remover trecho" className="text-gray-600 hover:text-white transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-gray-300 text-xs italic line-clamp-4">«{trecho}»</p>
                </div>
              )}

              {/* Mensagem */}
              <div>
                <textarea
                  value={mensagem}
                  onChange={e => setMensagem(e.target.value.slice(0, 2000))}
                  rows={4}
                  autoFocus
                  placeholder={tipo === 'erro'
                    ? 'Descreva o erro: o que esperava ver e o que apareceu?'
                    : 'Qual sua sugestão para melhorar o site?'}
                  className="w-full bg-black border border-[#2a2a2a] focus:border-[#FFD700]/50 text-gray-200 text-sm font-sans px-3 py-2.5 outline-none transition-colors resize-none placeholder:text-gray-700"
                />
                <p className="font-mono text-[8px] tracking-widest text-gray-700 text-right mt-1">{mensagem.length}/2000</p>
              </div>

              {/* Print anexado */}
              {imagem ? (
                <div className="relative border border-[#2a2a2a] p-2 bg-black">
                  <img src={imagem} alt="print anexado" className="max-h-44 w-auto mx-auto" />
                  <button onClick={() => setImagem('')} aria-label="Remover print"
                    className="absolute top-1 right-1 bg-black/80 text-white p-1 hover:bg-black transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 border border-dashed border-[#2a2a2a] hover:border-[#FFD700]/50 text-gray-500 hover:text-gray-300 text-xs font-sans py-2.5 cursor-pointer transition-colors">
                  <ImagePlus className="w-4 h-4" />
                  Anexar print — cole (Ctrl+V) ou clique
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) carregarImagem(f); e.target.value = ''; }} />
                </label>
              )}

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
                disabled={enviando || (mensagem.trim().length === 0 && !trecho && !imagem)}
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
