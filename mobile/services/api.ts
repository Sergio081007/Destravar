import { API_BASE_URL } from '../constants/config';

export async function fetchRandomQuestion(): Promise<string> {
  try {
    const res = await fetch(`${API_BASE_URL}/pergunta/aleatoria`, {
      headers: { 'Bypass-Tunnel-Reminder': 'true' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.pergunta || data.conteudo;
  } catch (err) {
    throw err;
  }
}

export async function transcribeAudio(audioUri: string, isQuestionMode: boolean, referenceText: string, userId: string | null): Promise<any> {
  const form = new FormData();
  form.append('file', { uri: audioUri, type: 'audio/m4a', name: 'rec.m4a' } as any);

  if (isQuestionMode) {
    form.append('pergunta', referenceText);
  } else {
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

export async function saveExerciseProgress(payload: {
  usuario_id: string;
  dificuldade: string;
  score: number;
  wpm: number;
  xp: number;
}): Promise<void> {
  await fetch(`${API_BASE_URL}/progresso/exercicio`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Bypass-Tunnel-Reminder': 'true' },
    body: JSON.stringify(payload),
  });
}
