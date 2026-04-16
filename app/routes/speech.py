from fastapi import APIRouter, UploadFile, File, HTTPException
import whisper
import tempfile
import os

router = APIRouter()

# Carregamento global para evitar lentidão em cada request 
# O modelo 'small' é ideal para o desenvolvimento inicial 
model = whisper.load_model("small")

@router.post("/transcrever")
async def transcrever(file: UploadFile = File(...)):
    # 1. Validação de segurança
    if not file:
        raise HTTPException(status_code=400, detail="Arquivo não enviado")

    audio_content = await file.read()
    
    # 2. Uso do tempfile com gerenciamento de limpeza 
    # Usamos o sufixo original do arquivo para evitar conflitos de codec
    suffix = os.path.splitext(file.filename)[1] if file.filename else ".tmp"
    
    caminho_audio = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(audio_content)
            caminho_audio = tmp.name

        # 3. Transcrição real com Whisper [cite: 83]
        resultado = model.transcribe(caminho_audio, language="pt", fp16=False)
        texto_transcrito = resultado["text"].strip()

        return {
            "filename": file.filename,
            "size_bytes": len(audio_content),
            "transcricao": texto_transcrito
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro no processamento: {str(e)}")
    
    finally:
        # 4. Limpeza obrigatória do arquivo temporário 
        if caminho_audio and os.path.exists(caminho_audio):
            os.remove(caminho_audio)