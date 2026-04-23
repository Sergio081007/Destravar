# 📖 Guia de Integração — Service de Textos de Treinamento

> Este documento é destinado ao **Front-End**. Explica como requisitar textos de treinamento do banco de dados para exibir ao usuário durante as sessões de fala.

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

**3. Popular o banco pela primeira vez**
```bash
cd app/db
python seed.py
```
---
> O banco é um arquivo local `app/db/destravar.db` — não precisa de servidor, Workbench ou senha.

## 🔌 Como requisitar um texto

### Importação
```python
from app.db.service import fetch_text
```

### Assinatura da função
```python
fetch_text(perfil, dificuldade, ultimo_id=None)
```

### Parâmetros

| Parâmetro | Tipo | Valores aceitos | Obrigatório |
|-----------|------|-----------------|-------------|
| `perfil` | string | `gagueira`, `fala_rapida`, `misto` | ✅ |
| `dificuldade` | string | `facil`, `medio`, `dificil` | ✅ |
| `ultimo_id` | int | ID do último texto exibido | ❌ |

---

## 📦 Exemplo de retorno

```json
{
  "id": 2,
  "externo_id": "txt_001",
  "titulo": "Apresentação simples",
  "conteudo": "Meu nome é Ana. Eu moro em São Paulo.",
  "tipo": "frase_curta",
  "categoria": "texto",
  "dica": "Fale com calma.",
  "foco_terapeutico": "introdução de fala contínua",
  "sons_alvo": null,
  "repeticoes_sugeridas": null
}
```

### O que cada campo significa

| Campo | Descrição | Quando usar |
|-------|-----------|-------------|
| `id` | ID interno do banco | Passar como `ultimo_id` na próxima chamada |
| `externo_id` | ID do arquivo JSON original | Referência com o Dev B |
| `titulo` | Nome do exercício | Exibir como título da tela |
| `conteudo` | Texto que o usuário vai ler | Exibir como conteúdo principal |
| `tipo` | Tamanho do texto | Controle de progressão |
| `categoria` | `texto` ou `trava_lingua` | Definir layout da tela |
| `dica` | Orientação antes da leitura | Exibir antes do usuário começar |
| `foco_terapeutico` | Intenção clínica | Uso interno / analytics |
| `sons_alvo` | Sons trabalhados (só trava-línguas) | Destacar letras no texto |
| `repeticoes_sugeridas` | Quantas vezes repetir (só trava-línguas) | Exibir contador de repetições |

---

## 🔄 Fluxo completo de uma sessão

```
1. Usuário abre o app → perfil já definido (ex: "gagueira")
2. Front chama fetch_text("gagueira", "facil")
3. Exibe o texto pro usuário
4. Usuário termina a leitura e avança
5. Front chama fetch_text("gagueira", "facil", ultimo_id=texto['id'])
6. Service garante que o próximo texto é diferente do anterior
7. Quando usuário sobe de nível → fetch_text("gagueira", "medio")
```
---

## 🛡️ Como tratar erros

A função retorna `None` quando não encontra nenhum texto pro filtro pedido. **Sempre verifique antes de exibir:**

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

Fala com o **Luciana** para qualquer dúvida sobre o service ou o banco de dados.