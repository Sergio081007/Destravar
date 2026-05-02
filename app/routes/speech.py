from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query
import tempfile
import os
import math
import re
import difflib
import unicodedata
import random
from groq import Groq
from difflib import SequenceMatcher
from pydantic import BaseModel
from collections import Counter
from dotenv import load_dotenv
from app.db.connection import get_connection
from app.db.service import fetch_texto, fetch_trava_lingua

load_dotenv()
router = APIRouter()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

FASES_POR_DIFICULDADE = {
    "facil":   list(range(1, 4)),
    "medio":   list(range(4, 8)),
    "dificil": list(range(8, 11)),
}


@router.get("/textos/aleatorio")
async def obter_texto_aleatorio(
    dificuldade: str = Query(default="facil"),
    categoria: str = Query(default="texto"),
    ultimo_id: str = Query(default=None),
):
    fases = FASES_POR_DIFICULDADE.get(dificuldade, FASES_POR_DIFICULDADE["facil"])
    fase = random.choice(fases)

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

LAST_TRANSCRIPTION = ""

JANELA_OSCILACAO = 10


class ComparacaoRequest(BaseModel):
    texto_referencia: str
    texto_transcrito: str = ""


def normalizar(texto: str):
    texto = texto.lower()
    texto = unicodedata.normalize("NFD", texto)
    texto = "".join(c for c in texto if unicodedata.category(c) != "Mn")
    texto = re.sub(r"[^\w\s]", "", texto)
    texto = re.sub(r"\s+", " ", texto).strip()
    palavras = texto.split()

    # Remove repetições consecutivas antes do diff para não punir duas vezes
    sem_repeticoes = []
    for i, p in enumerate(palavras):
        if i == 0 or p != palavras[i - 1]:
            sem_repeticoes.append(p)

    return sem_repeticoes


def detectar_blocos_gaguejo(palavras_processadas: list, min_pausa: float = 0.4, min_reps: int = 2) -> list:
    """
    Detecta o padrão clássico de gaguejo: pausa → repetição da mesma palavra N vezes.
    Diferencia blocos com bloqueio silencioso (pausa antes) dos que são só repetição.
    """
    blocos = []
    n = len(palavras_processadas)
    i = 0
    while i < n:
        palavra = palavras_processadas[i]["word"].strip().lower()
        j = i + 1
        while j < n and palavras_processadas[j]["word"].strip().lower() == palavra:
            j += 1

        reps = j - i
        if reps >= min_reps:
            pausa_antes = palavras_processadas[i]["silence_before"]
            blocos.append({
                "palavra":      palavras_processadas[i]["word"].strip(),
                "repeticoes":   reps,
                "pausa_antes":  pausa_antes,
                "inicio":       palavras_processadas[i]["start"],
                "fim":          palavras_processadas[j - 1]["end"],
                "com_bloqueio": pausa_antes >= min_pausa,
            })
            i = j
        else:
            i += 1

    return blocos


def detectar_blocos_silabicos(palavras_processadas: list, min_reps: int = 2) -> list:
    """
    Detecta repetição de sílaba/fragmento antes da palavra completa.
    Ex: 'la la la lago' — fragmento 'la' repetido 3× antes de 'lago'.
    Cobre o caso em que Whisper preserva os fragmentos como palavras separadas.
    """
    blocos = []
    n = len(palavras_processadas)
    i = 0
    while i < n:
        fragm = palavras_processadas[i]["word"].strip().lower()
        # Só considera fragmentos curtos (até 4 caracteres = sílabas)
        if len(fragm) > 4:
            i += 1
            continue

        j = i + 1
        while j < n and palavras_processadas[j]["word"].strip().lower() == fragm:
            j += 1

        reps = j - i
        if reps < min_reps:
            i += 1
            continue

        palavra_alvo = None
        if j < n:
            prox = palavras_processadas[j]["word"].strip().lower()
            # Confirma que a próxima palavra começa com o fragmento e é mais longa
            if len(prox) > len(fragm) and prox.startswith(fragm):
                palavra_alvo = prox

        blocos.append({
            "fragmento":    palavras_processadas[i]["word"].strip(),
            "repeticoes":   reps,
            "palavra_alvo": palavra_alvo,
            "inicio":       palavras_processadas[i]["start"],
            "fim":          palavras_processadas[j - 1]["end"],
            "tipo":         "silabico" if palavra_alvo else "fragmento",
        })
        # Avança além da palavra-alvo também
        i = j + (1 if palavra_alvo else 0)

    return blocos


