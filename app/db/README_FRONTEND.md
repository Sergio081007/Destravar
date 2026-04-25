# 📖 Guia de Integração — Service de Textos de Treinamento

> Este documento é destinado ao **Front-End**. Explica como requisitar textos de treinamento para exibir ao usuário durante as sessões de fala.

---

## 🚀 Antes de começar

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

> ℹ️ O banco agora é na nuvem (Supabase) — não precisa rodar seed, criar arquivo local nem configurar nada além do `.env`. Os dados já estão lá.

---

## 🔌 Como requisitar um texto

### Importação
```python
from app.db.service import fetch_text
```

### Assinatura da função
```python
fetch_text(perfil, dificuldade, fase=None, ultimo_id=None)
```

### Parâmetros

| Parâmetro | Tipo | Valores aceitos | Obrigatório |
|-----------|------|-----------------|-------------|
| `perfil` | string | `gagueira`, `fala_rapida`, `misto` | ✅ |
| `dificuldade` | string | `facil`, `medio`, `dificil` | ✅ |
| `fase` | int | número da fase do usuário | ❌ |
| `ultimo_id` | int | ID do último texto exibido | ❌ |

---

## 📦 Exemplo de retorno

```json
{
  "id": 2,
  "externo_id": "txt_002",
  "perfil": "gagueira",
  "fase": 1,
  "titulo": "O dia a dia",
  "conteudo": "Hoje eu acordei cedo. Tomei café com pão. O dia estava bonito.",
  "dificuldade": "facil",
  "ex2_dica_velocidade": "Respire antes de cada frase.",
  "ex2_wpm_min": 100,
  "ex2_wpm_max": 140,
  "ex3_som_alvo": "o",
  "ex3_instrucao": "Comece 'Hoje' com o 'o' bem aberto e suave. Não force a garganta.",
  "ex3_exemplo_palavra": "Hoje",
  "ex3_nivel_suavizacao": "facil",
  "ex3_trava_lingua_id": null
}
```

### O que cada campo significa

| Campo | Descrição | Quando usar |
|-------|-----------|-------------|
| `id` | ID interno do banco | Passar como `ultimo_id` na próxima chamada |
| `externo_id` | ID do arquivo JSON original | Referência com o Dev B |
| `perfil` | Perfil terapêutico do texto | Conferência interna |
| `fase` | Fase do texto | Controle de progressão |
| `titulo` | Nome do exercício | Exibir como título da tela |
| `conteudo` | Texto que o usuário vai ler | Exibir como conteúdo principal |
| `dificuldade` | Nível do texto | Controle de progressão |
| `ex2_dica_velocidade` | Dica de velocidade do exercício 2 | Exibir antes do usuário começar |
| `ex2_wpm_min` | WPM mínimo esperado no exercício 2 | Referência para feedback de velocidade |
| `ex2_wpm_max` | WPM máximo esperado no exercício 2 | Referência para feedback de velocidade |
| `ex3_som_alvo` | Som trabalhado no exercício 3 | Destacar letra/som no texto |
| `ex3_instrucao` | Instrução do exercício 3 | Exibir como orientação ao usuário |
| `ex3_exemplo_palavra` | Palavra de exemplo do exercício 3 | Exibir como referência |
| `ex3_nivel_suavizacao` | Nível de suavização do exercício 3 | Controle de progressão |
| `ex3_trava_lingua_id` | ID do trava-língua vinculado | Buscar trava-língua com `fetch_trava_lingua` |

---

## 🔌 Como requisitar um trava-língua

### Importação
```python
from app.db.service import fetch_trava_lingua
```

### Assinatura da função
```python
fetch_trava_lingua(trava_lingua_id=None, dificuldade=None, fase_atual=None, ultimo_id=None)
```

### Parâmetros

| Parâmetro | Tipo | Descrição | Obrigatório |
|-----------|------|-----------|-------------|
| `trava_lingua_id` | string | ID externo específico (ex: `"tl_002"`) | ❌ |
| `dificuldade` | string | `facil`, `medio`, `dificil` | ❌ |
| `fase_atual` | int | Fase atual do usuário | ❌ |
| `ultimo_id` | int | ID do último trava-língua exibido | ❌ |

> ℹ️ Se passar `trava_lingua_id`, os outros filtros são ignorados — ele busca aquele específico.

---

## 🔄 Fluxo completo de uma sessão

```
1. Usuário abre o app → perfil já definido (ex: "gagueira")
2. Front chama fetch_text("gagueira", "facil")
3. Exibe o texto pro usuário
4. Usuário termina a leitura e avança
5. Front chama fetch_text("gagueira", "facil", ultimo_id=texto['id'])
6. Service garante que o próximo texto é diferente do anterior
7. Quando o texto tem ex3_trava_lingua_id preenchido:
   → chama fetch_trava_lingua(trava_lingua_id=texto['ex3_trava_lingua_id'])
8. Quando usuário sobe de nível → fetch_text("gagueira", "medio")
```

---

## 🛡️ Como tratar erros

A função retorna `None` quando não encontra nenhum texto para o filtro pedido. **Sempre verifique antes de exibir:**

```python
texto = fetch_text("gagueira", "facil")

if texto is None:
    # exibe mensagem de fallback na tela
    print("Nenhum conteúdo disponível. Tente novamente.")
else:
    # exibe o texto normalmente
    print(texto['conteudo'])
```

### Tabela de fallbacks

| Situação | Retorno da função | O que exibir na tela |
|----------|-------------------|----------------------|
| Perfil ou dificuldade inválidos | `None` | "Nenhum texto disponível para este perfil." |
| Banco sem registros pro filtro | `None` | "Conteúdo indisponível. Tente novamente." |
| Falha na conexão com o banco | Exception | "Erro interno. Contate o suporte." |

---

## ❓ Dúvidas

Fala com a **Luciana** para qualquer dúvida sobre o service ou o banco de dados.