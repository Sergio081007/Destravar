from fastapi import APIRouter, HTTPException
from app.db.connection import get_connection

router = APIRouter()

# ── Critérios de aprovação por exercício (espelhados no roteiro) ──
CRITERIO_APROVACAO = {1: 1, 2: 2, 3: 3}


@router.get("/mapa/{usuario_id}")
async def obter_mapa(usuario_id: str):
    """
    Retorna o estado completo do mapa de fases para o usuário.

    Para cada fase retorna:
      - fase: int
      - desbloqueada: bool
      - fase_concluida: bool (todos os 3 exercícios concluídos)
      - exercicios: lista com estado de cada um dos 3 exercícios
          - exercicio: 1 | 2 | 3
          - aprovacoes_consecutivas: int
          - criterio: int
          - concluido: bool
      - melhor_wpm: float | None  (melhor WPM do ex2 na fase)
      - ultima_sessao: str | None (ISO timestamp da sessão mais recente)

    Lógica de desbloqueio:
      - Fase 1 sempre desbloqueada.
      - Fase N desbloqueada quando fase N-1 está concluída.
    """
    supabase = get_connection()

    prog_response = (
        supabase.table("progresso")
        .select("fase, exercicio, aprovacoes_consecutivas, desbloqueado, atualizado_em")
        .eq("usuario_id", usuario_id)
        .order("fase")
        .order("exercicio")
        .execute()
    )
    progresso_rows = prog_response.data or []

    sess_response = (
        supabase.table("sessoes")
        .select("fase, exercicio, wpm_obtido, aprovado, criado_em")
        .eq("usuario_id", usuario_id)
        .order("criado_em", desc=True)
        .execute()
    )
    sessoes_rows = sess_response.data or []

    # ── Indexar progresso: {(fase, exercicio): row} ───────────────
    prog_index: dict = {}
    for r in progresso_rows:
        prog_index[(r["fase"], r["exercicio"])] = r

    # ── Melhor WPM (ex2) e última sessão por fase ─────────────────
    melhor_wpm_por_fase: dict = {}
    ultima_sessao_por_fase: dict = {}

    for s in sessoes_rows:
        fase = s["fase"]
        if fase not in ultima_sessao_por_fase:
            ultima_sessao_por_fase[fase] = s["criado_em"]
        if s["exercicio"] == 2 and s.get("wpm_obtido") is not None:
            atual = melhor_wpm_por_fase.get(fase)
            if atual is None or s["wpm_obtido"] > atual:
                melhor_wpm_por_fase[fase] = round(s["wpm_obtido"], 1)

    # ── Fases a retornar: todas com dados + a próxima bloqueada ───
    fases_com_dados = (
        {r["fase"] for r in progresso_rows}
        | {s["fase"] for s in sessoes_rows}
        | {1}
    )
    max_fase = max(fases_com_dados)
    fases_a_retornar = sorted(fases_com_dados | {max_fase + 1})

    # ── Montar mapa ───────────────────────────────────────────────
    mapa = []
    fase_anterior_concluida = True  # fase 1 sempre desbloqueada

    for fase in fases_a_retornar:
        desbloqueada = fase == 1 or fase_anterior_concluida

        exercicios = []
        todos_concluidos = True

        for ex in [1, 2, 3]:
            row = prog_index.get((fase, ex))
            aprovacoes = row["aprovacoes_consecutivas"] if row else 0
            criterio = CRITERIO_APROVACAO[ex]
            concluido = aprovacoes >= criterio

            if not concluido:
                todos_concluidos = False

            exercicios.append({
                "exercicio":               ex,
                "aprovacoes_consecutivas": aprovacoes,
                "criterio":                criterio,
                "concluido":               concluido,
            })

        fase_concluida = todos_concluidos and desbloqueada

        mapa.append({
            "fase":           fase,
            "desbloqueada":   desbloqueada,
            "fase_concluida": fase_concluida,
            "exercicios":     exercicios,
            "melhor_wpm":     melhor_wpm_por_fase.get(fase),
            "ultima_sessao":  ultima_sessao_por_fase.get(fase),
        })

        fase_anterior_concluida = fase_concluida

    return {"usuario_id": usuario_id, "mapa": mapa}


