from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query
import tempfile
import os
import difflib
import random
from groq import Groq
from difflib import SequenceMatcher
from pydantic import BaseModel
from dotenv import load_dotenv
from app.db.connection import get_connection
from app.db.service import fetch_texto, fetch_trava_lingua, carregar_calibracao
from app.services.analysis import (
    JANELA_OSCILACAO,
    normalizar,
    detectar_blocos_gaguejo,
    detectar_blocos_silabicos,
    detectar_prolongamentos,
    comparar_textos,
    classificar_fluencia,
    calcular_penalidade_temporal,
    get_prob_from_segments,
    wpm_local,
    classificar_oscilacao,
)
from app.services.feedback import calcular_aprovacao


load_dotenv()
router = APIRouter()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

FASES_POR_DIFICULDADE = {
    "facil":   list(range(1, 4)),
    "medio":   list(range(4, 8)),
    "dificil": list(range(8, 11)),
}

LAST_TRANSCRIPTION = ""

FALLBACK_PROMPT_GAGUEIRA = (
    "Mas mas mas fui ao ao mercado. Meu meu nome é é Ana. "
    "Co-co-corona. Antáaaaaart- Antártica. Ta-ta-ta-trazendo. "
    "Eh hum então eu eu precisava de de leite."
)


def _truncar_alucinacao(words):
    """Remove repetições excessivas causadas por alucinação do Whisper.

    Sequências da mesma palavra com mais de 6 ocorrências são truncadas
    ao número plausível pela duração (mínimo 0.35 s por repetição).
    """
    if not words:
        return words
    result = []
    i = 0
    while i < len(words):
        j = i + 1
        token = words[i]["word"].strip().lower()
        while j < len(words) and words[j]["word"].strip().lower() == token:
            j += 1
        run_len = j - i
        if run_len > 6:
            duracao_seq = words[j - 1]["end"] - words[i]["start"]
            count_plausivel = max(1, int(duracao_seq / 0.35))
            result.extend(words[i : i + count_plausivel])
        else:
            result.extend(words[i:j])
        i = j
    return result


class ComparacaoRequest(BaseModel):
    texto_referencia: str
    texto_transcrito: str = ""


def _alinhar_analise_corrigida(analise_palavras_bruta: list, transcricao_corrigida: str) -> list:
    """Mapeia as categorias da transcrição bruta para as palavras da transcrição corrigida.

    Usa SequenceMatcher para alinhar as duas listas de palavras e herdar a
    categoria do token correspondente na bruta. Palavras inseridas pelo LLM
    (sem correspondente na bruta) recebem categoria 'correta'.
    """
    palavras_corrigida = normalizar(transcricao_corrigida)
    if not palavras_corrigida:
        return []

    palavras_bruta_norm = []
    for p in analise_palavras_bruta:
        norm = normalizar(p["word"])
        palavras_bruta_norm.append(norm[0] if norm else p["word"].strip().lower())

    categorias_bruta = [p["categoria"] for p in analise_palavras_bruta]
    matcher = SequenceMatcher(None, palavras_bruta_norm, palavras_corrigida)

    result = []
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            for bi, ci in zip(range(i1, i2), range(j1, j2)):
                result.append({"word": palavras_corrigida[ci], "categoria": categorias_bruta[bi]})
        elif tag == "insert":
            for ci in range(j1, j2):
                result.append({"word": palavras_corrigida[ci], "categoria": "correta"})
        elif tag == "replace":
            bruta_indices = list(range(i1, i2))
            for k, ci in enumerate(range(j1, j2)):
                bi = bruta_indices[k] if k < len(bruta_indices) else bruta_indices[-1]
                result.append({"word": palavras_corrigida[ci], "categoria": categorias_bruta[bi]})
        # tag == "delete": palavra só existe na bruta, não aparece na corrigida — ignorar

    return result


@router.get("/textos/aleatorio")
async def obter_texto_aleatorio(
    dificuldade: str = Query(default="facil"),
    categoria: str = Query(default="texto"),
    ultimo_id: str = Query(default=None),
):
    fases = FASES_POR_DIFICULDADE.get(dificuldade, FASES_POR_DIFICULDADE["facil"])
    fase  = random.choice(fases)

    if categoria == "trava_lingua":
        texto = fetch_trava_lingua(fase_atual=fase, ultimo_id=ultimo_id)
        if not texto:
            texto = fetch_trava_lingua(ultimo_id=ultimo_id)
    else:
        texto = fetch_texto(fase=fase, ultimo_id=ultimo_id)
        if not texto:
            texto = fetch_texto(fase=random.choice(fases))

    if not texto:
        raise HTTPException(status_code=404, detail="Nenhum texto encontrado.")

    return texto


