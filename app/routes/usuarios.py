from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.db.connection import get_connection

router = APIRouter()

class UsuarioCreate(BaseModel):
    id: str | None = None
    nome: str
    avatar_id: int | None = None
    xp: int | None = None

@router.post("/usuarios")
async def criar_usuario(payload: UsuarioCreate):
    if not payload.nome.strip():
        raise HTTPException(status_code=400, detail="Nome não pode ser vazio.")

    supabase = get_connection()
    row: dict = {"nome": payload.nome.strip()}
    if payload.id:
        row["id"] = payload.id
    if payload.avatar_id is not None:
        row["avatar_id"] = payload.avatar_id
    response = (
        supabase.table("usuarios")
        .upsert(row, on_conflict="id")
        .execute()
    )

    if payload.xp is not None and payload.id and response.data:
        current_xp = response.data[0].get("xp") or 0
        if payload.xp > current_xp:
            supabase.table("usuarios").update({"xp": payload.xp}).eq("id", payload.id).execute()

    if not response.data:
        raise HTTPException(status_code=500, detail="Erro ao criar usuário.")

    return {"usuario_id": response.data[0]["id"], "nome": response.data[0]["nome"]}


@router.get("/usuarios/{usuario_id}")
async def obter_usuario(usuario_id: str):
    supabase = get_connection()
    response = (
        supabase.table("usuarios")
        .select("id, nome, xp, avatar_id")
        .eq("id", usuario_id)
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    u = response.data[0]
    return {"id": u["id"], "nome": u["nome"], "xp": u.get("xp") or 0, "avatar_id": u.get("avatar_id")}