@router.get("/streak/{usuario_id}")
async def obter_streak(usuario_id: str):
    """
    Retorna o streak atual do usuário (dias consecutivos com sessão aprovada)
    e o total de XP acumulado.

    XP por evento:
      - Sessão aprovada (qualquer exercício): +10 XP
      - Fase concluída (3 exercícios ok):    +50 XP
      - Dia com streak ativo:                +5 XP bônus

    Retorna:
      - streak_atual: int      (dias consecutivos até hoje)
      - streak_maximo: int     (maior sequência histórica)
      - xp_total: int
      - xp_hoje: int
      - ultimo_dia_ativo: str | None (data ISO da última sessão aprovada)
    """
    from datetime import date, timedelta

    supabase = get_connection()

    sess_response = (
        supabase.table("sessoes")
        .select("aprovado, criado_em, fase, exercicio")
        .eq("usuario_id", usuario_id)
        .eq("aprovado", True)
        .order("criado_em", desc=False)
        .execute()
    )
    sessoes = sess_response.data or []

    if not sessoes:
        return {
            "streak_atual":    0,
            "streak_maximo":   0,
            "xp_total":        0,
            "xp_hoje":         0,
            "ultimo_dia_ativo": None,
        }

    # ── Dias únicos com pelo menos uma sessão aprovada ────────────
    dias_ativos = sorted({
        s["criado_em"][:10]  # "YYYY-MM-DD"
        for s in sessoes
    })

    # ── Calcular streak atual e máximo ───────────────────────────
    streak_atual = 1
    streak_maximo = 1
    sequencia = 1

    for i in range(1, len(dias_ativos)):
        d_anterior = date.fromisoformat(dias_ativos[i - 1])
        d_atual    = date.fromisoformat(dias_ativos[i])
        if (d_atual - d_anterior).days == 1:
            sequencia += 1
            streak_maximo = max(streak_maximo, sequencia)
        else:
            sequencia = 1

    # Streak atual: só conta se o último dia ativo é hoje ou ontem
    hoje = date.today()
    ultimo_dia = date.fromisoformat(dias_ativos[-1])
    if (hoje - ultimo_dia).days <= 1:
        # Reconstrói a sequência a partir do fim
        streak_atual = 1
        for i in range(len(dias_ativos) - 1, 0, -1):
            d1 = date.fromisoformat(dias_ativos[i - 1])
            d2 = date.fromisoformat(dias_ativos[i])
            if (d2 - d1).days == 1:
                streak_atual += 1
            else:
                break
    else:
        streak_atual = 0  # perdeu o streak

    # ── XP ────────────────────────────────────────────────────────
    XP_SESSAO_APROVADA = 10
    XP_BONUS_STREAK    = 5

    # Fases concluídas: identifica quando os 3 exercícios de uma fase
    # foram aprovados (pelo menos uma aprovação cada)
    prog_response = (
        supabase.table("progresso")
        .select("fase, exercicio, aprovacoes_consecutivas")
        .eq("usuario_id", usuario_id)
        .execute()
    )
    prog_rows = prog_response.data or []

    fases_concluidas = set()
    from collections import defaultdict
    ex_por_fase: dict = defaultdict(set)
    for r in prog_rows:
        if r["aprovacoes_consecutivas"] >= CRITERIO_APROVACAO.get(r["exercicio"], 1):
            ex_por_fase[r["fase"]].add(r["exercicio"])
    for fase, exs in ex_por_fase.items():
        if exs >= {1, 2, 3}:
            fases_concluidas.add(fase)

    XP_FASE_CONCLUIDA = 50
    xp_total = (
        len(sessoes) * XP_SESSAO_APROVADA
        + len(fases_concluidas) * XP_FASE_CONCLUIDA
        + len(dias_ativos) * XP_BONUS_STREAK
    )

    hoje_str = hoje.isoformat()
    xp_hoje = sum(
        XP_SESSAO_APROVADA
        for s in sessoes
        if s["criado_em"][:10] == hoje_str
    )
    if hoje_str in dias_ativos:
        xp_hoje += XP_BONUS_STREAK

    return {
        "streak_atual":    streak_atual,
        "streak_maximo":   streak_maximo,
        "xp_total":        xp_total,
        "xp_hoje":         xp_hoje,
        "ultimo_dia_ativo": dias_ativos[-1] if dias_ativos else None,
    }


