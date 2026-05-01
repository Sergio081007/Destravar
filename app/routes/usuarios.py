from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.db.connection import get_connection

router = APIRouter()

class UsuarioCreate(BaseModel):
    usuario_id: str  # vem do Supabase Auth
    nome: str

@router.post("/usuarios")
async def criar_usuario(payload: UsuarioCreate):
    if not payload.nome.strip():
        raise HTTPException(status_code=400, detail="Nome não pode ser vazio.")

    supabase = get_connection()
    response = (
        supabase.table("usuarios")
        .insert({
            "id":   payload.usuario_id,
            "nome": payload.nome.strip()
        })
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=500, detail="Erro ao criar usuário.")

    return {"usuario_id": response.data[0]["id"], "nome": response.data[0]["nome"]}