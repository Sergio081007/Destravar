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