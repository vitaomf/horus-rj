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
  funcao: 'Pensa no Brasil como uma empresa gigante — o Presidente é o CEO. Ele decide onde vai o dinheiro público, escolhe os ministros, e pode barrar qualquer lei que o Congresso aprove. Se o Congresso fizer uma lei e ele não concordar, assina "não" — e a lei não entra em vigor. É o cargo mais poderoso do país.',
  fotoUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/9e/Foto_oficial_de_Luiz_In%C3%A1cio_Lula_da_Silva_%28ombros%29_denoise.jpg',
  partido: 'PT',
  mandato: '2023-2026',
  ordem: 1,
};

export const VICE_PRESIDENTE: CargoEletivo = {
  id: 'vice-presidente',
  nome: 'Geraldo Alckmin',
  cargo: 'Vice-Presidente da República',
  funcao: 'Fica de plantão caso o Presidente adoeça, saia do país ou seja afastado. Enquanto isso não acontece, ajuda a coordenar os ministérios e representa o governo em reuniões com empresários e parlamentares.',
  fotoUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/c2/Alckmin_2024.jpg',
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
        'É o "ministro da mesada" do Brasil. Decide quanto o governo pode gastar, cuida de cobrar os impostos de todos nós (via Receita Federal) e garante que o dinheiro não acabe antes do fim do ano. Quando a economia vai mal, é aqui que aparece primeiro.', 'PT', 'economico', 1,
        'https://upload.wikimedia.org/wikipedia/commons/5/52/Fernando_Haddad_posse_min._da_Fazenda.jpg'),
      m('planejamento',   'Simone Tebet',       'Ministério do Planejamento e Orçamento',
        'Faz o orçamento do Brasil — como uma família que senta pra decidir onde vai gastar o dinheiro do mês, só que aqui são centenas de bilhões. Define quanto vai pra saúde, educação, obras e cada área do governo.', 'MDB', 'economico', 2,
        'https://upload.wikimedia.org/wikipedia/commons/a/a1/01.01.2023_-_Posse_de_Simone_Tebet%2C_Ministra_de_Estado_do_Planejamento_%2852626505494%29_%28cropped%29.jpg'),
      m('trabalho',       'Luiz Marinho',       'Ministério do Trabalho e Emprego',
        'Cuida das regras entre patrão e empregado. Define o salário-mínimo todo ano, fiscaliza se as empresas estão cumprindo a lei e cuida do FGTS — aquela reserva que quem trabalha com carteira assinada acumula e pode sacar em certas situações.', 'PT', 'economico', 3,
        'https://upload.wikimedia.org/wikipedia/commons/2/2a/01.01.2023_-_Posse_de_Luiz_Marinho%2C_Ministro_de_Estado_do_Trabalho_%2852626603644%29_%28cropped%29.jpg'),
      m('agricultura',    'Carlos Fávaro',      'Ministério da Agricultura e Pecuária',
        'Apoia os grandes produtores rurais — garante crédito agrícola e protege o país de pragas e doenças animais. É quem viabiliza as exportações do agronegócio (soja, carne, cana) que entram muitas divisas para o Brasil.', 'PSD', 'economico', 4,
        'https://upload.wikimedia.org/wikipedia/commons/f/fc/Carlos_F%C3%A1varo_-_Foto_oficial_como_Senador.jpg'),
      m('industria',      'Geraldo Alckmin',    'Ministério do Desenvolvimento, Indústria, Comércio e Serviços',
        'Ajuda as fábricas e empresas brasileiras a crescer, negocia acordos comerciais com outros países e cuida do BNDES — o banco do governo que empresta dinheiro mais barato pra empresas investirem e gerar empregos.', 'PSB', 'economico', 5,
        'https://upload.wikimedia.org/wikipedia/commons/c/c2/Alckmin_2024.jpg'),
      m('desenvAgrario',  'Paulo Teixeira',     'Ministério do Desenvolvimento Agrário',
        'Enquanto o Ministério da Agricultura cuida dos grandes fazendeiros, este cuida dos pequenos: distribui terra pra quem não tem, apoia assentamentos e financia quem produz feijão, arroz e verduras pra alimentar o Brasil.', 'PT', 'economico', 6,
        'https://upload.wikimedia.org/wikipedia/commons/6/6a/02.01.2023_-_Posse_de_Paulo_Teixeira%2C_Ministro_de_Estado_de_Estado_do_Desenvolvimento_Agr%C3%A1rio_%2852626408096%29_%28cropped%29.jpg'),
      m('pesca',          'André de Paula',     'Ministério da Pesca e Aquicultura',
        'Apoia os pescadores — tanto os artesanais que pescam de barco pequeno no litoral quanto as fazendas de peixe em tanques. Define as regras de pesca pra não acabar com os peixes dos rios e mares.', 'PSD', 'economico', 7,
        'https://upload.wikimedia.org/wikipedia/commons/f/f9/01.01.2023_-_Posse_de_Andr%C3%A9_de_Paula%2C_Ministro_de_Estado_da_Pesca_e_Aquicultura_%2852625774842%29_%28cropped%29.jpg'),
      m('turismo',        'Celso Sabino',       'Ministério do Turismo',
        'Divulga o Brasil pra quem está fora do país e incentiva o turismo interno. Tudo que atrai visitante — praias, festas, parques — passa por aqui. Quando o turismo cresce, gera emprego e renda para muita gente.', 'União Brasil', 'economico', 8,
        'https://upload.wikimedia.org/wikipedia/commons/6/66/Celso_Sabino_2026.jpg'),
      m('empreendedorismo','Márcio França',     'Ministério do Empreendedorismo e MEIs',
        'Ajuda quem quer abrir um negócio, especialmente os MEIs — trabalhadores que se registram como empresa individual. Simplifica a burocracia e cria formas de conseguir crédito mais barato pra quem está começando.', 'PSB', 'economico', 9,
        'https://upload.wikimedia.org/wikipedia/commons/2/2f/Ordem_do_Ipiranga_-_M%C3%A1rcio_Fran%C3%A7a.jpg'),
    ],
  },
  {
    slug: 'social',
    nome: 'Social',
    icone: '👥',
    cor: '#FF9800',
    cargos: [
      m('saude',          'Nísia Trindade',     'Ministério da Saúde',
        'Comanda o SUS — os hospitais e postos de saúde que atendem de graça. Compra todas as vacinas do calendário nacional, fiscaliza remédios e alimentos pela ANVISA e define como tratar doenças. Sem ele, não existiria saúde pública no Brasil.', 'sem partido', 'social', 1,
        'https://upload.wikimedia.org/wikipedia/commons/3/36/N%C3%ADsia_Trindade_Lima.jpg'),
      m('educacao',       'Camilo Santana',     'Ministério da Educação',
        'Cuida de todas as escolas públicas do Brasil. Define o que os alunos vão aprender, distribui livros didáticos de graça e opera o ENEM — a prova que abre as portas pra faculdade. Também financia bolsas como ProUni e FIES.', 'PT', 'social', 2,
        'https://upload.wikimedia.org/wikipedia/commons/7/75/Senador_Camilo_Santana.jpg'),
      m('mulheres',       'Cida Gonçalves',     'Ministério das Mulheres',
        'Trabalha pra que homens e mulheres tenham os mesmos direitos. Cuida do combate à violência doméstica (Lei Maria da Penha), da igualdade de salários entre homens e mulheres que fazem o mesmo trabalho.', 'PT', 'social', 3,
        'https://upload.wikimedia.org/wikipedia/commons/2/24/2023_-_Reuni%C3%A3o_com_a_Cida_Gon%C3%A7alves%2C_Ministra_das_Mulheres_%28cropped%29.jpg'),
      m('igualdadeRacial','Anielle Franco',     'Ministério da Igualdade Racial',
        'Combate o racismo e cria programas pra garantir que negros, quilombolas e outros grupos historicamente excluídos tenham as mesmas oportunidades que os demais — em educação, saúde e trabalho.', 'PT', 'social', 4,
        'https://upload.wikimedia.org/wikipedia/commons/5/5a/2023-01-26_Anielle_Franco.JPG'),
      m('povosIndigenas', 'Sonia Guajajara',    'Ministério dos Povos Indígenas',
        'Protege as terras e os direitos dos povos indígenas. Trabalha com a FUNAI pra garantir que as comunidades indígenas não sejam expulsas de suas terras e que sua cultura e saúde sejam preservadas.', 'PSOL', 'social', 5,
        'https://upload.wikimedia.org/wikipedia/commons/d/d1/COP30_-_S%C3%B4nia_Guajajara_02.jpg'),
      m('direitosHumanos','Macaé Evaristo',     'Ministério dos Direitos Humanos e Cidadania',
        'Protege quem precisa de mais cuidado: crianças, idosos, pessoas com deficiência, LGBTQIA+. Também cuida de jovens que cometeram infrações e monitora se os direitos estão sendo respeitados em todo o país.', 'PT', 'social', 6,
        'https://upload.wikimedia.org/wikipedia/commons/e/e3/Maca%C3%A9_Evaristo_%2854025594176%29_Sept._2024_%28cropped%29.jpg'),
      m('cultura',        'Margareth Menezes',  'Ministério da Cultura',
        'Financia o que nos torna brasileiros: o cinema, a música, o teatro, os livros. Preserva os lugares históricos e distribui verba pra artistas e projetos culturais via leis de incentivo.', 'PT', 'social', 7,
        'https://upload.wikimedia.org/wikipedia/commons/2/22/2022-09-07_Ensaio_do_Bicenten%C3%A1rio_da_Independ%C3%AAncia_27_%28cropped%29.jpg'),
      m('esportes',       'André Fufuca',       'Ministério do Esporte',
        'Investe no esporte — desde os atletas olímpicos (que recebem a Bolsa Atleta) até a construção de quadras em bairros carentes. Quando o Brasil vai bem nas Olimpíadas, este ministério tem parte do mérito.', 'PP', 'social', 8,
        'https://upload.wikimedia.org/wikipedia/commons/1/1d/13-09-23._MEsp_-_Posse_Min_Andr%C3%A9_Fufuca_%28cropped%29.jpg'),
      m('cidadania',      'Wellington Dias',    'Ministério do Desenvolvimento Social, Família e Assistência',
        'Opera o Bolsa Família — o programa que transfere dinheiro todo mês pra famílias em situação de pobreza. Também cuida do BPC (aposentadoria pra idosos pobres e pessoas com deficiência) e dos centros de assistência social nos bairros.', 'PT', 'social', 9,
        'https://upload.wikimedia.org/wikipedia/commons/6/6e/Senadores_da_57%C2%AA_Legislatura_%2852689032501%29.jpg'),
      m('previdencia',    'Carlos Lupi',        'Ministério da Previdência Social',
        'Administra o INSS — o cofre das aposentadorias. Quando você trabalha com carteira assinada e contribui pro INSS, é este ministério que vai te pagar a aposentadoria, o auxílio se ficar doente, ou a pensão pra família se você falecer.', 'PDT', 'social', 10,
        'https://upload.wikimedia.org/wikipedia/commons/d/d8/01.01.2023_-_Posse_de_Carlos_Lupi%2C_Ministro_de_Estado_da_Previd%C3%AAncia_Social_%2852625793002%29_%28cropped%29.jpg'),
    ],
  },
  {
    slug: 'infraestrutura',
    nome: 'Infraestrutura',
    icone: '🏗',
    cor: '#03A9F4',
    cargos: [
      m('transportes',    'Renan Filho',        'Ministério dos Transportes',
        'Cuida das estradas federais, ferrovias e rios navegáveis. Decide quais rodovias vão ter pedágio (com empresa privada cuidando) e quais obras de infraestrutura entram no plano do governo. Quer uma estrada nova? Passa por aqui.', 'MDB', 'infraestrutura', 1,
        'https://upload.wikimedia.org/wikipedia/commons/3/3e/Senadores_da_57%C2%AA_Legislatura_%2852689452405%29.jpg'),
      m('minasEnergia',   'Alexandre Silveira', 'Ministério de Minas e Energia',
        'Garante que a luz não falte. Supervisiona as usinas de energia (hidrelétrica, solar, eólica), decide as tarifas da sua conta de luz e cuida do petróleo e gás natural. Quando a energia fica cara, é aqui que está a razão.', 'PSD', 'infraestrutura', 2,
        'https://upload.wikimedia.org/wikipedia/commons/a/a8/Fotos_Oficiais_dos_Senadores_da_56%C2%AA_Legislatura_-_Alexandre_Silveira_%2852261299526%29.jpg'),
      m('comunicacoes',   'Juscelino Filho',    'Ministério das Comunicações',
        'Garante que o Brasil tenha internet, telefone e TV. Regula as operadoras (via ANATEL), cuida dos Correios e tenta levar internet pra regiões remotas que ainda não têm acesso.', 'União Brasil', 'infraestrutura', 3,
        'https://upload.wikimedia.org/wikipedia/commons/a/a4/Fotos_oficiais_do_Ministro_de_Estado_das_Comunica%C3%A7%C3%B5es_Juscelino_Filho_%2852682623696%29.jpg'),
      m('cidades',        'Jader Filho',        'Ministério das Cidades',
        'Cuida de moradia e saneamento. Opera o Minha Casa Minha Vida — o programa que financia casas pra famílias de baixa renda. Quando falta esgoto ou água encanada numa cidade, é aqui que parte da solução precisa vir.', 'MDB', 'infraestrutura', 4,
        'https://upload.wikimedia.org/wikipedia/commons/f/f1/Jader_Barbalho_Filho%2C_August_2023.jpg'),
      m('meioAmbiente',   'Marina Silva',       'Ministério do Meio Ambiente e Mudança do Clima',
        'Protege florestas, rios e animais. Comanda o IBAMA (que multa quem desmata ou polui) e as reservas naturais. É quem representa o Brasil nas negociações sobre o clima no mundo — como os acordos pra reduzir emissões.', 'Rede', 'infraestrutura', 5,
        'https://upload.wikimedia.org/wikipedia/commons/3/33/CI_-_Comiss%C3%A3o_de_Servi%C3%A7os_de_Infraestrutura_%2854549175000%29_%28cropped%29.jpg'),
      m('portosAeroportos','Silvio Costa Filho','Ministério de Portos e Aeroportos',
        'Administra os grandes aeroportos e portos do Brasil. Decide quais serão gerenciados por empresas privadas e garante que as pessoas e mercadorias se movam pelo país sem parar.', 'Republicanos', 'infraestrutura', 6,
        'https://upload.wikimedia.org/wikipedia/commons/f/f5/31-10-2023._Juscelino_Filho_recebe_o_ministro_de_Portos_e_Aeroportos_Silvio_Costa_Filho_%28cropped%29.jpg'),
      m('integracao',     'Waldez Góes',        'Ministério da Integração e Desenvolvimento Regional',
        'Cuida das regiões que precisam mais atenção — Nordeste e Amazônia. Em catástrofes como enchentes e secas, coordena a Defesa Civil para ajudar as vítimas. É quem tenta diminuir a desigualdade entre as regiões do Brasil.', 'PDT', 'infraestrutura', 7,
        'https://upload.wikimedia.org/wikipedia/commons/3/3b/2023_-_Reuni%C3%A3o_com_o_Ministro_Waldez_G%C3%B3es_-_MDR_%28cropped%29.jpg'),
    ],
  },
  {
    slug: 'defesa',
    nome: 'Defesa e Segurança',
    icone: '🛡',
    cor: '#F44336',
    cargos: [
      m('justica',        'Ricardo Lewandowski','Ministério da Justiça e Segurança Pública',
        'Comanda a Polícia Federal (que investiga grandes crimes como corrupção e tráfico) e a PRF (que patrulha as estradas federais). Define como o governo vai combater o crime organizado e o tráfico de drogas.', 'sem partido', 'defesa', 1,
        'https://upload.wikimedia.org/wikipedia/commons/d/dd/Ricardo_Lewandowski_em_novembro_de_2016_%28recorte%29.jpg'),
      m('defesa',         'José Múcio',         'Ministério da Defesa',
        'Comanda o Exército, a Marinha e a Aeronáutica. Os militares protegem as fronteiras, o espaço aéreo e o mar do Brasil. Em desastres como enchentes, as Forças Armadas também ajudam no socorro às vítimas.', 'sem partido', 'defesa', 2,
        'https://upload.wikimedia.org/wikipedia/commons/5/5c/Foto_Oficial_do_Senhor_Ministro_da_Defesa_Jos%C3%A9_M%C3%BAcio_Monteiro_Filho_%2852624967260%29.jpg'),
      m('gsi',            'Marcos Antonio Amaro','Gabinete de Segurança Institucional',
        'É a agência de inteligência do Presidente. Protege o Presidente e sua família, coordena as informações estratégicas e secretas do Estado e supervisiona a ABIN — os espiões do governo.', 'sem partido', 'defesa', 3,
        'https://upload.wikimedia.org/wikipedia/commons/f/f1/04.05.2023_-_Posse_do_Ministro_do_Gabinete_de_Seguran%C3%A7a_Institucional%2C_General_Marcos_Amaro_%2852869271052%29_%28cropped%29.jpg'),
      m('agu',            'Jorge Messias',      'Advocacia-Geral da União',
        'É o advogado do governo. Quando alguém processa o governo federal, a AGU defende. Antes do governo tomar uma decisão importante, a AGU analisa se é legal. Também cobra dívidas que terceiros têm com a União.', 'sem partido', 'defesa', 4,
        'https://upload.wikimedia.org/wikipedia/commons/5/54/Jorge_Messias_-_CCJ_-_Comissão_de_Constituição%2C_Justiça_e_Cidadania_-_55239002980_%28cropped%29.jpg'),
      m('cgu',            'Vinícius Marques de Carvalho','Controladoria-Geral da União',
        'É o fiscal interno do governo federal. Audita os gastos, investiga suspeitas de corrupção nos órgãos federais e garante seu direito de saber como o dinheiro público é gasto — via Lei de Acesso à Informação.', 'sem partido', 'defesa', 5,
        'https://upload.wikimedia.org/wikipedia/commons/6/68/02.01.2023_-_Posse_de_Vinicius_Marques_de_Carvalho%2C_Ministro_de_Estado_da_CGU_%2852626908178%29_%28cropped%29.jpg'),
    ],
  },
  {
    slug: 'politico',
    nome: 'Político-Institucional',
    icone: '🏛',
    cor: '#9C27B0',
    cargos: [
      m('casaCivil',      'Rui Costa',          'Casa Civil',
        'É o braço direito do Presidente. Coordena todos os ministérios pra trabalharem juntos, gerencia a agenda presidencial e filtra os assuntos antes de chegarem ao Presidente. É o segundo cargo mais poderoso do governo.', 'PT', 'politico', 1),
      m('relacoesInst',   'Alexandre Padilha',  'Secretaria de Relações Institucionais',
        'É o negociador do governo no Congresso. Convence os parlamentares a votar a favor das propostas do governo e garante que o governo tenha maioria nas votações importantes. Sem ele, as leis do governo não passam.', 'PT', 'politico', 2),
      m('secomSocial',    'Sidônio Palmeira',   'Secretaria de Comunicação Social',
        'Cuida da imagem e da comunicação do governo — define como os programas vão ser divulgados pra população, combate fake news sobre políticas públicas e gerencia a TV Brasil e a Rádio Nacional.', 'PT', 'politico', 3),
      m('secGeral',       'Márcio Macêdo',      'Secretaria-Geral da Presidência',
        'É a ponte entre o governo e a sociedade — sindicatos, movimentos sociais, ONGs. Organiza os conselhos onde cidadãos participam das decisões do governo e garante que as demandas da sociedade cheguem ao Presidente.', 'PT', 'politico', 4),
      m('relacoesExt',    'Mauro Vieira',       'Ministério das Relações Exteriores',
        'Representa o Brasil no mundo. Define como o país se posiciona em conflitos internacionais, quais tratados assina e como se relaciona com organismos como a ONU, o BRICS e o Mercosul.', 'sem partido', 'politico', 5),
      m('cienciaTec',     'Luciana Santos',     'Ministério da Ciência, Tecnologia e Inovação',
        'Investe em pesquisa e inovação. Financia universidades, o INPE (que monitora o desmatamento por satélite), a Embrapa (pesquisa agrícola) e startups de tecnologia. É quem garante que o Brasil não fique pra trás na ciência.', 'PCdoB', 'politico', 6),
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
    funcao: 'Cuida das escolas estaduais — principalmente o ensino médio, o último ciclo antes da faculdade. Define salários de professores, o material didático e as condições das escolas. O governador nomeia quem vai comandar.' },
  { id: 'sec-saude',          cargo: 'Secretaria de Saúde',
    funcao: 'Administra os hospitais e UPAs do estado. Coordena como o dinheiro do SUS é distribuído entre as cidades e decide o que fazer em emergências de saúde. Em epidemias, é esta secretaria que coordena a resposta do estado.' },
  { id: 'sec-fazenda',        cargo: 'Secretaria de Fazenda',
    funcao: 'Arrecada os impostos do estado — principalmente o ICMS (embutido no preço de tudo que você compra) e o IPVA (imposto do carro). Com esse dinheiro, o estado paga funcionários, obras e serviços públicos.' },
  { id: 'sec-seguranca',      cargo: 'Secretaria de Segurança Pública',
    funcao: 'Comanda a Polícia Civil (que investiga crimes), a Polícia Militar (que patrulha as ruas) e os Bombeiros. Quando a violência aumenta num estado, é aqui que a responsabilidade está.' },
  { id: 'sec-infraestrutura', cargo: 'Secretaria de Infraestrutura',
    funcao: 'Constrói e mantém as estradas, pontes e obras estaduais. Decide quais obras entram no orçamento do ano e fiscaliza as empresas contratadas. A qualidade das rodovias estaduais depende desta secretaria.' },
];

