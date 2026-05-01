import { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ScrollView } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withSequence, withTiming, Easing,
} from 'react-native-reanimated';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { calcularXP } from './utils/calcularXP';
import { addXP, updateStreak, getLevelProgress, incrementLevelProgress, getUserId } from './utils/storage';
import { API_BASE_URL } from './config';

const LEVEL_COLORS: Record<string, readonly [string, string]> = {
  facil:   ['#0061a2', '#4da9ff'],
  medio:   ['#10b981', '#34d399'],
  dificil: ['#5e41d0', '#8b5cf6'],
};

const LEVEL_LABELS: Record<string, string> = {
  facil: 'Fácil', medio: 'Médio', dificil: 'Difícil',
};

export default function Treinar() {
  const router = useRouter();
  const { dificuldade: rawDiff } = useLocalSearchParams<{ dificuldade: string }>();
  const dificuldade = (rawDiff as string) || 'facil';
  const [c1, c2] = LEVEL_COLORS[dificuldade] || LEVEL_COLORS.facil;

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
  const [userId, setUserId] = useState<string | null>(null);

  const ring1Scale   = useSharedValue(1.0);
  const ring1Opacity = useSharedValue(0.4);
  const ring2Scale   = useSharedValue(1.0);
  const ring2Opacity = useSharedValue(0.15);

  useEffect(() => {
    ring1Scale.value = withRepeat(
      withSequence(
        withTiming(1.22, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0,  { duration: 900, easing: Easing.inOut(Easing.ease) }),
      ), -1, false,
    );
    ring1Opacity.value = withRepeat(
      withSequence(withTiming(0.15, { duration: 900 }), withTiming(0.45, { duration: 900 })),
      -1, false,
    );
    ring2Scale.value = withRepeat(
      withSequence(
        withTiming(1.42, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0,  { duration: 1400, easing: Easing.inOut(Easing.ease) }),
      ), -1, false,
    );
    ring2Opacity.value = withRepeat(
      withSequence(withTiming(0.05, { duration: 1400 }), withTiming(0.18, { duration: 1400 })),
      -1, false,
    );
  }, []);

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring1Scale.value }], opacity: ring1Opacity.value,
  }));
  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring2Scale.value }], opacity: ring2Opacity.value,
  }));

  useEffect(() => {
    getLevelProgress().then(setLevelProgress);
    getUserId().then(setUserId);
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
      if (userId) form.append('usuario_id', userId);

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
    if (userId && transcriptionResult) {
      try {
        await fetch(`${API_BASE_URL}/progresso/exercicio`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Bypass-Tunnel-Reminder': 'true' },
          body: JSON.stringify({
            usuario_id: userId,
            dificuldade,
            score: transcriptionResult.score ?? 0,
            wpm: transcriptionResult.wpm ?? 0,
          }),
        });
      } catch (e) {
        console.warn('Erro ao salvar progresso:', e);
      }
    }

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
      {/* White header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={c1} />
        </TouchableOpacity>
        <View style={styles.headerMid}>
          <Text style={styles.headerTitle}>Desafio de Voz</Text>
          <View style={[styles.levelBadge, { backgroundColor: c1 + '18' }]}>
            <Text style={[styles.levelBadgeText, { color: c1 }]}>
              ETAPA 2 · {LEVEL_LABELS[dificuldade].toUpperCase()}
            </Text>
          </View>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {completionMessage && (
          <View style={styles.completionBox}>
            <Text style={styles.completionText}>{completionMessage}</Text>
          </View>
        )}

        {/* Mascot card — visible before result */}
        {!transcriptionResult && (
          <View style={styles.mascotPreCard}>
            <View style={[styles.mascotIconWrap, { backgroundColor: '#dd962b18' }]}>
              <Ionicons name="lock-open-outline" size={18} color="#845400" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.mascotPreLabel}>DESTRAVAR DIZ:</Text>
              <Text style={styles.mascotPreText}>
                Fale no seu tempo, estou aqui com você!
              </Text>
            </View>
          </View>
        )}

        {/* Phrase card */}
        <View style={styles.phraseCard}>
          <View style={styles.phraseCardTop}>
            <View style={[styles.phraseBadge, { backgroundColor: c1 + '18' }]}>
              <Text style={[styles.phraseBadgeText, { color: c1 }]}>
                {textoTitulo.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.phraseCardTitle}>Leia em voz alta:</Text>
          </View>
          <View style={styles.phraseBox}>
            <Text style={[styles.phraseText, { color: c1 }]}>"{textoTreino}"</Text>
          </View>
          <View style={styles.breathHint}>
            <Ionicons name="leaf-outline" size={14} color="#845400" />
            <Text style={styles.breathHintText}>Respire antes de começar</Text>
          </View>
        </View>

        {/* Recording section — hidden after result */}
        {!transcriptionResult && (
          <>
            {needsToRecord && !isRecording && (
              <Text style={styles.retryHint}>Tente novamente! 🔄</Text>
            )}

            {isRecording && (
              <Text style={styles.timer}>{formatTime(seconds)}</Text>
            )}

            {/* Recording area 280×280 */}
            <View style={styles.recordingArea}>
              {!isRecording && !isTranscribing && (
                <>
                  <Animated.View style={[styles.ring2, { borderColor: c2 }, ring2Style]} />
                  <Animated.View style={[styles.ring1, { borderColor: c1 }, ring1Style]} />
                </>
              )}

              {!isTranscribing && (
                <TouchableOpacity
                  style={[
                    styles.micBtn,
                    { backgroundColor: isRecording ? '#dc2626' : c1, shadowColor: isRecording ? '#dc2626' : c1 },
                  ]}
                  onPress={isRecording ? handleStopPress : handleRecordPress}
                  activeOpacity={0.85}
                >
                  <Ionicons name={isRecording ? 'square' : 'mic'} size={isRecording ? 38 : 44} color="#fff" />
                  <Text style={styles.micBtnLabel}>{isRecording ? 'PARAR' : 'GRAVAR'}</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Waveform — always visible */}
            <View style={styles.waveformArea}>
              {[4, 7, 10, 14, 10, 7, 4, 7, 11, 14, 10, 7, 4].map((h, i) => (
                <View
                  key={i}
                  style={[
                    styles.waveBar,
                    { height: h, backgroundColor: isRecording ? c1 + '90' : c1 + '30' },
                  ]}
                />
              ))}
            </View>

            {isTranscribing && (
              <Text style={styles.statusText}>Analisando sua voz... ⏳</Text>
            )}

            {!isRecording && !isTranscribing && (
              <Text style={styles.footerText}>
                Sua voz é única e importante. Sinta a vibração em seu peito enquanto fala calmamente.
              </Text>
            )}
          </>
        )}

        {/* Result card */}
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

            {transcriptionResult.feedback_fono && (
              <View style={styles.mascotCard}>
                <View style={styles.mascotIcon}>
                  <Ionicons name="chatbubble-ellipses" size={16} color="#845400" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.mascotLabel}>DESTRAVAR DIZ:</Text>
                  <Text style={styles.mascotText}>{transcriptionResult.feedback_fono}</Text>
                </View>
              </View>
            )}

            {transcriptionResult.analise_palavras?.length > 0 && (
              <View style={styles.transcriptionBox}>
                <Text style={styles.transcriptionTitle}>Sua leitura</Text>
                <Text style={styles.transcriptionText}>
                  {transcriptionResult.analise_palavras.map((item: any, i: number) => {
                    const color =
                      item.categoria === 'correta'        ? '#16a34a'
                      : item.categoria === 'pouco_clara'  ? '#ca8a04'
                      : item.categoria === 'prolongamento'? '#ea580c'
                      : item.categoria === 'disfluente'   ? '#9333ea'
                      : '#dc2626';
                    return (
                      <Text key={i} style={{ color, fontWeight: '700' }}>
                        {item.word}{' '}
                      </Text>
                    );
                  })}
                </Text>
                <View style={styles.legendRow}>
                  {[
                    { color: '#16a34a', label: 'Correta' },
                    { color: '#9333ea', label: 'Gaguejo' },
                    { color: '#ea580c', label: 'Prolongada' },
                    { color: '#dc2626', label: 'Incorreta' },
                  ].map(l => (
                    <View key={l.label} style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: l.color }]} />
                      <Text style={styles.legendText}>{l.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {(transcriptionResult.hesitacoes?.length > 0 || transcriptionResult.prolongamentos?.length > 0) && (
              <View style={styles.sinaisCard}>
                {transcriptionResult.hesitacoes?.length > 0 && (
                  <Text style={styles.sinaisText}>
                    ⏸ {transcriptionResult.hesitacoes.length} pausa(s) longa(s) detectada(s)
                  </Text>
                )}
                {transcriptionResult.prolongamentos?.length > 0 && (
                  <Text style={styles.sinaisText}>
                    〰 {transcriptionResult.prolongamentos.length} prolongamento(s) detectado(s)
                  </Text>
                )}
              </View>
            )}

            {evalResult?.passed ? (
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: c1 }]} onPress={handleNext}>
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
  root: { flex: 1, backgroundColor: '#f7fafd' },

  // ── Header ─────────────────────────────────────────────────────
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 52, paddingBottom: 12, paddingHorizontal: 16,
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 3,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#f7fafd',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 4, elevation: 2,
  },
  headerMid: { flex: 1, alignItems: 'center', gap: 5 },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#181c1e' },
  levelBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  levelBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },

  container: {
    flexGrow: 1, alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40,
  },

  completionBox: {
    width: '100%', backgroundColor: '#d1fae5',
    padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#10b981', marginBottom: 20,
  },
  completionText: { color: '#064e3b', fontSize: 14, fontWeight: '700', textAlign: 'center' },

  // ── Mascot pre-card ────────────────────────────────────────────
  mascotPreCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    width: '100%',
    backgroundColor: '#fffbeb',
    borderRadius: 16, padding: 14, marginBottom: 14,
    borderLeftWidth: 3, borderLeftColor: '#dd962b',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  mascotIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
  },
  mascotPreLabel: { fontSize: 10, fontWeight: '800', color: '#845400', letterSpacing: 0.6, marginBottom: 3 },
  mascotPreText: { fontSize: 13, color: '#404751', fontWeight: '500', lineHeight: 18 },

  // ── Phrase card ────────────────────────────────────────────────
  phraseCard: {
    width: '100%', backgroundColor: '#fff',
    borderRadius: 20, padding: 20, marginBottom: 20,
    shadowColor: '#0061a2', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 4,
    gap: 10,
  },
  phraseCardTop: { gap: 6 },
  phraseBadge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  phraseBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  phraseCardTitle: { fontSize: 14, fontWeight: '700', color: '#404751' },
  phraseBox: {
    backgroundColor: '#f7fafd', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#e5e8eb',
  },
  phraseText: {
    fontSize: 20, fontWeight: '700',
    fontStyle: 'italic', lineHeight: 30, textAlign: 'center',
  },
  breathHint: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
  breathHintText: { fontSize: 12, color: '#845400', fontWeight: '600', fontStyle: 'italic' },

  retryHint: { color: '#f59e0b', fontSize: 14, fontWeight: '700', textAlign: 'center', marginBottom: 8 },

  timer: {
    fontSize: 44, fontWeight: '300', color: '#181c1e',
    fontFamily: 'monospace', marginBottom: 8, letterSpacing: 2,
  },

  // ── Recording area 280×280 ─────────────────────────────────────
  recordingArea: {
    width: 280, height: 280, alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  ring1: {
    position: 'absolute',
    width: 192, height: 192, borderRadius: 96, borderWidth: 2,
    top: 44, left: 44,   // (280 - 192) / 2 = 44
  },
  ring2: {
    position: 'absolute',
    width: 256, height: 256, borderRadius: 128, borderWidth: 1.5,
    top: 12, left: 12,   // (280 - 256) / 2 = 12
  },
  micBtn: {
    width: 128, height: 128, borderRadius: 64,
    justifyContent: 'center', alignItems: 'center',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3, shadowRadius: 20, elevation: 12,
    gap: 4,
  },
  micBtnLabel: { color: '#fff', fontWeight: '800', fontSize: 12, letterSpacing: 0.8 },

  // ── Waveform ───────────────────────────────────────────────────
  waveformArea: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 3, marginBottom: 20, height: 20,
  },
  waveBar: { width: 5, borderRadius: 3 },

  statusText: { fontSize: 14, color: '#5e41d0', fontWeight: '600', marginTop: 8 },

  footerText: {
    textAlign: 'center', paddingHorizontal: 16,
    fontSize: 14, color: '#707883', fontWeight: '500', lineHeight: 20,
    marginTop: 4,
  },

  // ── Result card ────────────────────────────────────────────────
  resultCard: {
    width: '100%', backgroundColor: '#fff', borderRadius: 20,
    padding: 20, marginTop: 8,
    shadowColor: '#5a32b4', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10, shadowRadius: 16, elevation: 5,
  },
  resultTitle: { fontSize: 17, fontWeight: '800', color: '#181c1e', textAlign: 'center', marginBottom: 14 },
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

  // ── Mascot card (result feedback) ─────────────────────────────
  mascotCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fffbeb',
    borderRadius: 14, padding: 12,
    borderLeftWidth: 3, borderLeftColor: '#dd962b',
    marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 5, elevation: 2,
  },
  mascotIcon: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#dd962b20',
    justifyContent: 'center', alignItems: 'center',
  },
  mascotLabel: { fontSize: 9, fontWeight: '800', color: '#845400', letterSpacing: 0.6, marginBottom: 2 },
  mascotText: { fontSize: 13, color: '#404751', fontWeight: '500', lineHeight: 18 },

  // ── Transcription analysis ─────────────────────────────────────
  transcriptionBox: {
    backgroundColor: '#f9f7ff', borderRadius: 14, padding: 14,
    borderLeftWidth: 3, borderLeftColor: '#5e41d0', marginBottom: 10, gap: 8,
  },
  transcriptionTitle: { fontSize: 10, fontWeight: '800', color: '#5e41d0', textTransform: 'uppercase', letterSpacing: 0.6 },
  transcriptionText: { fontSize: 15, color: '#181c1e', lineHeight: 26 },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, color: '#707883', fontWeight: '600' },

  sinaisCard: {
    backgroundColor: '#fef3ee', borderRadius: 12, padding: 12,
    borderLeftWidth: 3, borderLeftColor: '#ea580c', marginBottom: 10, gap: 4,
  },
  sinaisText: { fontSize: 13, color: '#9a3412', fontWeight: '600' },

  actionBtn: {
    paddingVertical: 16, borderRadius: 14, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 6, elevation: 3,
  },
  actionBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  failBlock: { gap: 8 },
  failText: { color: '#ef4444', fontSize: 13, fontWeight: '700', textAlign: 'center' },
});
