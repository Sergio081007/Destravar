# Guia de Integração — API Destravar (Frontend)

> Referência de endpoints HTTP para o time de **Front-End / Mobile**.  
> Base URL (desenvolvimento): `http://localhost:8000`  
> Base URL (produção): a definir após deploy

---

## Antes de começar

**1. Ativar o ambiente virtual e instalar dependências**
```bash
cd Destravar
source venv/bin/activate
pip install -r requirements.txt
```

**2. Criar o arquivo `.env` na raiz do projeto** (use `.env.example` como referência)
```
SUPABASE_URL=https://xxxxxxxx.supabase.co
SUPABASE_KEY=sua_service_role_key
GROQ_API_KEY=sua_groq_key
```

**3. Subir o servidor**
```bash
uvicorn app.main:app --reload
```

---

## Índice de Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/usuarios` | Cria ou atualiza um usuário |
| `GET`  | `/texto-calibracao` | Retorna o texto padrão de calibração |
| `POST` | `/calibrar` | Realiza calibração de voz (3 áudios) |
| `GET`  | `/calibracao` | Retorna calibração mais recente do usuário |
| `GET`  | `/textos/aleatorio` | Retorna texto aleatório por dificuldade |
| `GET`  | `/texto/{fase}` | Retorna pergunta e dica de uma fase específica |
| `GET`  | `/trava-lingua/{id}` | Retorna trava-língua por ID |
| `POST` | `/transcrever` | Transcreve áudio e analisa fluência |
| `POST` | `/comparar-texto` | Compara texto referência com transcrição |
| `POST` | `/sessao/iniciar` | Inicia uma sessão de exercício |
| `POST` | `/sessao/completar` | Marca uma sessão como concluída |
| `GET`  | `/mapa/{usuario_id}` | Retorna o mapa completo de fases |
| `GET`  | `/streak/{usuario_id}` | Retorna streak e XP do usuário |
| `GET`  | `/ranking` | Retorna o ranking global (Mural dos Heróis) |

---

## Usuários

### `POST /usuarios`

Cria um novo usuário ou atualiza se o `id` já existir (upsert). Chamar no cadastro.

**Body (JSON)**
```json
{ "nome": "Ana Souza" }
```

Opcionalmente, passe `id` para usar um UUID externo (ex: Supabase Auth):
```json
{ "id": "uuid-do-auth", "nome": "Ana Souza" }
```

**Resposta**
```json
{
  "usuario_id": "uuid-gerado",
  "nome": "Ana Souza"
}
```

> Guarde o `usuario_id` localmente — ele é necessário em praticamente todos os outros endpoints.

---

## Calibração

### `GET /texto-calibracao`

Retorna o texto que o usuário deve ler durante a calibração.

**Resposta**
```json
{
  "id": "texto_calibracao",
  "titulo": "Texto de calibração",
  "conteudo": "Hoje o céu estava azul e sem nuvens...",
  "palavras": 35,
  "instrucao_rapido": "Leia esse texto da forma mais rápida que conseguir.",
  "instrucao_devagar": "Agora leia esse mesmo texto de forma bem lenta.",
  "instrucao_confortavel": "E por último, leia esse texto de forma confortável para você."
}
```

---

### `POST /calibrar`

Recebe 3 áudios e o texto lido. Calcula WPM e salva o perfil de velocidade do usuário.

**Body (multipart/form-data)**

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `usuario_id` | string | ✅ | ID do usuário |
| `audio_rapido` | file | ✅ | Áudio lendo o mais rápido possível |
| `audio_devagar` | file | ✅ | Áudio lendo bem devagar |
| `audio_confortavel` | file | ✅ | Áudio lendo em ritmo natural |
| `texto_referencia` | string | ❌ | Texto lido (busca do banco se omitido) |

**Formatos de áudio aceitos:** `.flac`, `.mp3`, `.mp4`, `.mpeg`, `.mpga`, `.m4a`, `.ogg`, `.opus`, `.wav`, `.webm`

**Resposta**
```json
{
  "status": "calibrado",
  "leituras": {
    "rapido":      { "wpm": 180.5, "duracao_segundos": 12.3 },
    "devagar":     { "wpm": 85.2,  "duracao_segundos": 26.1 },
    "confortavel": { "wpm": 130.0, "duracao_segundos": 17.4 }
  },
  "perfil": {
    "wpm_base":          130.0,
    "limite_inferior":   104.0,
    "limite_superior":   156.0,
    "margem_percentual": 0.20
  },
  "texto_referencia": "Hoje o céu estava azul..."
}
```

