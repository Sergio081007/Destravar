-- Limpeza inicial
DROP TABLE IF EXISTS progresso;
DROP TABLE IF EXISTS sessoes;
DROP TABLE IF EXISTS calibracao;
DROP TABLE IF EXISTS textos;
DROP TABLE IF EXISTS trava_linguas;
DROP TABLE IF EXISTS textos_calibracao;
DROP TABLE IF EXISTS usuarios;
DROP TABLE IF EXISTS mensagens_feedback;

-- 1. usuarios (Ajustada para o Auth)
CREATE TABLE usuarios (
    id         UUID PRIMARY KEY,
    nome       TEXT NOT NULL,
    email      TEXT UNIQUE,
    criado_em  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. textos_calibracao
CREATE TABLE textos_calibracao (
    id                    TEXT PRIMARY KEY,
    titulo                TEXT,
    conteudo              TEXT,
    palavras              INT,
    instrucao_rapido      TEXT,
    instrucao_devagar     TEXT,
    instrucao_confortavel TEXT
);

-- 3. trava_linguas
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

-- 4. textos
CREATE TABLE textos (
    id                  TEXT PRIMARY KEY,
    fase                INT,
    dificuldade         TEXT,
    titulo              TEXT,
    conteudo            TEXT,
    palavras            INT,
    ex2_wpm_min         INT,
    ex2_wpm_max         INT,
    ex2_dica            TEXT,
    ex3_som_alvo        TEXT,
    ex3_instrucao       TEXT,
    ex3_exemplo_palavra TEXT,
    ex3_trava_lingua_id TEXT REFERENCES trava_linguas(id)
);

-- 5. calibracao
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

-- 6. sessoes
CREATE TABLE sessoes (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id    UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    texto_id      TEXT REFERENCES textos(id),
    fase          INT,
    exercicio     INT,
    tentativa     INT,
    aprovado      BOOLEAN,
    wpm_obtido    FLOAT,
    resultado_ex3 TEXT,
    criado_em     TIMESTAMPTZ DEFAULT NOW()
);

-- 7. progresso
CREATE TABLE progresso (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id              UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    fase                    INT,
    exercicio               INT,
    aprovacoes_consecutivas INT DEFAULT 0,
    desbloqueado            BOOLEAN DEFAULT FALSE,
    atualizado_em           TIMESTAMPTZ DEFAULT NOW()
);


-- 8. mensagens_feedback
DROP TABLE IF EXISTS mensagens_feedback;
CREATE TABLE mensagens_feedback (
    id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status   TEXT NOT NULL,   -- 'aprovado' | 'aviso_suave' | 'diretivo'
    subtipo  TEXT,            -- 'lento' | 'rapido' | 'precisao' | 'combinado' | NULL
    titulo   TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    ativo    BOOLEAN DEFAULT TRUE
);

INSERT INTO mensagens_feedback (status, subtipo, titulo, mensagem) VALUES

-- aprovado
('aprovado', NULL, 'Incrível!',     'Você leu no ritmo certo. Continue assim!'),
('aprovado', NULL, 'Arrasou!',      'Fluência perfeita. Você está evoluindo muito!'),
('aprovado', NULL, 'Perfeito!',     'Ritmo e precisão no ponto. Orgulho total!'),
('aprovado', NULL, 'Que leitura!',  'Tudo no lugar — ritmo, clareza e precisão.'),
('aprovado', NULL, 'Show!',         'Você dominou esse texto. Próximo nível!'),

-- aviso_suave / lento
('aviso_suave', 'lento', 'Quase lá!',      'Tente acelerar um pouco o ritmo.'),
('aviso_suave', 'lento', 'Bom trabalho!',  'Só aumente um pouco a velocidade e você passa.'),
('aviso_suave', 'lento', 'Boa leitura!',   'Experimente falar um pouquinho mais rápido.'),
('aviso_suave', 'lento', 'Progredindo!',   'Ritmo um pouco abaixo — você consegue mais!'),

-- aviso_suave / rapido
('aviso_suave', 'rapido', 'Quase lá!',  'Respire e diminua um pouco o ritmo.'),
('aviso_suave', 'rapido', 'Atenção!',   'Você acelerou demais — cada palavra merece atenção.'),
('aviso_suave', 'rapido', 'Foco!',      'Ritmo alto demais. Vá com calma e vai passar.'),
('aviso_suave', 'rapido', 'Calma aí!',  'Tente desacelerar e aproveitar cada frase.'),

-- diretivo / lento
('diretivo', 'lento', 'Vamos tentar de novo!', 'Sua velocidade está bem abaixo do esperado. Tente falar com mais fluidez.'),
('diretivo', 'lento', 'Não desista!',           'Ritmo muito lento — foque em manter o fluxo da fala.'),
('diretivo', 'lento', 'Respira e tenta!',       'Velocidade abaixo da faixa. Experimente ler sem pausas longas.'),

-- diretivo / rapido
('diretivo', 'rapido', 'Vamos tentar de novo!', 'Você falou muito rápido. Cada ponto final é uma pausa real.'),
('diretivo', 'rapido', 'Calma!',                'Ritmo muito acima do ideal. Respire antes de cada frase.'),
('diretivo', 'rapido', 'Devagar!',              'Velocidade alta demais. Foque em cada palavra com cuidado.'),

-- diretivo / precisao
('diretivo', 'precisao', 'Atenção ao texto!',  'Sua precisão ficou baixa. Leia com mais atenção às palavras.'),
('diretivo', 'precisao', 'Vamos de novo!',     'Muitas palavras diferentes do texto. Tente seguir linha por linha.'),
('diretivo', 'precisao', 'Foco no texto!',     'Precisão abaixo de 70%. Leia devagar e acompanhe cada palavra.'),

-- diretivo / combinado
('diretivo', 'combinado', 'Vamos tentar de novo!', 'Ritmo e precisão precisam melhorar. Leia devagar, palavra por palavra.'),
('diretivo', 'combinado', 'Não desanima!',          'Velocidade e precisão fora da faixa. Respire, foque e tente de novo.');


-- Função para o Trigger
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

-- Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
