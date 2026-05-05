-- ============================================================
-- DESTRAVAR — Schema v6.1.0
-- ============================================================

-- Limpeza inicial (ordem respeita FK)
DROP TABLE IF EXISTS progresso          CASCADE;
DROP TABLE IF EXISTS sessoes            CASCADE;
DROP TABLE IF EXISTS calibracao         CASCADE;
DROP TABLE IF EXISTS textos             CASCADE;
DROP TABLE IF EXISTS trava_linguas      CASCADE;
DROP TABLE IF EXISTS textos_calibracao  CASCADE;
DROP TABLE IF EXISTS mensagens_feedback CASCADE;
DROP TABLE IF EXISTS usuarios           CASCADE;

-- ============================================================
-- 1. usuarios
-- ============================================================
CREATE TABLE usuarios (
    id        UUID PRIMARY KEY,
    nome      TEXT NOT NULL,
    email     TEXT UNIQUE,
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. textos_calibracao
-- ============================================================
CREATE TABLE textos_calibracao (
    id                    TEXT PRIMARY KEY,
    titulo                TEXT,
    conteudo              TEXT,
    palavras              INT,
    instrucao_rapido      TEXT,
    instrucao_devagar     TEXT,
    instrucao_confortavel TEXT
);

-- ============================================================
-- 3. trava_linguas
-- ============================================================
CREATE TABLE trava_linguas (
    id          TEXT PRIMARY KEY,
    fase_minima INT,
    dificuldade TEXT,
    titulo      TEXT,
    conteudo    TEXT,
    sons_alvo   TEXT[],
    dica        TEXT,
    repeticoes  INT
);

-- ============================================================
-- 4. textos (v6 — ex2 é fala espontânea, sem conteudo/palavras)
-- ============================================================
CREATE TABLE textos (
    id                  TEXT PRIMARY KEY,
    fase                INT,
    dificuldade         TEXT,
    titulo              TEXT,
    ex2_pergunta        TEXT,
    ex2_dica            TEXT,
    ex3_som_alvo        TEXT,
    ex3_instrucao       TEXT,
    ex3_exemplo_palavra TEXT,
    ex3_trava_lingua_id TEXT REFERENCES trava_linguas(id)
);

-- ============================================================
-- 5. mensagens_feedback
-- ============================================================
CREATE TABLE mensagens_feedback (
    id       SERIAL PRIMARY KEY,
    status   TEXT NOT NULL,           -- 'aprovado' | 'aviso_suave' | 'diretivo'
    subtipo  TEXT,                    -- 'lento' | 'rapido' | 'precisao' | 'combinado' | NULL
    titulo   TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    ativo    BOOLEAN NOT NULL DEFAULT TRUE
);

-- ============================================================
-- 6. calibracao
-- ============================================================
CREATE TABLE calibracao (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id       UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    wpm_rapido       FLOAT,
    wpm_devagar      FLOAT,
    wpm_confortavel  FLOAT,
    wpm_base         FLOAT,
    limite_inferior  FLOAT,
    limite_superior  FLOAT,
    texto_referencia TEXT,
    criado_em        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. sessoes
-- ============================================================
CREATE TABLE sessoes (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id    UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    texto_id      TEXT REFERENCES textos(id),
    fase          INT,
    exercicio     INT,
    tipo          TEXT,
    tentativa     INT,
    status        TEXT NOT NULL DEFAULT 'em_andamento', -- 'em_andamento' | 'concluida'
    aprovado              BOOLEAN,
    wpm_obtido            FLOAT,
    score                 FLOAT,
    score_fluencia        FLOAT,   -- taxa de fluência da fala espontânea (passo 1 do ex2)
    transcricao_corrigida TEXT,    -- versão fluente gerada pelo LLM no passo 1 do ex2
    resultado_ex3         TEXT,
    criado_em     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 8. progresso
-- ============================================================
CREATE TABLE progresso (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id              UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    fase                    INT,
    exercicio               INT,
    aprovacoes_consecutivas INT DEFAULT 0,
    desbloqueado            BOOLEAN DEFAULT FALSE,
    atualizado_em           TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TRIGGER: cria usuario ao registrar no Auth
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.usuarios (id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', 'Aprendiz'),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- DADOS: textos_calibracao
-- ============================================================
INSERT INTO textos_calibracao (id, titulo, conteudo, palavras, instrucao_rapido, instrucao_devagar, instrucao_confortavel) VALUES
(
  'texto_calibracao',
  'Texto de calibração',
  'Hoje o céu estava azul e sem nuvens. Fui ao parque com minha família e ficamos lá por um tempo. Tinha crianças brincando e pássaros cantando. Foi um dia muito tranquilo e feliz.',
  35,
  'Leia esse texto da forma mais rápida que conseguir.',
  'Agora leia esse mesmo texto de forma bem lenta.',
  'E por último, leia esse texto de forma confortável para você.'
);

-- ============================================================
-- DADOS: trava_linguas
-- ============================================================
INSERT INTO trava_linguas (id, fase_minima, dificuldade, titulo, conteudo, sons_alvo, dica, repeticoes) VALUES
('tl_001', 8,  'facil',   'O rato e o rei',       'O rato roeu a roupa do rei de Roma.',                                                                 ARRAY['r'],            'Vá devagar. O R não precisa de força, precisa de ritmo.',               3),
('tl_002', 8,  'facil',   'O pato pateta',         'O pato pateta pula no prato. O prato do pato é pequeno e chato.',                                      ARRAY['p'],            'Respire antes do P. Não segure o ar.',                                  3),
('tl_003', 8,  'facil',   'A fada fina',           'A fada fina faz fitas fofas para fadas felizes.',                                                       ARRAY['f'],            'O F é suave. Deixe o ar sair sem forçar.',                              3),
('tl_004', 8,  'facil',   'A lua limpa',           'A lua lava a lona longa no lago lindo.',                                                               ARRAY['l'],            'O L é suave, fluido e contínuo.',                                       3),
('tl_005', 8,  'facil',   'O sapo soluça',         'O sapo, soluçando, sai. O sapo saiu, soluçou e sumiu.',                                                ARRAY['s'],            'As vírgulas são obrigatórias. Pare nelas. Realmente pare.',             3),
('tl_006', 8,  'facil',   'A manga macia',         'Manga macia, manga mole, manga madeira e manga manga.',                                                ARRAY['m'],            'O M exige que a boca feche bem. Mas sem travar.',                       3),
('tl_007', 8,  'facil',   'O burro bravo',         'O burro bravo berra. Berrou, bradou e brincou no brejo.',                                              ARRAY['b', 'br'],      'Ritmo estável. Nem rápido demais, nem com pausas longas.',              3),
('tl_008', 8,  'facil',   'A dona da dor',         'Dona Dora dorme e desperta. Desperta e diz: a dor desapareceu.',                                       ARRAY['d'],            'O D não pode virar pausa. Mantenha o fluxo.',                           3),
('tl_009', 9,  'medio',   'O papa e a pipoca',     'O papa papou a pouca papa que o papa Pio Nono pregou.',                                                ARRAY['p'],            'Alta frequência de P. Respire fundo antes de começar.',                 4),
('tl_010', 9,  'medio',   'Pedro e a pedra',       'Pedro pregou um prego numa pedra. Numa pedra pregou um prego Pedro.',                                  ARRAY['pr', 'p'],      'Inversão no final. Mantenha o ritmo mesmo lendo ao contrário.',         4),
('tl_011', 9,  'medio',   'Três tigres',           'Três tigres tristes mastigam trigo. Trigo tragam três tigres tristes.',                                ARRAY['tr', 'ti'],     'Comece com pausas: Três tigres... tristes... Depois junte.',            4),
('tl_012', 9,  'medio',   'O bispo e o vinho',     'O bispo bebeu vinho no bosque. Bispos bebem, bispos dormem.',                                          ARRAY['b', 'v'],       'Diferença entre B e V: não confunda. Pause entre palavras.',            4),
('tl_013', 9,  'medio',   'A cobra e o couro',     'A cobra criou o couro curto na caverna escura.',                                                       ARRAY['c', 'r'],       'Não trave no CR. Separe mentalmente: co-bra.',                          4),
('tl_014', 9,  'medio',   'A cigarra e a aranha',  'A cigarra canta enquanto a aranha tece. A aranha tece enquanto a cigarra canta.',                      ARRAY['c', 'r', 'nh'], 'Inversão no final. Mantenha o ritmo como se fosse música.',             4),
('tl_015', 10, 'dificil', 'Seis sábios sabiás',    'Seis sábios sabiás sentados sob seis sabugos de sabugueiro.',                                          ARRAY['s'],            'Fale em no mínimo 8 segundos. Não menos.',                              5),
('tl_016', 10, 'dificil', 'Os mafagafos',          'Num ninho de mafagafos, cinco mafagafinhos há. Quem os desmafagafizou, bom desmafagafizador será.',    ARRAY['m', 'f', 'g'], 'Decore antes de falar, depois fale no ritmo.',                          5),
('tl_017', 10, 'dificil', 'O trem de ferro',       'O trem treme, trepida e trafega. Trafega, trepida e treme o trem de ferro.',                          ARRAY['tr', 't'],      'Inversão mais grupos consonantais. Desafio máximo.',                    5),
('tl_018', 10, 'dificil', 'O fígado do bígaro',    'O fígado faz falta ao bígaro no fundo do frasco de formol.',                                          ARRAY['f', 'fr'],      'Muitas fricativas seguidas. Marque o ritmo batendo o pé.',              5);

-- ============================================================
-- DADOS: textos (v6 — fala espontânea no ex2)
-- ============================================================
INSERT INTO textos (id, fase, dificuldade, titulo, ex2_pergunta, ex2_dica, ex3_som_alvo, ex3_instrucao, ex3_exemplo_palavra, ex3_trava_lingua_id) VALUES
('txt_001', 1,  'facil',   'Cor favorita',       'Qual é a sua cor favorita e por quê?',                                                         'Que sentimento essa cor traz? Quais objetos têm essa cor?',                  'a',  'Fale o som A bem suave, como se fosse um sussurro. Sinta a voz entrar sem esforço.',                              'Ana',        NULL),
('txt_002', 2,  'facil',   'Café da manhã',      'O que você gosta de comer no café da manhã?',                                                  'Descreva o que você come normalmente. Qual horário você normalmente come?',   'o',  'Fale o som O bem aberto e solto. Não aperte a garganta.',                                                           'Hoje',       NULL),
('txt_003', 3,  'facil',   'Animal favorito',    'Qual é o seu animal favorito? Me conta um pouco sobre ele.',                                   'É doméstico? É aquático? É peludo?',                                         'f',  'Diga FUNDO deixando o ar sair pelo F bem suave. O som F não precisa de força.',                                    'fundo',      NULL),
('txt_004', 4,  'facil',   'Rotina diária',      'Me conta como é a sua rotina.',                                                                'Narre em sequência, desde que acordou, até se preparar para dormir.',        'v',  'Diga VI deixando o ar passar suavemente entre os dentes e o lábio no V. Sem pressão.',                             'vi',         NULL),
('txt_005', 5,  'medio',   'Série ou filme',     'Qual foi a última série ou filme que você assistiu? Me conta um pouco.',                       'Fale o nome, do que se trata e o que achou. Tente manter o ritmo constante.','m',  'Diga MAIS com os lábios se tocando levemente no M. Não prenda o ar, deixe a voz entrar junto.',                    'mais',       NULL),
('txt_006', 6,  'medio',   'Viagem dos sonhos',  'Se você pudesse viajar para qualquer lugar agora, para onde iria e por quê?',                  'Diga o destino e justifique. É fora do seu Estado? É em outro país?',        'b',  'Diga BEM com os lábios se tocando muito levemente. Não prenda o ar antes, solte junto com a voz.',                 'bem',        NULL),
('txt_007', 7,  'medio',   'Pessoa importante',  'Me conta sobre uma pessoa importante na sua vida e o que ela significa para você.',             'Pode ser um amigo, parente, etc!',                                           'p',  'Diga PERSISTIR com o P muito leve. Lábios se tocam quase sem pressão e soltam o ar suavemente.',                  'persistir',  NULL),
('txt_008', 8,  'medio',   'Solo ou grupo',      'Você prefere trabalhar ou estudar sozinho ou em grupo? Por quê?',                              'Dê a sua opinião e explique. É legal ou desafiador?',                        't',  'Diga TODA com a língua tocando levemente os dentes superiores no T. Não trave — solte o som junto com a voz.',   'toda',       NULL),
('txt_009', 9,  'dificil', 'Tecnologia e vida',  'Você acredita que a tecnologia facilita ou complica a vida das pessoas?',                      'Fale devagar nas transições entre ideias.',                                   'd',  'Diga DECISÃO com a língua tocando suavemente os dentes no D. Não prenda o ar — o som sai fluido.',                'decisão',    NULL),
('txt_010', 10, 'dificil', 'Esporte favorito',   'Você tem algum hobbie? Fale sobre ele.',                                                       'Você pode falar sobre esporte, jogos, lazer...',                             'c',  'Diga CONFIANÇA com o C saindo suave. Sinta o ar fluir desde o início da palavra.',                                'confiança',  NULL);

-- ============================================================
-- DADOS: mensagens_feedback
-- ============================================================
INSERT INTO mensagens_feedback (status, subtipo, titulo, mensagem) VALUES

-- aprovado
('aprovado', NULL,        'Incrível!',             'Você leu no ritmo certo. Continue assim!'),
('aprovado', NULL,        'Arrasou!',              'Fluência perfeita. Você está evoluindo muito!'),
('aprovado', NULL,        'Perfeito!',             'Ritmo e precisão no ponto. Orgulho total!'),
('aprovado', NULL,        'Que leitura!',          'Tudo no lugar — ritmo, clareza e precisão.'),
('aprovado', NULL,        'Show!',                 'Você dominou esse texto. Próximo nível!'),

-- aviso_suave / lento
('aviso_suave', 'lento',  'Quase lá!',             'Tente acelerar um pouco o ritmo.'),
('aviso_suave', 'lento',  'Bom trabalho!',         'Só aumente um pouco a velocidade e você passa.'),
('aviso_suave', 'lento',  'Boa leitura!',          'Experimente falar um pouquinho mais rápido.'),
('aviso_suave', 'lento',  'Progredindo!',          'Ritmo um pouco abaixo — você consegue mais!'),

-- aviso_suave / rapido
('aviso_suave', 'rapido', 'Quase lá!',             'Respire e diminua um pouco o ritmo.'),
('aviso_suave', 'rapido', 'Atenção!',              'Você acelerou demais — cada palavra merece atenção.'),
('aviso_suave', 'rapido', 'Foco!',                 'Ritmo alto demais. Vá com calma e vai passar.'),
('aviso_suave', 'rapido', 'Calma aí!',             'Tente desacelerar e aproveitar cada frase.'),

-- diretivo / lento
('diretivo',    'lento',  'Vamos tentar de novo!', 'Sua velocidade está bem abaixo do esperado. Tente falar com mais fluidez.'),
('diretivo',    'lento',  'Não desista!',          'Ritmo muito lento — foque em manter o fluxo da fala.'),
('diretivo',    'lento',  'Respira e tenta!',      'Velocidade abaixo da faixa. Experimente ler sem pausas longas.'),

-- diretivo / rapido
('diretivo',    'rapido', 'Vamos tentar de novo!', 'Você falou muito rápido. Cada ponto final é uma pausa real.'),
('diretivo',    'rapido', 'Calma!',                'Ritmo muito acima do ideal. Respire antes de cada frase.'),
('diretivo',    'rapido', 'Devagar!',              'Velocidade alta demais. Foque em cada palavra com cuidado.'),

-- diretivo / precisao
('diretivo',    'precisao','Atenção ao texto!',    'Sua precisão ficou baixa. Leia com mais atenção às palavras.'),
('diretivo',    'precisao','Vamos de novo!',       'Muitas palavras diferentes do texto. Tente seguir linha por linha.'),
('diretivo',    'precisao','Foco no texto!',       'Precisão abaixo de 70%. Leia devagar e acompanhe cada palavra.'),

-- diretivo / combinado
('diretivo',    'combinado','Vamos tentar de novo!','Ritmo e precisão precisam melhorar. Leia devagar, palavra por palavra.'),
('diretivo',    'combinado','Não desanima!',        'Velocidade e precisão fora da faixa. Respire, foque e tente de novo.');