---

### `GET /calibracao?usuario_id={id}`

Retorna o perfil de calibração mais recente do usuário.

**Resposta**
```json
{
  "wpm_rapido":      180.5,
  "wpm_devagar":     85.2,
  "wpm_confortavel": 130.0,
  "wpm_base":        130.0,
  "limite_inferior": 104.0,
  "limite_superior": 156.0,
  "criado_em":       "2024-08-15T10:00:00Z"
}
```

> Retorna **404** se o usuário ainda não foi calibrado.

---

## Exercícios — Visão Geral

O app tem **3 exercícios por fase**.

### Exercício 1 — Respiração

**100% local. Nenhuma chamada de API.**

A tela anima as fases inspire / segure / expire / relaxe por 3 ciclos. Ao concluir, registre via `POST /sessao/iniciar` e `POST /sessao/completar`.

**Critério de conclusão:** 1 aprovação.

---

### Exercício 2 — Fala Espontânea

Fluxo completo com API:

```
1. GET /textos/aleatorio
      └─ usa ex2_pergunta e ex2_dica para exibir a pergunta aberta

2. Usuário grava a resposta

3. POST /transcrever  (modo_livre=true, sem texto_referencia)
      └─ retorna transcricao_corrigida + analise_corrigida

4. Tela exibe transcricao_corrigida com palavras coloridas
   conforme analise_corrigida (ver tabela de categorias abaixo)

5. Usuário clica "Tentar repetir"
      └─ frontend mantém transcricao_corrigida em memória

6. Usuário grava novamente

7. POST /transcrever  (modo_livre=false, texto_referencia = transcricao_corrigida)
      └─ retorna score, analise_palavras, aprovado, status_feedback

8. POST /sessao/iniciar + POST /sessao/completar
```

**Critério de conclusão:** 2 aprovações consecutivas.

---

### Exercício 3 — Suavização Articulatória

**100% local. Nenhuma chamada de API.**

A tela exibe instrução com som-alvo e referências de palavras/frases (campos `ex3_*` do texto da fase, disponíveis via `GET /textos/aleatorio` ou `GET /texto/{fase}`). Exercício de automonitoramento sem gravação.

Ao fim, dois botões: **"Consegui"** ou **"Precisei forçar"**.

**Critério de conclusão:** 3 marcações "Consegui" consecutivas → `POST /sessao/iniciar` + `POST /sessao/completar`.

---

## Conteúdo (Textos e Trava-Línguas)

### `GET /textos/aleatorio`

Retorna um texto ou trava-língua aleatório de acordo com a dificuldade.

**Query params**

| Parâmetro | Tipo | Default | Valores possíveis |
|-----------|------|---------|-------------------|
| `dificuldade` | string | `facil` | `facil`, `medio`, `dificil` |
| `categoria` | string | `texto` | `texto`, `trava_lingua` |
| `ultimo_id` | string | — | ID do último conteúdo exibido (evita repetição) |

**Mapeamento de dificuldade → fases**
- `facil` → fases 1–3
- `medio` → fases 4–7
- `dificil` → fases 8–10

**Resposta (categoria `texto`)**
```json
{
  "id":                  "txt_004",
  "fase":                2,
  "dificuldade":         "facil",
  "ex2_pergunta":        "Qual é a sua cor favorita e por quê?",
  "ex2_dica":            "Que sentimento essa cor traz?",
  "ex3_som_alvo":        "o",
  "ex3_instrucao":       "Fale o som O bem aberto.",
  "ex3_exemplo_palavra": "Hoje",
  "ex3_trava_lingua_id": null
}
```

---

### `GET /texto/{fase}`

Retorna a pergunta e dica de fala espontânea para a fase informada.

**Path param:** `fase` — inteiro (1–10)

**Resposta**
```json
{
  "id":      "txt_004",
  "pergunta": "Qual é a sua cor favorita e por quê?",
  "dica":     "Que sentimento essa cor traz?"
}
```

---

### `GET /trava-lingua/{id}`

Retorna uma trava-língua pelo ID. Usar quando `ex3_trava_lingua_id` do texto não for `null`.

**Path param:** `id` — ex: `"tl_008"`

**Resposta**
```json
{
  "id":          "tl_008",
  "titulo":      "A dona da dor",
  "conteudo":    "Dona Dora dorme e desperta...",
  "sons_alvo":   ["d"],
  "dica":        "O D não pode virar pausa. Mantenha o fluxo.",
  "repeticoes":  3,
  "fase_minima": 8,
  "dificuldade": "facil"
}
```

