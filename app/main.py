from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.speech import router as speech_router

app = FastAPI(
    title="Destravar API",
    version="1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(speech_router)

@app.get("/")
def home():
    return {"message": "Backend rodando 🚀"}