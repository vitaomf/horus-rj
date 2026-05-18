// Dados estáticos de cargos eletivos — federal real, estadual/municipal placeholder
// Fotos hospedadas no Wikimedia (URLs estáveis, licença livre)

import { getEstado } from './mockBrasil';

export interface CargoEletivo {
  id: string;
  nome: string;
  cargo: string;
  funcao: string;
  fotoUrl?: string;
  partido?: string;
  mandato?: string;
  ordem: number;
  areaSlug?: AreaSlug;
}

export type AreaSlug = 'economico' | 'social' | 'infraestrutura' | 'defesa' | 'politico';

export interface AreaMinisterial {
  slug: AreaSlug;
  nome: string;
  icone: string;
  cor: string;
  cargos: CargoEletivo[];
}

// ── FEDERAL ──────────────────────────────────────────────────────────────────
export const PRESIDENTE: CargoEletivo = {
  id: 'presidente',
  nome: 'Luiz Inácio Lula da Silva',
  cargo: 'Presidente da República',
  funcao: 'É o chefe do governo federal — quem manda no Brasil. Decide para onde vai o dinheiro público, escolhe os ministros (cada um cuida de uma área), assina ou veta as leis que o Congresso aprova (vetar = dizer não), e representa o Brasil no mundo. Ele não faz leis, mas pode impedir que elas entrem em vigor.',
  fotoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Lula_-_foto_oficial05012023_%28cropped%29.jpg/400px-Lula_-_foto_oficial05012023_%28cropped%29.jpg',
  partido: 'PT',
  mandato: '2023-2026',
  ordem: 1,
};

export const VICE_PRESIDENTE: CargoEletivo = {
  id: 'vice-presidente',
  nome: 'Geraldo Alckmin',
  cargo: 'Vice-Presidente da República',
  funcao: 'É o "substituto" do Presidente — assume se ele ficar doente, viajar ou for afastado. Na prática, também tem função ativa: coordena a política industrial e representa o governo em reuniões importantes com o setor privado e o Congresso.',
  fotoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Geraldo_Alckmin_em_2023_%28cropped%29.jpg/400px-Geraldo_Alckmin_em_2023_%28cropped%29.jpg',
  partido: 'PSB',
  mandato: '2023-2026',
  ordem: 2,
};

// Função utilitária — gera ministro
const m = (id: string, nome: string, cargo: string, funcao: string, partido: string, areaSlug: AreaSlug, ordem: number, fotoUrl?: string): CargoEletivo => ({
  id, nome, cargo, funcao, partido, areaSlug, ordem, fotoUrl, mandato: '2023-2026',
});

