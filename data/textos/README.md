# 📚 README — Banco de Textos de Treinamento

## 🌿 Contexto da Feature

Esta task implementa o **banco inicial de textos progressivos adaptáveis por perfil de fala**, utilizado nos exercícios de leitura do sistema.

Branch: feat\textos-treinamento

Localização: data/textos/textos-treinamento.json


---

## 🎯 Objetivo

Criar uma base estruturada de textos para:

- treino de fluência
- adaptação por perfil do usuário
- progressão de dificuldade
- integração com análise de fala (backend)

---

## 🧠 Como o arquivo funciona

O arquivo `textos-treinamento.json` contém **dois tipos de conteúdo**:

### 1. Textos de leitura
- frases curtas
- frases médias
- parágrafos

### 2. Trava-línguas
- foco fonético
- repetição controlada
- treino específico de sons

---

## 🧩 Estrutura dos dados

### 📄 Texto de leitura

```json
{
  "id": "txt_001",
  "tipo": "frase_curta",
  "perfil": "gagueira",
  "dificuldade": "facil",
  "titulo": "Apresentação simples",
  "conteudo": "Meu nome é Ana. Eu moro em São Paulo.",
  "palavras": 11,
  "dica": "Fale com calma.",
  "foco_terapeutico": "introdução de fala contínua"
} 
```

Trava lingua 
```json
{
  "id": "tl_001",
  "perfil": "gagueira",
  "dificuldade": "facil",
  "titulo": "O rato e o rei",
  "conteudo": "O rato roeu a roupa do rei de Roma.",
  "palavras": 9,
  "sons_alvo": ["r"],
  "dica": "Vá devagar.",
  "repeticoes_sugeridas": 3
}
```
## ⚙️ Campos importantes

- **`tipo`** → define o tamanho do texto (progressão)
- **`perfil`** → segmenta o usuário (`gagueira`, `fala_rapida`, `misto`)
- **`dificuldade`** → controla progressão (`facil` → `medio` → `dificil`)
- **`palavras`** → usado para cálculo de WPM
- **`dica`** → feedback antes da execução
- **`foco_terapeutico`** → intenção clínica do texto

---

## 📊 Lógica de distribuição

O banco foi estruturado com progressão em dois eixos:

### 📏 Por tamanho do texto
- **`frase_curta → frase_media → paragrafo`**


### 🎯 Por dificuldade
- **`facil → medio → dificil`**

### 👤 Por perfil
- gagueira
- fala_rapida
- misto

A combinação desses três fatores define a progressão do usuário dentro do sistema.