@router.get("/texto/{fase}")
async def obter_texto_por_fase(fase: int):
    texto = fetch_texto(fase=fase)

    if not texto:
        raise HTTPException(status_code=404, detail="Texto não encontrado para essa fase.")

    return {
        "id":       texto["id"],
        "pergunta": texto.get("ex2_pergunta"),
        "dica":     texto.get("ex2_dica"),
    }



@router.post("/transcrever")
async def transcrever(
    file: UploadFile = File(...),
    texto_referencia: str = Form(default=""),
    usuario_id: str = Form(default=""),
    wpm_min: float | None = Form(default=None),
    wpm_max: float | None = Form(default=None),
    modo_livre: bool = Form(default=False),
):
    global LAST_TRANSCRIPTION
    texto_alvo = texto_referencia

    if not file:
        raise HTTPException(status_code=400, detail="Arquivo não enviado")

    audio_content = await file.read()
    ext_original  = os.path.splitext(file.filename)[1].lower() if file.filename else ".mp3"
    extensoes_permitidas = ['.flac', '.mp3', '.mp4', '.mpeg', '.mpga', '.m4a', '.ogg', '.opus', '.wav', '.webm']
    suffix = ext_original if ext_original in extensoes_permitidas else ".mp3"

    caminho_audio = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(audio_content)
            caminho_audio = tmp.name

        prompt_whisper = (
            texto_referencia.strip()
            if texto_referencia.strip()
            else FALLBACK_PROMPT_GAGUEIRA
        )

        with open(caminho_audio, "rb") as audio_file:
            resultado = client.audio.transcriptions.create(
                file=(os.path.basename(caminho_audio), audio_file),
                model="whisper-large-v3",
                language="pt",
                response_format="verbose_json",
                timestamp_granularities=["segment", "word"],
                temperature=0,
                prompt=prompt_whisper,
            )

        texto         = resultado.text.strip()
        LAST_TRANSCRIPTION = texto

        segmentos    = [dict(s) for s in (resultado.segments or [])]
        palavras_obj = _truncar_alucinacao(list(resultado.words or []))
        duracao_total = segmentos[-1]["end"] if segmentos else 0

        if palavras_obj:
            palavras_lista = [w["word"].strip().lower() for w in palavras_obj if w["word"].strip()]
            total_palavras = len(palavras_lista)
            duracao_total  = palavras_obj[-1]["end"]
        else:
            palavras_lista = [p.strip().lower() for p in texto.split() if p.strip()]
            total_palavras = len(palavras_lista)

        wpm = (total_palavras / (duracao_total / 60)) if duracao_total > 0 else 0

        # Detecta silêncio ou alucinação do Whisper
        no_speech_prob_medio = (
            sum(s.get("no_speech_prob", 0) for s in segmentos) / len(segmentos)
            if segmentos else 1.0
        )
        is_silencio = (
            total_palavras == 0
            or no_speech_prob_medio > 0.80
            or (total_palavras <= 2 and wpm < 15)
        )
        if is_silencio:
            return {
                "aprovado": False,
                "silencio": True,
                "status_feedback": {
                    "mensagem": "Não detectamos sua voz. Fale mais perto do microfone e tente novamente."
                },
                "transcricao": texto,
                "transcricao_corrigida": None,
                "analise_corrigida": [],
                "analise_palavras": [],
                "wpm": 0,
                "duracao_segundos": round(duracao_total, 2),
                "total_palavras": 0,
                "score": 0.0,
                "fluencia": "lento",
                "modo_livre": modo_livre,
            }

        repeticoes = sum(
            1 for i in range(len(palavras_lista) - 1)
            if palavras_lista[i] == palavras_lista[i + 1]
        )
        taxa_repeticao = repeticoes / total_palavras if total_palavras > 0 else 0

        bloqueios_detectados  = 0
        muletas_detectadas    = 0
        palavras_processadas  = []
        hesitacoes            = []
        oscilacoes_detectadas = 0

        muletas_comuns = ["é", "éé", "ah", "hã", "hum", "uhm", "tipo", "então", "assim"]

        calibracao = carregar_calibracao(usuario_id) if usuario_id else None

        if palavras_obj:
            for i, w in enumerate(palavras_obj):
                pausa_previa = 0.0
                if i > 0:
                    pausa_previa = round(w["start"] - palavras_obj[i - 1]["end"], 2)

                    if pausa_previa > 2.0:
                        bloqueios_detectados += 1
                        hesitacoes.append({
                            "palavra_anterior": palavras_obj[i - 1]["word"].strip(),
                            "palavra_seguinte": w["word"].strip(),
                            "inicio":           round(palavras_obj[i - 1]["end"], 2),
                            "fim":              round(w["start"], 2),
                            "duracao_pausa":    pausa_previa,
                        })

                prob          = get_prob_from_segments(w["start"], segmentos)
                stutter_flag  = False
                palavra_atual = w["word"].strip().lower()

                if pausa_previa >= 2.0:
                    stutter_flag = True
                if 0.0 < prob < 0.5:
                    stutter_flag = True
                if i > 0 and palavra_atual == palavras_obj[i - 1]["word"].strip().lower():
                    stutter_flag = True

                duracao = round(w["end"] - w["start"], 2)
                if len(palavra_atual) <= 2:
                    limite_tempo = 0.85
                else:
                    limite_tempo = max(len(palavra_atual) * 0.22, 0.80)
                is_prolongation = duracao > limite_tempo

                is_filler = palavra_atual in muletas_comuns
                if is_filler:
                    muletas_detectadas += 1

                wpm_loc   = 0.0
                oscilacao = "sem_calibracao"
                if calibracao:
                    wpm_loc   = wpm_local(palavras_obj, i, JANELA_OSCILACAO)
                    oscilacao = classificar_oscilacao(
                        wpm_loc,
                        calibracao["limite_inferior"],
                        calibracao["limite_superior"],
                    )
                    if oscilacao in ("acelerado", "lento"):
                        oscilacoes_detectadas += 1

                palavras_processadas.append({
                    "word":            w["word"],
                    "start":           w["start"],
                    "end":             w["end"],
                    "probability":     prob,
                    "duration":        duracao,
                    "silence_before":  pausa_previa,
                    "is_stutter":      stutter_flag,
                    "is_filler":       is_filler,
                    "is_prolongation": is_prolongation,
                    "wpm_local":       wpm_loc,
                    "oscilacao":       oscilacao,
                })

        blocos_gaguejo       = detectar_blocos_gaguejo(palavras_processadas) if palavras_obj else []
        blocos_com_bloqueio  = sum(1 for b in blocos_gaguejo if b["com_bloqueio"])
        blocos_silabicos     = detectar_blocos_silabicos(palavras_processadas) if palavras_obj else []
        prolongamentos_lista = detectar_prolongamentos(palavras_processadas) if palavras_obj else []
        total_prolongamentos = len(prolongamentos_lista)

        total_palavras_ref = len(normalizar(texto_referencia)) if texto_referencia else total_palavras
        temporal = calcular_penalidade_temporal(
            palavras_processadas, total_palavras_ref, duracao_total, segmentos
        )

        # ── Modo livre: fala espontânea sem texto de referência ──────────────
        if modo_livre:
            analise_palavras = []
            for idx, p in enumerate(palavras_processadas):
                palavra_atual_raw    = p["word"].strip().lower()
                palavra_anterior_raw = palavras_processadas[idx - 1]["word"].strip().lower() if idx > 0 else ""
                is_repeticao_direta  = (idx > 0 and palavra_atual_raw == palavra_anterior_raw)

                is_bloco_silabico = any(
                    b["inicio"] <= p["start"] <= b["fim"]
                    for b in blocos_silabicos
                )

                # Prioridade: stutter > acelerado/lento > filler > prolongamento > correta
                if p["is_stutter"] or is_repeticao_direta or is_bloco_silabico:
                    categoria = "disfluente"
                elif p["oscilacao"] == "acelerado":
                    categoria = "acelerado"
                elif p["oscilacao"] == "lento":
                    categoria = "lento"
                elif p["is_filler"]:
                    categoria = "muleta"
                elif p["is_prolongation"]:
                    categoria = "prolongamento"
                else:
                    categoria = "correta"

                analise_palavras.append({
                    **p,
                    "categoria":        categoria,
                    "repeticao_direta": is_repeticao_direta,
                    "bloco_silabico":   is_bloco_silabico,
                })

            palavras_fluentes = sum(1 for p in analise_palavras if p["categoria"] == "correta")
            taxa_fluencia = round(palavras_fluentes / total_palavras, 4) if total_palavras > 0 else 0.0

            transcricao_corrigida = texto
            try:
                prompt_correcao = (
                    f"Você recebeu a transcrição bruta de alguém com gagueira. "
                    f"Reescreva apenas o que a pessoa quis dizer, removendo: repetições de palavras ou sílabas, "
                    f"palavras incompletas, muletas de linguagem (ah, éé, hum, tipo, então, assim) e sons prolongados. "
                    f"Transcrição bruta: \"{texto}\". "
                    f"Retorne apenas a frase corrigida, sem explicações."
                )
                resp_correcao = client.chat.completions.create(
                    messages=[{"role": "user", "content": prompt_correcao}],
                    model="llama-3.1-8b-instant",
                    temperature=0.3,
                    max_tokens=200,
                )
                transcricao_corrigida = resp_correcao.choices[0].message.content.strip()
            except Exception as e:
                print("Erro ao gerar transcrição corrigida:", e)

            dica_fono = "Não foi possível gerar dica no momento."
            try:
                prompt_fono = (
                    f"Você é uma fonoaudióloga coach em um app gamificado. Analise esses dados de fala espontânea:\n"
                    f"- Palavras por minuto: {round(wpm, 1)}\n"
                    f"- Taxa de gaguejo: {round(taxa_repeticao * 100, 1)}%\n"
                    f"- Blocos de gaguejo: {len(blocos_gaguejo)} (com bloqueio: {blocos_com_bloqueio})\n"
                    f"- Blocos silábicos: {len(blocos_silabicos)}\n"
                    f"- Prolongamentos: {total_prolongamentos}\n"
                    f"- Bloqueios silenciosos: {bloqueios_detectados}\n"
                    f"- Muletas usadas: {muletas_detectadas}\n"
                    f"- Fluência: {round(taxa_fluencia * 100, 1)}%\n"
                    f"- O que disse: \"{texto}\"\n"
                    f"- Versão corrigida: \"{transcricao_corrigida}\"\n"
                    f"Responda em português brasileiro com no máximo 18 palavras. "
                    f"Incentive o paciente a repetir a frase corrigida. "
                    f"Prioridade: blocos silábicos > prolongamentos > repetições > elogio."
                )
                chat_completion = client.chat.completions.create(
                    messages=[{"role": "user", "content": prompt_fono}],
                    model="llama-3.1-8b-instant",
                    temperature=0.7,
                    max_tokens=100,
                )
                dica_fono = chat_completion.choices[0].message.content.strip()
            except Exception as e:
                print("Erro ao gerar feedback:", e)

            taxa_oscilacao = round(oscilacoes_detectadas / total_palavras, 4) if calibracao and total_palavras > 0 else 0.0
            analise_corrigida = _alinhar_analise_corrigida(analise_palavras, transcricao_corrigida)

            return {
                "filename":              file.filename,
                "modo_livre":            True,
                "transcricao":           texto,
                "transcricao_corrigida": transcricao_corrigida,
                "analise_corrigida":     analise_corrigida,
                "texto_alvo":            "",
                "precisao_alvo":         0.0,
                "taxa_fluencia":         taxa_fluencia,
                "duracao_segundos":      round(duracao_total, 2),
                "total_palavras":        total_palavras,
                "wpm":                   round(wpm, 2),
                "repeticoes":            repeticoes,
                "taxa_repeticao":        round(taxa_repeticao, 4),
                "bloqueios_silenciosos": bloqueios_detectados,
                "muletas_detectadas":    muletas_detectadas,
                "blocos_gaguejo":        blocos_gaguejo,
                "blocos_silabicos":      blocos_silabicos,
                "prolongamentos":        prolongamentos_lista,
                "fluencia":              classificar_fluencia(wpm, taxa_repeticao),
                "feedback_fono":         dica_fono,
                "segmentos":             segmentos,
                "palavras":              palavras_processadas if palavras_obj else [],
                "analise_palavras":      analise_palavras,
                "omitidas":              [],
                "score":                 taxa_fluencia,
                "score_bruto":           taxa_fluencia,
                "hesitacoes":            hesitacoes,
                "oscilacoes":            oscilacoes_detectadas if calibracao else 0,
                "taxa_oscilacao":        taxa_oscilacao,
                "wpm_base":              calibracao["wpm_base"] if calibracao else None,
                "calibrado":             calibracao is not None,
                **calcular_aprovacao(
                    wpm=wpm,
                    score_penalizado=taxa_fluencia,
                    wpm_min=wpm_min,
                    wpm_max=wpm_max,
                    limite_inferior=calibracao["limite_inferior"] if calibracao else None,
                    limite_superior=calibracao["limite_superior"] if calibracao else None,
                ),
            }

        # ── Modo leitura: comparação com texto de referência (comportamento original) ──
        precisao_alvo = 0.0
        if texto_alvo and len(texto) > 0:
            precisao_alvo = round(
                difflib.SequenceMatcher(
                    None,
                    normalizar(texto_alvo),
                    normalizar(texto)
                ).ratio() * 100, 2
            )

        dica_fono = "Não foi possível gerar dica no momento."
        try:
            prompt_fono = (
                f"Você é uma fonoaudióloga coach em um app gamificado, analise esses dados:\n"
                f"- Palavras por minuto: {round(wpm, 1)}\n"
                f"- Taxa de repetição (gaguejo): {round(taxa_repeticao * 100, 1)}%\n"
                f"- Blocos de gaguejo: {len(blocos_gaguejo)} (com bloqueio: {blocos_com_bloqueio})\n"
                f"- Blocos silábicos (ex: 'la la la lago'): {len(blocos_silabicos)}\n"
                f"- Prolongamentos (ex: 'Aaaa casa'): {total_prolongamentos}\n"
                f"- Bloqueios silenciosos: {bloqueios_detectados}\n"
                f"- Muletas usadas: {muletas_detectadas}\n"
                f"- Transcrição: \"{texto}\"\n"
                f"- Texto esperado: \"{texto_alvo}\"\n"
                f"Responda em português brasileiro com no máximo 18 palavras.\n"
                f"Prioridade: blocos silábicos > prolongamentos > repetições > elogio.\n"
                f"Exemplo: \"Quase lá! Respire antes de cada frase. Você consegue!\""
            )
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

        ref_words_lookup   = normalizar(texto_referencia)
        trans_words_lookup = normalizar(texto)
        matcher_lookup     = SequenceMatcher(None, ref_words_lookup, trans_words_lookup)

        palavras_acerto = set()
        for tag, i1, i2, j1, j2 in matcher_lookup.get_opcodes():
            if tag == "equal":
                palavras_acerto.update(ref_words_lookup[i1:i2])

        lookup = {}
        for palavra in set(ref_words_lookup) | set(trans_words_lookup):
            if palavra in palavras_acerto:
                lookup[palavra] = "acerto"
            elif palavra not in ref_words_lookup:
                lookup[palavra] = "extra"
            else:
                lookup[palavra] = "omitida"

        analise_palavras = []
        for idx, p in enumerate(palavras_processadas):
            palavra_norm = normalizar(p["word"])
            palavra_norm = palavra_norm[0] if len(palavra_norm) > 0 else p["word"].strip().lower()
            status_diff  = lookup.get(palavra_norm, "acerto")

            palavra_atual_raw    = p["word"].strip().lower()
            palavra_anterior_raw = palavras_processadas[idx - 1]["word"].strip().lower() if idx > 0 else ""
            is_repeticao_direta  = (idx > 0 and palavra_atual_raw == palavra_anterior_raw)

            is_bloco_silabico = any(
                b["inicio"] <= p["start"] <= b["fim"]
                for b in blocos_silabicos
            )

            if is_repeticao_direta or is_bloco_silabico:
                categoria = "disfluente"
            elif p["is_prolongation"]:
                categoria = "prolongamento"
            elif not texto_referencia or status_diff == "acerto":
                categoria = "correta" if p["probability"] >= 0.30 else "pouco_clara"
            else:
                categoria = "incorreta"

            analise_palavras.append({
                **p,
                "status_diff":      status_diff,
                "categoria":        categoria,
                "repeticao_direta": is_repeticao_direta,
                "bloco_silabico":   is_bloco_silabico,
            })

        penalidade_repeticao      = min(taxa_repeticao * 1.5, 0.5)
        penalidade_blocos         = min(blocos_com_bloqueio * 0.05, 0.2)
        penalidade_silabica       = min(len(blocos_silabicos) * 0.08, 0.2)
        penalidade_prolongamentos = min(total_prolongamentos * 0.07, 0.25)
        penalidade_duracao        = temporal["penalidade_duracao"]
        penalidade_confianca      = temporal["penalidade_confianca"]
        penalidade_total          = min(
            penalidade_repeticao + penalidade_blocos + penalidade_silabica
            + penalidade_prolongamentos + penalidade_duracao + penalidade_confianca,
            0.9
        )
        score_bruto      = diff["score"]
        score_penalizado = round(max(0.0, score_bruto * (1 - penalidade_total)), 4)

        taxa_oscilacao = round(oscilacoes_detectadas / total_palavras, 4) if calibracao and total_palavras > 0 else 0.0

        return {
            "filename":              file.filename,
            "transcricao":           texto,
            "texto_alvo":            texto_alvo,
            "precisao_alvo":         precisao_alvo,
            "duracao_segundos":      round(duracao_total, 2),
            "total_palavras":        total_palavras,
            "wpm":                   round(wpm, 2),
            "repeticoes":            repeticoes,
            "taxa_repeticao":        round(taxa_repeticao, 4),
            "bloqueios_silenciosos": bloqueios_detectados,
            "muletas_detectadas":    muletas_detectadas,
            "blocos_gaguejo":        blocos_gaguejo,
            "blocos_silabicos":      blocos_silabicos,
            "prolongamentos":        prolongamentos_lista,
            "fluencia":              classificar_fluencia(wpm, taxa_repeticao),
            "feedback_fono":         dica_fono,
            "segmentos":             segmentos,
            "palavras":              palavras_processadas if palavras_obj else [],
            "analise_palavras":      analise_palavras,
            "omitidas":              diff["omitidas"],
            "score":                 score_penalizado,
            "score_bruto":           score_bruto,
            "penalidade_repeticao":       round(penalidade_repeticao, 4),
            "penalidade_blocos":          round(penalidade_blocos, 4),
            "penalidade_silabica":        round(penalidade_silabica, 4),
            "penalidade_prolongamentos":  round(penalidade_prolongamentos, 4),
            "penalidade_duracao":         penalidade_duracao,
            "penalidade_confianca":       penalidade_confianca,
            "ratio_duracao":         temporal["ratio_duracao"],
            "palavras_longas":       temporal["palavras_longas"],
            "hesitacoes":            hesitacoes,
            "oscilacoes":            oscilacoes_detectadas if calibracao else 0,
            "taxa_oscilacao":        taxa_oscilacao,
            "wpm_base":              calibracao["wpm_base"] if calibracao else None,
            "calibrado":             calibracao is not None,
            **calcular_aprovacao(
                wpm=wpm,
                score_penalizado=score_penalizado,
                wpm_min=wpm_min,
                wpm_max=wpm_max,
                limite_inferior=calibracao["limite_inferior"] if calibracao else None,
                limite_superior=calibracao["limite_superior"] if calibracao else None,
            ),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro no processamento: {str(e)}")

    finally:
        if caminho_audio and os.path.exists(caminho_audio):
            os.remove(caminho_audio)


@router.get("/trava-lingua/{id}")
async def obter_trava_lingua(id: str):
    supabase = get_connection()
    response = (
        supabase.table("trava_linguas")
        .select("*")
        .eq("id", id)
        .limit(1)
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=404, detail="Trava-língua não encontrada.")

    tl = response.data[0]
    return {
        "id":          tl["id"],
        "titulo":      tl.get("titulo"),
        "conteudo":    tl.get("conteudo"),
        "sons_alvo":   tl.get("sons_alvo", []),
        "dica":        tl.get("dica"),
        "repeticoes":  tl.get("repeticoes", 3),
        "fase_minima": tl.get("fase_minima"),
        "dificuldade": tl.get("dificuldade"),
    }


@router.post("/comparar-texto")
async def comparar(payload: ComparacaoRequest):
    texto_transcrito = payload.texto_transcrito
    if not texto_transcrito:
        texto_transcrito = LAST_TRANSCRIPTION
    if not texto_transcrito:
        raise HTTPException(status_code=400, detail="Nenhuma transcrição disponível.")
    return comparar_textos(payload.texto_referencia, texto_transcrito)
