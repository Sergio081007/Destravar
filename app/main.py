from fastapi import FastAPI
from app.routes.speech import router as speech_router

app = FastAPI(
    title="Destravar API",
    version="1.0"
)

app.include_router(speech_router)

@app.get("/")
def home():
    return {"message": "Backend rodando 🚀"}