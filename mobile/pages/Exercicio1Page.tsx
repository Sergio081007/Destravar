import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import ConfirmExitModal from '../components/ConfirmExitModal';
import { Colors, Shadow } from '../constants/theme';
import { startSession, completeSession } from '../services/api';
import { getUserId } from '../utils/storage';

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
  fase?: number;
  onComplete?: () => void;
  isPanel?: boolean;  // quando true: sem header próprio, sem beforeRemove listener
};

export default function BreathingExercise({ fase: propFase, onComplete, isPanel }: Props) {
  const router = useRouter();
  const navigation = useNavigation();
  const { dificuldade: rawDiff, fase: rawFase } = useLocalSearchParams<{ dificuldade: string, fase: string }>();
  const dificuldade = rawDiff || 'facil';
  const fase = propFase ?? parseInt(rawFase || '1', 10);

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
  const sessionIdRef   = useRef<string | null>(null);

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

  async function handleStart() {
    clearTimers();
    circleRadius.setValue(80);
    colorPhase.setValue(0);
    completedRef.current = 0;
    setCompletedCycles(0);
    setRunning(true);
    setDone(false);
    startPhase(0, 1);

    const uid = await getUserId();
    if (uid) {
      try {
        const session = await startSession({ usuario_id: uid, fase, exercicio: 1, tipo: 'exercicio_1' });
        sessionIdRef.current = session.sessao_id;
      } catch (e) { console.warn(e); }
    }
  }

  async function handleComplete() {
    clearTimers();
    Animated.timing(circleRadius, {
      toValue: 80, duration: 800,
      easing: Easing.out(Easing.ease), useNativeDriver: false,
    }).start();
    setRunning(false);
    setDone(true);
    
    if (sessionIdRef.current) {
      await completeSession({
        sessao_id: sessionIdRef.current,
        aprovado: true,
        score: 1.0
      }).catch(console.warn);
    }
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
      {/* Área central do círculo */}

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
            <Text style={[styles.countdown, { color: Colors.primary }]}>{timeLeft}</Text>
          </>
        ) : done ? (
          <>
            <Text style={[styles.phaseLabel, { color: '#34d399' }]}>Perfeito!</Text>
            <Text style={styles.phaseSub}>Respiração concluída.{'\n'}Agora vamos praticar a voz.</Text>
          </>
        ) : (
          <>
            <Text style={styles.phaseLabel}>Respiração Guiada</Text>
            <Text style={styles.phaseSub}>Inspire quando o círculo crescer e expire quando ele diminuir.</Text>
            <Text style={styles.suggestion}>Complete 3 ciclos para avançar</Text>
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
    backgroundColor: Colors.surface,
  },

  // ── Header Padronizado ──────────────────────────────────────────────
  headerArea: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
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
    color: Colors.dark,
    letterSpacing: 1,
    textAlign: 'center',
  },
  phaseSub: {
    fontSize: 14,
    fontWeight: '400',
    color: Colors.onSurfaceVariant,
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
    color: Colors.gray,
    fontWeight: '500',
    marginTop: 4,
  },

  // ── Botões ─────────────────────────────────────────────────────────
  actions: {
    paddingHorizontal: 28,
    paddingBottom: 48,
  },
  btnPrimary: {
    backgroundColor: Colors.primary,
    paddingVertical: 18,
    borderRadius: 999,
    alignItems: 'center',
    ...Shadow.md,
  },
  btnPrimaryText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  btnComplete: {
    paddingVertical: 18,
    borderRadius: 999,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.surfaceVariant,
    backgroundColor: Colors.white,
  },
  btnCompleteActive: {
    backgroundColor: '#f0fdf4',
    borderColor: '#34d399',
  },
  btnCompleteText: {
    color: Colors.gray,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  btnCompleteTextActive: {
    color: '#16a34a',
  },
});
