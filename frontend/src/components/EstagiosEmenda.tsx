import React, { useState } from 'react';

export const EstagiosEmenda = () => {
    const [ativo, setAtivo] = useState<number | null>(null);

    const estagios = [
        {
            numero: '01',
            nome: 'EMPENHADO',
            icone: '📋',
            cor: '#FFD700',
            descricao: 'Valor reservado no orçamento federal.',
            detalhe: 'É uma promessa legal de pagamento. O governo garante que esse dinheiro existe e está separado para essa finalidade. Nem sempre significa que foi usado.'
        },
        {
            numero: '02',
            nome: 'LIQUIDADO',
            icone: '✅',
            cor: '#FFA500',
            descricao: 'Serviço ou obra confirmada como entregue.',
            detalhe: 'O governo verificou que o que foi contratado foi realmente executado. É a confirmação de que o trabalho foi feito antes de pagar.'
        },
        {
            numero: '03',
            nome: 'PAGO',
            icone: '💰',
            cor: '#888888',
            descricao: 'Dinheiro efetivamente transferido.',
            detalhe: 'O valor saiu do cofre federal e chegou ao destino. Este é o valor real gasto. Pode ser menor que o empenhado se a obra não foi concluída.'
        }
    ];

    return (
        <div className="bg-[#0a0808] border border-[#FFD700]/20 
                    rounded-sm p-6 mb-6">

            {/* Título */}
            <div className="flex items-center gap-3 mb-6">
                <div className="h-[3px] w-[30px] bg-[#FFD700]" />
                <p className="text-[#FFD700] font-bebas tracking-widest text-lg">
                    COMO FUNCIONA O VALOR DAS EMENDAS?
                </p>
                <div className="h-[3px] flex-1 bg-[#FFD700]/10" />
            </div>

            {/* Pipeline visual */}
            <div className="flex flex-col md:flex-row items-stretch gap-0">
                {estagios.map((e, idx) => (
                    <React.Fragment key={e.numero}>

                        {/* Card do estágio */}
                        <div
                            onClick={() => setAtivo(ativo === idx ? null : idx)}
                            className="flex-1 cursor-pointer group relative flex flex-col justify-between"
                            style={{
                                border: `1px solid ${ativo === idx ? e.cor : 'rgba(255,215,0,0.1)'}`,
                                background: ativo === idx ? `${e.cor}10` : '#0a0808',
                                transition: 'all 0.2s'
                            }}
                        >
                            {/* Número grande decorativo */}
                            <div className="absolute top-2 right-3 font-bebas text-6xl 
                              opacity-5 select-none"
                                style={{ color: e.cor }}>
                                {e.numero}
                            </div>

                            <div className="p-5 relative z-10 flex-grow">
                                {/* Ícone + Nome */}
                                <div className="flex items-center gap-3 mb-3">
                                    <span className="text-2xl">{e.icone}</span>
                                    <div>
                                        <p className="font-bebas tracking-widest text-xl"
                                            style={{ color: e.cor }}>
                                            {e.nome}
                                        </p>
                                        <p className="text-gray-400 text-xs uppercase tracking-wider">
                                            ESTÁGIO {e.numero}
                                        </p>
                                    </div>
                                </div>

                                {/* Descrição curta */}
                                <p className="text-gray-300 text-sm leading-relaxed">
                                    {e.descricao}
                                </p>

                                {/* Detalhe expandido ao clicar */}
                                {ativo === idx && (
                                    <div className="mt-4 pt-4 border-t border-[#FFD700]/20 animate-fade-in">
                                        <p className="text-gray-400 text-sm leading-relaxed">
                                            {e.detalhe}
                                        </p>
                                    </div>
                                )}

                                {/* Hint de clique */}
                                <p className="text-xs mt-3 transition-colors uppercase font-bebas tracking-wider"
                                    style={{ color: ativo === idx ? e.cor : 'rgba(255,255,255,0.2)' }}>
                                    {ativo === idx ? '▲ FECHAR' : '▼ SAIBA MAIS'}
                                </p>
                            </div>

                            {/* Barra inferior colorida */}
                            <div className="h-[3px] w-full transition-all duration-300"
                                style={{
                                    backgroundColor: e.cor,
                                    opacity: ativo === idx ? 1 : 0.2
                                }}
                            />
                        </div>

                        {/* Seta conectora entre estágios */}
                        {idx < estagios.length - 1 && (
                            <div className="hidden md:flex items-center justify-center 
                              px-2 text-[#FFD700]/30 text-2xl font-bold 
                              shrink-0">
                                →
                            </div>
                        )}
                    </React.Fragment>
                ))}
            </div>

            {/* Aviso do Horus */}
            <div className="mt-5 flex items-start gap-3 bg-[#FFD700]/5 
                      border-l-4 border-[#FFD700] px-4 py-3">
                <span className="text-[#FFD700] shrink-0">⚠</span>
                <p className="text-gray-400 text-sm leading-relaxed">
                    O <span className="text-[#FFD700] font-semibold">HORUS</span> exibe o valor <span className="text-white font-semibold">EMPENHADO</span> — o maior estágio. O valor real pago pode ser menor. Clique em <span className="text-[#FFD700]">↗ FONTE</span> para conferir o status atualizado no Portal da Transparência.
                </p>
            </div>
        </div>
    );
};
