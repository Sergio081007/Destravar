from fastapi import APIRouter, UploadFile, File, Form, HTTPException
import tempfile
import os
import math
import re
import difflib
from groq import Groq
from difflib import SequenceMatcher
from pydantic import BaseModel
from collections import Counter

router = APIRouter()
client = Groq(api_key="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")

LAST_TRANSCRIPTION = ""

class ComparacaoRequest(BaseModel):
    texto_referencia: str
    texto_transcrito: str = ""  

def normalizar(texto: str):
    texto = texto.lower()
    texto = re.sub(r"[^\w\sà-úãõâêîôûç]", "", texto)
    texto = re.sub(r"\s+", " ", texto).strip()
    return texto.split()

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
            resultado["erros"].append({"esperado": ref_words[i1:i2], "ouvido": trans_words[j1:j2]})
        elif tag == "delete":
            resultado["omitidas"].extend(ref_words[i1:i2])
        elif tag == "insert":
            resultado["extras"].extend(trans_words[j1:j2])

    resultado["score"] = round(acertos / total_ref, 4) if total_ref > 0 else 0
    resultado["omitidas"] = sorted(resultado["omitidas"])
    resultado["extras"] = sorted(resultado["extras"])
    return resultado

def classificar_fluencia(wpm: float, taxa_repeticao: float) -> str:
    if taxa_repeticao > 0.15: return "disfluente"
    elif wpm < 130: return "lento"
    elif wpm <= 160: return "normal"
    else: return "rapido"

def get_prob_from_segments(word_start: float, segmentos: list) -> float:
    for seg in segmentos:
        if seg["start"] <= word_start <= seg["end"]:
            return round(math.exp(seg.get("avg_logprob", -1.0)), 4)
    return 0.0

