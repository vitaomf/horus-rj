const FONT_DECO   = "'Cinzel Decorative', serif";
const FONT_CINZEL = "'Cinzel', serif";

interface Termo {
  termo: string;
  simples: string;
  detalhe?: string;
  fonte?: string;
}

const TERMOS: Termo[] = [
  {
    termo: 'Emenda parlamentar',
    simples: 'É quando um deputado ou senador aponta e diz: "Quero que X reais do orçamento vá para aquela cidade ou hospital." É o poder que os parlamentares têm de direcionar parte do dinheiro público.',
    detalhe: 'Cada deputado federal tem direito a indicar cerca de R$ 17 milhões por ano. As emendas podem ser individuais (de um parlamentar só), de bancada (de um grupo de estado) ou de comissão.',
    fonte: 'Portal da Transparência (gov.br)',
  },
  {
    termo: 'Valor empenhado',
    simples: 'É o dinheiro que foi "prometido" — o governo reservou no orçamento. É como colocar dinheiro em uma conta separada com um destino específico.',
    detalhe: 'Empenhar é o primeiro estágio da execução. O dinheiro empenhado ainda não saiu do cofre do governo — é só uma reserva.',
  },
  {
    termo: 'Valor liquidado',
    simples: 'É o dinheiro que o serviço foi entregue. A empresa ou pessoa fez o trabalho, e o governo confirmou. Só falta pagar.',
    detalhe: 'Liquidar significa que o governo recebeu o serviço ou produto e está pronto para liberar o pagamento.',
  },
  {
    termo: 'Valor pago',
    simples: 'É o dinheiro que de fato saiu do cofre do governo e foi transferido. É o valor real que chegou.',
    detalhe: 'Diferença importante: um político pode ter R$ 10M empenhados, mas só R$ 6M efetivamente pagos. O restante pode ter sido bloqueado, cancelado ou ainda estar em processo.',
  },
  {
    termo: 'Deputado Federal',
    simples: 'Vai a Brasília para representar o seu estado. Junto com outros 512 deputados, vota nas leis do Brasil inteiro.',
    detalhe: 'São eleitos de 4 em 4 anos, em quantidade proporcional à população de cada estado. São Paulo tem 70; Acre tem 8.',
  },
  {
    termo: 'Senador',
    simples: 'Cada estado tem 3 senadores, independente do tamanho. Eles "revisam" as leis que os deputados aprovam.',
    detalhe: 'Mandato de 8 anos — o dobro do deputado. São 81 senadores no total. A renovação é feita a cada 4 anos, alternando 1/3 e 2/3 das vagas.',
  },
  {
    termo: 'Deputado Estadual',
    simples: 'Faz o mesmo que o deputado federal, mas só para o estado. Vota nas leis estaduais e fiscaliza o governador.',
    detalhe: 'Cada estado tem sua Assembleia Legislativa, com número de deputados proporcional à população.',
  },
  {
    termo: 'Vereador',
    simples: 'É o representante do seu bairro na câmara municipal. Faz leis da cidade e fiscaliza o prefeito.',
    detalhe: 'São eleitos a cada 4 anos. O número de vereadores varia de 9 (cidades pequenas) a 55 (São Paulo). No total, há cerca de 59 mil vereadores no Brasil.',
  },
  {
    termo: 'Emenda individual vs. de bancada',
    simples: 'Individual = um parlamentar só indicou. Bancada = todos os parlamentares de um estado indicaram juntos. Bancada costuma ter valor maior.',
  },
  {
    termo: 'Emenda impositiva',
    simples: 'O governo é obrigado por lei a pagar. Antes de 2015, o governo podia ignorar a emenda. Hoje, parte delas são obrigatórias.',
    detalhe: 'As emendas individuais e de bancada são impositivas desde 2015 e 2019, respectivamente.',
  },
  {
    termo: 'IPTU',
    simples: 'Imposto que donos de imóveis pagam todo ano para a prefeitura. Proporcional ao valor e tamanho do imóvel.',
  },
  {
    termo: 'IPVA',
    simples: 'Imposto anual que donos de veículos pagam para o estado. Calculado sobre o valor do carro.',
  },
  {
    termo: 'ICMS',
    simples: 'Imposto estadual embutido no preço de quase tudo que você compra: gasolina, supermercado, roupas. É a maior fonte de receita dos estados.',
  },
  {
    termo: 'ISS',
    simples: 'Imposto municipal cobrado de quem presta serviços — médicos, advogados, salões de beleza, contadores.',
  },
  {
    termo: 'SUS',
    simples: 'Sistema Único de Saúde — os hospitais e postos que atendem de graça. Financiado pelo governo federal, estadual e municipal juntos.',
  },
  {
    termo: 'INSS',
    simples: 'O cofre das aposentadorias. Quando você trabalha com carteira assinada, uma parte do seu salário vai para o INSS. Na velhice ou doença, você saca de lá.',
  },
  {
    termo: 'Mandato',
    simples: 'O período que um político foi eleito para exercer o cargo. Prefeito: 4 anos. Deputado/Senador: 4 ou 8 anos. Presidente: 4 anos.',
  },
  {
    termo: 'Legislatura',
    simples: 'Cada período de 4 anos do Congresso. A atual (2023-2026) é a 57ª legislatura.',
  },
  {
    termo: 'Contrato público',
    simples: 'Quando o governo contrata uma empresa para fazer uma obra ou prestar um serviço. Precisa seguir regras específicas (como licitação) para evitar favorecimento.',
  },
  {
    termo: 'Licitação',
    simples: 'O processo onde o governo abre concorrência: várias empresas apresentam propostas, e normalmente a mais barata com qualidade adequada ganha o contrato.',
  },
  {
    termo: 'Transparência ativa',
    simples: 'Obrigação do governo de publicar informações antes de alguém pedir. Este site usa dados de transparência ativa.',
  },
  {
    termo: 'Portal da Transparência',
    simples: 'Site do governo federal (transparencia.gov.br) onde qualquer pessoa pode ver como o dinheiro público é gasto. É nossa principal fonte de dados.',
    fonte: 'Controladoria-Geral da União (CGU)',
  },
  {
    termo: 'TSE (Tribunal Superior Eleitoral)',
    simples: 'O juiz das eleições. Cuida das regras eleitorais, registra candidatos, valida eleições e disponibiliza dados públicos sobre candidatos e eleitos.',
    fonte: 'DivulgaCandContas (TSE)',
  },
];

