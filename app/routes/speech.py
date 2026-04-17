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
        resultado = model.transcribe(
            caminho_audio, 
            language="pt", 
            fp16=False, 
            word_timestamps=True
        )

        #  NOVO: preparação dos dados para análise
        texto = resultado["text"].strip()
        segmentos = resultado["segments"]

        #  NOVO: cálculo da duração total do áudio (último timestamp)
        duracao_total = segmentos[-1]["end"] if segmentos else 0

        #  NOVO: contagem total de palavras usando timestamps (mais preciso)
        total_palavras = sum(len(seg.get("words", [])) for seg in segmentos)

        #  NOVO: cálculo de WPM (Words Per Minute)
        wpm = 0
        if duracao_total > 0:
            wpm = total_palavras / (duracao_total / 60)

        # NOVO: extrair lista de palavras normalizadas
        palavras = []
        for seg in segmentos:
            for w in seg.get("words", []):
                palavra = w["word"].strip().lower()
                if palavra:
                    palavras.append(palavra)

        # NOVO: detectar repetições consecutivas (indicador de gagueira)
        repeticoes = 0
        for i in range(len(palavras) - 1):
            if palavras[i] == palavras[i + 1]:
                repeticoes += 1

        # NOVO: taxa de repetição (quanto da fala é repetida)
        taxa_repeticao = repeticoes / total_palavras if total_palavras > 0 else 0

        # NOVO: classificação de fluência combinando WPM + repetição
        def classificar_fluencia(wpm, taxa_repeticao):
            if taxa_repeticao > 0.15:
                return "disfluente"
            elif wpm < 130:
                return "lento"
            elif wpm <= 160:
                return "normal"
            else:
                return "rapido"

        return {
            "filename": file.filename,
            "transcricao": texto,
            "duracao_segundos": duracao_total,
            "total_palavras": total_palavras,
            "wpm": round(wpm, 2),
            "repeticoes": repeticoes,                  # NOVO
            "taxa_repeticao": round(taxa_repeticao, 2),# NOVO
            "fluencia": classificar_fluencia(wpm, taxa_repeticao),  # NOVO
            "segmentos": segmentos
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro no processamento: {str(e)}")
    
    finally:
        # 4. Limpeza (Evita entupir o WSL com arquivos temporários)
        if caminho_audio and os.path.exists(caminho_audio):
            os.remove(caminho_audio)