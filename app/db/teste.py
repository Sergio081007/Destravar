from service import fetch_text, fetch_trava_lingua

# Busca texto por perfil + dificuldade
texto = fetch_text(perfil='gagueira', dificuldade='facil')
print("Texto:", texto)

# Busca texto filtrando por fase
texto_fase = fetch_text(perfil='gagueira', dificuldade='facil', fase=1)
print("Texto fase 1:", texto_fase)

# Busca trava-língua por ID específico
tl = fetch_trava_lingua(trava_lingua_id='tl_002')
print("Trava-língua:", tl)

# Busca trava-língua aleatório disponível a partir da fase 7
tl_aleatorio = fetch_trava_lingua(dificuldade='facil', fase_atual=7)
print("Trava-língua aleatório:", tl_aleatorio)