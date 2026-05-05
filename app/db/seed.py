import json
import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '../../.env'))

# ── Debug: confirma se as vars estão carregando ───────────────────────────────
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

print("=== CONFIG ===")
print(f"SUPABASE_URL: {'OK → ' + SUPABASE_URL[:30] + '...' if SUPABASE_URL else 'NÃO ENCONTRADO'}")
print(f"SUPABASE_KEY: {'OK (começa com ' + SUPABASE_KEY[:10] + '...)' if SUPABASE_KEY else 'NÃO ENCONTRADO'}")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("\nERRO: Variáveis de ambiente não carregadas.")
    print(f"  .env esperado em: {os.path.abspath(os.path.join(os.path.dirname(__file__), '../../.env'))}")
    print("  Verifique se o arquivo existe nesse caminho.")
    exit(1)

from supabase import create_client

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

JSON_PATH = os.path.join(os.path.dirname(__file__), '../../data/textos/textos-treinamento.json')

print(f"\n=== JSON ===")
print(f"Caminho: {os.path.abspath(JSON_PATH)}")
if not os.path.exists(JSON_PATH):
    print("ERRO: Arquivo JSON não encontrado nesse caminho.")
    exit(1)
print("JSON encontrado OK\n")


def inserir(tabela: str, payload: dict, id_label: str):
    """Tenta inserir um registro e imprime o resultado."""
    try:
        res = supabase.table(tabela).insert(payload).execute()
        if res.data:
            print(f"  [OK] {tabela} → '{id_label}' inserido")
        else:
            print(f"  [VAZIO] {tabela} → '{id_label}' — resposta sem data: {res}")
    except Exception as e:
        print(f"  [ERRO] {tabela} → '{id_label}': {e}")


def seed():
    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    inseridos = 0
    pulados = 0

    # ── Texto de calibração ───────────────────────────────────────────────────
    print("=== CALIBRAÇÃO ===")
    cal = data['calibracao']
    existing = supabase.table("textos_calibracao").select("id").eq("id", cal['id']).execute()
    if existing.data:
        print(f"  [PULADO] '{cal['id']}' já existe")
        pulados += 1
    else:
        inserir("textos_calibracao", {
            "id":                    cal['id'],
            "titulo":                cal.get('titulo'),
            "conteudo":              cal['conteudo'],
            "palavras":              cal.get('palavras'),
            "instrucao_rapido":      cal['instrucoes']['rapido'],
            "instrucao_devagar":     cal['instrucoes']['devagar'],
            "instrucao_confortavel": cal['instrucoes']['confortavel'],
        }, cal['id'])
        inseridos += 1

    # ── Trava-línguas ─────────────────────────────────────────────────────────
    print("\n=== TRAVA-LÍNGUAS ===")
    for tl in data['trava_linguas']:
        existing = supabase.table("trava_linguas").select("id").eq("id", tl['id']).execute()
        if existing.data:
            print(f"  [PULADO] '{tl['id']}' já existe")
            pulados += 1
            continue

        inserir("trava_linguas", {
            "id":          tl['id'],
            "fase_minima": tl.get('fase_minima'),
            "dificuldade": tl.get('dificuldade'),
            "titulo":      tl.get('titulo'),
            "conteudo":    tl['conteudo'],
            "sons_alvo":   tl.get('sons_alvo', []),
            "dica":        tl.get('dica'),
            "repeticoes":  tl.get('repeticoes'),
        }, tl['id'])
        inseridos += 1

    # ── Textos ────────────────────────────────────────────────────────────────
    print("\n=== TEXTOS ===")
    for texto in data['textos']:
        existing = supabase.table("textos").select("id").eq("id", texto['id']).execute()
        if existing.data:
            print(f"  [PULADO] '{texto['id']}' já existe")
            pulados += 1
            continue

        inserir("textos", {
            "id":                  texto['id'],
            "fase":                texto.get('fase'),
            "dificuldade":         texto.get('dificuldade'),
            "titulo":              texto.get('titulo'),
            "ex2_pergunta":        texto.get('ex2_pergunta'),
            "ex2_dica":            texto.get('ex2_dica'),
            "ex3_som_alvo":        texto.get('ex3_som_alvo'),
            "ex3_instrucao":       texto.get('ex3_instrucao'),
            "ex3_exemplo_palavra": texto.get('ex3_exemplo_palavra'),
            "ex3_trava_lingua_id": texto.get('ex3_trava_lingua_id'),
        }, texto['id'])
        inseridos += 1

    print(f"\n=== RESULTADO: {inseridos} inseridos, {pulados} pulados ===")


if __name__ == "__main__":
    seed()