import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

// Fases: dur em ms, toRadius em px, colorIdx mapeia para PHASE_COLORS
const PHASES = [
  { label: 'Inspire', sub: 'Encha os pulmões devagar', dur: 4000, toRadius: 140, colorIdx: 0 },
  { label: 'Segure',  sub: 'Mantenha o ar',            dur: 2000, toRadius: 140, colorIdx: 1 },
  { label: 'Solte',   sub: 'Libere devagar',           dur: 4000, toRadius: 80,  colorIdx: 2 },
];

// Cores por fase (circle, glow interno, glow externo)
const PHASE_COLORS = [
  { circle: '#818cf8', g1: 'rgba(129,140,248,0.18)', g2: 'rgba(129,140,248,0.07)' }, // inspire: índigo
  { circle: '#c084fc', g1: 'rgba(192,132,252,0.18)', g2: 'rgba(192,132,252,0.07)' }, // segure: lilás
  { circle: '#34d399', g1: 'rgba(52,211,153,0.18)',  g2: 'rgba(52,211,153,0.07)'  }, // solte: verde-azul
];

const LEVEL_LABELS: Record<string, string> = {
  facil: 'Fácil', medio: 'Médio', dificil: 'Difícil',
};

export default function BreathingExercise({ onComplete }: { onComplete?: () => void }) {
  const router = useRouter();
  const { dificuldade: rawDiff } = useLocalSearchParams<{ dificuldade: string }>();
  const dificuldade = rawDiff || 'facil';

  const [phaseIdx, setPhaseIdx]             = useState(-1);   // -1 = idle
  const [timeLeft, setTimeLeft]             = useState(4);
  const [cycle, setCycle]                   = useState(1);
  const [completedCycles, setCompletedCycles] = useState(0);
  const [running, setRunning]               = useState(false);
  const [done, setDone]                     = useState(false);

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

  function clearTimers() {
    if (phaseTimerRef.current)  { clearTimeout(phaseTimerRef.current);   phaseTimerRef.current = null; }
    if (countdownRef.current)   { clearInterval(countdownRef.current);   countdownRef.current = null; }
  }

  function startPhase(pIdx: number, cNum: number) {
    // Fim de um ciclo completo
    if (pIdx >= PHASES.length) {
      completedRef.current += 1;
      setCompletedCycles(completedRef.current);
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
    if (onComplete) onComplete();
  }

  function goToNextExercise() {
    router.push({ pathname: '/treinar', params: { dificuldade } });
  }

  const canComplete  = completedRef.current >= 1;
  const currentPhase = phaseIdx >= 0 ? PHASES[phaseIdx] : null;

  return (
    <View style={styles.root}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#9ca3af" />
        </TouchableOpacity>
        <View style={styles.headerMid}>
          <Text style={styles.headerTitle}>Respiração Guiada</Text>
          <Text style={styles.headerSub}>ETAPA 1 · {(LEVEL_LABELS[dificuldade] || 'Fácil').toUpperCase()}</Text>
        </View>
        {/* Contador de ciclos ou botão pular */}
        {running ? (
          <View style={styles.cycleTag}>
            <Text style={styles.cycleTagText}>Ciclo {cycle}</Text>
          </View>
        ) : (
          <TouchableOpacity onPress={goToNextExercise} style={styles.skipBtn}>
            <Text style={styles.skipText}>Pular</Text>
          </TouchableOpacity>
        )}
      </View>

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
        ]} />
      </View>

      {/* Texto da fase */}
      <View style={styles.phaseArea}>
        {running && currentPhase ? (
          <>
            <Text style={styles.phaseLabel}>{currentPhase.label}</Text>
            <Text style={styles.phaseSub}>{currentPhase.sub}</Text>
            <Text style={styles.countdown}>{timeLeft}</Text>
          </>
        ) : done ? (
          <>
            <Text style={[styles.phaseLabel, { color: '#34d399' }]}>Muito bem</Text>
            <Text style={styles.phaseSub}>Respiração concluída.{'\n'}Agora vamos praticar a voz.</Text>
          </>
        ) : (
          <>
            <Text style={styles.phaseLabel}>Primeiro, respire</Text>
            <Text style={styles.phaseSub}>
              Relaxe os ombros.{'\n'}Inspire 4s · Segure 2s · Solte 4s
            </Text>
            <Text style={styles.suggestion}>Sugerido: 4 a 5 ciclos</Text>
          </>
        )}
      </View>

      {/* Botões */}
      <View style={styles.actions}>
        {done ? (
          <TouchableOpacity style={styles.btnPrimary} onPress={goToNextExercise} activeOpacity={0.8}>
            <Text style={styles.btnPrimaryText}>Próximo exercício →</Text>
          </TouchableOpacity>
        ) : !running ? (
          <TouchableOpacity style={styles.btnPrimary} onPress={handleStart} activeOpacity={0.8}>
            <Text style={styles.btnPrimaryText}>Começar</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.btnComplete, canComplete && styles.btnCompleteActive]}
            onPress={canComplete ? handleComplete : undefined}
            activeOpacity={canComplete ? 0.8 : 1}
          >
            <Text style={[styles.btnCompleteText, canComplete && styles.btnCompleteTextActive]}>
              {canComplete ? 'Concluir' : `Conclua pelo menos 1 ciclo`}
            </Text>
          </TouchableOpacity>
        )}
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0d0f14',
  },

  // ── Header ────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 54, paddingBottom: 14, paddingHorizontal: 20,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#1c1f28',
    justifyContent: 'center', alignItems: 'center',
  },
  headerMid: { flex: 1, alignItems: 'center', gap: 3 },
  headerTitle: { fontSize: 15, fontWeight: '600', color: '#e5e7eb', letterSpacing: 0.2 },
  headerSub:   { fontSize: 10, fontWeight: '700', color: '#4b5563', letterSpacing: 1.2 },
  cycleTag: {
    backgroundColor: '#1c1f28', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  cycleTagText: { fontSize: 11, fontWeight: '700', color: '#6b7280', letterSpacing: 0.5 },
  skipBtn:  { width: 46, alignItems: 'flex-end' },
  skipText: { fontSize: 13, fontWeight: '500', color: '#4b5563' },

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
    // width, height, borderRadius, backgroundColor vêm das animated values
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
    color: '#f9fafb',
    letterSpacing: 1,
    textAlign: 'center',
  },
  phaseSub: {
    fontSize: 14,
    fontWeight: '400',
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  countdown: {
    fontSize: 52,
    fontWeight: '200',
    color: '#d1d5db',
    letterSpacing: -1,
    marginTop: 4,
  },
  suggestion: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
    marginTop: 4,
  },

  // ── Botões ─────────────────────────────────────────────────────────
  actions: {
    paddingHorizontal: 28,
    paddingBottom: 48,
  },
  btnPrimary: {
    backgroundColor: '#1e2130',
    borderWidth: 1,
    borderColor: '#2d3147',
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
  },
  btnPrimaryText: {
    color: '#e5e7eb',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  btnComplete: {
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  btnCompleteActive: {
    backgroundColor: '#1a2e1f',
    borderColor: '#34d399',
  },
  btnCompleteText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  btnCompleteTextActive: {
    color: '#34d399',
  },
});
