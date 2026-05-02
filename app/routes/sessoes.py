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

    xp_ganho = round(payload.score * 100)

    user_resp = (
        supabase.table("usuarios")
        .select("xp")
        .eq("id", payload.usuario_id)
        .execute()
    )

    if not user_resp.data:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    xp_atual = user_resp.data[0].get("xp") or 0

    supabase.table("usuarios").update({"xp": xp_atual + xp_ganho}).eq("id", payload.usuario_id).execute()

    return {"status": "registrado", "xp_ganho": xp_ganho}


@router.get("/ranking")
async def get_ranking():
    supabase = get_connection()

    response = (
        supabase.table("usuarios")
        .select("id, nome, xp")
        .gt("xp", 0)
        .order("xp", desc=True)
        .limit(50)
        .execute()
    )

    if not response.data:
        return []

    return [
        {"usuario_id": u["id"], "nome": u["nome"], "xp": u.get("xp") or 0}
        for u in response.data
    ]