# Guia de Integração — API Destravar (Frontend)

> Referência de endpoints HTTP para o time de **Front-End / Mobile**.  
> Base URL padrão (desenvolvimento): `http://localhost:8000`

---

## Antes de começar

**1. Ativar o ambiente virtual e instalar dependências**
```bash
cd Destravar
source venv/bin/activate
pip install -r requirements.txt
```

**2. Criar o arquivo `.env` na raiz do projeto**
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
| `POST` | `/usuarios` | Cria um novo usuário |
| `GET` | `/texto-calibracao` | Retorna o texto padrão de calibração |
| `POST` | `/calibrar` | Realiza calibração de voz (3 áudios) |
| `GET` | `/calibracao` | Retorna calibração mais recente do usuário |
| `GET` | `/textos/aleatorio` | Retorna texto aleatório por dificuldade |
| `GET` | `/texto/{fase}` | Retorna texto de uma fase específica |
| `GET` | `/trava-lingua/{id}` | Retorna trava-língua por ID |
| `POST` | `/transcrever` | Transcreve áudio e analisa fluência |
| `POST` | `/comparar-texto` | Compara texto referência com transcrição |
| `POST` | `/sessao/iniciar` | Inicia uma sessão de exercício |
| `POST` | `/sessao/completar` | Marca uma sessão como concluída |
| `POST` | `/progresso/exercicio` | Registra progresso de exercício |
| `GET` | `/mapa/{usuario_id}` | Retorna o mapa completo de fases |
| `GET` | `/streak/{usuario_id}` | Retorna streak e XP do usuário |
| `GET` | `/ranking` | Retorna o ranking global (Mural dos Heróis) |

---

## Usuários

### `POST /usuarios`

Cria um novo usuário. Chamar uma única vez no cadastro.

**Body (JSON)**
```json
{ "nome": "Ana Souza" }
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
  "id": "cal_001",
  "conteudo": "O Pedro foi ao parque com a sua cachorra...",
  "titulo": "Texto de calibração"
}
```

---

### `POST /calibrar`

Recebe 3 áudios (rápido, devagar, confortável) e salva o perfil de velocidade do usuário.

**Body (multipart/form-data)**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `usuario_id` | string | ID do usuário |
| `audio_rapido` | file | Áudio lendo o mais rápido possível |
| `audio_devagar` | file | Áudio lendo bem devagar |
| `audio_confortavel` | file | Áudio lendo em ritmo natural |
| `texto_referencia` | string | Texto que foi lido (opcional — busca do banco se omitido) |

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
  "texto_referencia": "O Pedro foi ao parque..."
}
```

---

### `GET /calibracao?usuario_id={id}`

Retorna o perfil de calibração mais recente do usuário.

**Query params**

| Parâmetro | Tipo | Obrigatório |
|-----------|------|-------------|
| `usuario_id` | string | ✅ |

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
  "id": "txt_004",
  "fase": 2,
  "dificuldade": "facil",
  "titulo": "O dia a dia",
  "conteudo": "Hoje eu acordei cedo. Tomei café com pão.",
  "palavras": 9,
  "ex2_wpm_min": 100,
  "ex2_wpm_max": 140,
  "ex2_dica": "Respire antes de cada frase.",
  "ex3_som_alvo": "o",
  "ex3_instrucao": "Fale o som O bem aberto.",
  "ex3_exemplo_palavra": "Hoje",
  "ex3_trava_lingua_id": null
}
```

---

### `GET /texto/{fase}`

Retorna um texto para a fase informada. Retorna apenas `conteudo`, `dica` e limites de WPM.

**Path param:** `fase` — inteiro (1–10)

**Resposta**
```json
{
  "id": "txt_004",
  "conteudo": "Hoje eu acordei cedo. Tomei café com pão.",
  "dica": "Respire antes de cada frase.",
  "wpm_min": 100,
  "wpm_max": 140
}
```

---

### `GET /trava-lingua/{id}`

Retorna uma trava-língua pelo ID. Usar quando `ex3_trava_lingua_id` do texto não for `null`.

**Path param:** `id` — ex: `"tl_008"`

**Resposta**
```json
{
  "id": "tl_008",
  "titulo": "A dona da dor",
  "conteudo": "Dona Dora dorme e desperta...",
  "sons_alvo": ["d"],
  "dica": "O D não pode virar pausa. Mantenha o fluxo.",
  "repeticoes": 3,
  "fase_minima": 8,
  "dificuldade": "facil"
}
```

---

## Transcrição e Análise de Fala

### `POST /transcrever`

Endpoint principal da sessão de fala. Recebe o áudio gravado pelo usuário, transcreve com Whisper e retorna análise completa de fluência, detecção de gaguejo, WPM e score.

**Body (multipart/form-data)**

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `file` | file | ✅ | Áudio gravado pelo usuário |
| `texto_referencia` | string | ❌ | Texto que o usuário deveria ler |
| `usuario_id` | string | ❌ | ID do usuário (necessário para análise de oscilação) |

