<div align="center">

# Destravar

*Transformando o desenvolvimento da comunicação em um processo contínuo, acessível e guiado.*

</div>

---

## Sobre o projeto

O **Destravar** é um aplicativo mobile gamificado para pessoas que enfrentam dificuldades na fala, como **gagueira** ou **fala acelerada**. Ele oferece exercícios práticos baseados em técnicas fonoaudiológicas, com progressão por fases, sistema de XP, ranking e reforço de hábitos — respeitando o ritmo de cada usuário.

> **Aviso:** Este projeto tem caráter educacional e de apoio complementar. Não substitui diagnóstico, acompanhamento ou tratamento de um fonoaudiólogo.

---

## Funcionalidades

- **Mapa de fases** — progressão visual estilo jogo, com nós desbloqueáveis por fase
- **Exercícios de fala** — leitura em voz alta com análise de WPM e precisão, fala livre guiada, e prática de sons com trava-línguas
- **Sistema de vidas** — o usuário perde vidas ao errar e precisa aguardar recarga (1 vida a cada 4 horas)
- **XP e ranking** — pontuação acumulada sincronizada com o servidor, com placar global Top 20 entre usuários
- **Perfil personalizado** — nome, avatar escolhido entre 5 personagens, conquistas por marcos de XP
- **Sequência diária** — rastreamento de dias consecutivos de prática
- **Calibração** — sessão inicial para medir o WPM natural do usuário e ajustar os exercícios
- **Autenticação** — login com e-mail via Supabase Auth, com persistência de progresso entre dispositivos

---

## Arquitetura

```
Destravar/
├── mobile/          # App React Native (Expo)
└── app/             # Backend FastAPI
```

### Mobile (`/mobile`)

- **Framework:** React Native com Expo SDK 54
- **Navegação:** expo-router (file-based routing)
- **Linguagem:** TypeScript
- **Estado local:** AsyncStorage + Supabase Auth user_metadata
- **Autenticação:** `@supabase/supabase-js`
- **Áudio:** expo-av

Estrutura de telas:

| Arquivo | Tela |
|---|---|
| `pages/MapPage.tsx` | Mapa de fases |
| `pages/AtividadesPage.tsx` | Lista de atividades |
| `pages/RankingPage.tsx` | Ranking global (Top 20) |
| `pages/PerfilPage.tsx` | Perfil do usuário |
| `pages/SequenciaPage.tsx` | Sequência diária |
| `pages/Exercicio1Page.tsx` | Exercício de leitura com WPM |
| `pages/Exercicio2Page.tsx` | Desafio de fala livre |
| `pages/Exercicio3Page.tsx` | Exercício de sons e trava-línguas |
| `pages/TrainingPage.tsx` | Treinamento livre |
| `pages/LoginPage.tsx` | Login / cadastro |
| `pages/OnboardingPage.tsx` | Calibração inicial |

Componentes reutilizáveis em `components/`, hooks em `hooks/`, utilitários em `utils/`.

### Backend (`/app`)

- **Framework:** FastAPI
- **Banco de dados:** Supabase (PostgreSQL)
- **Transcrição de áudio:** Whisper (via Groq)
- **Correção de texto:** LLaMA 3.1 8B (via Groq)
- **Linguagem:** Python 3.12
- **Servidor:** Uvicorn

Rotas disponíveis:

| Módulo | Prefixo | Responsabilidade |
|---|---|---|
| `usuarios.py` | `/usuarios` | Cadastro, atualização de perfil e XP |
| `sessoes.py` | `/sessao`, `/ranking` | Registro de sessões e ranking global |
| `progresso.py` | `/progresso` | Progresso por fase/exercício |
| `calibracao.py` | `/calibracao` | Calibração de WPM |
| `speech.py` | `/transcrever`, `/textos` | Análise de áudio e textos de exercício |

---

## Como rodar localmente

### Pré-requisitos

- Node.js 18+
- Python 3.12+
- Expo Go no celular (ou emulador Android/iOS) — o app requer permissão de microfone
- Conta no [Supabase](https://supabase.com)
- Conta no [Groq](https://console.groq.com) (para transcrição de áudio)

### Backend

```bash
# Na raiz do projeto
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Criar arquivo .env com as variáveis necessárias:
# SUPABASE_URL=...
# SUPABASE_KEY=...
# GROQ_API_KEY=...

uvicorn app.main:app --reload
```

O schema do banco está em `schema.sql`. Execute-o no SQL Editor do Supabase para criar todas as tabelas.

### Mobile

```bash
cd mobile
npm install
npx expo start
```

Escaneie o QR code com o Expo Go. Configure o endereço do backend em `mobile/constants/config.ts`:

```ts
export const API_BASE_URL = 'http://<IP_DO_SERVIDOR>:8000';
```

#### WSL2 — Expo Go no dispositivo físico

O Expo precisa alcançar o IP do WSL2 pela rede local. Descubra o IP com:

```bash
ip addr show eth0 | grep inet
```

E inicie com o IP explícito:

```bash
npx expo start --host <IP_WSL2>
```

Atualize também `mobile/constants/config.ts` com o mesmo IP para que o app alcance o backend:

```ts
export const API_BASE_URL = 'http://<IP_WSL2>:8000';
```

---

## Build para Android

O projeto está configurado com EAS Build. Para gerar um APK de preview:

```bash
npm install -g eas-cli
eas login
cd mobile
eas build -p android --profile preview
```

Para a Play Store (`.aab`):

```bash
eas build -p android --profile production
```

---

## Banco de dados — visão geral

| Tabela | Descrição |
|---|---|
| `usuarios` | Perfis dos usuários (nome, xp, avatar_id) |
| `sessoes` | Histórico de sessões de exercício |
| `progresso` | Aprovações por fase/exercício |
| `calibracao` | WPM medido na calibração inicial |
| `textos` | Textos e perguntas usados nos exercícios |
| `textos_calibracao` | Textos da calibração |
| `trava_linguas` | Trava-línguas para o exercício 3 |
| `mensagens_feedback` | Mensagens de feedback por resultado |

A autenticação usa o Supabase Auth. O `user_metadata` persiste avatar, XP, streak e progresso entre logins em dispositivos diferentes.

---

<div align="center">

*Acreditamos que a comunicação é uma das habilidades mais importantes da vida.*
*Com as ferramentas certas, qualquer pessoa pode se expressar com mais clareza, segurança e liberdade.*

</div>