---

## Transcrição e Análise de Fala

### `POST /transcrever`

Endpoint principal de análise de fala. Usado em dois modos: **livre** (fala espontânea, 1ª gravação do Ex. 2) e **leitura** (comparação com texto de referência, "Tentar repetir").

**Body (multipart/form-data)**

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `file` | file | ✅ | Áudio gravado pelo usuário |
| `usuario_id` | string | ❌ | ID do usuário (necessário para análise de oscilação) |
| `modo_livre` | boolean | ❌ | `true` na 1ª gravação do Ex. 2; omita ou `false` no "Tentar repetir" |
| `texto_referencia` | string | ❌ | Omita no modo livre; preencha com `transcricao_corrigida` no "Tentar repetir" |
| `wpm_min` | float | ❌ | WPM mínimo esperado |
| `wpm_max` | float | ❌ | WPM máximo esperado |

---

**Resposta — modo livre (`modo_livre=true`)**

```json
{
  "modo_livre":            true,
  "transcricao":           "eu eu fui ao ao mercado comprar leite",
  "transcricao_corrigida": "eu fui ao mercado comprar leite",

  "analise_corrigida": [
    { "word": "eu",      "categoria": "disfluente" },
    { "word": "fui",     "categoria": "correta"    },
    { "word": "ao",      "categoria": "disfluente" },
    { "word": "mercado", "categoria": "correta"    },
    { "word": "comprar", "categoria": "correta"    },
    { "word": "leite",   "categoria": "correta"    }
  ],

  "aprovado":       false,
  "status_feedback": {
    "status":     "diretivo",
    "subtipo":    "precisao",
    "titulo":     "Quase lá!",
    "mensagem":   "Tente falar com mais calma.",
    "wpm_obtido": 95.4,
    "precisao":   72.0,
    "faixa_min":  null,
    "faixa_max":  null,
    "desvio_pct": 0.0
  },

  "wpm":                   95.4,
  "taxa_fluencia":         0.72,
  "score":                 0.72,
  "feedback_fono":         "Respire antes de cada frase. Você está quase lá!",
  "duracao_segundos":      8.4,
  "total_palavras":        6,
  "repeticoes":            2,
  "taxa_repeticao":        0.18,
  "bloqueios_silenciosos": 1,
  "muletas_detectadas":    0,
  "blocos_gaguejo":        [],
  "blocos_silabicos":      [],
  "prolongamentos":        [],
  "hesitacoes":            [],
  "oscilacoes":            1,
  "taxa_oscilacao":        0.08,
  "wpm_base":              130.0,
  "calibrado":             true
}
```

> **`transcricao_corrigida`** — guarde este valor no estado local. Ele será usado como `texto_referencia` no `POST /transcrever` do "Tentar repetir".

> **`analise_corrigida`** — lista das palavras da versão corrigida com categoria herdada da versão bruta. Use para colorir a frase na tela (ver tabela de categorias abaixo).

---

**Resposta — modo leitura (`modo_livre=false`, com `texto_referencia`)**

Mesmos campos acima, mais:

```json
{
  "modo_livre":    false,
  "precisao_alvo": 94.3,
  "score_bruto":   0.91,
  "score":         0.82,
  "omitidas":      ["comprar"],

  "analise_palavras": [
    {
      "word":             "eu",
      "start":            0.12,
      "end":              0.38,
      "probability":      0.98,
      "duration":         0.26,
      "silence_before":   0.0,
      "is_stutter":       false,
      "is_filler":        false,
      "is_prolongation":  false,
      "wpm_local":        128.0,
      "oscilacao":        "normal",
      "status_diff":      "acerto",
      "categoria":        "correta",
      "repeticao_direta": false,
      "bloco_silabico":   false
    }
  ],

  "penalidade_repeticao":      0.09,
  "penalidade_blocos":         0.05,
  "penalidade_silabica":       0.08,
  "penalidade_prolongamentos": 0.07,
  "penalidade_duracao":        0.0,
  "penalidade_confianca":      0.0,
  "ratio_duracao":             1.1,
  "palavras_longas":           1
}
```

---

**Categorias de palavras — guia de cores**

Usadas em `analise_corrigida` (modo livre) e `analise_palavras` (modo leitura):

