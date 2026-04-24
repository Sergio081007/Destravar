import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'destravar.db')

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_connection() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS calibracao (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 
                -- WPM medido em cada modalidade
                wpm_rapido     REAL NOT NULL,
                wpm_devagar    REAL NOT NULL,
                wpm_confortavel REAL NOT NULL,
 
                -- Velocidade-base usada no treino (= wpm_confortavel)
                wpm_base       REAL NOT NULL,
 
                -- Limites de oscilação calculados automaticamente
                -- Base ± margem (20% por padrão)
                limite_inferior REAL NOT NULL,
                limite_superior REAL NOT NULL,
 
                -- Texto lido na calibração (para referência futura)
                texto_referencia TEXT
            )
        """)
        conn.commit()