export const AREAS_MINISTERIAIS: AreaMinisterial[] = [
  {
    slug: 'economico',
    nome: 'Econômico',
    icone: '💰',
    cor: '#4CAF50',
    cargos: [
      m('fazenda',        'Fernando Haddad',    'Ministério da Fazenda',
        'É o "gerente financeiro" do Brasil. Define quanto o governo vai gastar, cobra impostos (via Receita Federal), controla o Tesouro Nacional e garante que as contas públicas não entrem no vermelho.', 'PT', 'economico', 1),
      m('planejamento',   'Simone Tebet',       'Ministério do Planejamento e Orçamento',
        'Elabora o orçamento federal — decide como distribuir o dinheiro público entre saúde, educação, obras e outros setores. Também coordena o PAC (programa de grandes obras de infraestrutura).', 'MDB', 'economico', 2),
      m('trabalho',       'Luiz Marinho',       'Ministério do Trabalho e Emprego',
        'Cuida das relações entre trabalhadores e empresas. Define o salário-mínimo, fiscaliza condições de trabalho, administra o FGTS (fundo que todo trabalhador tem e pode sacar em certas situações) e media conflitos sindicais.', 'PT', 'economico', 3),
      m('agricultura',    'Carlos Fávaro',      'Ministério da Agricultura e Pecuária',
        'Apoia os grandes produtores rurais — garante crédito agrícola, fiscaliza alimentos e defensivos, e protege o país de pragas e doenças animais (ex: febre aftosa). É quem viabiliza as exportações do agronegócio.', 'PSD', 'economico', 4),
      m('industria',      'Geraldo Alckmin',    'Ministério do Desenvolvimento, Indústria, Comércio e Serviços',
        'Fomenta a indústria nacional, negocia acordos comerciais com outros países e supervisiona o BNDES (banco que empresta dinheiro barato para empresas crescerem).', 'PSB', 'economico', 5),
      m('desenvAgrario',  'Paulo Teixeira',     'Ministério do Desenvolvimento Agrário',
        'Cuida dos pequenos agricultores e da reforma agrária. Distribui terra para quem não tem, apoia assentamentos do MST e financia a agricultura familiar (quem produz feijão, arroz e hortaliças para consumo interno).', 'PT', 'economico', 6),
      m('pesca',          'André de Paula',     'Ministério da Pesca e Aquicultura',
        'Apoia pescadores artesanais e a criação de peixe em tanques (aquicultura). Define regras de pesca para não esvaziar rios e mares, e garante renda para comunidades que vivem da pesca.', 'PSD', 'economico', 7),
      m('turismo',        'Celso Sabino',       'Ministério do Turismo',
        'Promove o Brasil como destino turístico dentro e fora do país (via Embratur). Investe em infraestrutura de turismo e apoia eventos que atraem visitantes (shows, feiras, jogos).', 'União Brasil', 'economico', 8),
      m('empreendedorismo','Márcio França',     'Ministério do Empreendedorismo e MEIs',
        'Cuida dos pequenos negócios e microempreendedores individuais (MEIs). Simplifica burocracia para abrir empresas, apoia o Sebrae e cria linhas de crédito acessíveis para quem está começando.', 'PSB', 'economico', 9),
    ],
  },
  {
    slug: 'social',
    nome: 'Social',
    icone: '👥',
    cor: '#FF9800',
    cargos: [
      m('saude',          'Nísia Trindade',     'Ministério da Saúde',
        'Comanda o SUS — o sistema público de saúde que atende gratuitamente toda a população. Compra vacinas, define protocolos médicos, fiscaliza remédios (via ANVISA) e opera programas como Mais Médicos e Farmácia Popular.', 'sem partido', 'social', 1),
      m('educacao',       'Camilo Santana',     'Ministério da Educação',
        'Cuida de toda a educação pública federal — do ENEM às universidades. Define o currículo nacional (BNCC), distribui livros didáticos, financia bolsas (ProUni, FIES) e repassa verba para as escolas municipais e estaduais.', 'PT', 'social', 2),
      m('mulheres',       'Cida Gonçalves',     'Ministério das Mulheres',
        'Cria e executa políticas que protegem as mulheres — combate à violência doméstica (Lei Maria da Penha), igualdade salarial, acesso a serviços de saúde específicos e programas de autonomia econômica.', 'PT', 'social', 3),
      m('igualdadeRacial','Anielle Franco',     'Ministério da Igualdade Racial',
        'Combate o racismo e promove oportunidades iguais para negros, quilombolas e outras populações historicamente excluídas. Cuida de políticas afirmativas, acesso à educação e saúde para essas comunidades.', 'PT', 'social', 4),
      m('povosIndigenas', 'Sonia Guajajara',    'Ministério dos Povos Indígenas',
        'Defende os direitos dos povos indígenas — demarcação de terras (delimitar oficialmente onde vivem), proteção da cultura e da saúde indígena, e coordena a FUNAI (órgão que faz esse trabalho no campo).', 'PSOL', 'social', 5),
      m('direitosHumanos','Macaé Evaristo',     'Ministério dos Direitos Humanos e Cidadania',
        'Protege grupos vulneráveis: crianças, idosos, LGBTQIA+, pessoas com deficiência. Cuida do sistema socioeducativo (jovens em conflito com a lei) e monitora violações de direitos no país.', 'PT', 'social', 6),
      m('cultura',        'Margareth Menezes',  'Ministério da Cultura',
        'Financia e protege a cultura brasileira — cinema, música, teatro, literatura, patrimônio histórico. Cuida do IPHAN (que preserva sítios históricos) e distribui recursos via Lei de incentivo à cultura (Rouanet).', 'PT', 'social', 7),
      m('esportes',       'André Fufuca',       'Ministério do Esporte',
        'Fomenta o esporte no Brasil — financia atletas olímpicos (Bolsa Atleta), constrói quadras e ginásios em comunidades, e organiza eventos esportivos nacionais. Cuida também do esporte como ferramenta de inclusão social.', 'PP', 'social', 8),
      m('cidadania',      'Wellington Dias',    'Ministério do Desenvolvimento Social, Família e Assistência',
        'Opera o Bolsa Família (transferência de renda para famílias pobres), o BPC (benefício para idosos e deficientes sem renda) e os CRAS (centros de assistência social espalhados pelo país). É quem alcança quem mais precisa.', 'PT', 'social', 9),
      m('previdencia',    'Carlos Lupi',        'Ministério da Previdência Social',
        'Administra o INSS — o sistema de aposentadorias e pensões. Quando você contribui com a Previdência ao longo da vida, é este ministério que garante sua aposentadoria, auxílio-doença e pensão por morte.', 'PDT', 'social', 10),
    ],
  },
  {
    slug: 'infraestrutura',
    nome: 'Infraestrutura',
    icone: '🏗',
    cor: '#03A9F4',
    cargos: [
      m('transportes',    'Renan Filho',        'Ministério dos Transportes',
        'Cuida das estradas, ferrovias e hidrovias federais. Decide quais obras de infraestrutura serão feitas, fiscaliza rodovias concedidas à iniciativa privada (pedágios) e supervisiona o DNIT, que mantém as estradas.', 'MDB', 'infraestrutura', 1),
      m('minasEnergia',   'Alexandre Silveira', 'Ministério de Minas e Energia',
        'Garante que o Brasil tenha energia — supervisiona usinas hidrelétricas, define tarifas de luz (via ANEEL) e o preço do combustível (via ANP e Petrobras). É quem decide sobre petróleo, gás natural e energia renovável.', 'PSD', 'infraestrutura', 2),
      m('comunicacoes',   'Juscelino Filho',    'Ministério das Comunicações',
        'Garante que o país tenha internet, telefone e TV. Regula o setor via ANATEL (que fiscaliza as operadoras), cuida dos Correios e define políticas de inclusão digital para regiões sem acesso.', 'União Brasil', 'infraestrutura', 3),
      m('cidades',        'Jader Filho',        'Ministério das Cidades',
        'Cuida de habitação e planejamento urbano. Opera o Minha Casa Minha Vida (que financia casas para famílias de baixa renda), investe em saneamento básico (água e esgoto) e transporte coletivo.', 'MDB', 'infraestrutura', 4),
      m('meioAmbiente',   'Marina Silva',       'Ministério do Meio Ambiente e Mudança do Clima',
        'Protege florestas, rios e a biodiversidade do Brasil. Comanda o IBAMA (que multa e embarga quem destrói o meio ambiente), o ICMBio (que cuida das áreas protegidas) e as políticas climáticas, como o Fundo Amazônia.', 'Rede', 'infraestrutura', 5),
      m('portosAeroportos','Silvio Costa Filho','Ministério de Portos e Aeroportos',
        'Administra os portos e aeroportos federais — define quais serão concedidos à iniciativa privada, regulamenta companhias aéreas (via ANAC) e garante que o escoamento da produção agrícola e industrial funcione.', 'Republicanos', 'infraestrutura', 6),
      m('integracao',     'Waldez Góes',        'Ministério da Integração e Desenvolvimento Regional',
        'Cuida de regiões menos desenvolvidas — coordena a SUDAM (Amazônia) e SUDENE (Nordeste), opera a Defesa Civil em desastres naturais e supervisiona obras estratégicas como a transposição do Rio São Francisco.', 'PDT', 'infraestrutura', 7),
    ],
  },
  {
    slug: 'defesa',
    nome: 'Defesa e Segurança',
    icone: '🛡',
    cor: '#F44336',
    cargos: [
      m('justica',        'Ricardo Lewandowski','Ministério da Justiça e Segurança Pública',
        'Comanda a segurança pública federal — Polícia Federal (que investiga crimes federais e corrupção), PRF (que patrulha as rodovias federais) e o sistema penitenciário federal. Define a política de drogas e combate ao crime organizado.', 'sem partido', 'defesa', 1),
      m('defesa',         'José Múcio',         'Ministério da Defesa',
        'Comanda as Forças Armadas — Exército, Marinha e Aeronáutica. Garante a soberania do país, as fronteiras e o espaço aéreo. Em situações de crise, os militares podem ser convocados para apoiar operações internas (como desastres ou segurança em grandes eventos).', 'sem partido', 'defesa', 2),
      m('gsi',            'Marcos Antonio Amaro','Gabinete de Segurança Institucional',
        'Protege o Presidente e cuida da inteligência de Estado (informações estratégicas e secretas). Supervisiona a ABIN (Agência Brasileira de Inteligência), que monitora ameaças à segurança nacional.', 'sem partido', 'defesa', 3),
      m('agu',            'Jorge Messias',      'Advocacia-Geral da União',
        'É o advogado do governo federal. Defende a União em processos judiciais (quando alguém processa o governo) e dá pareceres jurídicos para evitar que o governo tome decisões ilegais. Também recupera dívidas com a União.', 'sem partido', 'defesa', 4),
      m('cgu',            'Vinícius Marques de Carvalho','Controladoria-Geral da União',
        'É o "fiscal interno" do governo. Audita os gastos públicos, investiga denúncias de corrupção em órgãos federais e garante que a Lei de Acesso à Informação seja cumprida (o direito do cidadão de saber o que o governo faz com seu dinheiro).', 'sem partido', 'defesa', 5),
    ],
  },
  {
    slug: 'politico',
    nome: 'Político-Institucional',
    icone: '🏛',
    cor: '#9C27B0',
    cargos: [
      m('casaCivil',      'Rui Costa',          'Casa Civil',
        'É o "chefe de gabinete" do Presidente. Coordena todos os ministérios para que trabalhem de forma integrada, gerencia a agenda do Presidente e filtra as propostas antes de chegarem a ele. É o segundo cargo mais poderoso do Executivo.', 'PT', 'politico', 1),
      m('relacoesInst',   'Alexandre Padilha',  'Secretaria de Relações Institucionais',
        'É o "embaixador" do governo no Congresso. Negocia apoio dos parlamentares para aprovação de leis e evita derrotas do governo nas votações. Também articula com governadores e prefeitos para alinhar políticas.', 'PT', 'politico', 2),
      m('secomSocial',    'Sidônio Palmeira',   'Secretaria de Comunicação Social',
        'Cuida da imagem e da comunicação do governo — define como anunciar os programas públicos, combate desinformação sobre políticas do governo e supervisiona a EBC (Empresa Brasil de Comunicação, que opera a TV Brasil).', 'PT', 'politico', 3),
      m('secGeral',       'Márcio Macêdo',      'Secretaria-Geral da Presidência',
        'É a ponte entre o governo e a sociedade civil — sindicatos, movimentos sociais, ONGs. Organiza conselhos participativos (onde cidadãos opinam sobre políticas públicas) e garante que grupos organizados tenham voz no governo.', 'PT', 'politico', 4),
      m('relacoesExt',    'Mauro Vieira',       'Ministério das Relações Exteriores',
        'É o "embaixador do Brasil no mundo". Define a política externa — como o Brasil se posiciona em conflitos internacionais, quais acordos comerciais e tratados assina, e como se relaciona com organismos como ONU, BRICS e Mercosul.', 'sem partido', 'politico', 5),
      m('cienciaTec',     'Luciana Santos',     'Ministério da Ciência, Tecnologia e Inovação',
        'Financia pesquisa científica e inovação tecnológica. Apoia universidades e institutos como CNPq, Embrapa (pesquisa agropecuária) e INPE (que monitora o clima e o desmatamento). É quem garante que o Brasil invista em ciência e em tecnologia própria.', 'PCdoB', 'politico', 6),
    ],
  },
];

