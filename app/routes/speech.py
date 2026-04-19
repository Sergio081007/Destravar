from fastapi import APIRouter, UploadFile, File, Form, HTTPException
import tempfile
import os
import math
import difflib
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
async def transcrever(
    file: UploadFile = File(...),
    texto_alvo: str = Form(None)
):
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

        # Novas métricas adicionais (Bloqueios, Gagueira, Muletas e Prolongamentos)
        bloqueios_detectados = 0
        muletas_detectadas = 0
        palavras_processadas = []
        muletas_comuns = ["é", "éé", "ah", "hã", "hum", "uhm", "tipo", "então", "assim"]
        
        if palavras_obj:
            for i, w in enumerate(palavras_obj):
                pausa_previa = 0.0
                if i > 0:
                    pausa_previa = round(w["start"] - palavras_obj[i-1]["end"], 2)
                    if pausa_previa > 1.5:
                        bloqueios_detectados += 1
                
                prob = get_prob_from_segments(w["start"], segmentos)
                
                # Regras de detecção de gagueira no Frontend
                stutter_flag = False
                palavra_atual = w["word"].strip().lower()
                palavra_anterior = palavras_obj[i-1]["word"].strip().lower() if i > 0 else ""
                
                # 1. Pausa excessiva antes da palavra (Bloqueio) -> Gagueira
                if pausa_previa >= 1.0:
                    stutter_flag = True
                
                # 2. Score de Confiança do Whisper (Dúvida do que murmurou)
                # O limite de 0.5 indica menos de 50% de confiança
                if 0.0 < prob < 0.5:
                    stutter_flag = True
                    
                # 3. Repetição literal (eu eu, que que)
                if i > 0 and palavra_atual == palavra_anterior:
                    stutter_flag = True

                # 4. Prolongamento (sílabas arrastadas: + de 0.25 segs por letra falada)
                duracao = round(w["end"] - w["start"], 2)
                limite_tempo = max(len(palavra_atual) * 0.25, 0.45) # min absoluto de 0.45s 
                is_prolongation = duracao > limite_tempo
                
                # 5. Muleta de linguagem
                is_filler = palavra_atual in muletas_comuns
                if is_filler:
                    muletas_detectadas += 1

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
                
        # Calcula Precisão (Accuracy) caso haja um texto-alvo provido para treinar
        precisao_alvo = 0.0
        if texto_alvo and len(texto) > 0:
            precisao_alvo = round(difflib.SequenceMatcher(None, texto_alvo.lower(), texto.lower()).ratio() * 100, 2)

        # Chamar Llama-3 para analisar como uma fonoaudióloga
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
            print("Erro ao gerar feedback da LLM:", e)

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
            "palavras": palavras_processadas if palavras_obj else []
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro no processamento: {str(e)}")

    finally:
        if caminho_audio and os.path.exists(caminho_audio):
            os.remove(caminho_audio)