| Categoria | Cor sugerida | Significado |
|-----------|--------------|-------------|
| `correta` | verde | Palavra falada sem problemas |
| `disfluente` | vermelho | Repetição de palavra ou sílaba (gaguejo) |
| `muleta` | laranja | Palavra de preenchimento (ah, hum, tipo, então...) |
| `prolongamento` | amarelo | Vogal ou consoante esticada anormalmente |
| `acelerado` | azul claro | Ritmo acima do limite superior calibrado |
| `lento` | roxo/cinza | Ritmo abaixo do limite inferior calibrado |
| `pouco_clara` | cinza claro | Prob. de reconhecimento < 50% (só modo leitura) |
| `incorreta` | vermelho escuro | Palavra diferente do texto esperado (só modo leitura) |

**Campo `aprovado`:** `true` quando `score >= 0.70` e WPM dentro da faixa calibrada.

**Campo `status_feedback.status`:** `"aprovado"` | `"aviso_suave"` | `"diretivo"`

**Campo `fluencia`:** `"disfluente"` | `"lento"` | `"normal"` | `"rapido"`

**Campo `oscilacoes` / `taxa_oscilacao`:** só preenchido se o usuário foi calibrado (`calibrado: true`).

---

### `POST /comparar-texto`

Compara um texto de referência com um texto transcrito. Útil para re-análise sem reenviar áudio.

**Body (JSON)**
```json
{
  "texto_referencia": "Hoje eu fui ao mercado.",
  "texto_transcrito": "Hoje eu fui ao ao mercado."
}
```

> Sempre envie `texto_transcrito`. O fallback interno não é confiável em produção.

**Resposta**
```json
{
  "acertos":  ["hoje", "eu", "fui", "ao", "mercado"],
  "erros":    [],
  "omitidas": [],
  "extras":   ["ao"],
  "score":    0.8333
}
```

---

## Sessões

### `POST /sessao/iniciar`

Registra o início de uma sessão de exercício.

**Body (JSON)**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `usuario_id` | string | ID do usuário |
| `fase` | int | Fase atual |
| `exercicio` | int | Número do exercício (1, 2 ou 3) |
| `tipo` | string | Tipo da sessão (ex: `"exercicio_1"`, `"exercicio_2"`, `"exercicio_3"`) |

**Resposta**
```json
{
  "sessao_id": "uuid-da-sessao",
  "status":    "iniciada"
}
```

> Guarde o `sessao_id` para completar a sessão depois.

---

### `POST /sessao/completar`

Marca a sessão como concluída e registra os resultados.

**Body (JSON)**

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `sessao_id` | string | ✅ | ID retornado pelo `/sessao/iniciar` |
| `aprovado` | boolean | ❌ | Se a sessão foi aprovada |
| `wpm_obtido` | float | ❌ | WPM obtido na sessão |
| `score` | float | ❌ | Score de fluência (0.0–1.0) |
| `score_fluencia` | float | ❌ | Score de fluência complementar |
| `transcricao_corrigida` | string | ❌ | Transcrição corrigida da sessão |

**Resposta**
```json
{ "status": "concluida" }
```

---

## Progresso e Gamificação

### `GET /mapa/{usuario_id}`

Retorna o estado completo do mapa de fases do usuário.

**Lógica de desbloqueio:** Fase 1 sempre desbloqueada. Fase N desbloqueada quando a fase N-1 está concluída (3 exercícios aprovados).

**Critérios de aprovação por exercício:**
- Exercício 1: 1 aprovação consecutiva
- Exercício 2: 2 aprovações consecutivas
- Exercício 3: 3 aprovações consecutivas

**Resposta**
```json
{
  "usuario_id": "uuid",
  "mapa": [
    {
      "fase": 1,
      "desbloqueada": true,
      "fase_concluida": true,
      "exercicios": [
        { "exercicio": 1, "aprovacoes_consecutivas": 1, "criterio": 1, "concluido": true },
        { "exercicio": 2, "aprovacoes_consecutivas": 2, "criterio": 2, "concluido": true },
        { "exercicio": 3, "aprovacoes_consecutivas": 3, "criterio": 3, "concluido": true }
      ],
      "melhor_wpm":    142.5,
      "ultima_sessao": "2024-08-15T10:00:00Z"
    },
    {
      "fase": 2,
      "desbloqueada": true,
      "fase_concluida": false,
      "exercicios": [
        { "exercicio": 1, "aprovacoes_consecutivas": 1, "criterio": 1, "concluido": true },
        { "exercicio": 2, "aprovacoes_consecutivas": 1, "criterio": 2, "concluido": false },
        { "exercicio": 3, "aprovacoes_consecutivas": 0, "criterio": 3, "concluido": false }
      ],
      "melhor_wpm":    138.0,
      "ultima_sessao": "2024-08-16T09:30:00Z"
    }
  ]
}
```