// ── ESTADUAL/MUNICIPAL — placeholders genéricos ─────────────────────────────
export interface CargosEstaduais {
  governador: CargoEletivo;
  vice: CargoEletivo;
  secretarios: CargoEletivo[];
}

export interface CargosMunicipais {
  prefeito: CargoEletivo;
  vice: CargoEletivo;
  secretarios: CargoEletivo[];
}

const SECRETARIAS_ESTADUAIS = [
  { id: 'sec-educacao',       cargo: 'Secretaria de Educação',
    funcao: 'Cuida de todas as escolas públicas estaduais (ensino médio principalmente). Define quais professores contratar, o material didático e as condições das escolas. O governador nomeia o secretário — é ele quem decide os rumos da educação no estado.' },
  { id: 'sec-saude',          cargo: 'Secretaria de Saúde',
    funcao: 'Opera os hospitais estaduais, UPAs e unidades de referência. Gerencia o repasse de verbas do SUS para os municípios e define protocolos de atendimento. Nas crises (como epidemias), é a secretaria que coordena a resposta do estado.' },
  { id: 'sec-fazenda',        cargo: 'Secretaria de Fazenda',
    funcao: 'Arrecada os principais impostos estaduais: ICMS (que incide sobre tudo que você compra) e IPVA (imposto do carro). Com esse dinheiro, o estado paga servidores, obras e serviços. O secretário define como equilibrar receita e gasto.' },
  { id: 'sec-seguranca',      cargo: 'Secretaria de Segurança Pública',
    funcao: 'Comanda a Polícia Civil (investigação de crimes), a Polícia Militar (patrulhamento nas ruas) e o Corpo de Bombeiros. Define as estratégias de combate ao crime, distribui viaturas e efetivo, e responde pelos índices de violência do estado.' },
  { id: 'sec-infraestrutura', cargo: 'Secretaria de Infraestrutura',
    funcao: 'Constrói e mantém as estradas estaduais, pontes, barragens e obras públicas. Decide quais obras entram no orçamento do ano e fiscaliza as empresas contratadas. A qualidade das rodovias e do saneamento depende desta secretaria.' },
];

