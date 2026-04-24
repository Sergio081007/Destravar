from fastapi import APIRouter, UploadFile, File, HTTPException
import tempfile
import os
import math
from groq import Groq
from app.db.connection import get_connection, init_db

router = APIRouter()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# Margem percentual para definir os limites de oscilação
MARGEM_OSCILACAO = 0.20  # ±20% da velocidade-base

TEXTO_REFERENCIA = (
    "O controle de velocidade é considerado uma técnica universal na área de fluência. "
    "Reduzir ligeiramente a velocidade dá ao cérebro o tempo necessário para coordenar "
    "respiração, voz e articulação. O objetivo não é falar devagar, é encontrar uma "
    "velocidade confortável e estável."
)

MODALIDADES = ["rapido", "devagar", "confortavel"]


def calcular_wpm(palavras_obj: list, duracao_total: float) -> float:
    total = len(palavras_obj) if palavras_obj else 0
    return (total / (duracao_total / 60)) if duracao_total > 0 else 0.0


def transcrever_audio(caminho: str) -> tuple[float, float]:
    """
    Transcreve um arquivo de áudio e retorna (wpm, duracao_segundos).
    """
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


@router.on_event("startup")
async def startup():
    init_db()


@router.post("/calibrar")
async def calibrar(
    audio_rapido: UploadFile = File(...),
    audio_devagar: UploadFile = File(...),
    audio_confortavel: UploadFile = File(...),
):
    """
    Recebe 3 áudios do mesmo texto lido em velocidades diferentes.
    Calcula a velocidade-base (confortável) e os limites de oscilação.
    Salva o perfil no banco e retorna o resultado.
    """
    extensoes_permitidas = {'.flac', '.mp3', '.mp4', '.mpeg', '.mpga', '.m4a', '.ogg', '.opus', '.wav', '.webm'}
    uploads = {
        "rapido": audio_rapido,
        "devagar": audio_devagar,
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

        wpm_rapido     = resultados["rapido"]["wpm"]
        wpm_devagar    = resultados["devagar"]["wpm"]
        wpm_confortavel = resultados["confortavel"]["wpm"]

        # Velocidade-base = leitura confortável
        wpm_base = wpm_confortavel
        limite_inferior = round(wpm_base * (1 - MARGEM_OSCILACAO), 2)
        limite_superior = round(wpm_base * (1 + MARGEM_OSCILACAO), 2)

        with get_connection() as conn:
            conn.execute(
                """
                INSERT INTO calibracao
                    (wpm_rapido, wpm_devagar, wpm_confortavel, wpm_base,
                     limite_inferior, limite_superior, texto_referencia)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    wpm_rapido, wpm_devagar, wpm_confortavel, wpm_base,
                    limite_inferior, limite_superior, TEXTO_REFERENCIA,
                ),
            )
            conn.commit()

        return {
            "status": "calibrado",
            "leituras": resultados,
            "perfil": {
                "wpm_base": wpm_base,
                "limite_inferior": limite_inferior,
                "limite_superior": limite_superior,
                "margem_percentual": MARGEM_OSCILACAO,
            },
            "texto_referencia": TEXTO_REFERENCIA,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na calibração: {str(e)}")

    finally:
        for caminho in caminhos_tmp:
            if os.path.exists(caminho):
                os.remove(caminho)


@router.get("/calibracao")
async def obter_calibracao():
    """
    Retorna o perfil de calibração mais recente salvo no banco.
    """
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM calibracao ORDER BY criado_em DESC LIMIT 1"
        ).fetchone()

    if not row:
        raise HTTPException(
            status_code=404,
            detail="Nenhuma calibração encontrada. Faça o onboarding primeiro."
        )

    return {
        "wpm_rapido": row["wpm_rapido"],
        "wpm_devagar": row["wpm_devagar"],
        "wpm_confortavel": row["wpm_confortavel"],
        "wpm_base": row["wpm_base"],
        "limite_inferior": row["limite_inferior"],
        "limite_superior": row["limite_superior"],
        "criado_em": row["criado_em"],
    }