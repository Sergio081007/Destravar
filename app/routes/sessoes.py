from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.db.connection import get_connection

router = APIRouter()


class SessaoIniciar(BaseModel):
    usuario_id: str
    fase: int
    exercicio: int
    tipo: str


class SessaoCompletar(BaseModel):
    sessao_id: str
    aprovado: bool | None = None
    wpm_obtido: float | None = None
    score: float | None = None


@router.post("/sessao/iniciar")
async def iniciar_sessao(payload: SessaoIniciar):
    supabase = get_connection()

    response = (
        supabase.table("sessoes")
        .insert({
            "usuario_id": payload.usuario_id,
            "fase":       payload.fase,
            "exercicio":  payload.exercicio,
            "tipo":       payload.tipo,
            "status":     "em_andamento",
        })
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=500, detail="Erro ao iniciar sessão.")

    return {
        "sessao_id": response.data[0]["id"],
        "status":    "iniciada",
    }


@router.post("/sessao/completar")
async def completar_sessao(payload: SessaoCompletar):
    supabase = get_connection()

    update: dict = {"status": "concluida"}
    if payload.aprovado is not None:
        update["aprovado"] = payload.aprovado
    if payload.wpm_obtido is not None:
        update["wpm_obtido"] = payload.wpm_obtido
    if payload.score is not None:
        update["score"] = payload.score

    response = (
        supabase.table("sessoes")
        .update(update)
        .eq("id", payload.sessao_id)
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=500, detail="Erro ao completar sessão.")

    return {"status": "concluida"}
