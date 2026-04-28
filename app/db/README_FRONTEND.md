# Guia de Integração — Service de Textos de Treinamento

> Este documento é destinado ao **Front-End**. Explica como requisitar textos de treinamento para exibir ao usuário durante as sessões de fala.

---

## Antes de começar

Antes de qualquer chamada ao service, garanta que:

**1. O ambiente virtual está ativo**
```bash
cd Destravar
source venv/bin/activate
```

**2. As dependências estão instaladas**
```bash
pip install -r requirements.txt
```

**3. O arquivo `.env` existe na raiz do projeto** com as variáveis:
```
SUPABASE_URL=https://xxxxxxxx.supabase.co
SUPABASE_KEY=sua_service_role_key
GROQ_API_KEY=sua_groq_key
```

> O banco é na nuvem (Supabase) — não precisa rodar seed, criar arquivo local nem configurar nada além do `.env`. Os dados já estão lá.

---

## Como requisitar um texto de treinamento

### Importação
```python
from app.db.service import fetch_texto
```

### Assinatura da função
```python
fetch_texto(fase, ultimo_id=None)
```

### Parâmetros

| Parâmetro | Tipo | Descrição | Obrigatório |
|-----------|------|-----------|-------------|
| `fase` | int | Fase atual do usuário (1 a 10) | ✅ |
| `ultimo_id` | str | ID do último texto exibido (evita repetição) | ❌ |

---

## Exemplo de retorno

```json
{
  "id": "txt_002",
  "fase": 2,
  "dificuldade": "facil",
  "titulo": "O dia a dia",
  "conteudo": "Hoje eu acordei cedo. Tomei café com pão. O dia estava bonito.",
  "palavras": 13,
  "ex2_wpm_min": 100,
  "ex2_wpm_max": 140,
  "ex2_dica": "Respire antes de cada frase.",
  "ex3_som_alvo": "o",
  "ex3_instrucao": "Fale o som O bem aberto e solto. Não aperte a garganta.",
  "ex3_exemplo_palavra": "Hoje",
  "ex3_trava_lingua_id": null
}
```

### O que cada campo significa

| Campo | Descrição | Quando usar |
|-------|-----------|-------------|
| `id` | ID do texto (ex: `"txt_002"`) | Passar como `ultimo_id` na próxima chamada |
| `fase` | Fase do texto | Controle de progressão |
| `dificuldade` | Nível do texto (`facil`, `medio`, `dificil`) | Controle de progressão |
| `titulo` | Nome do exercício | Exibir como título da tela |
| `conteudo` | Texto que o usuário vai ler | Exibir como conteúdo principal |
| `palavras` | Contagem de palavras do texto | Cálculo de WPM |
| `ex2_wpm_min` | WPM mínimo esperado no exercício 2 | Referência para feedback de velocidade |
| `ex2_wpm_max` | WPM máximo esperado no exercício 2 | Referência para feedback de velocidade |
| `ex2_dica` | Dica de leitura do exercício 2 | Exibir antes do usuário começar |
| `ex3_som_alvo` | Som trabalhado no exercício 3 | Destacar letra/som no texto |
| `ex3_instrucao` | Instrução do exercício 3 | Exibir como orientação ao usuário |
| `ex3_exemplo_palavra` | Palavra de exemplo do exercício 3 | Exibir como referência |
| `ex3_trava_lingua_id` | ID do trava-língua vinculado (ou `null`) | Buscar trava-língua com `fetch_trava_lingua` |

---

## Como requisitar um trava-língua

### Importação
```python
from app.db.service import fetch_trava_lingua
```

### Assinatura da função
```python
fetch_trava_lingua(trava_lingua_id=None, fase_atual=None, ultimo_id=None)
```

### Parâmetros

| Parâmetro | Tipo | Descrição | Obrigatório |
|-----------|------|-----------|-------------|
| `trava_lingua_id` | str | ID específico (ex: `"tl_008"`) — ignora os outros filtros | ❌ |
| `fase_atual` | int | Fase atual do usuário — respeita `fase_minima` de cada trava-língua | ❌ |
| `ultimo_id` | str | ID do último trava-língua exibido (evita repetição) | ❌ |

### Exemplo de retorno

```json
{
  "id": "tl_008",
  "fase_minima": 8,
  "dificuldade": "facil",
  "titulo": "A dona da dor",
  "conteudo": "Dona Dora dorme e desperta. Desperta e diz: a dor desapareceu.",
  "sons_alvo": ["d"],
  "dica": "O D não pode virar pausa. Mantenha o fluxo.",
  "repeticoes": 3
}
```

---

## Fluxo completo de uma sessão

```
1. Usuário abre o app (fase já conhecida, ex: fase 9)
2. Front chama fetch_texto(fase=9)
3. Exibe o texto pro usuário
4. Usuário termina a leitura e avança
5. Front chama fetch_texto(fase=9, ultimo_id=texto['id'])
   → Service garante que o próximo texto é diferente do anterior
6. Quando o texto tem ex3_trava_lingua_id preenchido:
   → chama fetch_trava_lingua(trava_lingua_id=texto['ex3_trava_lingua_id'])
7. Quando o texto não tem ex3_trava_lingua_id (valor null):
   → exerce só com o texto, sem trava-língua vinculado
```

---

## Como tratar erros

A função retorna `None` quando não encontra nenhum resultado. **Sempre verifique antes de exibir:**

```python
texto = fetch_texto(fase=3)

if texto is None:
    # exibe mensagem de fallback na tela
    print("Nenhum conteúdo disponível. Tente novamente.")
else:
    print(texto['conteudo'])
```

### Tabela de fallbacks

| Situação | Retorno | O que exibir na tela |
|----------|---------|----------------------|
| Fase sem textos cadastrados | `None` | "Nenhum texto disponível para esta fase." |
| Banco sem registros pro filtro | `None` | "Conteúdo indisponível. Tente novamente." |
| Falha na conexão com o banco | Exception | "Erro interno. Contate o suporte." |

---

## Dúvidas

Fala com a **Luciana** para qualquer dúvida sobre o service ou o banco de dados.
