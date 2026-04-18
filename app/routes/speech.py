from fastapi import APIRouter, UploadFile, File, HTTPException
import tempfile
import os
import math
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
            avg_logprob = seg.get("avg_logprob", -1.0)
            prob = math.exp(avg_logprob) 
            return round(prob, 4)
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

        # Lógica original para extrair lista de palavras minúsculas
        if palavras_obj:
            palavras_lista = [w["word"].strip().lower() for w in palavras_obj if w["word"].strip()]
            total_palavras = len(palavras_lista)
            duracao_total = palavras_obj[-1]["end"]
        else:
            palavras_lista = [p.strip().lower() for p in texto.split() if p.strip()]
            total_palavras = len(palavras_lista)

        wpm = (total_palavras / (duracao_total / 60)) if duracao_total > 0 else 0

        repeticoes = sum(
            1 for i in range(len(palavras_lista) - 1)
            if palavras_lista[i] == palavras_lista[i + 1]
        )
        taxa_repeticao = repeticoes / total_palavras if total_palavras > 0 else 0

        # Novas métricas adicionais (Bloqueios)
        bloqueios_detectados = 0
        palavras_processadas = []
        
        if palavras_obj:
            for i, w in enumerate(palavras_obj):
                pausa_previa = 0.0
                if i > 0:
                    pausa_previa = round(w["start"] - palavras_obj[i-1]["end"], 2)
                    if pausa_previa > 1.5:
                        bloqueios_detectados += 1
                
                # Mantém seus campos originais e adiciona os novos
                palavras_processadas.append({
                    "word": w["word"],
                    "start": w["start"],
                    "end": w["end"],
                    "probability": get_prob_from_segments(w["start"], segmentos),
                    "duration": round(w["end"] - w["start"], 2),      # Adicionado
                    "silence_before": pausa_previa                   # Adicionado
                })

        return {
            "filename": file.filename,
            "transcricao": texto,
            "duracao_segundos": round(duracao_total, 2),
            "total_palavras": total_palavras,
            "wpm": round(wpm, 2),
            "repeticoes": repeticoes,
            "taxa_repeticao": round(taxa_repeticao, 4),
            "bloqueios_silenciosos": bloqueios_detectados,           # Adicionado
            "fluencia": classificar_fluencia(wpm, taxa_repeticao),
            "segmentos": segmentos,
            "palavras": palavras_processadas if palavras_obj else []
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro no processamento: {str(e)}")

    finally:
        if caminho_audio and os.path.exists(caminho_audio):
            os.remove(caminho_audio)