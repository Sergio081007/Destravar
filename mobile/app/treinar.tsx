import { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ScrollView } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withSequence, withTiming, Easing, withSpring,
} from 'react-native-reanimated';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { calcularXP } from './utils/calcularXP';
import { addXP, updateStreak, getLevelProgress, incrementLevelProgress, getUserId, getCalibration, loseHeart, getHeartsState } from './utils/storage';
import { API_BASE_URL } from './config';
import ConfirmExitModal from './components/ConfirmExitModal';
import HeartLostModal from './components/HeartLostModal';
import { Colors, Shadow } from './theme';



const LEVEL_LABELS: Record<string, string> = {
  facil: 'Fácil', medio: 'Médio', dificil: 'Difícil',
};

type Modo = 'pergunta' | 'praticar';

type Props = {
  isPanel?: boolean;
  onExit?: () => void;
  onComplete?: () => void;
};

export default function Treinar({ isPanel, onExit, onComplete }: Props) {
  const router = useRouter();
  const navigation = useNavigation();
  const { dificuldade: rawDiff, replay } = useLocalSearchParams<{ dificuldade: string; replay: string }>();
  const dificuldade = (rawDiff as string) || 'facil';
  const isReplay = replay === 'true';

  const [permissionResponse, requestPermission] = Audio.usePermissions();
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionResult, setTranscriptionResult] = useState<any>(null);

  const [textoTreino, setTextoTreino] = useState('Carregando...');
  const [modo, setModo] = useState<Modo>('pergunta');
  const [fraseParaPraticar, setFraseParaPraticar] = useState<string | null>(null);
  const [levelProgress, setLevelProgress] = useState<any>({ nivel1_completos: 0, nivel2_completos: 0, nivel3_completos: 0 });

  const [needsToRecord, setNeedsToRecord] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [calibration, setCalibration] = useState<any>(null);
  const [showExitModal, setShowExitModal] = useState(false);
  const [heartsLeft, setHeartsLeft] = useState<number | null>(null);
  const [showHeartLost, setShowHeartLost] = useState(false);
  const pendingExitAction = useRef<any>(null);
  const skipExitGuard    = useRef(false);
  const questionsAnswered = useRef(0);
  const consecutivePasses = useRef(0);
  const totalAttempts = useRef(0);
  const sessionXpRef      = useRef(0);


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
    getCalibration().then(setCalibration);
    getHeartsState().then(s => setHeartsLeft(s.hearts));
    fetchPergunta();
    requestPermission();
  }, []);

  useEffect(() => {
    if (isPanel) return;
    const unsubscribe = (navigation as any).addListener('beforeRemove', (e: any) => {
      if (skipExitGuard.current) return;
      e.preventDefault();
      pendingExitAction.current = e.data.action;
      setShowExitModal(true);
    });
    return unsubscribe;
  }, [navigation, isPanel]);


  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isRecording) {
      interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else {
      setSeconds(0);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isRecording]);

  // Auto-stop at 60 seconds in pergunta mode
  useEffect(() => {
    if (isRecording && modo === 'pergunta' && seconds >= 60) {
      handleStopPress();
    }
  }, [seconds]);

  const FALLBACKS = [
    "Como foi o seu dia hoje?",
    "Qual é a sua comida favorita e por quê?",
    "O que você gosta de fazer no tempo livre?",
    "Conte sobre um lugar que você gostaria de visitar.",
    "Qual foi o melhor filme ou série que você assistiu recentemente?",
    "Se você pudesse ter um superpoder, qual seria?"
  ];

  const fetchPergunta = async () => {
    setTextoTreino('Carregando pergunta...');
    setTranscriptionResult(null);
    setSeconds(0);
    setNeedsToRecord(false);
    setModo('pergunta');
    setFraseParaPraticar(null);
    try {
      const res = await fetch(`${API_BASE_URL}/pergunta/aleatoria`, {
        headers: { 'Bypass-Tunnel-Reminder': 'true' },
      });
      if (res.ok) {
        const data = await res.json();
        setTextoTreino(data.pergunta || data.conteudo || FALLBACKS[0]);
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch {
      // Rotaciona as perguntas baseado no número de fases que já passou!
      const progressObj = await getLevelProgress();
      const progress = progressObj[dificuldade as keyof typeof progressObj] || 0;
      setTextoTreino(FALLBACKS[progress % FALLBACKS.length]);
    }
  };

  const handlePraticarFrase = (frase: string) => {
    setFraseParaPraticar(frase);
    setTextoTreino(frase);
    setModo('praticar');
    setTranscriptionResult(null);
    setSeconds(0);
    setNeedsToRecord(true);
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

      if (modo === 'pergunta') {
        form.append('pergunta', textoTreino);
      } else {
        form.append('texto_referencia', fraseParaPraticar || textoTreino);
      }
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

        const palavras = data?.analise_palavras || [];
        const taxaFluenciaNum = palavras.length > 0
          ? (palavras.filter((p: any) => p.categoria === 'correta').length / palavras.length) * 100
          : 0;

        const taxaAcerto = modo === 'pergunta'
          ? taxaFluenciaNum
          : (data.score !== undefined ? data.score * 100 : (data.precisao_alvo || 0));

        const minWpm = calibration?.limite_inferior ?? 80;
        const passed = modo !== 'pergunta' || (data.wpm ?? 0) >= minWpm;

        if (passed && !isReplay) {
          const finalXP = calcularXP({
            fluencia: numFluencia,
            taxaAcerto,
            wpm: data.wpm,
            meta: { wpmMin: 130, wpmMax: 160 },
          });
          data.xpGanho = finalXP;
          sessionXpRef.current += finalXP;
          await updateStreak();
        }

        if (modo === 'pergunta' && !passed) {
          const remHearts = await loseHeart();
          setHeartsLeft(remHearts);
          setShowHeartLost(true);
        } else {
          setShowHeartLost(false);
        }

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

  const getLevelCount = (prog: any, d: string) => {
    if (d === 'facil') return prog.nivel1_completos as number;
    if (d === 'medio') return prog.nivel2_completos as number;
    return prog.nivel3_completos as number;
  };

  const handleNext = async () => {
    if (modo === 'praticar' || isReplay) {
      fetchPergunta();
      return;
    }

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
            xp: transcriptionResult.xpGanho ?? 0,
          }),
        });
      } catch (e) {
        console.warn('Erro ao salvar progresso:', e);
      }
    }

    totalAttempts.current += 1;
    if (evalResult?.passed) {
      consecutivePasses.current += 1;
    } else {
      consecutivePasses.current = 0;
    }

    if (consecutivePasses.current >= 2 || totalAttempts.current >= 5) {
      if (sessionXpRef.current > 0) {
        await addXP(sessionXpRef.current);
        sessionXpRef.current = 0;
      }

      if (onComplete) {
        onComplete();
      } else {
        router.replace('/(tabs)');
      }
      return;
    }

    fetchPergunta();
  };

  const getTaxaFluencia = () => {
    const palavras = transcriptionResult?.analise_palavras || [];
    if (palavras.length === 0) return 0;
    const corretas = palavras.filter((p: any) => p.categoria === 'correta').length;
    return (corretas / palavras.length) * 100;
  };

  const formatTime = (total: number) => {
    const m = Math.floor(total / 60).toString().padStart(2, '0');
    const s = (total % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const getLevelNumber = (d: string) => d === 'facil' ? 1 : d === 'medio' ? 2 : 3;
  const getNextLevel = (d: string) => d === 'facil' ? 'medio' : d === 'medio' ? 'dificil' : null;
  const isLevelComplete = (prog: any, d: string) => {
    if (d === 'facil') return prog.nivel1_completos >= 3;
    if (d === 'medio') return prog.nivel2_completos >= 3;
    return prog.nivel3_completos >= 3;
  };

  const getPassed = () => {
    if (!transcriptionResult) return null;
    if (modo === 'praticar') return { passed: true, msg: '' };

    const wpm = transcriptionResult.wpm ?? 0;
    const minWpm = calibration?.limite_inferior ?? 80;
    if (wpm >= minWpm) return { passed: true, msg: '' };
    return {
      passed: false,
      msg: 'Seu ritmo ficou um pouquinho abaixo do ideal. Respire fundo e tente fluir as palavras mais naturalmente.',
    };
  };

  const evalResult = getPassed();

  const handleExit = async () => {
    if (sessionXpRef.current > 0) {
      await addXP(sessionXpRef.current);
      sessionXpRef.current = 0;
    }
    if (isPanel && onExit) {
      onExit();
    } else {
      skipExitGuard.current = true;
      router.replace('/(tabs)');
    }
  };

  return (
    <View style={styles.root}>
      {!isPanel && (
        <View style={styles.standaloneHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.standaloneBackBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.standaloneTitle}>Treinamento Livre</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* Header Padronizado */}
        <View style={styles.headerArea}>
          <Text style={styles.superTitle}>DESAFIO DE RITMO</Text>
          <Text style={styles.title}>Controle de Velocidade</Text>
          <Text style={styles.subtitle}>Fale a resposta da pergunta de forma clara e rítmica.</Text>
        </View>
        {!transcriptionResult && (
          <View style={styles.mascotPreCard}>
            <View style={[styles.mascotIconWrap, { backgroundColor: '#dd962b18' }]}>
              <Ionicons name="lock-open-outline" size={18} color="#845400" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.mascotPreLabel}>DESTRAVAR DIZ:</Text>
              <Text style={styles.mascotPreText}>
                {modo === 'pergunta'
                  ? 'Fale no seu tempo, estou aqui com você!'
                  : 'Tente repetir a frase corrigida com calma!'}
              </Text>
            </View>
          </View>
        )}

        {/* Pergunta / frase card */}
        <View style={styles.phraseCard}>
          <View style={styles.phraseCardTop}>
            <View style={[styles.phraseBadge, { backgroundColor: Colors.primary + '18' }]}>
              <Text style={[styles.phraseBadgeText, { color: Colors.primary }]}>
                {modo === 'pergunta' ? 'PERGUNTA' : 'PARA REPETIR'}
              </Text>
            </View>
            <Text style={styles.phraseCardTitle}>
              {modo === 'pergunta' ? 'Responda em até 1 minuto:' : 'Repita em voz alta:'}
            </Text>
          </View>
          <View style={styles.phraseBox}>
            <Text style={[styles.phraseText, { color: Colors.primary }]}>"{textoTreino}"</Text>
          </View>
          <View style={styles.breathHint}>
            <Ionicons name={modo === 'pergunta' ? 'time-outline' : 'leaf-outline'} size={14} color="#845400" />
            <Text style={styles.breathHintText}>
              {modo === 'pergunta' ? 'Fale livremente, sem se preocupar com erros' : 'Respire antes de começar'}
            </Text>
          </View>
        </View>

        {/* Recording section */}
        {!transcriptionResult && (
          <>
            {isRecording && (
              <View style={styles.timerRow}>
                <Text style={styles.timer}>{formatTime(seconds)}</Text>
                {modo === 'pergunta' && (
                  <Text style={styles.timerLimit}>/ 01:00</Text>
                )}
              </View>
            )}

            <View style={styles.recordingArea}>
              {!isRecording && !isTranscribing && (
                <>
                  <Animated.View style={[styles.ring2, { borderColor: Colors.primary + '60' }, ring2Style]} />
                  <Animated.View style={[styles.ring1, { borderColor: Colors.primary }, ring1Style]} />
                </>
              )}

              {!isTranscribing && (
                <TouchableOpacity
                  style={[
                    styles.micBtn,
                    { backgroundColor: isRecording ? '#dc2626' : Colors.primary, shadowColor: isRecording ? '#dc2626' : Colors.primary },
                  ]}
                  onPress={isRecording ? handleStopPress : handleRecordPress}
                  activeOpacity={0.85}
                >
                  <Ionicons name={isRecording ? 'square' : 'mic'} size={isRecording ? 38 : 44} color="#fff" />
                  <Text style={styles.micBtnLabel}>{isRecording ? 'PARAR' : 'GRAVAR'}</Text>
                </TouchableOpacity>
              )}
            </View>

            {isTranscribing && (
              <Text style={[styles.statusText, { color: Colors.primary }]}>Analisando sua voz... ⏳</Text>
            )}

            {!isRecording && !isTranscribing && (
              <Text style={styles.footerText}>
                {modo === 'pergunta'
                  ? 'Não há resposta certa ou errada. Expresse-se naturalmente!'
                  : 'Sua voz é única e importante. Sinta a vibração em seu peito enquanto fala calmamente.'}
              </Text>
            )}
          </>
        )}

        {/* Result card */}
        {transcriptionResult && (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>
              {modo === 'pergunta' ? 'Análise da Resposta' : 'Resultado da Prática'}
            </Text>

            {transcriptionResult.xpGanho !== undefined && (
              <View style={styles.xpBadge}>
                <Text style={styles.xpText}>⚡ +{transcriptionResult.xpGanho} XP</Text>
              </View>
            )}

            <View style={[styles.metricsRow, { backgroundColor: Colors.primary + '12' }]}>
              <View style={styles.metricItem}>
                <Text style={[styles.metricValue, { color: Colors.primary }]}>{transcriptionResult.wpm}</Text>
                <Text style={styles.metricLabel}>RITMO</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricItem}>
                <Text style={[styles.metricValue, { color: Colors.primary }]}>
                  {modo === 'pergunta'
                    ? `${getTaxaFluencia().toFixed(0)}%`
                    : `${transcriptionResult.score !== undefined
                        ? (transcriptionResult.score * 100).toFixed(0)
                        : (transcriptionResult.precisao_alvo || 0)}%`}
                </Text>
                <Text style={styles.metricLabel}>
                  {modo === 'pergunta' ? 'Fluência' : 'Precisão'}
                </Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricItem}>
                <Text style={[styles.metricValue, { color: Colors.primary }]}>{transcriptionResult.duracao_segundos}s</Text>
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

            {/* Seção 1: O que você disse */}
            {transcriptionResult.analise_palavras?.length > 0 && (
              <View style={[styles.transcriptionBox, { borderLeftColor: Colors.primary, backgroundColor: Colors.primary + '0d' }]}>
                <Text style={[styles.transcriptionTitle, { color: Colors.primary }]}>
                  {modo === 'pergunta' ? 'O que você disse' : 'Sua leitura'}
                </Text>
                <Text style={styles.transcriptionText}>
                  {transcriptionResult.analise_palavras.map((item: any, i: number) => {
                    const color =
                      item.categoria === 'correta'         ? '#16a34a'
                      : item.categoria === 'pouco_clara'   ? '#ca8a04'
                      : item.categoria === 'prolongamento' ? '#ea580c'
                      : item.categoria === 'disfluente'    ? '#9333ea'
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
                    { color: '#16a34a', label: 'Fluente' },
                    { color: '#9333ea', label: 'Gaguejo' },
                    { color: '#ea580c', label: 'Prolongada' },
                    { color: '#dc2626', label: 'Disfluente' },
                  ].map(l => (
                    <View key={l.label} style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: l.color }]} />
                      <Text style={styles.legendText}>{l.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Seção 2: Como ficaria (só no modo pergunta) */}
            {modo === 'pergunta' && transcriptionResult.transcricao_corrigida && (
              <View style={styles.corrigidaBox}>
                <View style={styles.corrigidaHeader}>
                  <Ionicons name="checkmark-circle" size={15} color="#16a34a" />
                  <Text style={styles.corrigidaTitle}>Como ficaria</Text>
                </View>
                <Text style={styles.corrigidaText}>"{transcriptionResult.transcricao_corrigida}"</Text>
                <TouchableOpacity
                  style={[styles.praticarBtn, { backgroundColor: c1 }]}
                  onPress={() => handlePraticarFrase(transcriptionResult.transcricao_corrigida)}
                >
                  <Ionicons name="mic" size={15} color="#fff" />
                  <Text style={styles.praticarBtnText}>Praticar essa frase</Text>
                </TouchableOpacity>
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
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.primary }]} onPress={handleNext}>
                <Text style={styles.actionBtnText}>
                  {modo === 'praticar' ? 'Ótimo! Próxima Pergunta →' : 'Próxima Pergunta →'}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.failBlock}>
                <Text style={styles.failText}>⚠️ {evalResult?.msg}</Text>
                
                {(heartsLeft === null || heartsLeft > 0) ? (
                  <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
                    <Ionicons name="refresh" size={16} color="#ef4444" />
                    <Text style={styles.retryBtnText}>Tentar Novamente</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={[styles.retryBtn, { backgroundColor: '#f3f4f6', borderColor: '#d1d5db' }]} onPress={handleExit}>
                    <Ionicons name="exit-outline" size={16} color="#6b7280" />
                    <Text style={[styles.retryBtnText, { color: '#6b7280' }]}>Sair (Sem vidas)</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {!isPanel && (
        <ConfirmExitModal
          visible={showExitModal}
          onCancel={() => setShowExitModal(false)}
          onConfirm={() => {
            setShowExitModal(false);
            handleExit();
          }}
        />
      )}


      {heartsLeft !== null && (
        <HeartLostModal
          visible={showHeartLost}
          heartsLeft={heartsLeft}
          onClose={() => setShowHeartLost(false)}
          onExit={handleExit}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.surface },
  
  // ── Header Padronizado ──────────────────────────────────────────────
  standaloneHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 54, paddingBottom: 14, paddingHorizontal: 20,
    backgroundColor: Colors.white,
    borderBottomWidth: 1, borderBottomColor: Colors.surfaceVariant,
  },
  standaloneBackBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  standaloneTitle: {
    marginLeft: 16, fontSize: 17, fontWeight: '700', color: Colors.dark,
  },

  headerArea: {
    alignItems: 'center',
    marginBottom: 20,
  },
  superTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.gray,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.dark,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.outline,
    textAlign: 'center',
    lineHeight: 22,
  },

  container: {
    flexGrow: 1, alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 30, paddingBottom: 40,
  },


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

  phraseCard: {
    width: '100%', backgroundColor: Colors.white,
    borderRadius: 20, padding: 20, marginBottom: 20,
    ...Shadow.md,
    gap: 10,
  },
  phraseCardTop: { gap: 6 },
  phraseBadge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  phraseBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  phraseCardTitle: { fontSize: 14, fontWeight: '700', color: '#404751' },
  phraseBox: {
    backgroundColor: Colors.surface, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: Colors.surfaceVariant,
  },
  phraseText: {
    fontSize: 20, fontWeight: '700',
    fontStyle: 'italic', lineHeight: 30, textAlign: 'center',
  },
  breathHint: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
  breathHintText: { fontSize: 12, color: '#845400', fontWeight: '600', fontStyle: 'italic' },


  timerRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 8 },
  timer: {
    fontSize: 44, fontWeight: '300', color: '#181c1e',
    fontFamily: 'monospace', letterSpacing: 2,
  },
  timerLimit: { fontSize: 18, color: '#9ca3af', fontWeight: '400', fontFamily: 'monospace' },

  recordingArea: {
    width: 280, height: 280, alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  ring1: {
    position: 'absolute',
    width: 192, height: 192, borderRadius: 96, borderWidth: 2,
    top: 44, left: 44,
  },
  ring2: {
    position: 'absolute',
    width: 256, height: 256, borderRadius: 128, borderWidth: 1.5,
    top: 12, left: 12,
  },
  micBtn: {
    width: 128, height: 128, borderRadius: 64,
    justifyContent: 'center', alignItems: 'center',
    ...Shadow.lg,
    gap: 4,
  },
  micBtnLabel: { color: '#fff', fontWeight: '800', fontSize: 12, letterSpacing: 0.8 },

  statusText: { fontSize: 14, color: '#0061a2', fontWeight: '600', marginTop: 8 },

  footerText: {
    textAlign: 'center', paddingHorizontal: 16,
    fontSize: 14, color: '#707883', fontWeight: '500', lineHeight: 20,
    marginTop: 4,
  },

  resultCard: {
    width: '100%', backgroundColor: Colors.white, borderRadius: 20,
    padding: 20, marginTop: 8,
    ...Shadow.md,
  },
  resultTitle: { fontSize: 17, fontWeight: '800', color: '#181c1e', textAlign: 'center', marginBottom: 14 },
  xpBadge: {
    alignSelf: 'center', backgroundColor: '#fffbeb',
    borderWidth: 1, borderColor: '#f59e0b',
    borderRadius: 20, paddingVertical: 7, paddingHorizontal: 18, marginBottom: 16,
  },
  xpText: { color: '#b45309', fontWeight: '800', fontSize: 16 },
  metricsRow: {
    flexDirection: 'row', backgroundColor: '#f7fafd',
    borderRadius: 14, padding: 14, marginBottom: 16, alignItems: 'center',
  },
  metricItem: { flex: 1, alignItems: 'center' },
  metricValue: { fontSize: 22, fontWeight: '800', color: '#0061a2' },
  metricLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '600', marginTop: 2 },
  metricDivider: { width: 1, height: 32, backgroundColor: '#e5e7eb' },

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

  transcriptionBox: {
    backgroundColor: '#f7fafd', borderRadius: 14, padding: 14,
    borderLeftWidth: 3, borderLeftColor: '#0061a2', marginBottom: 10, gap: 8,
  },
  transcriptionTitle: { fontSize: 10, fontWeight: '800', color: '#0061a2', textTransform: 'uppercase', letterSpacing: 0.6 },
  transcriptionText: { fontSize: 15, color: '#181c1e', lineHeight: 26 },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, color: '#707883', fontWeight: '600' },

  corrigidaBox: {
    backgroundColor: '#f0fdf4', borderRadius: 14, padding: 14,
    borderLeftWidth: 3, borderLeftColor: '#16a34a', marginBottom: 10, gap: 10,
  },
  corrigidaHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  corrigidaTitle: { fontSize: 10, fontWeight: '800', color: '#16a34a', textTransform: 'uppercase', letterSpacing: 0.6 },
  corrigidaText: { fontSize: 16, color: '#14532d', fontWeight: '600', lineHeight: 24, fontStyle: 'italic' },
  praticarBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 7, paddingVertical: 14, borderRadius: 999,
    ...Shadow.sm,
  },
  praticarBtnText: { color: Colors.white, fontWeight: '700', fontSize: 14 },

  sinaisCard: {
    backgroundColor: '#fef3ee', borderRadius: 12, padding: 12,
    borderLeftWidth: 3, borderLeftColor: '#ea580c', marginBottom: 10, gap: 4,
  },
  sinaisText: { fontSize: 13, color: '#9a3412', fontWeight: '600' },

  actionBtn: {
    paddingVertical: 18, borderRadius: 999, alignItems: 'center',
    ...Shadow.md,
  },
  actionBtnText: { color: Colors.white, fontWeight: '800', fontSize: 16 },
  failBlock: { gap: 10 },
  failText: { color: '#ef4444', fontSize: 13, fontWeight: '700', textAlign: 'center' },
  heartLostContainer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#fef2f2', paddingVertical: 10, borderRadius: 12,
    borderWidth: 1, borderColor: '#fecaca', marginBottom: 2,
  },
  heartLostText: { color: '#dc2626', fontSize: 13, fontWeight: '700' },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 18, borderRadius: 999,
    backgroundColor: '#fef2f2',
    borderWidth: 2, borderColor: '#fca5a5',
  },
  retryBtnText: { color: '#ef4444', fontWeight: '700', fontSize: 15 },


});