@router.get("/ranking")
async def obter_ranking(limite: int = 10):
    """
    Retorna o ranking global dos usuários por XP total.
    Usado no Mural dos Heróis.

    Retorna lista de até `limite` usuários com:
      - posicao: int
      - usuario_id: str
      - nome: str
      - xp_total: int
      - streak_atual: int
    """
    from datetime import date
    from collections import defaultdict

    supabase = get_connection()

    # Busca todas as sessões aprovadas agrupadas por usuário
    sess_response = (
        supabase.table("sessoes")
        .select("usuario_id, aprovado, criado_em")
        .eq("aprovado", True)
        .execute()
    )
    sessoes = sess_response.data or []

    # Busca todo o progresso pra calcular fases concluídas
    prog_response = (
        supabase.table("progresso")
        .select("usuario_id, fase, exercicio, aprovacoes_consecutivas")
        .execute()
    )
    prog_rows = prog_response.data or []

    # Busca nomes e avatares dos usuários
    usuarios_response = (
        supabase.table("usuarios")
        .select("id, nome, avatar_id")
        .execute()
    )
    nomes    = {u["id"]: u["nome"]            for u in (usuarios_response.data or [])}
    avatares = {u["id"]: u.get("avatar_id")   for u in (usuarios_response.data or [])}

    # ── XP por usuário ────────────────────────────────────────────
    XP_SESSAO   = 10
    XP_FASE     = 50
    XP_STREAK   = 5

    sessoes_por_usuario:    dict = defaultdict(list)
    for s in sessoes:
        sessoes_por_usuario[s["usuario_id"]].append(s["criado_em"][:10])

    fases_por_usuario: dict = defaultdict(lambda: defaultdict(set))
    for r in prog_rows:
        if r["aprovacoes_consecutivas"] >= CRITERIO_APROVACAO.get(r["exercicio"], 1):
            fases_por_usuario[r["usuario_id"]][r["fase"]].add(r["exercicio"])

    hoje = date.today()
    ranking_bruto = []

    todos_usuarios = set(sessoes_por_usuario.keys()) | set(fases_por_usuario.keys())

    for uid in todos_usuarios:
        dias = sorted(set(sessoes_por_usuario[uid]))
        total_sessoes = len(sessoes_por_usuario[uid])

        fases_concluidas = sum(
            1 for exs in fases_por_usuario[uid].values()
            if exs >= {1, 2, 3}
        )

        xp = (
            total_sessoes * XP_SESSAO
            + fases_concluidas * XP_FASE
            + len(dias) * XP_STREAK
        )

        # Streak atual
        streak = 0
        if dias:
            ultimo = date.fromisoformat(dias[-1])
            if (hoje - ultimo).days <= 1:
                streak = 1
                for i in range(len(dias) - 1, 0, -1):
                    d1 = date.fromisoformat(dias[i - 1])
                    d2 = date.fromisoformat(dias[i])
                    if (d2 - d1).days == 1:
                        streak += 1
                    else:
                        break

        ranking_bruto.append({
            "usuario_id":   uid,
            "nome":         nomes.get(uid, "Usuário"),
            "xp_total":     xp,
            "streak_atual": streak,
            "avatar_id":    avatares.get(uid),
        })

    # ── Ordenar e paginar ─────────────────────────────────────────
    ranking_bruto.sort(key=lambda x: x["xp_total"], reverse=True)

    resultado = []
    for i, entry in enumerate(ranking_bruto[:limite], start=1):
        resultado.append({"posicao": i, **entry})

    return {"ranking": resultado, "total_usuarios": len(ranking_bruto)}