export function GlossarioPage() {
  return (
    <div className="min-h-screen bg-black text-white">

      {/* Hero */}
      <div className="relative border-b border-[#FFD700]/20 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-[0.025]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,215,0,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,215,0,1) 1px,transparent 1px)',
            backgroundSize: '40px 40px',
          }} />
        <div className="relative z-10 px-6 py-10 md:px-12 md:py-14">
          <p style={{ fontFamily: FONT_CINZEL }}
            className="text-[#FFD700]/50 text-[9px] tracking-[0.6em] uppercase mb-3">
            Horus · Referência
          </p>
          <h1 style={{ fontFamily: FONT_DECO }}
            className="text-[40px] md:text-[64px] leading-none text-white tracking-wide mb-4">
            GLOSSÁRIO
          </h1>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px w-8 bg-[#FFD700]/40" />
            <div className="w-1 h-1 bg-[#FFD700]" />
            <div className="h-px w-8 bg-[#FFD700]/40" />
          </div>
          <p className="font-mono text-[9px] tracking-[0.35em] text-gray-700 uppercase">
            Todos os termos explicados como se você tivesse 10 anos — sem jargão, com exemplos reais
          </p>
        </div>
      </div>

      {/* Lista de termos */}
      <div className="max-w-4xl mx-auto px-6 md:px-12 py-10 space-y-1">
        {TERMOS.map((t, i) => (
          <div key={i} className="border border-[#1a1a1a] hover:border-[#FFD700]/20 transition-colors group">
            <div className="flex items-start gap-4 p-5">
              {/* Inicial decorativa */}
              <div className="w-10 h-10 border border-[#FFD700]/20 flex items-center justify-center shrink-0 mt-0.5 group-hover:border-[#FFD700]/40 transition-colors">
                <span className="font-bebas text-lg text-[#FFD700]/50 group-hover:text-[#FFD700]/80 transition-colors">
                  {t.termo[0]}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                {/* Termo */}
                <h3 className="font-bebas text-xl tracking-wide text-[#FFD700] leading-tight mb-2">
                  {t.termo}
                </h3>

                {/* Explicação simples */}
                <p className="text-gray-300 text-sm leading-relaxed">
                  {t.simples}
                </p>

                {/* Detalhe técnico (colapsado visualmente) */}
                {t.detalhe && (
                  <p className="text-gray-600 text-xs leading-relaxed mt-2 border-l border-[#2a2a2a] pl-3">
                    {t.detalhe}
                  </p>
                )}

                {/* Fonte */}
                {t.fonte && (
                  <p className="font-mono text-[8px] tracking-widest text-gray-700 mt-2">
                    Fonte: {t.fonte}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-[#1a1a1a] px-6 md:px-12 py-6">
        <p className="font-mono text-[8px] tracking-[0.4em] text-gray-800 uppercase text-center">
          Horus · Transparência Pública · Fontes: Portal da Transparência, TSE, Câmara dos Deputados, Senado Federal
        </p>
      </div>
    </div>
  );
}
