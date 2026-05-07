import { API_BASE_URL } from '../constants/config';

export async function fetchRandomQuestion(): Promise<any> {
  try {
    const res = await fetch(`${API_BASE_URL}/textos/aleatorio`, {
      headers: { 'Bypass-Tunnel-Reminder': 'true' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch (err) {
    throw err;
  }
}

export async function transcribeAudio(audioUri: string, modoLivre: boolean, referenceText: string | null, userId: string | null): Promise<any> {
  const form = new FormData();
  form.append('file', { uri: audioUri, type: 'audio/m4a', name: 'rec.m4a' } as any);
  form.append('modo_livre', String(modoLivre));
  if (!modoLivre && referenceText) {
    form.append('texto_referencia', referenceText);
  }
  if (userId) form.append('usuario_id', userId);

  const res = await fetch(`${API_BASE_URL}/transcrever`, {
    method: 'POST',
    headers: { 'Bypass-Tunnel-Reminder': 'true' },
    body: form,
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function startSession(payload: {
  usuario_id: string;
  fase: number;
  exercicio: number;
  tipo: string;
}): Promise<{ sessao_id: string }> {
  const res = await fetch(`${API_BASE_URL}/sessao/iniciar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Bypass-Tunnel-Reminder': 'true' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function completeSession(payload: {
  sessao_id: string;
  aprovado?: boolean;
  wpm_obtido?: number;
  score?: number;
  score_fluencia?: number;
  transcricao_corrigida?: string;
}): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/sessao/completar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Bypass-Tunnel-Reminder': 'true' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}
