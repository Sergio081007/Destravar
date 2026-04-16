from fastapi import APIRouter, UploadFile, File

router = APIRouter()

@router.post("/transcrever")
async def transcrever(file: UploadFile = File(...)):
    audio = await file.read()

    # 🔥 MOCK (depois entra Whisper aqui)
    texto_transcrito = "isso é uma transcrição simulada"

    return {
        "filename": file.filename,
        "size_bytes": len(audio),
        "transcricao": texto_transcrito
    }