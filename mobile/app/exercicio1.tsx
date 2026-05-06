import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import ConfirmExitModal from './components/ConfirmExitModal';

// Fases: dur em ms, toRadius em px, colorIdx mapeia para PHASE_COLORS
const PHASES = [
  { label: 'Inspire', sub: 'Encha os pulmões devagar', dur: 4000, toRadius: 89, colorIdx: 0 },
  { label: 'Segure',  sub: 'Mantenha o ar',            dur: 2000, toRadius: 89, colorIdx: 1 },
  { label: 'Solte',   sub: 'Libere devagar',           dur: 4000, toRadius: 80,  colorIdx: 2 },
];

// Cores por fase (circle, glow interno, glow externo)
const PHASE_COLORS = [
  { circle: '#818cf8', g1: 'rgba(129,140,248,0.22)', g2: 'rgba(129,140,248,0.10)' }, // inspire: índigo
  { circle: '#c084fc', g1: 'rgba(192,132,252,0.22)', g2: 'rgba(192,132,252,0.10)' }, // segure: lilás
  { circle: '#34d399', g1: 'rgba(52,211,153,0.22)',  g2: 'rgba(52,211,153,0.10)'  }, // solte: verde-azul
];

const LEVEL_LABELS: Record<string, string> = {
  facil: 'Fácil', medio: 'Médio', dificil: 'Difícil',
};



type Props = {
  onComplete?: () => void;
  isPanel?: boolean;  // quando true: sem header próprio, sem beforeRemove listener
};

