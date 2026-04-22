from service import fetch_text

print("=== Teste 1: Gagueira - Fácil ===")
texto = fetch_text("gagueira", "facil")
print(f"Título: {texto['titulo']}")
print(f"Categoria: {texto['categoria']}")
print(f"Conteúdo: {texto['conteudo']}")

print("\n=== Teste 2: Fala Rápida - Médio ===")
texto = fetch_text("fala_rapida", "medio")
print(f"Título: {texto['titulo']}")
print(f"Categoria: {texto['categoria']}")
print(f"Conteúdo: {texto['conteudo']}")

print("\n=== Teste 3: Misto - Difícil ===")
texto = fetch_text("misto", "dificil")
print(f"Título: {texto['titulo']}")
print(f"Categoria: {texto['categoria']}")
print(f"Conteúdo: {texto['conteudo']}")

print("\n=== Teste 4: Randomização sem repetição consecutiva (5x Gagueira - Fácil) ===")
ultimo_id = None
for i in range(5):
    texto = fetch_text("gagueira", "facil", ultimo_id=ultimo_id)
    print(f"  {i+1}. [{texto['id']}] {texto['titulo']}")
    ultimo_id = texto['id']