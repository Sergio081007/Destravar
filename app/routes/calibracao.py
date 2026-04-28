from fastapi import APIRouter, UploadFile, File, Form, HTTPException
import tempfile
import os
from groq import Groq
from app.db.connection import get_connection
from app.db.service import fetch_texto_calibracao

router = APIRouter()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

MARGEM_OSCILACAO = 0.20


def calcular_wpm(palavras_obj: list, duracao_total: float) -> float:
    total = len(palavras_obj) if palavras_obj else 0
    return (total / (duracao_total / 60)) if duracao_total > 0 else 0.0


def transcrever_audio(caminho: str) -> tuple[float, float]:
    with open(caminho, "rb") as f:
        resultado = client.audio.transcriptions.create(
            file=(os.path.basename(caminho), f),
            model="whisper-large-v3-turbo",
            language="pt",
            response_format="verbose_json",
            timestamp_granularities=["segment", "word"],
            temperature=0,
        )

    palavras_obj = resultado.words or []
    segmentos = [dict(s) for s in (resultado.segments or [])]

    if palavras_obj:
        duracao = palavras_obj[-1]["end"]
    elif segmentos:
        duracao = segmentos[-1]["end"]
    else:
        duracao = 0.0

    wpm = calcular_wpm(palavras_obj, duracao)
    return round(wpm, 2), round(duracao, 2)


@router.get("/texto-calibracao")
async def obter_texto_calibracao():
    """
    Retorna o texto de calibração para o frontend exibir ao usuário.
    """
    texto = fetch_texto_calibracao()
    if not texto:
        raise HTTPException(status_code=404, detail="Texto de calibração não encontrado.")
    return texto


@router.post("/calibrar")
async def calibrar(
    usuario_id: str = Form(...),
    audio_rapido: UploadFile = File(...),
    audio_devagar: UploadFile = File(...),
    audio_confortavel: UploadFile = File(...),
    texto_referencia: str = Form(default=""),
):
    """
    Recebe 3 áudios e o texto lido. Calcula WPM e salva o perfil de calibração.
    """
    # Se o frontend não mandar o texto, busca do banco como fallback
    if not texto_referencia.strip():
        texto_cal = fetch_texto_calibracao()
        texto_referencia = texto_cal["conteudo"] if texto_cal else ""

    extensoes_permitidas = {'.flac', '.mp3', '.mp4', '.mpeg', '.mpga', '.m4a', '.ogg', '.opus', '.wav', '.webm'}
    uploads = {
        "rapido":      audio_rapido,
        "devagar":     audio_devagar,
        "confortavel": audio_confortavel,
    }

    resultados: dict[str, dict] = {}
    caminhos_tmp: list[str] = []

    try:
        for modalidade, upload in uploads.items():
            conteudo = await upload.read()
            ext = os.path.splitext(upload.filename)[1].lower() if upload.filename else ".mp3"
            suffix = ext if ext in extensoes_permitidas else ".mp3"

            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                tmp.write(conteudo)
                caminhos_tmp.append(tmp.name)

            wpm, duracao = transcrever_audio(caminhos_tmp[-1])
            resultados[modalidade] = {"wpm": wpm, "duracao_segundos": duracao}

        wpm_rapido      = resultados["rapido"]["wpm"]
        wpm_devagar     = resultados["devagar"]["wpm"]
        wpm_confortavel = resultados["confortavel"]["wpm"]

        wpm_base        = wpm_confortavel
        limite_inferior = round(wpm_base * (1 - MARGEM_OSCILACAO), 2)
        limite_superior = round(wpm_base * (1 + MARGEM_OSCILACAO), 2)

        supabase = get_connection()
        supabase.table("calibracao").insert({
            "usuario_id":       usuario_id,
            "wpm_rapido":       wpm_rapido,
            "wpm_devagar":      wpm_devagar,
            "wpm_confortavel":  wpm_confortavel,
            "wpm_base":         wpm_base,
            "limite_inferior":  limite_inferior,
            "limite_superior":  limite_superior,
            "texto_referencia": texto_referencia,
        }).execute()

        return {
            "status": "calibrado",
            "leituras": resultados,
            "perfil": {
                "wpm_base":          wpm_base,
                "limite_inferior":   limite_inferior,
                "limite_superior":   limite_superior,
                "margem_percentual": MARGEM_OSCILACAO,
            },
            "texto_referencia": texto_referencia,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na calibração: {str(e)}")

    finally:
        for caminho in caminhos_tmp:
            if os.path.exists(caminho):
                os.remove(caminho)


@router.get("/calibracao")
async def obter_calibracao(usuario_id: str):
    """
    Retorna a calibração mais recente do usuário.
    """
    supabase = get_connection()
    response = (
        supabase.table("calibracao")
        .select("*")
        .eq("usuario_id", usuario_id)
        .order("criado_em", desc=True)
        .limit(1)
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=404,
            detail="Nenhuma calibração encontrada para este usuário."
        )

    row = response.data[0]
    return {
        "wpm_rapido":      row["wpm_rapido"],
        "wpm_devagar":     row["wpm_devagar"],
        "wpm_confortavel": row["wpm_confortavel"],
        "wpm_base":        row["wpm_base"],
        "limite_inferior": row["limite_inferior"],
        "limite_superior": row["limite_superior"],
        "criado_em":       row["criado_em"],
    }