---

### `GET /streak/{usuario_id}`

Retorna o streak atual e o XP acumulado do usuário.

**Regras de XP:**
- Sessão aprovada: **+10 XP**
- Fase concluída (3 exercícios): **+50 XP**
- Bônus por dia ativo com streak: **+5 XP**

**Resposta**
```json
{
  "streak_atual":     5,
  "streak_maximo":    12,
  "xp_total":         390,
  "xp_hoje":          25,
  "ultimo_dia_ativo": "2024-08-16"
}
```

> `streak_atual` é zerado se o último dia ativo foi há mais de 1 dia.

---

### `GET /ranking?limite={n}`

Retorna o ranking global de usuários por XP (Mural dos Heróis).

**Query params**

| Parâmetro | Tipo | Default | Descrição |
|-----------|------|---------|-----------|
| `limite` | int | `10` | Número máximo de usuários retornados |

**Resposta**
```json
{
  "ranking": [
    { "posicao": 1, "usuario_id": "uuid-1", "nome": "Ana",    "xp_total": 520, "streak_atual": 10 },
    { "posicao": 2, "usuario_id": "uuid-2", "nome": "Carlos", "xp_total": 390, "streak_atual": 5  },
    { "posicao": 3, "usuario_id": "uuid-3", "nome": "Maria",  "xp_total": 210, "streak_atual": 2  }
  ],
  "total_usuarios": 47
}
```

---

## Tratamento de Erros

Todos os endpoints seguem o padrão de erros do FastAPI:

```json
{ "detail": "Mensagem de erro descritiva." }
```

| Status | Situação |
|--------|----------|
| `400` | Parâmetro inválido ou ausente |
| `404` | Recurso não encontrado (texto, calibração, trava-língua) |
| `500` | Erro interno (banco, transcrição, etc.) |

**Sempre verifique antes de exibir o conteúdo:**
```javascript
const res = await fetch('/textos/aleatorio?dificuldade=facil')
if (!res.ok) {
  // exibe mensagem de fallback
  return
}
const texto = await res.json()
```

---

## Fluxos típicos por exercício

### Exercício 1 — Respiração (local)
```
1. GET /mapa/{usuario_id}     → verifica se está desbloqueado
2. [animação local — sem API]
3. POST /sessao/iniciar       → { usuario_id, fase, exercicio: 1, tipo: "exercicio_1" }
4. POST /sessao/completar     → { sessao_id, aprovado: true, score: 1.0 }
5. GET /mapa/{usuario_id}     → atualiza UI
```

### Exercício 2 — Fala Espontânea
```
1. GET /mapa/{usuario_id}          → verifica se está desbloqueado
2. GET /textos/aleatorio           → usa ex2_pergunta e ex2_dica
3. POST /sessao/iniciar            → { usuario_id, fase, exercicio: 2, tipo: "exercicio_2" }

4. [1ª gravação]
   POST /transcrever  modo_livre=true
   → guarda transcricao_corrigida em estado local
   → exibe frase colorida via analise_corrigida

5. [usuário clica "Tentar repetir"]
   POST /transcrever  modo_livre=false, texto_referencia=transcricao_corrigida
   → exibe score e feedback

6. POST /sessao/completar     → { sessao_id, aprovado, wpm_obtido, score }
7. GET /mapa/{usuario_id}     → atualiza UI
```

### Exercício 3 — Suavização Articulatória (local)
```
1. GET /mapa/{usuario_id}     → verifica se está desbloqueado
2. GET /textos/aleatorio      → usa campos ex3_* para instrução e som-alvo
   (se ex3_trava_lingua_id != null → GET /trava-lingua/{id})
3. POST /sessao/iniciar       → { usuario_id, fase, exercicio: 3, tipo: "exercicio_3" }
4. [automonitoramento local — sem gravação]
5. Usuário marca "Consegui" ou "Precisei forçar"
6. POST /sessao/completar     → { sessao_id, aprovado: true/false, score: 1.0 ou 0.0 }
7. GET /mapa/{usuario_id}     → atualiza UI
```

---

## Dúvidas

Fala com a **Luciana** para dúvidas sobre banco de dados e API.