export default function BreathingExercise({ onComplete, isPanel }: Props) {
  const router = useRouter();
  const navigation = useNavigation();
  const { dificuldade: rawDiff } = useLocalSearchParams<{ dificuldade: string }>();
  const dificuldade = rawDiff || 'facil';
  const c1 = '#0061a2';

  const [phaseIdx, setPhaseIdx]             = useState(-1);   // -1 = idle
  const [timeLeft, setTimeLeft]             = useState(4);
  const [cycle, setCycle]                   = useState(1);
  const [completedCycles, setCompletedCycles] = useState(0);
  const [running, setRunning]               = useState(false);
  const [done, setDone]                     = useState(false);
  const [showExitModal, setShowExitModal]   = useState(false);
  const pendingExitAction                   = useRef<any>(null);

  // Timing — controlado 100% por setTimeout + Date.now()
  const phaseTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const completedRef   = useRef(0);

  // Animações — React Native Animated (sem Reanimated)
  const circleRadius = useRef(new Animated.Value(80)).current;
  const colorPhase   = useRef(new Animated.Value(0)).current;

  // Interpolações de cor por fase (0→1→2)
  const circleColor = colorPhase.interpolate({
    inputRange:  [0, 1, 2],
    outputRange: PHASE_COLORS.map(p => p.circle),
  });
  const glow1Color = colorPhase.interpolate({
    inputRange:  [0, 1, 2],
    outputRange: PHASE_COLORS.map(p => p.g1),
  });
  const glow2Color = colorPhase.interpolate({
    inputRange:  [0, 1, 2],
    outputRange: PHASE_COLORS.map(p => p.g2),
  });

  // Tamanhos animados derivados do raio
  const circleSize = Animated.multiply(circleRadius, 2);
  const glow1Size  = Animated.multiply(circleRadius, 3.2);
  const glow1BR    = Animated.multiply(circleRadius, 1.6);
  const glow2Size  = Animated.multiply(circleRadius, 4.6);
  const glow2BR    = Animated.multiply(circleRadius, 2.3);

  useEffect(() => () => clearTimers(), []);

  useEffect(() => {
    if (isPanel) return;
    const unsubscribe = (navigation as any).addListener('beforeRemove', (e: any) => {
      if (!running && !done) return;
      e.preventDefault();
      pendingExitAction.current = e.data.action;
      setShowExitModal(true);
    });
    return unsubscribe;
  }, [navigation, running, done, isPanel]);

  function clearTimers() {
    if (phaseTimerRef.current)  { clearTimeout(phaseTimerRef.current);   phaseTimerRef.current = null; }
    if (countdownRef.current)   { clearInterval(countdownRef.current);   countdownRef.current = null; }
  }

  function startPhase(pIdx: number, cNum: number) {
    // Fim de um ciclo completo
    if (pIdx >= PHASES.length) {
      completedRef.current += 1;
      setCompletedCycles(completedRef.current);
      if (completedRef.current >= 3) {
        handleComplete();
        return;
      }
      startPhase(0, cNum + 1);
      return;
    }

    const phase = PHASES[pIdx];
    setPhaseIdx(pIdx);
    setCycle(cNum);

    // Anima o círculo (puramente visual — não controla o tempo)
    Animated.timing(circleRadius, {
      toValue:        phase.toRadius,
      duration:       phase.dur,
      easing:         Easing.linear,
      useNativeDriver: false,
    }).start();

    // Transição de cor suave ao mudar de fase
    Animated.timing(colorPhase, {
      toValue:        phase.colorIdx,
      duration:       400,
      easing:         Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();

    // Contagem regressiva precisa com Date.now() para evitar drift
    const startTime = Date.now();
    if (countdownRef.current) clearInterval(countdownRef.current);
    setTimeLeft(Math.ceil(phase.dur / 1000));
    countdownRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((phase.dur - (Date.now() - startTime)) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(countdownRef.current!);
        countdownRef.current = null;
      }
    }, 200);

    // Avanço de fase exclusivamente via setTimeout
    if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current);
    phaseTimerRef.current = setTimeout(() => {
      phaseTimerRef.current = null;
      startPhase(pIdx + 1, cNum);
    }, phase.dur);
  }

  function handleStart() {
    clearTimers();
    circleRadius.setValue(80);
    colorPhase.setValue(0);
    completedRef.current = 0;
    setCompletedCycles(0);
    setRunning(true);
    setDone(false);
    startPhase(0, 1);
  }

  function handleComplete() {
    clearTimers();
    Animated.timing(circleRadius, {
      toValue: 80, duration: 800,
      easing: Easing.out(Easing.ease), useNativeDriver: false,
    }).start();
    setRunning(false);
    setDone(true);
  }

  function goToNextExercise() {
    if (onComplete) {
      onComplete();
    } else {
      router.replace({ pathname: '/treinar', params: { dificuldade } });
    }
  }

  const currentPhase = phaseIdx >= 0 ? PHASES[phaseIdx] : null;

  return (
    <View style={styles.root}>

      {/* Header e indicador de etapas — ocultados quando renderizado como painel */}
      {!isPanel && (
        <>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={20} color={c1} />
            </TouchableOpacity>
            <View style={styles.headerMid}>
              <Text style={styles.headerTitle}>Respiração Guiada</Text>
              <Text style={[styles.headerSub, { color: c1 }]}>ETAPA 1 · {(LEVEL_LABELS[dificuldade] || 'Fácil').toUpperCase()}</Text>
            </View>
            {running ? (
              <View style={[styles.cycleTag, { backgroundColor: c1 + '18' }]}>
                <Text style={[styles.cycleTagText, { color: c1 }]}>Ciclo {cycle} / 3</Text>
              </View>
            ) : (
              <View style={{ width: 60 }} />
            )}
          </View>

          <View style={styles.stepRow}>
            <View style={styles.stepItem}>
              <View style={[styles.stepCircle, { backgroundColor: c1 }]}>
                <Text style={styles.stepNum}>1</Text>
              </View>
              <Text style={[styles.stepLabel, { color: c1 }]}>Respiração</Text>
            </View>
            <View style={styles.stepLine} />
            <View style={styles.stepItem}>
              <View style={[styles.stepCircle, styles.stepInactive]}>
                <Text style={[styles.stepNum, { color: '#9ca3af' }]}>2</Text>
              </View>
              <Text style={[styles.stepLabel, { color: '#9ca3af' }]}>Exercício</Text>
            </View>
          </View>
        </>
      )}

      {/* Área central do círculo */}
      <View style={styles.circleArea}>

        {/* Halos de brilho — escalam junto com o círculo */}
        <Animated.View style={[
          styles.glowBase,
          { width: glow2Size, height: glow2Size, borderRadius: glow2BR, backgroundColor: glow2Color },
        ]} />
        <Animated.View style={[
          styles.glowBase,
          { width: glow1Size, height: glow1Size, borderRadius: glow1BR, backgroundColor: glow1Color },
        ]} />

        {/* Círculo principal */}
        <Animated.View style={[
          styles.circle,
          { width: circleSize, height: circleSize, borderRadius: circleRadius, backgroundColor: circleColor },
        ]}>
          <Ionicons name="leaf" size={38} color="rgba(255,255,255,0.85)" />
        </Animated.View>
      </View>

      {/* Texto da fase */}
      <View style={styles.phaseArea}>
        {running && currentPhase ? (
          <>
            <Text style={styles.phaseLabel}>{currentPhase.label}</Text>
            <Text style={styles.phaseSub}>{currentPhase.sub}</Text>
            <Text style={[styles.countdown, { color: c1 }]}>{timeLeft}</Text>
          </>
        ) : done ? (
          <>
            <Text style={[styles.phaseLabel, { color: '#34d399' }]}>Perfeito!</Text>
            <Text style={styles.phaseSub}>Respiração concluída.{'\n'}Agora vamos praticar a voz.</Text>
          </>
        ) : (
          <>
            <Text style={styles.phaseLabel}>Primeiro, respire</Text>
            <Text style={styles.phaseSub}>Relaxe os ombros e siga o ritmo do círculo.</Text>
            <Text style={styles.suggestion}>Complete 3 respirações para avançar</Text>
          </>
        )}
      </View>

      {/* Botões */}
      <View style={styles.actions}>
        {done ? (
          <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: c1, shadowColor: c1 }]} onPress={goToNextExercise} activeOpacity={0.8}>
            <Text style={styles.btnPrimaryText}>Próximo exercício →</Text>
          </TouchableOpacity>
        ) : !running ? (
          <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: c1, shadowColor: c1 }]} onPress={handleStart} activeOpacity={0.8}>
            <Text style={styles.btnPrimaryText}>Começar</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.btnComplete}>
            <Text style={styles.btnCompleteText}>
              Ciclo {completedCycles + 1} de 3...
            </Text>
          </View>
        )}
      </View>

      {!isPanel && (
        <ConfirmExitModal
          visible={showExitModal}
          onCancel={() => setShowExitModal(false)}
          onConfirm={() => {
            setShowExitModal(false);
            navigation.dispatch(pendingExitAction.current);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f7fafd',
  },

  // ── Header ────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 54, paddingBottom: 14, paddingHorizontal: 20,
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 3,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#f7fafd',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 4, elevation: 2,
  },
  headerMid: { flex: 1, alignItems: 'center', gap: 3 },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#181c1e', letterSpacing: 0.2 },
  headerSub:   { fontSize: 10, fontWeight: '800', color: '#0061a2', letterSpacing: 1.2 },
  cycleTag: {
    backgroundColor: '#eff6ff', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  cycleTagText: { fontSize: 11, fontWeight: '700', color: '#0061a2', letterSpacing: 0.5 },

  // ── Indicador de etapas ────────────────────────────────────────────
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
  stepInactive: { backgroundColor: '#e5e8eb' },
  stepNum: { fontSize: 12, fontWeight: '800', color: '#fff' },
  stepLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },
  stepLine: { flex: 1, height: 2, backgroundColor: '#e5e8eb', marginHorizontal: 10, marginBottom: 14 },

  // ── Círculo ────────────────────────────────────────────────────────
  circleArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowBase: {
    position: 'absolute',
  },
  circle: {
    justifyContent: 'center', alignItems: 'center',
  },

  // ── Texto da fase ──────────────────────────────────────────────────
  phaseArea: {
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 16,
    gap: 8,
    minHeight: 120,
    justifyContent: 'center',
  },
  phaseLabel: {
    fontSize: 36,
    fontWeight: '300',
    color: '#181c1e',
    letterSpacing: 1,
    textAlign: 'center',
  },
  phaseSub: {
    fontSize: 14,
    fontWeight: '400',
    color: '#404751',
    textAlign: 'center',
    lineHeight: 20,
  },
  countdown: {
    fontSize: 52,
    fontWeight: '200',
    color: '#0061a2',
    letterSpacing: -1,
    marginTop: 4,
  },
  suggestion: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
    marginTop: 4,
  },

  // ── Botões ─────────────────────────────────────────────────────────
  actions: {
    paddingHorizontal: 28,
    paddingBottom: 48,
  },
  btnPrimary: {
    backgroundColor: '#0061a2',
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
    shadowColor: '#0061a2', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  btnPrimaryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  btnComplete: {
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e5e8eb',
    backgroundColor: '#fff',
  },
  btnCompleteActive: {
    backgroundColor: '#f0fdf4',
    borderColor: '#34d399',
  },
  btnCompleteText: {
    color: '#9ca3af',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  btnCompleteTextActive: {
    color: '#16a34a',
  },
});
