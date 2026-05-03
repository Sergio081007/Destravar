from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.speech import router as speech_router
from app.routes.calibracao import router as calibracao_router
from app.routes.usuarios import router as usuarios_router
from app.routes.sessoes import router as sessoes_router
from app.routes import progresso


app = FastAPI(
    title="Destravar API",
    version="1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sessoes_router)
app.include_router(speech_router)
app.include_router(calibracao_router)
app.include_router(usuarios_router)
app.include_router(progresso.router)

@app.get("/")
def home():
    return {"message": "Backend rodando 🚀"}