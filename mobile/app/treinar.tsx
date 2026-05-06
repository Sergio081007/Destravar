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
import { addXP, updateStreak, getLevelProgress, incrementLevelProgress, getUserId, getCalibration, loseHeart } from './utils/storage';
import { API_BASE_URL } from './config';
import ConfirmExitModal from './components/ConfirmExitModal';

const LEVEL_COLORS: Record<string, readonly [string, string]> = {
  facil:   ['#0061a2', '#4da9ff'],
  medio:   ['#10b981', '#34d399'],
  dificil: ['#5e41d0', '#8b5cf6'],
};

const LEVEL_LABELS: Record<string, string> = {
  facil: 'Fácil', medio: 'Médio', dificil: 'Difícil',
};

type Modo = 'pergunta' | 'praticar';

type Props = {
  isPanel?: boolean;  // quando true: sem header próprio, sem beforeRemove listener
  onExit?: () => void; // chamado em lugar de router.replace quando isPanel=true
};

export default function Treinar({ isPanel, onExit }: Props) {
  const router = useRouter();
  const navigation = useNavigation();
  const { dificuldade: rawDiff, replay } = useLocalSearchParams<{ dificuldade: string; replay: string }>();
  const dificuldade = (rawDiff as string) || 'facil';
  const isReplay = replay === 'true';
  const [c1, c2] = LEVEL_COLORS[dificuldade] || LEVEL_COLORS.facil;

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
  const [phaseComplete, setPhaseComplete] = useState<{
    levelNum: number; sessionNum: number; levelComplete: boolean; allDone: boolean;
  } | null>(null);
  const [needsToRecord, setNeedsToRecord] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [calibration, setCalibration] = useState<any>(null);
  const [showExitModal, setShowExitModal] = useState(false);
  const pendingExitAction = useRef<any>(null);
  const skipExitGuard    = useRef(false);
  const questionsAnswered = useRef(0);
  const sessionXpRef      = useRef(0);

  const overlayOpacity = useSharedValue(0);
  const cardScale      = useSharedValue(0.75);

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
  const overlayAnimStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));
  const cardAnimStyle    = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
    opacity: overlayOpacity.value,
  }));

  useEffect(() => {
    getLevelProgress().then(setLevelProgress);
    getUserId().then(setUserId);
    getCalibration().then(setCalibration);
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
    if (!phaseComplete) return;
    overlayOpacity.value = withTiming(1, { duration: 280 });
    cardScale.value      = withSpring(1, { damping: 14, stiffness: 180 });
  }, [phaseComplete]);

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
        setTextoTreino(data.pergunta || data.conteudo || 'Como foi o seu dia?');
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch {
      setTextoTreino('Como foi o seu dia hoje?');
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

        if (modo === 'pergunta' && !passed) await loseHeart();

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

    questionsAnswered.current += 1;

    if (questionsAnswered.current < 3) {
      fetchPergunta();
      return;
    }

    // All 3 questions done — commit XP and complete this session
    if (sessionXpRef.current > 0) await addXP(sessionXpRef.current);
    await incrementLevelProgress(dificuldade);
    const newProgress = await getLevelProgress();
    setLevelProgress(newProgress);

    const levelComplete = isLevelComplete(newProgress, dificuldade);
    const nextLevel     = getNextLevel(dificuldade);
    const sessionNum    = getLevelCount(newProgress, dificuldade);

    setPhaseComplete({
      levelNum: getLevelNumber(dificuldade),
      sessionNum,
      levelComplete,
      allDone: levelComplete && !nextLevel,
    });
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
      msg: `Tente falar um pouco mais rápido! Seu ritmo: ${wpm} wpm (mínimo: ${minWpm} wpm)`,
    };
  };

  const evalResult = getPassed();

  const handleExit = () => {
    if (isPanel && onExit) {
      onExit();
    } else {
      skipExitGuard.current = true;
      router.replace('/(tabs)');
    }
  };

  return (
    <View style={styles.root}>
      {/* Header e indicador de etapas — ocultados quando renderizado como painel */}
      {!isPanel && (
        <>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => modo === 'praticar' ? fetchPergunta() : router.back()}
              style={styles.backBtn}
            >
              <Ionicons name="arrow-back" size={22} color={c1} />
            </TouchableOpacity>
            <View style={styles.headerMid}>
              <Text style={styles.headerTitle}>
                {modo === 'pergunta' ? 'Resposta Livre' : 'Pratique a Frase'}
              </Text>
              <View style={[styles.levelBadge, { backgroundColor: c1 + '18' }]}>
                <Text style={[styles.levelBadgeText, { color: c1 }]}>
                  ETAPA 2 · {LEVEL_LABELS[dificuldade].toUpperCase()}
                </Text>
              </View>
            </View>
            <View style={{ width: 38 }} />
          </View>

          <View style={styles.stepRow}>
            <View style={styles.stepItem}>
              <View style={[styles.stepCircle, { backgroundColor: '#16a34a' }]}>
                <Ionicons name="checkmark" size={13} color="#fff" />
              </View>
              <Text style={[styles.stepLabel, { color: '#16a34a' }]}>Respiração</Text>
            </View>
            <View style={styles.stepLine} />
            <View style={styles.stepItem}>
              <View style={[styles.stepCircle, { backgroundColor: c1 }]}>
                <Text style={styles.stepNum}>2</Text>
              </View>
              <Text style={[styles.stepLabel, { color: c1 }]}>Exercício</Text>
            </View>
          </View>
        </>
      )}

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
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
            <View style={[styles.phraseBadge, { backgroundColor: c1 + '18' }]}>
              <Text style={[styles.phraseBadgeText, { color: c1 }]}>
                {modo === 'pergunta' ? 'PERGUNTA' : 'PARA REPETIR'}
              </Text>
            </View>
            <Text style={styles.phraseCardTitle}>
              {modo === 'pergunta' ? 'Responda em até 1 minuto:' : 'Repita em voz alta:'}
            </Text>
          </View>
          <View style={styles.phraseBox}>
            <Text style={[styles.phraseText, { color: c1 }]}>"{textoTreino}"</Text>
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

            {isTranscribing && (
              <Text style={[styles.statusText, { color: c1 }]}>Analisando sua voz... ⏳</Text>
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

            <View style={[styles.metricsRow, { backgroundColor: c1 + '12' }]}>
              <View style={styles.metricItem}>
                <Text style={[styles.metricValue, { color: c1 }]}>{transcriptionResult.wpm}</Text>
                <Text style={styles.metricLabel}>WPM</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricItem}>
                <Text style={[styles.metricValue, { color: c1 }]}>
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
                <Text style={[styles.metricValue, { color: c1 }]}>{transcriptionResult.duracao_segundos}s</Text>
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
              <View style={[styles.transcriptionBox, { borderLeftColor: c1, backgroundColor: c1 + '0d' }]}>
                <Text style={[styles.transcriptionTitle, { color: c1 }]}>
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
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: c1 }]} onPress={handleNext}>
                <Text style={styles.actionBtnText}>
                  {modo === 'praticar' ? 'Ótimo! Próxima Pergunta →' : 'Próxima Pergunta →'}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.failBlock}>
                <Text style={styles.failText}>⚠️ {evalResult?.msg}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
                  <Ionicons name="refresh" size={16} color="#b45309" />
                  <Text style={styles.retryBtnText}>Tentar Novamente</Text>
                </TouchableOpacity>
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

      {phaseComplete && (
        <Animated.View style={[styles.completionOverlay, overlayAnimStyle]}>
          <Animated.View style={[styles.completionCard, cardAnimStyle]}>
            <View style={[styles.completionIconRing, { borderColor: c1 + '40' }]}>
              <View style={[styles.completionIconCircle, { backgroundColor: c1 + '18' }]}>
                <Ionicons
                  name={phaseComplete.levelComplete ? 'trophy' : 'checkmark-circle'}
                  size={40}
                  color={c1}
                />
              </View>
            </View>

            <Text style={styles.completionTitle}>
              {phaseComplete.allDone
                ? 'Todos os níveis\nconcluídos!'
                : phaseComplete.levelComplete
                  ? `Nível ${phaseComplete.levelNum}\nconcluído!`
                  : `Sessão ${phaseComplete.sessionNum} de 3\nconcluída!`}
            </Text>
            <Text style={styles.completionSub}>
              {phaseComplete.allDone
                ? 'Você completou toda a jornada. Incrível!'
                : phaseComplete.levelComplete
                  ? 'Excelente trabalho! Pronto para o próximo desafio?'
                  : 'Boa prática! Continue treinando para avançar no mapa.'}
            </Text>

            {phaseComplete.levelComplete && (
              <View style={styles.completionStars}>
                {[0, 1, 2].map(i => (
                  <Ionicons key={i} name="star" size={22} color="#f59e0b" />
                ))}
              </View>
            )}

            <TouchableOpacity
              style={[styles.completionBtn, { backgroundColor: c1 }]}
              onPress={handleExit}
              activeOpacity={0.85}
            >
              <Text style={styles.completionBtnText}>
                {phaseComplete.levelComplete ? 'Ver desafios →' : 'Ver mapa →'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f7fafd' },

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

  stepRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, paddingHorizontal: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f0f2f4',
  },
  stepItem: { alignItems: 'center', gap: 4 },
  stepCircle: {
    width: 26, height: 26, borderRadius: 13,
    justifyContent: 'center', alignItems: 'center',
  },
  stepNum: { fontSize: 12, fontWeight: '800', color: '#fff' },
  stepLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },
  stepLine: { flex: 1, height: 2, backgroundColor: '#e5e8eb', marginHorizontal: 10, marginBottom: 14 },

  container: {
    flexGrow: 1, alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40,
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
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3, shadowRadius: 20, elevation: 12,
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
    width: '100%', backgroundColor: '#fff', borderRadius: 20,
    padding: 20, marginTop: 8,
    shadowColor: '#0061a2', shadowOffset: { width: 0, height: 4 },
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
    gap: 7, paddingVertical: 12, borderRadius: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10, shadowRadius: 4, elevation: 2,
  },
  praticarBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

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
  failBlock: { gap: 10 },
  failText: { color: '#ef4444', fontSize: 13, fontWeight: '700', textAlign: 'center' },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 14,
    backgroundColor: '#fffbeb',
    borderWidth: 1.5, borderColor: '#f59e0b',
  },
  retryBtnText: { color: '#b45309', fontWeight: '700', fontSize: 15 },

  completionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 28, zIndex: 100,
  },
  completionCard: {
    width: '100%', backgroundColor: '#fff',
    borderRadius: 28, padding: 32,
    alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.25, shadowRadius: 32, elevation: 20,
  },
  completionIconRing: {
    width: 104, height: 104, borderRadius: 52,
    borderWidth: 2, justifyContent: 'center', alignItems: 'center',
    marginBottom: 4,
  },
  completionIconCircle: {
    width: 84, height: 84, borderRadius: 42,
    justifyContent: 'center', alignItems: 'center',
  },
  completionTitle: {
    fontSize: 26, fontWeight: '800', color: '#181c1e',
    textAlign: 'center', letterSpacing: -0.4, lineHeight: 32,
  },
  completionSub: {
    fontSize: 14, color: '#707883', textAlign: 'center',
    lineHeight: 20, fontWeight: '500',
  },
  completionStars: { flexDirection: 'row', gap: 6, marginVertical: 4 },
  completionBtn: {
    width: '100%', paddingVertical: 16,
    borderRadius: 999, alignItems: 'center', marginTop: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 10, elevation: 6,
  },
  completionBtnText: { color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 0.2 },
});
