from fastapi import APIRouter, UploadFile, File, HTTPException
import tempfile
import os
from groq import Groq

router = APIRouter()
client = Groq(api_key="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")

def classificar_fluencia(wpm: float, taxa_repeticao: float) -> str:
    if taxa_repeticao > 0.15:
        return "disfluente"
    elif wpm < 130:
        return "lento"
    elif wpm <= 160:
        return "normal"
    else:
        return "rapido"

def get_prob_from_segments(word_start: float, segmentos: list) -> float:
    for seg in segmentos:
        if seg["start"] <= word_start <= seg["end"]:
            return round(min(1.0, max(0.0, (seg.get("avg_logprob", -1) + 1))), 4)
    return 0.0

@router.post("/transcrever")
async def transcrever(file: UploadFile = File(...)):
    if not file:
        raise HTTPException(status_code=400, detail="Arquivo não enviado")

    audio_content = await file.read()
    ext_original = os.path.splitext(file.filename)[1].lower() if file.filename else ".mp3"
    extensoes_permitidas = ['.flac', '.mp3', '.mp4', '.mpeg', '.mpga', '.m4a', '.ogg', '.opus', '.wav', '.webm']
    suffix = ext_original if ext_original in extensoes_permitidas else ".mp3"

    caminho_audio = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(audio_content)
            caminho_audio = tmp.name

        with open(caminho_audio, "rb") as audio_file:
            resultado = client.audio.transcriptions.create(
                file=(os.path.basename(caminho_audio), audio_file),
                model="whisper-large-v3-turbo",
                language="pt",
                response_format="verbose_json",
                timestamp_granularities=["segment", "word"],
                temperature=0,
            )

        texto = resultado.text.strip()
        segmentos = [dict(s) for s in (resultado.segments or [])]
        palavras_obj = resultado.words or []

        duracao_total = segmentos[-1]["end"] if segmentos else 0

        if palavras_obj:
            palavras = [w["word"].strip().lower() for w in palavras_obj if w["word"].strip()]
            total_palavras = len(palavras)
            duracao_total = palavras_obj[-1]["end"]
        else:
            palavras = [p.strip().lower() for p in texto.split() if p.strip()]
            total_palavras = len(palavras)

        wpm = (total_palavras / (duracao_total / 60)) if duracao_total > 0 else 0

        repeticoes = sum(
            1 for i in range(len(palavras) - 1)
            if palavras[i] == palavras[i + 1]
        )
        taxa_repeticao = repeticoes / total_palavras if total_palavras > 0 else 0

        return {
            "filename": file.filename,
            "transcricao": texto,
            "duracao_segundos": round(duracao_total, 2),
            "total_palavras": total_palavras,
            "wpm": round(wpm, 2),
            "repeticoes": repeticoes,
            "taxa_repeticao": round(taxa_repeticao, 4),
            "fluencia": classificar_fluencia(wpm, taxa_repeticao),
            "segmentos": segmentos,
            "palavras": [
                {
                    "word": w["word"],
                    "start": w["start"],
                    "end": w["end"],
                    "probability": get_prob_from_segments(w["start"], segmentos),
                }
                for w in palavras_obj
            ] if palavras_obj else [],
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro no processamento: {str(e)}")

    finally:
        if caminho_audio and os.path.exists(caminho_audio):
            os.remove(caminho_audio)