def detectar_prolongamentos(palavras_processadas: list) -> list:
    """
    Retorna apenas as palavras marcadas como prolongamento com contexto extra.
    Inclui casos em que Whisper colapsa 'la la la lago' e reporta só 'lago'
    com duração anormalmente longa.
    """
    resultado = []
    for p in palavras_processadas:
        if not p.get("is_prolongation"):
            continue
        palavra = p["word"].strip().lower()
        duracao = p["duration"]
        esperado = max(len(palavra) * 0.12, 0.15)
        fator = round(duracao / esperado, 1) if esperado > 0 else 0
        resultado.append({
            "palavra":        p["word"].strip(),
            "inicio":         p["start"],
            "fim":            p["end"],
            "duracao":        duracao,
            "fator_excesso":  fator,
        })
    return resultado


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

    resultado["score"] = round(acertos / total_ref, 4) if total_ref > 0 else 0
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


def calcular_penalidade_temporal(
    palavras_obj: list,
    total_palavras_ref: int,
    duracao_total: float,
    segmentos: list,
) -> dict:
    """
    Detecta disfluências via análise de tempo — independente do que o Whisper transcreveu.

    Retorna um dict com:
      - penalidade_duracao: 0.0–0.4 baseada em quanto a fala foi mais lenta que o esperado
      - penalidade_confianca: 0.0–0.3 baseada em segmentos com baixa confiança
      - palavras_longas: count de palavras com duração > 2.5x o esperado
    """
    # ── Ratio de duração ─────────────────────────────────────────────────────
    # Fala fluente normal: ~400ms por palavra. Se demorou muito mais, havia travamentos.
    duracao_esperada = total_palavras_ref * 0.40
    ratio_duracao    = duracao_total / duracao_esperada if duracao_esperada > 0 else 1.0
    # ratio 1.0 = perfeito; 2.0 = demorou o dobro; penaliza a partir de 1.3
    penalidade_duracao = round(min(max((ratio_duracao - 1.3) * 0.25, 0.0), 0.4), 4)

    # ── Confiança dos segmentos ───────────────────────────────────────────────
    # avg_logprob próximo de 0 = alta confiança; muito negativo = baixa confiança
    # Segmentos com avg_logprob < -0.5 indicam fala pouco clara ou colapsada
    if segmentos:
        logprobs         = [s.get("avg_logprob", 0.0) for s in segmentos]
        media_logprob    = sum(logprobs) / len(logprobs)
        # converte para penalidade: -0.5 → 0.0, -1.5 → 0.3
        penalidade_conf  = round(min(max((-media_logprob - 0.5) * 0.3, 0.0), 0.3), 4)
    else:
        penalidade_conf = 0.0

    # ── Palavras com duração anormal ─────────────────────────────────────────
    palavras_longas = 0
    if palavras_obj:
        for w in palavras_obj:
            palavra    = w["word"].strip().lower()
            duracao_w  = w["end"] - w["start"]
            esperado_w = max(len(palavra) * 0.08, 0.25)  # ~80ms por letra, mínimo 250ms
            if duracao_w > esperado_w * 2.5:
                palavras_longas += 1

    return {
        "penalidade_duracao":  penalidade_duracao,
        "penalidade_confianca": penalidade_conf,
        "palavras_longas":     palavras_longas,
        "ratio_duracao":       round(ratio_duracao, 2),
    }


def get_prob_from_segments(word_start: float, segmentos: list) -> float:
    closest = min(segmentos, key=lambda s: abs(s["start"] - word_start))
    avg_logprob = closest.get("avg_logprob", -1.0)
    return round(max(0.0, min(1.0, math.exp(avg_logprob))), 4)