**Resposta (campos principais)**

```json
{
  "transcricao":           "Texto que o Whisper entendeu",
  "texto_alvo":            "Texto de referência",
  "precisao_alvo":         87.5,
  "duracao_segundos":      14.2,
  "total_palavras":        32,
  "wpm":                   135.2,
  "fluencia":              "normal",

  "score":                 0.76,
  "score_bruto":           0.92,

  "repeticoes":            2,
  "taxa_repeticao":        0.0625,
  "bloqueios_silenciosos": 1,
  "muletas_detectadas":    1,

  "blocos_gaguejo": [
    {
      "palavra":     "meu",
      "repeticoes":  3,
      "pausa_antes": 0.8,
      "inicio":      1.2,
      "fim":         2.1,
      "com_bloqueio": true
    }
  ],
  "blocos_silabicos": [
    {
      "fragmento":    "la",
      "repeticoes":   3,
      "palavra_alvo": "lago",
      "inicio":       4.0,
      "fim":          5.1,
      "tipo":         "silabico"
    }
  ],
  "prolongamentos": [
    {
      "palavra":       "meeeu",
      "inicio":        6.5,
      "fim":           7.2,
      "duracao":       0.7,
      "fator_excesso": 2.3
    }
  ],

  "hesitacoes": [
    {
      "palavra_anterior": "comprar",
      "palavra_seguinte": "pão",
      "inicio":           8.1,
      "fim":              10.5,
      "duracao_pausa":    2.4
    }
  ],

  "feedback_fono": "Quase lá! Respire antes de cada frase. Você consegue!",

  "omitidas":   ["café"],
  "analise_palavras": [...],

  "oscilacoes":    3,
  "taxa_oscilacao": 0.09,
  "wpm_base":      130.0,
  "calibrado":     true,

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

**Campo `fluencia`:** `"disfluente"` | `"lento"` | `"normal"` | `"rapido"`

**Campo `analise_palavras`:** lista com cada palavra transcrita + metadados de timing, probabilidade e categoria:
- `categoria`: `"correta"` | `"pouco_clara"` | `"incorreta"` | `"disfluente"` | `"prolongamento"`

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

Se `texto_transcrito` for omitido, usa a última transcrição processada no servidor.

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
| `tipo` | string | Tipo da sessão (ex: `"exercicio_1"`, `"exercicio_2"`, `"exercicio_3"`) |

**Resposta**
```json
{
  "sessao_id": "uuid-da-sessao",
  "status": "iniciada"
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
| `wpm` | float | ❌ | WPM obtido na sessão |
| `score` | float | ❌ | Score de fluência (0.0–1.0) |

**Resposta**
```json
{ "status": "concluida" }
```

---

### `POST /progresso/exercicio`

Registra o progresso de um exercício individual.

**Body (JSON)**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `usuario_id` | string | ID do usuário |
| `dificuldade` | string | `"facil"`, `"medio"` ou `"dificil"` |
| `score` | float | Score obtido (0.0–1.0) |
| `wpm` | float | WPM obtido |

**Resposta**
```json
{ "status": "registrado", "id": "uuid" }
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
      "melhor_wpm": 142.5,
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
      "melhor_wpm": 138.0,
      "ultima_sessao": "2024-08-16T09:30:00Z"
    },
    {
      "fase": 3,
      "desbloqueada": false,
      "fase_concluida": false,
      "exercicios": [...],
      "melhor_wpm": null,
      "ultima_sessao": null
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
  "streak_atual":    5,
  "streak_maximo":   12,
  "xp_total":        390,
  "xp_hoje":         25,
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
    { "posicao": 2, "usuario_id": "uuid-2", "nome": "Carlos", "xp_total": 390, "streak_atual": 5 },
    { "posicao": 3, "usuario_id": "uuid-3", "nome": "Maria",  "xp_total": 210, "streak_atual": 2 }
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

## Fluxo típico de uma sessão

```
1. App inicia → GET /mapa/{usuario_id}
   → descobre a fase atual e quais exercícios estão desbloqueados

2. Usuário entra num exercício → GET /texto/{fase}
   → exibe o texto para leitura

3. Usuário começa a gravar → POST /sessao/iniciar
   → guarda o sessao_id retornado

4. Usuário termina de gravar → POST /transcrever
   → usa o score e wpm retornados para feedback visual

5. Sessão concluída → POST /sessao/completar
   → envia sessao_id + wpm + score

6. Atualiza mapa → GET /mapa/{usuario_id}
   → exibe progresso e desbloqueios

7. Tela de perfil → GET /streak/{usuario_id}
   → exibe XP e streak

8. Quando texto tem ex3_trava_lingua_id preenchido → GET /trava-lingua/{id}
   → carrega o trava-língua vinculado ao exercício 3
```

---

## Dúvidas

Fala com a **Luciana** para dúvidas sobre banco de dados