const SECRETARIAS_MUNICIPAIS = [
  { id: 'sec-educacao',   cargo: 'Secretaria Municipal de Educação',
    funcao: 'Cuida das creches e escolas municipais (do berçário ao 5º ano). O prefeito nomeia o secretário — ele define salários de professores, merenda escolar, reforma das escolas e programas de aprendizagem. É a porta de entrada da educação pública para as crianças.' },
  { id: 'sec-saude',      cargo: 'Secretaria Municipal de Saúde',
    funcao: 'Gerencia os postos de saúde (UBSs), o atendimento básico e os programas de vacinação na cidade. É a secretaria mais próxima do cidadão — resolve desde uma consulta de rotina até surtos de doenças no bairro. O prefeito nomeia quem vai comandá-la.' },
  { id: 'sec-obras',      cargo: 'Secretaria de Obras e Infraestrutura',
    funcao: 'Cuida das ruas, calçadas, iluminação pública e obras da cidade. Quando um buraco aparece na sua rua, é desta secretaria a responsabilidade de tapar. O secretário é nomeado pelo prefeito e decide quais obras entram no orçamento municipal.' },
  { id: 'sec-fazenda',    cargo: 'Secretaria de Fazenda',
    funcao: 'Arrecada os impostos municipais: IPTU (imposto do imóvel, que todo proprietário paga anualmente) e ISS (cobrado de quem presta serviços — médicos, advogados, salões). Com esse dinheiro, a prefeitura paga funcionários e faz obras.' },
  { id: 'sec-assistencia', cargo: 'Secretaria de Assistência Social',
    funcao: 'Atende famílias em situação de vulnerabilidade — opera os CRAS (centros de referência de assistência social), distribui benefícios emergenciais e apoia idosos, crianças em risco e pessoas em situação de rua. É a rede de proteção social da cidade.' },
];