const SECRETARIAS_MUNICIPAIS = [
  { id: 'sec-educacao',   cargo: 'Secretaria Municipal de Educação',
    funcao: 'Cuida das creches e escolas municipais — do berçário até o 5º ano. O prefeito nomeia o secretário, que define os salários dos professores, a merenda escolar e as reformas das escolas. É a porta de entrada da educação pública pras crianças.' },
  { id: 'sec-saude',      cargo: 'Secretaria Municipal de Saúde',
    funcao: 'Gerencia os postos de saúde (UBSs) e a vacinação da cidade. É a secretaria mais próxima do cidadão — resolve desde uma consulta de rotina até surtos de doenças no bairro. Nomeada pelo prefeito.' },
  { id: 'sec-obras',      cargo: 'Secretaria de Obras e Infraestrutura',
    funcao: 'Cuida das ruas, calçadas e iluminação pública. Quando aparece um buraco na sua rua, é desta secretaria a responsabilidade de tapar. O secretário, nomeado pelo prefeito, decide quais obras entram no orçamento.' },
  { id: 'sec-fazenda',    cargo: 'Secretaria de Fazenda',
    funcao: 'Arrecada os impostos municipais: IPTU (imposto do imóvel) e ISS (cobrado de médicos, advogados, salões). Com esse dinheiro, a prefeitura paga seus funcionários e faz obras na cidade.' },
  { id: 'sec-assistencia', cargo: 'Secretaria de Assistência Social',
    funcao: 'Atende famílias em situação de vulnerabilidade nos CRAS (centros de assistência social), distribui benefícios emergenciais e apoia idosos, crianças em risco e pessoas em situação de rua.' },
];

