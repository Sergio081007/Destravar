from fastapi import APIRouter, UploadFile, File, HTTPException
import tempfile
import os
import math
import re
from groq import Groq
from difflib import SequenceMatcher
from pydantic import BaseModel

router = APIRouter()

# NOVO: memória da última transcrição (fluxo automático)
LAST_TRANSCRIPTION = ""

# NOVO: modelo para comparação de texto (referência vs transcrição)
class ComparacaoRequest(BaseModel):
    texto_referencia: str
    texto_transcrito: str = ""  # opcional

# cliente Groq (SEGURANÇA: usar variável de ambiente idealmente)
client = Groq(api_key="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")

# =========================
# UTIL: normalização de texto
# =========================
def normalizar(texto: str):
    texto = texto.lower()
    texto = re.sub(r"[^\w\sà-úãõâêîôûç]", "", texto)  # remove pontuação
    texto = re.sub(r"\s+", " ", texto).strip()
    return texto.split()

# =========================
# DIFLIB MELHORADO (COM CLASSIFICAÇÃO)
# =========================
def comparar_textos(ref: str, trans: str):

    ref_words = normalizar(ref)
    trans_words = normalizar(trans)

    matcher = SequenceMatcher(None, ref_words, trans_words)

    resultado = {
        "acertos": [],
        "erros": [],
        "omitidas": [],
        "extras": [],
        "score": 0
    }

    total_ref = len(ref_words)
    acertos = 0

    for tag, i1, i2, j1, j2 in matcher.get_opcodes():

        if tag == "equal":
            palavras = ref_words[i1:i2]
            resultado["acertos"].extend(palavras)
            acertos += len(palavras)

        elif tag == "replace":
            resultado["erros"].append({
                "esperado": ref_words[i1:i2],
                "ouvido": trans_words[j1:j2]
            })

        elif tag == "delete":
            resultado["omitidas"].extend(ref_words[i1:i2])

        elif tag == "insert":
            resultado["extras"].extend(trans_words[j1:j2])

    # SCORE de precisão
    resultado["score"] = round(acertos / total_ref, 4) if total_ref > 0 else 0

    # ranking simples (mais importante primeiro)
    resultado["omitidas"] = sorted(resultado["omitidas"])
    resultado["extras"] = sorted(resultado["extras"])

    return resultado


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
            return round(math.exp(avg_logprob), 4)
    return 0.0


# =========================
# TRANSCRIÇÃO
# =========================
@router.post("/transcrever")
async def transcrever(file: UploadFile = File(...)):
    global LAST_TRANSCRIPTION

    if not file:
        raise HTTPException(status_code=400, detail="Arquivo não enviado")

    audio_content = await file.read()
    suffix = os.path.splitext(file.filename)[1] or ".mp3"

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
        LAST_TRANSCRIPTION = texto  # salva última transcrição

        segmentos = [dict(s) for s in (resultado.segments or [])]
        palavras_obj = resultado.words or []

        palavras_lista = [w["word"].strip().lower() for w in palavras_obj]

        total_palavras = len(palavras_lista)
        duracao_total = palavras_obj[-1]["end"] if palavras_obj else 0

        wpm = (total_palavras / (duracao_total / 60)) if duracao_total > 0 else 0

        repeticoes = sum(
            1 for i in range(len(palavras_lista) - 1)
            if palavras_lista[i] == palavras_lista[i + 1]
        )

        taxa_repeticao = repeticoes / total_palavras if total_palavras > 0 else 0

        palavras_processadas = []

        for i, w in enumerate(palavras_obj):
            pausa = 0.0
            if i > 0:
                pausa = round(w["start"] - palavras_obj[i - 1]["end"], 2)

            palavras_processadas.append({
                "word": w["word"],
                "start": w["start"],
                "end": w["end"],
                "probability": get_prob_from_segments(w["start"], segmentos),
                "duration": round(w["end"] - w["start"], 2),
                "silence_before": pausa
            })

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
            "palavras": palavras_processadas
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro no processamento: {str(e)}")

    finally:
        if caminho_audio and os.path.exists(caminho_audio):
            os.remove(caminho_audio)


# =========================
# COMPARAÇÃO (AGORA FUNCIONA DE VERDADE)
# =========================
@router.post("/comparar-texto")
async def comparar(payload: ComparacaoRequest):

    texto_transcrito = payload.texto_transcrito

    # fallback automático
    if not texto_transcrito:
        texto_transcrito = LAST_TRANSCRIPTION

    if not texto_transcrito:
        raise HTTPException(
            status_code=400,
            detail="Nenhuma transcrição disponível para comparação"
        )

    return comparar_textos(
        payload.texto_referencia,
        texto_transcrito
    )