// ── GOVERNADORES eleitos em 2022 ────────────────────────────────────────────
// Fontes: Wikipedia / portais oficiais dos governos estaduais
const GOVERNADORES: Record<string, { nome: string; partido: string; fotoUrl?: string }> = {
  AC: { nome: 'Gladson Cameli',         partido: 'PP',
        fotoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Gladson_Cameli_2019.jpg/400px-Gladson_Cameli_2019.jpg' },
  AL: { nome: 'Paulo Dantas',           partido: 'MDB',
        fotoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/PauloDantas.jpg/400px-PauloDantas.jpg' },
  AP: { nome: 'Clécio Luís',            partido: 'Solidariedade' },
  AM: { nome: 'Wilson Lima',            partido: 'União Brasil',
        fotoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Wilson_Lima_-_2019_%28cropped%29.jpg/400px-Wilson_Lima_-_2019_%28cropped%29.jpg' },
  BA: { nome: 'Jerônimo Rodrigues',     partido: 'PT',
        fotoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Jer%C3%B4nimo_Rodrigues.jpg/400px-Jer%C3%B4nimo_Rodrigues.jpg' },
  CE: { nome: 'Elmano de Freitas',      partido: 'PT' },
  DF: { nome: 'Ibaneis Rocha',          partido: 'MDB',
        fotoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Ibaneis_Rocha_foto_oficial.jpg/400px-Ibaneis_Rocha_foto_oficial.jpg' },
  ES: { nome: 'Renato Casagrande',      partido: 'PSB',
        fotoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Renato_Casagrande_2019.jpg/400px-Renato_Casagrande_2019.jpg' },
  GO: { nome: 'Ronaldo Caiado',         partido: 'União Brasil',
        fotoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Ronaldo_Caiado.jpg/400px-Ronaldo_Caiado.jpg' },
  MA: { nome: 'Carlos Brandão',         partido: 'PSB' },
  MT: { nome: 'Mauro Mendes',           partido: 'União Brasil' },
  MS: { nome: 'Eduardo Riedel',         partido: 'PSDB' },
  MG: { nome: 'Romeu Zema',            partido: 'Novo',
        fotoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/Romeu_Zema_Governador_de_Minas_Gerais.jpg/400px-Romeu_Zema_Governador_de_Minas_Gerais.jpg' },
  PA: { nome: 'Helder Barbalho',        partido: 'MDB',
        fotoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Helder_Barbalho_-_2019_%28cropped%29.jpg/400px-Helder_Barbalho_-_2019_%28cropped%29.jpg' },
  PB: { nome: 'João Azevêdo',           partido: 'PSB' },
  PR: { nome: 'Carlos Massa Ratinho Junior', partido: 'PSD',
        fotoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Ratinho_Junior.jpg/400px-Ratinho_Junior.jpg' },
  PE: { nome: 'Raquel Lyra',            partido: 'PSDB' },
  PI: { nome: 'Rafael Fonteles',        partido: 'PT' },
  RJ: { nome: 'Cláudio Castro',         partido: 'PL',
        fotoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Cl%C3%A1udio_Castro_Governador_do_Rio_de_Janeiro.jpg/400px-Cl%C3%A1udio_Castro_Governador_do_Rio_de_Janeiro.jpg' },
  RN: { nome: 'Fátima Bezerra',         partido: 'PT',
        fotoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/F%C3%A1tima_Bezerra_governadora_RN_%28cropped%29.jpg/400px-F%C3%A1tima_Bezerra_governadora_RN_%28cropped%29.jpg' },
  RS: { nome: 'Eduardo Leite',          partido: 'PSDB',
        fotoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Eduardo_Leite_foto_oficial_2019_%28cropped%29.jpg/400px-Eduardo_Leite_foto_oficial_2019_%28cropped%29.jpg' },
  RO: { nome: 'Marcos Rocha',           partido: 'União Brasil' },
  RR: { nome: 'Arthur Henrique',        partido: 'MDB' },
  SC: { nome: 'Jorginho Mello',         partido: 'PL' },
  SP: { nome: 'Tarcísio de Freitas',    partido: 'Republicanos',
        fotoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Tarccisio_de_Freitas_%28cropped%29.jpg/400px-Tarccisio_de_Freitas_%28cropped%29.jpg' },
  SE: { nome: 'Fábio Mitidieri',        partido: 'PSD' },
  TO: { nome: 'Wanderlei Barbosa',      partido: 'Republicanos' },
};

export function getCargosEstaduais(uf: string): CargosEstaduais {
  const estado = getEstado(uf);
  const nomeEstado = estado?.nome ?? uf;
  const govData = GOVERNADORES[uf.toUpperCase()];
  return {
    governador: {
      id: `gov-${uf}`,
      nome: govData?.nome ?? `Governador(a) de ${nomeEstado}`,
      cargo: 'Governador — Chefe do Poder Executivo Estadual',
      funcao: `É o chefe do governo de ${nomeEstado}. Comanda as polícias (Civil e Militar), as escolas estaduais e os hospitais públicos do estado. Sanciona leis estaduais (aprovadas pela Assembleia Legislativa) e nomeia secretários — cada um responsável por uma área como saúde, educação ou segurança.`,
      partido: govData?.partido ?? '—',
      fotoUrl: govData?.fotoUrl,
      mandato: '2023-2026',
      ordem: 1,
    },
    vice: {
      id: `vice-${uf}`,
      nome: `Vice-Governador(a) de ${nomeEstado}`,
      cargo: 'Vice-Governador',
      funcao: 'Assume o governo se o Governador ficar impossibilitado (por doença, viagem ou afastamento). Na prática, também exerce funções ativas — geralmente coordena uma secretaria ou programa específico do governo estadual.',
      partido: '—',
      mandato: '2023-2026',
      ordem: 2,
    },
    secretarios: SECRETARIAS_ESTADUAIS.map((s, i) => ({
      id: `${s.id}-${uf}`,
      nome: `Secretário(a) de ${nomeEstado}`,
      cargo: s.cargo,
      funcao: s.funcao,
      ordem: 10 + i,
    })),
  };
}

export function getCargosMunicipais(uf: string, slugMunicipio: string): CargosMunicipais {
  const nomeMunicipio = slugMunicipio.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return {
    prefeito: {
      id: `pref-${uf}-${slugMunicipio}`,
      nome: `Prefeito(a) de ${nomeMunicipio}`,
      cargo: 'Prefeito — Chefe do Poder Executivo Municipal',
      funcao: `É quem manda na administração de ${nomeMunicipio}. Sanciona leis municipais (aprovadas pelos vereadores) — ou seja, assina para que entrem em vigor, ou veta quando discorda. Nomeia os secretários municipais, que são os responsáveis por cada área da cidade: saúde, educação, obras, assistência social. Em resumo: é o "CEO" da prefeitura.`,
      partido: '—',
      mandato: '2025-2028',
      ordem: 1,
    },
    vice: {
      id: `vice-pref-${uf}-${slugMunicipio}`,
      nome: `Vice-Prefeito(a) de ${nomeMunicipio}`,
      cargo: 'Vice-Prefeito',
      funcao: 'Assume o comando da prefeitura se o prefeito ficar doente, viajar ou for afastado. Frequentemente acumula uma secretaria ou coordena projetos específicos do governo municipal.',
      partido: '—',
      mandato: '2025-2028',
      ordem: 2,
    },
    secretarios: SECRETARIAS_MUNICIPAIS.map((s, i) => ({
      id: `${s.id}-${uf}-${slugMunicipio}`,
      nome: `Secretário(a) de ${nomeMunicipio}`,
      cargo: s.cargo,
      funcao: s.funcao,
      ordem: 10 + i,
    })),
  };
}
