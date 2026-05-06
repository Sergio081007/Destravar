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
- **Sistema de vidas** — o usuário perde vidas ao errar e precisa aguardar recarga
- **XP e ranking** — pontuação acumulada sincronizada com o servidor, com placar global entre usuários
- **Perfil personalizado** — nome, avatar escolhido entre 5 personagens, conquistas por marcos de XP
- **Sequência diária** — rastreamento de dias consecutivos de prática
- **Calibração** — sessão inicial para medir o WPM natural do usuário e ajustar os exercícios
- **Autenticação** — login com e-mail via Supabase Auth, com persistência de progresso entre sessões

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
- **Estado local:** AsyncStorage
- **Autenticação:** `@supabase/supabase-js`
- **Áudio:** expo-av

Telas principais:

| Arquivo | Tela |
|---|---|
| `app/(tabs)/index.tsx` | Mapa de fases |
| `app/(tabs)/atividades.tsx` | Lista de atividades disponíveis |
| `app/(tabs)/ranking.tsx` | Ranking global de XP |
| `app/(tabs)/perfil.tsx` | Perfil do usuário |
| `app/(tabs)/sequencia.tsx` | Sequência diária |
| `app/exercicio1.tsx` | Exercício de leitura com WPM |
| `app/exercicio3.tsx` | Exercício de sons e trava-línguas |
| `app/desafio.tsx` | Desafio diário |
| `app/login.tsx` | Login / cadastro |
| `app/onboarding.tsx` | Onboarding inicial |

### Backend (`/app`)

- **Framework:** FastAPI
- **Banco de dados:** Supabase (PostgreSQL)
- **Linguagem:** Python 3.12
- **Servidor:** Uvicorn

Rotas disponíveis:

| Módulo | Prefixo | Responsabilidade |
|---|---|---|
| `usuarios.py` | `/usuarios` | Cadastro, atualização de perfil e XP |
| `sessoes.py` | `/sessoes`, `/ranking` | Registro de sessões e ranking global |
| `progresso.py` | `/progresso` | Progresso por fase/exercício |
| `calibracao.py` | `/calibracao` | Calibração de WPM |
| `speech.py` | `/speech` | Análise de áudio via IA |

---

## Como rodar localmente

### Pré-requisitos

- Node.js 18+
- Python 3.12+
- Expo Go no celular (ou emulador Android/iOS)
- Conta no [Supabase](https://supabase.com)

### Backend

```bash
# Na raiz do projeto
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Criar arquivo .env com as variáveis do Supabase
# SUPABASE_URL=...
# SUPABASE_KEY=...

uvicorn app.main:app --reload
```

O schema do banco está em `schema.sql`. Execute-o no SQL Editor do Supabase para criar todas as tabelas.

**Colunas adicionais necessárias** (não estão no schema original):

```sql
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS xp INT DEFAULT 0;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS avatar_id INT DEFAULT 1;
```

### Mobile

```bash
cd mobile
npm install
npx expo start
```

Escaneie o QR code com o Expo Go. Se estiver em WSL2, veja a seção abaixo.

#### WSL2 — Expo Go no dispositivo físico

O Expo precisa alcançar o IP do WSL2 pela rede local. Descubra o IP com:

```bash
ip addr show eth0 | grep inet
```

E inicie com o IP explícito:

```bash
npx expo start --host <IP_WSL2>
```

O endereço do backend também deve usar esse IP. Configure em `mobile/app/config.ts`.

---

## Build para Android

O projeto já está configurado com EAS Build. Para gerar um APK:

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
| `textos` | Textos usados nos exercícios |
| `textos_calibracao` | Textos da calibração |
| `trava_linguas` | Trava-línguas para o exercício 3 |
| `perguntas` | Perguntas para a atividade de fala livre |
| `mensagens_feedback` | Mensagens de feedback por resultado |

A autenticação usa o Supabase Auth. Um trigger (`on_auth_user_created`) cria automaticamente o registro em `usuarios` após o cadastro. O `user_metadata` do Supabase Auth é usado para persistir avatar e progresso entre logins.

---

<div align="center">

*Acreditamos que a comunicação é uma das habilidades mais importantes da vida.*
*Com as ferramentas certas, qualquer pessoa pode se expressar com mais clareza, segurança e liberdade.*

</div>
