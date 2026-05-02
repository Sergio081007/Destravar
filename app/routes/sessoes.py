from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.db.connection import get_connection

router = APIRouter()


class SessaoIniciar(BaseModel):
    usuario_id: str
    fase: int
    tipo: str


class SessaoCompletar(BaseModel):
    sessao_id: str
    wpm: float | None = None
    score: float | None = None


class ProgressoExercicio(BaseModel):
    usuario_id: str
    dificuldade: str
    score: float
    wpm: float


@router.post("/sessao/iniciar")
async def iniciar_sessao(payload: SessaoIniciar):
    supabase = get_connection()

    response = (
        supabase.table("sessoes")
        .insert({
            "usuario_id": payload.usuario_id,
            "fase": payload.fase,
            "tipo": payload.tipo,
            "status": "em_andamento"
        })
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=500, detail="Erro ao iniciar sessão.")

    return {
        "sessao_id": response.data[0]["id"],
        "status": "iniciada"
    }


@router.post("/sessao/completar")
async def completar_sessao(payload: SessaoCompletar):
    supabase = get_connection()

    response = (
        supabase.table("sessoes")
        .update({
            "status": "concluida",
            "wpm": payload.wpm,
            "score": payload.score
        })
        .eq("id", payload.sessao_id)
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=500, detail="Erro ao completar sessão.")

    return {
        "status": "concluida"
    }


@router.post("/progresso/exercicio")
async def registrar_progresso(payload: ProgressoExercicio):
    supabase = get_connection()

    response = (
        supabase.table("progresso")
        .insert({
            "usuario_id":  payload.usuario_id,
            "dificuldade": payload.dificuldade,
            "score":       payload.score,
            "wpm":         payload.wpm,
        })
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=500, detail="Erro ao registrar progresso.")

    return {"status": "registrado", "id": response.data[0]["id"]}


@router.get("/ranking")
async def get_ranking():
    supabase = get_connection()

    prog_resp = supabase.table("progresso").select("usuario_id, score").execute()
    if not prog_resp.data:
        return []

    # Agrega XP por usuário: soma de score * 100 * nº de exercícios
    user_stats: dict[str, dict] = {}
    for r in prog_resp.data:
        uid = r.get("usuario_id")
        if not uid:
            continue
        score = float(r.get("score") or 0)
        if uid not in user_stats:
            user_stats[uid] = {"count": 0, "total": 0.0}
        user_stats[uid]["count"] += 1
        user_stats[uid]["total"] += score

    if not user_stats:
        return []

    user_ids = list(user_stats.keys())
    users_resp = (
        supabase.table("usuarios")
        .select("id, nome")
        .in_("id", user_ids)
        .execute()
    )
    name_map = {u["id"]: u["nome"] for u in (users_resp.data or [])}

    ranking = []
    for uid, stats in user_stats.items():
        xp = round(stats["total"] * 100 * stats["count"])
        ranking.append({
            "usuario_id": uid,
            "nome": name_map.get(uid, "Anônimo"),
            "xp": xp,
            "exercicios": stats["count"],
        })

    ranking.sort(key=lambda x: x["xp"], reverse=True)
    return ranking[:50]