@router.post("/transcrever")
async def transcrever(file: UploadFile = File(...), texto_referencia: str = Form(default="")):
    global LAST_TRANSCRIPTION
    texto_alvo = texto_referencia
    if not file: raise HTTPException(status_code=400, detail="Arquivo não enviado")

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
        LAST_TRANSCRIPTION = texto  

        segmentos = [dict(s) for s in (resultado.segments or [])]
        palavras_obj = resultado.words or []
        duracao_total = segmentos[-1]["end"] if segmentos else 0

        if palavras_obj:
            palavras_lista = [w["word"].strip().lower() for w in palavras_obj if w["word"].strip()]
            total_palavras = len(palavras_lista)
            duracao_total = palavras_obj[-1]["end"]
        else:
            palavras_lista = [p.strip().lower() for p in texto.split() if p.strip()]
            total_palavras = len(palavras_lista)

        wpm = (total_palavras / (duracao_total / 60)) if duracao_total > 0 else 0
        repeticoes = sum(1 for i in range(len(palavras_lista) - 1) if palavras_lista[i] == palavras_lista[i + 1])
        taxa_repeticao = repeticoes / total_palavras if total_palavras > 0 else 0

        bloqueios_detectados = 0
        muletas_detectadas = 0
        palavras_processadas = []
        hesitacoes = []
        muletas_comuns = ["é", "éé", "ah", "hã", "hum", "uhm", "tipo", "então", "assim"]
        
        if palavras_obj:
            for i, w in enumerate(palavras_obj):
                pausa_previa = 0.0
                if i > 0:
                    pausa_previa = round(w["start"] - palavras_obj[i - 1]["end"], 2)
                    if pausa_previa > 1.5:
                        bloqueios_detectados += 1
                        hesitacoes.append({
                            "palavra_anterior": palavras_obj[i - 1]["word"].strip(),
                            "palavra_seguinte": w["word"].strip(),
                            "inicio": round(palavras_obj[i - 1]["end"], 2),
                            "fim": round(w["start"], 2),
                            "duracao_pausa": pausa_previa
                        })
                
                prob = get_prob_from_segments(w["start"], segmentos)
                stutter_flag = False
                palavra_atual = w["word"].strip().lower()
                palavra_anterior = palavras_obj[i-1]["word"].strip().lower() if i > 0 else ""
                
                if pausa_previa >= 1.0: stutter_flag = True
                if 0.0 < prob < 0.5: stutter_flag = True
                if i > 0 and palavra_atual == palavra_anterior: stutter_flag = True

                duracao = round(w["end"] - w["start"], 2)
                limite_tempo = max(len(palavra_atual) * 0.25, 0.45) 
                is_prolongation = duracao > limite_tempo
                
                is_filler = palavra_atual in muletas_comuns
                if is_filler: muletas_detectadas += 1

                palavras_processadas.append({
                    "word": w["word"],
                    "start": w["start"],
                    "end": w["end"],
                    "probability": prob,
                    "duration": duracao,
                    "silence_before": pausa_previa,
                    "is_stutter": stutter_flag,
                    "is_filler": is_filler,
                    "is_prolongation": is_prolongation
                })
                
        precisao_alvo = 0.0
        if texto_alvo and len(texto) > 0:
            precisao_alvo = round(difflib.SequenceMatcher(None, normalizar(texto_alvo), normalizar(texto)).ratio() * 100, 2)

        dica_fono = "Não foi possível gerar dica no momento."
        try:
            prompt_fono = f"""
            Aja como um fonoaudiólogo empático analisando o seguinte paciente que luta contra a gagueira:
            - Palavras por minuto: {wpm}
            - Taxa de Repetição: {taxa_repeticao}
            - Bloqueios Silenciosos: {bloqueios_detectados}
            - Muletas de linguagem usadas: {muletas_detectadas}
            - Transcrição do que ele disse: "{texto}"
            - Texto esperado (se houver): "{texto_alvo}"
            Forneça um feedback EXTREMAMENTE CURTO (No máximo 2 ou 3 frases curtas, tamanho de um tweet). Inspire e dê uma dica pontual baseada na taxa de repetição.
            """
            chat_completion = client.chat.completions.create(
                messages=[{"role": "user", "content": prompt_fono}],
                model="llama-3.1-8b-instant",
                temperature=0.7,
                max_tokens=100
            )
            dica_fono = chat_completion.choices[0].message.content.strip()
        except Exception as e:
            print("Erro ao gerar feedback:", e)

        diff = comparar_textos(texto_referencia, texto)
        ref_count = Counter(normalizar(texto_referencia))
        trans_count = Counter(normalizar(texto))

        lookup = {}
        for palavra in set(ref_count.keys()) | set(trans_count.keys()):
            r = ref_count.get(palavra, 0)
            t = trans_count.get(palavra, 0)
            if t == r: lookup[palavra] = "acerto"
            elif t > r: lookup[palavra] = "extra"
            else: lookup[palavra] = "omitida"

        analise_palavras = []
        for p in palavras_processadas:
            palavra_norm = normalizar(p["word"])
            palavra_norm = palavra_norm[0] if len(palavra_norm) > 0 else p["word"].strip().lower()
            status_diff = lookup.get(palavra_norm, "acerto")

            if status_diff == "acerto":
                categoria = "correta" if p["probability"] >= 0.5 else "pouco_clara"
            else:
                categoria = "incorreta"

            analise_palavras.append({
                **p,
                "status_diff": status_diff,
                "categoria": categoria
            })

        return {
            "filename": file.filename,
            "transcricao": texto,
            "texto_alvo": texto_alvo,
            "precisao_alvo": precisao_alvo,
            "duracao_segundos": round(duracao_total, 2),
            "total_palavras": total_palavras,
            "wpm": round(wpm, 2),
            "repeticoes": repeticoes,
            "taxa_repeticao": round(taxa_repeticao, 4),
            "bloqueios_silenciosos": bloqueios_detectados,
            "muletas_detectadas": muletas_detectadas,
            "fluencia": classificar_fluencia(wpm, taxa_repeticao),
            "feedback_fono": dica_fono,
            "segmentos": segmentos,
            "palavras": palavras_processadas if palavras_obj else [],
            "analise_palavras": analise_palavras,       
            "omitidas": diff["omitidas"],               
            "score": diff["score"],
            "hesitacoes": hesitacoes,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro no processamento: {str(e)}")

    finally:
        if caminho_audio and os.path.exists(caminho_audio):
            os.remove(caminho_audio)

@router.post("/comparar-texto")
async def comparar(payload: ComparacaoRequest):
    texto_transcrito = payload.texto_transcrito
    if not texto_transcrito: texto_transcrito = LAST_TRANSCRIPTION
    if not texto_transcrito: raise HTTPException(status_code=400, detail="Nenhuma transcrição disponível.")
    return comparar_textos(payload.texto_referencia, texto_transcrito)