// ── GOVERNADORES eleitos em 2022 ────────────────────────────────────────────
// Fontes: Wikipedia / portais oficiais dos governos estaduais
const GOVERNADORES: Record<string, { nome: string; partido: string; fotoUrl?: string }> = {
  AC: { nome: 'Gladson Cameli',         partido: 'PP',
        fotoUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Retrato_oficial_Gladson_Cameli_2019.jpg' },
  AL: { nome: 'Paulo Dantas',           partido: 'MDB',
        fotoUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b3/Paulo_Dantas_Foto_Oficial_%28cropped%29.jpg' },
  AP: { nome: 'Clécio Luís',            partido: 'Solidariedade',
        fotoUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/3f/Foto_oficial_do_governador_do_Estado_do_Amap%C3%A1%2C_Cl%C3%A9cio_Lu%C3%ADs.jpg' },
  AM: { nome: 'Wilson Lima',            partido: 'União Brasil',
        fotoUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/ee/Wilson_Lima.jpg' },
  BA: { nome: 'Jerônimo Rodrigues',     partido: 'PT',
        fotoUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/8c/18_01_2023_-_Visita_de_Cortesia_Jer%C3%B4nimo_Rodrigues_%28Governador_do_Estado_da_Bahia-BA%29_%2852635213362%29_%28cropped%29.jpg' },
  CE: { nome: 'Elmano de Freitas',      partido: 'PT',
        fotoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Plen%C3%A1rio_do_Congresso_%2854441463325%29.jpg/3840px-Plen%C3%A1rio_do_Congresso_%2854441463325%29.jpg' },
  DF: { nome: 'Ibaneis Rocha',          partido: 'MDB',
        fotoUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/48/Ibaneis_Rocha%2C_January_2023_%28cropped%29.jpg' },
  ES: { nome: 'Renato Casagrande',      partido: 'PSB',
        fotoUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/7f/Renato_Casagrande_em_mar%C3%A7o_de_2019.jpg' },
  GO: { nome: 'Ronaldo Caiado',         partido: 'União Brasil',
        fotoUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/f5/Foto_oficial_do_governador_de_Goi%C3%A1s%2C_Ronaldo_Caiado_em_2023_%28ombros%29.jpg' },
  MA: { nome: 'Carlos Brandão',         partido: 'PSB',
        fotoUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/1b/Retrato_Oficial_de_Carlos_Brand%C3%A3o_como_governador_do_Maranh%C3%A3o.jpg' },
  MT: { nome: 'Mauro Mendes',           partido: 'União Brasil',
        fotoUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/0f/2019_Reuni%C3%A3o_com_Ministros_da_Casa_Civil%2C_Defesa%2C_Rela%C3%A7%C3%B5es_Exteriores%2C_Meio_Ambiente%2C_Secretaria-Geral%2C_Secretaria_de_Governo%2C_GSI_e_Governadores_da_Amaz%C3%B4nia_Legal_-_48630502003_%28cropped%29_Mauro_Mendes.jpg' },
  MS: { nome: 'Eduardo Riedel',         partido: 'PSDB',
        fotoUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/1c/Governador_Eduardo_Riedel.jpg' },
  MG: { nome: 'Romeu Zema',            partido: 'Novo',
        fotoUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/bd/Romeu_Zema%2C_December_2024_%28cropped%29.jpg' },
  PA: { nome: 'Helder Barbalho',        partido: 'MDB',
        fotoUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/50/Helder_Barbalho%2C_January_2023_%28cropped%29.jpg' },
  PB: { nome: 'João Azevêdo',           partido: 'PSB',
        fotoUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/5b/Jo%C3%A3o_Azev%C3%AAdo%2C_May_2023_%28cropped%29.jpg' },
  PR: { nome: 'Carlos Massa Ratinho Junior', partido: 'PSD',
        fotoUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/31/Ratinho_J%C3%BAnior_as_governor_of_Paran%C3%A1%2C_January_2023_%28cropped%29.jpg' },
  PE: { nome: 'Raquel Lyra',            partido: 'PSDB',
        fotoUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/08/RL45_14-09.jpg' },
  PI: { nome: 'Rafael Fonteles',        partido: 'PT',
        fotoUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/87/Rafael_Fonteles_%28Foto_Oficial%29.jpg' },
  RJ: { nome: 'Cláudio Castro',         partido: 'PL',
        fotoUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/c0/Claudio_Castro_como_Vice_Governador_do_Rio_de_Janeiro.jpg' },
  RN: { nome: 'Fátima Bezerra',         partido: 'PT',
        fotoUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/08/F%C3%A1tima_Bezerra%2C_2023.jpg' },
  RS: { nome: 'Eduardo Leite',          partido: 'PSDB',
        fotoUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/ec/09.02.2026_%E2%80%93_Eduardo_Leite_em_visita_ao_Cong_Nacional_%2854310872266%29_%28cropped%29.jpg' },
  RO: { nome: 'Marcos Rocha',           partido: 'União Brasil',
        fotoUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/91/Desfile_de_7_de_Setembro_08.09.22_Foto_Daiane_Mendon%C3%A7a_%28384%29_%2852342537421%29_%28cropped%29.jpg' },
  RR: { nome: 'Arthur Henrique',        partido: 'MDB',
        fotoUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/0d/2024_ARTHUR_HENRIQUE_CANDIDATO_PREFEITO_RR_BOA_VISTA_TSE_%28230002024201%29.jpg' },
  SC: { nome: 'Jorginho Mello',         partido: 'PL',
        fotoUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/4e/Governador_Jorginho_Mello_-_Foto_Eduardo_Valente_-_GOVSC-7.jpg' },
  SP: { nome: 'Tarcísio de Freitas',    partido: 'Republicanos',
        fotoUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/74/Governador_do_Estado_de_S%C3%A3o_Paulo%2C_Tarc%C3%ADsio_de_Freitas_-_Foto_Oficial_%28cropped%29.jpg' },
  SE: { nome: 'Fábio Mitidieri',        partido: 'PSD',
        fotoUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/3d/Foto_oficial_do_governador_F%C3%A1bio_Mitidieri.jpg' },
  TO: { nome: 'Wanderlei Barbosa',      partido: 'Republicanos',
        fotoUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/4d/Wanderlei_Barbosa.jpg' },
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
      funcao: `É o chefe de ${nomeEstado} — tipo um prefeito, mas responsável por todas as cidades do estado juntas. Ele comanda a polícia militar (que patrulha as ruas), os hospitais estaduais, as escolas de ensino médio e as estradas. Se algo dá errado no estado, é ele que responde.`,
      partido: govData?.partido ?? '—',
      fotoUrl: govData?.fotoUrl,
      mandato: '2023-2026',
      ordem: 1,
    },
    vice: {
      id: `vice-${uf}`,
      nome: `Vice-Governador(a) de ${nomeEstado}`,
      cargo: 'Vice-Governador',
      funcao: 'Fica de prontidão caso o Governador adoeça, viaje ou seja afastado. Enquanto isso não acontece, geralmente comanda alguma secretaria ou projeto especial do governo estadual.',
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
      funcao: `É o chefe de ${nomeMunicipio} — cuida das ruas, das creches, dos postos de saúde, da coleta de lixo e dos parques. Nomeia os secretários pra cuidar de cada área e assina (ou barra) as leis que os vereadores aprovam. É o cargo político mais próximo do seu dia a dia.`,
      partido: '—',
      mandato: '2025-2028',
      ordem: 1,
    },
    vice: {
      id: `vice-pref-${uf}-${slugMunicipio}`,
      nome: `Vice-Prefeito(a) de ${nomeMunicipio}`,
      cargo: 'Vice-Prefeito',
      funcao: 'O substituto do prefeito. Se o prefeito sair por qualquer motivo, o vice assume. Enquanto isso não acontece, costuma coordenar alguma secretaria ou projeto da prefeitura.',
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
