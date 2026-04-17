from fastapi import APIRouter, UploadFile, File, HTTPException
import whisper
import tempfile
import os

router = APIRouter()

# Carregamento global (Dia 1)
model = whisper.load_model("small")

@router.post("/transcrever")
async def transcrever(file: UploadFile = File(...)):
    if not file:
        raise HTTPException(status_code=400, detail="Arquivo não enviado")

    audio_content = await file.read()
    suffix = os.path.splitext(file.filename)[1] if file.filename else ".tmp"
    
    caminho_audio = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(audio_content)
            caminho_audio = tmp.name

        # 3. Transcrição com Timestamps (Objetivo do Dia 2)
        # O parâmetro word_timestamps=True é o segredo para o feedback visual
        resultado = model.transcribe(
            caminho_audio, 
            language="pt", 
            fp16=False, 
            word_timestamps=True,
            temperature=0,      # Força a IA a ser menos "criativa" e mais literal
            condition_on_previous_text=False # Evita que ela use o contexto para adivinhar a próxima palavra
        )

        return {
            "filename": file.filename,
            "transcricao": resultado["text"].strip(),
            "segmentos": resultado["segments"] # Dados para o Dev A animar o texto
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro no processamento: {str(e)}")
    
    finally:
        # 4. Limpeza (Evita entupir o WSL com arquivos temporários)
        if caminho_audio and os.path.exists(caminho_audio):
            os.remove(caminho_audio)