def carregar_calibracao(usuario_id: str) -> dict | None:
    """Busca o perfil de calibração mais recente do usuário."""
    try:
        supabase = get_connection()
        response = (
            supabase.table("calibracao")
            .select("wpm_base, limite_inferior, limite_superior")
            .eq("usuario_id", usuario_id)
            .order("criado_em", desc=True)
            .limit(1)
            .execute()
        )
        if response.data:
            row = response.data[0]
            return {
                "wpm_base":        row["wpm_base"],
                "limite_inferior": row["limite_inferior"],
                "limite_superior": row["limite_superior"],
            }
    except Exception:
        pass
    return None


def wpm_local(palavras: list, indice: int, janela: int) -> float:
    inicio = max(0, indice - janela // 2)
    fim    = min(len(palavras), indice + janela // 2 + 1)
    trecho = palavras[inicio:fim]

    if len(trecho) < 2:
        return 0.0

    duracao = trecho[-1]["end"] - trecho[0]["start"]
    if duracao <= 0:
        return 0.0

    return round(len(trecho) / (duracao / 60), 2)


def classificar_oscilacao(wpm_loc: float, limite_inf: float, limite_sup: float) -> str:
    if wpm_loc <= 0:
        return "indefinido"
    elif wpm_loc > limite_sup:
        return "acelerado"
    elif wpm_loc < limite_inf:
        return "lento"
    else:
        return "normal"

@router.get("/texto/{fase}")
async def obter_texto_por_fase(fase: int):
    texto = fetch_texto(fase=fase)

    if not texto:
        raise HTTPException(status_code=404, detail="Texto não encontrado para essa fase.")

    return {
        "id": texto["id"],
        "conteudo": texto["conteudo"],
        "dica": texto.get("ex2_dica"),
        "wpm_min": texto.get("ex2_wpm_min"),
        "wpm_max": texto.get("ex2_wpm_max"),
    }

@router.post("/transcrever")
async def transcrever(
    file: UploadFile = File(...),
    texto_referencia: str = Form(default=""),
    usuario_id: str = Form(default=""),
):
    global LAST_TRANSCRIPTION
    texto_alvo = texto_referencia

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
                prompt="eu eu eu fui ao ao mercado comprar pão. Meu meu meu nome é é é Ana. Ah hum então eu eu precisava de de leite."
            )

        texto = resultado.text.strip()
        LAST_TRANSCRIPTION = texto

        segmentos    = [dict(s) for s in (resultado.segments or [])]
        palavras_obj = resultado.words or []
        duracao_total = segmentos[-1]["end"] if segmentos else 0

        if palavras_obj:
            palavras_lista = [w["word"].strip().lower() for w in palavras_obj if w["word"].strip()]
            total_palavras = len(palavras_lista)
            duracao_total  = palavras_obj[-1]["end"]
        else:
            palavras_lista = [p.strip().lower() for p in texto.split() if p.strip()]
            total_palavras = len(palavras_lista)

        wpm = (total_palavras / (duracao_total / 60)) if duracao_total > 0 else 0

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
                            "duracao_pausa":    pausa_previa
                        })

                prob             = get_prob_from_segments(w["start"], segmentos)
                stutter_flag     = False
                palavra_atual    = w["word"].strip().lower()
                palavra_anterior = palavras_obj[i - 1]["word"].strip().lower() if i > 0 else ""

                if pausa_previa >= 2.0:
                    stutter_flag = True
                if 0.0 < prob < 0.5:
                    stutter_flag = True
                if i > 0 and palavra_atual == palavra_anterior:
                    stutter_flag = True

                duracao = round(w["end"] - w["start"], 2)
                # Palavras curtas (sílabas, artigos): limiar menor — bloqueios em "a", "la" aparecem cedo
                if len(palavra_atual) <= 2:
                    limite_tempo = 0.45
                else:
                    limite_tempo = max(len(palavra_atual) * 0.18, 0.50)
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

        # ── Detectar blocos de gaguejo, silábicos e prolongamentos ───────────
        blocos_gaguejo          = detectar_blocos_gaguejo(palavras_processadas) if palavras_obj else []
        blocos_com_bloqueio     = sum(1 for b in blocos_gaguejo if b["com_bloqueio"])
        blocos_silabicos        = detectar_blocos_silabicos(palavras_processadas) if palavras_obj else []
        prolongamentos_lista    = detectar_prolongamentos(palavras_processadas) if palavras_obj else []
        total_prolongamentos    = len(prolongamentos_lista)

        # ── Penalidade temporal (independente do Whisper) ─────────────────────
        total_palavras_ref = len(normalizar(texto_referencia)) if texto_referencia else total_palavras
        temporal = calcular_penalidade_temporal(
            palavras_processadas, total_palavras_ref, duracao_total, segmentos
        )

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
            prompt_fono = f"""
            Você é uma fonoaudióloga coach em um app gamificado, analise esses dados:
            - Palavras por minuto: {round(wpm, 1)}
            - Taxa de repetição (gaguejo): {round(taxa_repeticao * 100, 1)}%
            - Blocos de gaguejo: {len(blocos_gaguejo)} (com bloqueio: {blocos_com_bloqueio})
            - Blocos silábicos (ex: 'la la la lago'): {len(blocos_silabicos)}
            - Prolongamentos (ex: 'Aaaa casa'): {total_prolongamentos}
            - Bloqueios silenciosos: {bloqueios_detectados}
            - Muletas usadas: {muletas_detectadas}
            - Transcrição: "{texto}"
            - Texto esperado: "{texto_alvo}"
            Responda em português brasileiro com no máximo 18 palavras.
            Prioridade: blocos silábicos > prolongamentos > repetições > elogio.
            Exemplo: "Quase lá! Respire antes de cada frase. Você consegue!"
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

        # ── Item 1: marcar repetições diretas como "disfluente" ──────────────
        analise_palavras = []
        for idx, p in enumerate(palavras_processadas):
            palavra_norm = normalizar(p["word"])
            palavra_norm = palavra_norm[0] if len(palavra_norm) > 0 else p["word"].strip().lower()
            status_diff  = lookup.get(palavra_norm, "acerto")

            palavra_atual_raw    = p["word"].strip().lower()
            palavra_anterior_raw = palavras_processadas[idx - 1]["word"].strip().lower() if idx > 0 else ""
            is_repeticao_direta  = (idx > 0 and palavra_atual_raw == palavra_anterior_raw)

            # Verifica se este fragmento faz parte de um bloco silábico
            is_bloco_silabico = any(
                b["inicio"] <= p["start"] <= b["fim"]
                for b in blocos_silabicos
            )

            if is_repeticao_direta or is_bloco_silabico:
                categoria = "disfluente"
            elif p["is_prolongation"]:
                categoria = "prolongamento"
            elif status_diff == "acerto":
                categoria = "correta" if p["probability"] >= 0.5 else "pouco_clara"
            else:
                categoria = "incorreta"

            analise_palavras.append({
                **p,
                "status_diff":        status_diff,
                "categoria":          categoria,
                "repeticao_direta":   is_repeticao_direta,
                "bloco_silabico":     is_bloco_silabico,
            })

        # ── Score penalizado: repetições + blocos + silábicos + prolongamentos + tempo + confiança
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

        taxa_oscilacao = round(oscilacoes_detectadas / total_palavras, 4) if calibracao and total_palavras > 0 else None

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
            "oscilacoes":    oscilacoes_detectadas if calibracao else 0,
            "taxa_oscilacao": taxa_oscilacao if calibracao else 0.0,
            "wpm_base":              calibracao["wpm_base"] if calibracao else None,
            "calibrado":             calibracao is not None,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro no processamento: {str(e)}")

    finally:
        if caminho_audio and os.path.exists(caminho_audio):
            os.remove(caminho_audio)

@router.get("/trava-lingua/{id}")
async def obter_trava_lingua(id: str):
    """
    Retorna uma trava-língua pelo ID.
    Usado pelo exercício 3 quando ex3_som_alvo == 'trava_lingua'.
    O frontend busca o ex3_trava_lingua_id do texto e chama este endpoint.
    """
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
