import { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ScrollView } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { calcularXP } from './utils/calcularXP';
import { addXP, updateStreak, getLevelProgress, incrementLevelProgress } from './utils/storage';
import { API_BASE_URL } from './config';

const LEVEL_COLORS: Record<string, readonly [string, string]> = {
  facil: ['#3b82f6', '#2563eb'],
  medio: ['#10b981', '#059669'],
  dificil: ['#8b5cf6', '#7c3aed'],
};

const LEVEL_LABELS: Record<string, string> = {
  facil: 'Nível 1 — Fácil',
  medio: 'Nível 2 — Médio',
  dificil: 'Nível 3 — Difícil',
};

export default function Treinar() {
  const router = useRouter();
  const { dificuldade: rawDiff } = useLocalSearchParams<{ dificuldade: string }>();
  const dificuldade = (rawDiff as string) || 'facil';

  const [permissionResponse, requestPermission] = Audio.usePermissions();
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionResult, setTranscriptionResult] = useState<any>(null);

  const [textoTreino, setTextoTreino] = useState('Carregando frase...');
  const [textoTitulo, setTextoTitulo] = useState('Frase do Treino');
  const [currentPhraseData, setCurrentPhraseData] = useState<any>(null);
  const [levelProgress, setLevelProgress] = useState<any>({ nivel1_completos: 0, nivel2_completos: 0, nivel3_completos: 0 });
  const [completionMessage, setCompletionMessage] = useState<string | null>(null);
  const [needsToRecord, setNeedsToRecord] = useState(false);

  useEffect(() => {
    getLevelProgress().then(setLevelProgress);
    fetchRandomText(dificuldade);
    requestPermission();
  }, []);

  useEffect(() => {
    if (!completionMessage) return;
    const t = setTimeout(() => setCompletionMessage(null), 5000);
    return () => clearTimeout(t);
  }, [completionMessage]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isRecording) {
      interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else {
      setSeconds(0);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isRecording]);

  const getLevelNumber = (d: string) => d === 'facil' ? 1 : d === 'medio' ? 2 : 3;
  const getNextLevel = (d: string) => d === 'facil' ? 'medio' : d === 'medio' ? 'dificil' : null;
  const isLevelComplete = (prog: any, d: string) => {
    if (d === 'facil') return prog.nivel1_completos >= 3;
    if (d === 'medio') return prog.nivel2_completos >= 3;
    return prog.nivel3_completos >= 3;
  };

  const fetchRandomText = async (diff: string, latestProgress?: any) => {
    const prog = latestProgress || levelProgress;
    setTextoTreino('Carregando frase...');
    setTextoTitulo('Carregando...');
    setCurrentPhraseData(null);
    setTranscriptionResult(null);
    setSeconds(0);
    setNeedsToRecord(false);

    let completed = 0;
    if (diff === 'facil') completed = prog.nivel1_completos || 0;
    else if (diff === 'medio') completed = prog.nivel2_completos || 0;
    else if (diff === 'dificil') completed = prog.nivel3_completos || 0;

    const step = completed % 3;
    let url = `${API_BASE_URL}/textos/aleatorio?dificuldade=${diff}`;
    if (step === 0) url += '&categoria=trava_lingua';
    else if (step === 1) url += '&categoria=texto';
    else url += '&categoria=texto';

    try {
      const res = await fetch(url, { headers: { 'Bypass-Tunnel-Reminder': 'true' } });
      if (res.ok) {
        const data = await res.json();
        setTextoTreino(data.conteudo);
        setTextoTitulo(data.titulo);
        setCurrentPhraseData(data);
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch {
      setTextoTreino('O rato roeu a roupa do rei de Roma.');
      setTextoTitulo('Trava-língua Clássico');
      setCurrentPhraseData({ dificuldade: diff });
    }
  };

  const handleRecordPress = async () => {
    if (isRecording) return;
    try {
      if (permissionResponse?.status !== 'granted') await requestPermission();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: rec } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(rec);
      setIsRecording(true);
      setNeedsToRecord(false);
      setTranscriptionResult(null);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const handleStopPress = async () => {
    if (!isRecording || !recording) return;
    setIsRecording(false);
    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recording.getURI();
      setRecording(null);
      if (uri) await processAudio(uri);
    } catch (err) {
      console.error('Failed to stop recording', err);
    }
  };

  const processAudio = async (audioUri: string) => {
    setIsTranscribing(true);
    try {
      const form = new FormData();
      form.append('file', { uri: audioUri, type: 'audio/m4a', name: 'rec.m4a' } as any);
      form.append('texto_referencia', textoTreino);

      const res = await fetch(`${API_BASE_URL}/transcrever`, {
        method: 'POST',
        headers: { 'Bypass-Tunnel-Reminder': 'true' },
        body: form,
      });

      if (res.ok) {
        const data = await res.json();
        let numFluencia = 40;
        if (data.fluencia === 'rapido') numFluencia = 100;
        else if (data.fluencia === 'normal') numFluencia = 85;
        else if (data.fluencia === 'lento') numFluencia = 65;

        const finalXP = calcularXP({
          fluencia: numFluencia,
          taxaAcerto: data.score !== undefined ? data.score * 100 : (data.precisao_alvo || 0),
          wpm: data.wpm,
          meta: { wpmMin: 130, wpmMax: 160 },
        });
        data.xpGanho = finalXP;
        await addXP(finalXP);
        await updateStreak();
        setTranscriptionResult(data);
      } else {
        console.error('Erro na API:', await res.text());
        alert('Erro na transcrição!');
      }
    } catch (err) {
      console.error('Erro no envio:', err);
      alert('Falha ao comunicar com o servidor.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleRetry = () => {
    setTranscriptionResult(null);
    setSeconds(0);
    setNeedsToRecord(true);
  };

  const handleNext = async () => {
    await incrementLevelProgress(dificuldade);
    const newProgress = await getLevelProgress();
    setLevelProgress(newProgress);

    const nextLevel = getNextLevel(dificuldade);
    const currentComplete = isLevelComplete(newProgress, dificuldade);

    if (currentComplete && nextLevel) {
      setCompletionMessage(`Parabéns! Nível ${getLevelNumber(dificuldade)} concluído. Continue no Nível ${getLevelNumber(nextLevel)}!`);
      router.replace({ pathname: '/treinar', params: { dificuldade: nextLevel } });
    } else if (currentComplete && !nextLevel) {
      setCompletionMessage(`Parabéns! Você concluiu todos os níveis! 🏆`);
      router.replace('/(tabs)');
    } else {
      fetchRandomText(dificuldade, newProgress);
    }
  };

  const formatTime = (total: number) => {
    const m = Math.floor(total / 60).toString().padStart(2, '0');
    const s = (total % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const gradientColors = LEVEL_COLORS[dificuldade] || LEVEL_COLORS.facil;

  const getPassed = () => {
    if (!transcriptionResult) return null;
    const accuracy = transcriptionResult.score !== undefined
      ? transcriptionResult.score * 100
      : (transcriptionResult.precisao_alvo || 0);
    const wpm = transcriptionResult.wpm || 0;
    const hesitacoes = transcriptionResult.hesitacoes?.length || 0;

    if (dificuldade === 'facil') {
      if (accuracy >= 80 && wpm >= 100 && wpm <= 150) return { passed: true, msg: '' };
      return { passed: false, msg: accuracy < 80 ? 'Você precisa de 80% de precisão.' : `Ritmo (${wpm} WPM) fora do ideal (100–150).` };
    }
    if (dificuldade === 'medio') {
      if (accuracy >= 85 && hesitacoes === 0) return { passed: true, msg: '' };
      return { passed: false, msg: accuracy < 85 ? 'Você precisa de 85% de precisão.' : 'Tente sem pausas ou hesitações.' };
    }
    if (accuracy >= 90) return { passed: true, msg: '' };
    return { passed: false, msg: 'No nível difícil, você precisa de 90% de precisão!' };
  };

  const evalResult = getPassed();

  return (
    <View style={styles.root}>
      <LinearGradient colors={gradientColors} style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.levelLabel}>{LEVEL_LABELS[dificuldade]}</Text>
        <View style={{ width: 38 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {completionMessage && (
          <View style={styles.completionBox}>
            <Text style={styles.completionText}>{completionMessage}</Text>
          </View>
        )}

        <Text style={styles.timer}>{formatTime(seconds)}</Text>

        <Text style={styles.phraseLabel}>{textoTitulo.toUpperCase()}</Text>
        <Text style={styles.phraseText}>"{textoTreino}"</Text>

        {needsToRecord && !isRecording && (
          <Text style={styles.retryHint}>👇 Aperte para tentar de novo!</Text>
        )}

        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.micBtn, isRecording && styles.micBtnActive, needsToRecord && !isRecording && styles.micBtnRetry]}
            onPress={handleRecordPress}
            disabled={isRecording}
          >
            <Ionicons name="mic" size={36} color={isRecording ? '#fca5a5' : '#fff'} />
          </TouchableOpacity>

          {isRecording && (
            <TouchableOpacity style={styles.stopBtn} onPress={handleStopPress}>
              <Ionicons name="square" size={26} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        {isTranscribing && (
          <Text style={styles.statusText}>Transcrevendo... ⏳</Text>
        )}

        {transcriptionResult && (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Resultado da Análise</Text>

            {transcriptionResult.xpGanho !== undefined && (
              <View style={styles.xpBadge}>
                <Text style={styles.xpText}>⚡ +{transcriptionResult.xpGanho} XP</Text>
              </View>
            )}

            <View style={styles.metricsRow}>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{transcriptionResult.wpm}</Text>
                <Text style={styles.metricLabel}>WPM</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>
                  {transcriptionResult.score !== undefined
                    ? (transcriptionResult.score * 100).toFixed(0)
                    : (transcriptionResult.precisao_alvo || 0)}%
                </Text>
                <Text style={styles.metricLabel}>Precisão</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{transcriptionResult.duracao_segundos}s</Text>
                <Text style={styles.metricLabel}>Duração</Text>
              </View>
            </View>

            {transcriptionResult.analise_palavras?.length > 0 && (
              <View style={styles.transcriptionBox}>
                <Text style={styles.transcriptionTitle}>Sua leitura</Text>
                <Text style={styles.transcriptionText}>
                  {transcriptionResult.analise_palavras.map((item: any, i: number) => {
                    const color =
                      item.categoria === 'correta' ? '#16a34a'
                      : item.categoria === 'pouco_clara' ? '#ca8a04'
                      : '#dc2626';
                    return (
                      <Text key={i} style={{ color, fontWeight: item.categoria === 'correta' ? '600' : 'bold' }}>
                        {item.word}{' '}
                      </Text>
                    );
                  })}
                </Text>
              </View>
            )}

            {transcriptionResult.hesitacoes?.length > 0 && (
              <Text style={styles.hesitacoesText}>
                {transcriptionResult.hesitacoes.length} pausa(s) detectada(s)
              </Text>
            )}

            <View style={styles.feedbackBox}>
              <Text style={styles.feedbackTitle}>🧠 Feedback</Text>
              <Text style={styles.feedbackText}>{transcriptionResult.feedback_fono}</Text>
            </View>

            {evalResult?.passed ? (
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: gradientColors[0] }]} onPress={handleNext}>
                <Text style={styles.actionBtnText}>Próxima Frase →</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.failBlock}>
                <Text style={styles.failText}>⚠️ {evalResult?.msg}</Text>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#f59e0b' }]} onPress={handleRetry}>
                  <Text style={styles.actionBtnText}>Tentar Novamente 🔄</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fafafa' },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 52, paddingBottom: 16, paddingHorizontal: 16,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  levelLabel: { color: '#fff', fontWeight: '700', fontSize: 15 },
  container: {
    flexGrow: 1, alignItems: 'center',
    paddingHorizontal: 24, paddingTop: 32, paddingBottom: 40,
  },
  completionBox: {
    width: '100%', backgroundColor: '#d1fae5',
    padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#10b981', marginBottom: 20,
  },
  completionText: { color: '#064e3b', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  timer: {
    fontSize: 52, fontWeight: '300', color: '#1a1a2e',
    fontFamily: 'monospace', marginBottom: 32,
    letterSpacing: 2,
  },
  phraseLabel: { fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8 },
  phraseText: {
    fontSize: 24, fontWeight: '700', color: '#1a1a2e',
    fontStyle: 'italic', textAlign: 'center', lineHeight: 34,
    marginBottom: 32, paddingHorizontal: 8,
  },
  retryHint: { color: '#f59e0b', fontSize: 15, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 28, marginBottom: 16 },
  micBtn: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#7c3aed',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 10,
  },
  micBtnActive: { backgroundColor: '#fca5a5', shadowColor: '#ef4444', transform: [{ scale: 0.95 }] },
  micBtnRetry: { backgroundColor: '#f59e0b', shadowColor: '#f59e0b' },
  stopBtn: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#374151',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2, shadowRadius: 6, elevation: 5,
  },
  statusText: { fontSize: 15, color: '#7c3aed', fontWeight: '600', marginTop: 12 },
  resultCard: {
    width: '100%', backgroundColor: '#fff', borderRadius: 20,
    padding: 20, marginTop: 24,
    shadowColor: '#5a32b4', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10, shadowRadius: 16, elevation: 5,
  },
  resultTitle: { fontSize: 17, fontWeight: '800', color: '#1a1a2e', textAlign: 'center', marginBottom: 14 },
  xpBadge: {
    alignSelf: 'center', backgroundColor: '#fffbeb',
    borderWidth: 1, borderColor: '#f59e0b',
    borderRadius: 20, paddingVertical: 7, paddingHorizontal: 18, marginBottom: 16,
  },
  xpText: { color: '#b45309', fontWeight: '800', fontSize: 16 },
  metricsRow: {
    flexDirection: 'row', backgroundColor: '#f8f7ff',
    borderRadius: 14, padding: 14, marginBottom: 16, alignItems: 'center',
  },
  metricItem: { flex: 1, alignItems: 'center' },
  metricValue: { fontSize: 22, fontWeight: '800', color: '#7c3aed' },
  metricLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '600', marginTop: 2 },
  metricDivider: { width: 1, height: 32, backgroundColor: '#e5e7eb' },
  transcriptionBox: {
    backgroundColor: '#f9f7ff', borderRadius: 12, padding: 14,
    borderLeftWidth: 3, borderLeftColor: '#7c3aed', marginBottom: 12,
  },
  transcriptionTitle: { fontSize: 11, fontWeight: '700', color: '#7c3aed', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  transcriptionText: { fontSize: 15, color: '#374151', lineHeight: 24 },
  hesitacoesText: { color: '#4b5563', fontStyle: 'italic', fontSize: 13, marginBottom: 10 },
  feedbackBox: {
    backgroundColor: '#ecfeff', borderRadius: 12, padding: 14,
    borderLeftWidth: 3, borderLeftColor: '#06b6d4', marginBottom: 16,
  },
  feedbackTitle: { fontSize: 13, fontWeight: '700', color: '#0891b2', marginBottom: 6 },
  feedbackText: { fontSize: 14, color: '#164e63', lineHeight: 20 },
  actionBtn: {
    paddingVertical: 16, borderRadius: 14, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 6, elevation: 3,
  },
  actionBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  failBlock: { gap: 8 },
  failText: { color: '#ef4444', fontSize: 13, fontWeight: '700', textAlign: 'center' },
});
