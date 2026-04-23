from fastapi import APIRouter

router = APIRouter()

@router.get("/onboarding")
def get_onboarding():
    """
    Retorna os 3 cards iniciais do app.
    A ideia é guiar o usuário nas técnicas principais de fala.
    """

    return {
        "cards": [
            {
                "id": 1,
                "titulo": "Respiração diafragmática",
                "descricao": "Aprenda a respirar usando o diafragma para ter mais controle da fala.",
                "icone": "lungs",
                "ordem": 1
            },
            {
                "id": 2,
                "titulo": "Controle de velocidade",
                "descricao": "Diminua o ritmo da fala para melhorar a clareza e reduzir erros.",
                "icone": "speedometer",
                "ordem": 2
            },
            {
                "id": 3,
                "titulo": "Suavização articulatória",
                "descricao": "Treine a transição suave entre palavras para evitar travamentos.",
                "icone": "wave",
                "ordem": 3
            }
        ]
    }