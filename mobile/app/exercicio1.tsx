import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, withRepeat, Easing, runOnJS, cancelAnimation,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

// isHold = fase sem movimento (círculo mantém escala atual, usa setTimeout)
const PHASES = [
  { label: 'Inspire', hint: 'Encha os pulmões devagar',        dur: 4000, toScale: 1.3,  expanding: true,  isHold: false },
  { label: 'Segure',  hint: 'Mantenha o ar por um instante',   dur: 2000, toScale: 1.3,  expanding: true,  isHold: true  },
  { label: 'Expire',  hint: 'Solte o ar bem devagar',          dur: 4000, toScale: 0.65, expanding: false, isHold: false },
  { label: 'Relaxe',  hint: 'Prepare-se para o próximo ciclo', dur: 2000, toScale: 0.65, expanding: false, isHold: true  },
];

const TOTAL_CYCLES = 3;

const LEVEL_COLORS: Record<string, [string, string]> = {
  facil:   ['#0061a2', '#4da9ff'],
  medio:   ['#10b981', '#34d399'],
  dificil: ['#5e41d0', '#8b5cf6'],
};

const LEVEL_LABELS: Record<string, string> = {
  facil: 'Fácil', medio: 'Médio', dificil: 'Difícil',
};

export default function Exercicio1() {
  const router = useRouter();
  const { dificuldade: rawDiff } = useLocalSearchParams<{ dificuldade: string }>();
  const dificuldade = rawDiff || 'facil';
  const [c1, c2] = LEVEL_COLORS[dificuldade] || LEVEL_COLORS.facil;

  const [phaseIdx, setPhaseIdx] = useState(0);
  const [cycle, setCycle]       = useState(1);
  const [done, setDone]         = useState(false);
  const [running, setRunning]   = useState(false);

  const circleScale  = useSharedValue(0.5);
  const ring1Scale   = useSharedValue(1.0);
  const ring1Opacity = useSharedValue(0.35);
  const ring2Scale   = useSharedValue(1.0);
  const ring2Opacity = useSharedValue(0.15);

  // Pulse idle dos anéis — ativo só quando não está respirando
  useEffect(() => {
    if (running) return;
    ring1Scale.value   = withRepeat(withTiming(1.2,  { duration: 1400, easing: Easing.inOut(Easing.ease) }), -1, true);
    ring1Opacity.value = withRepeat(withTiming(0.12, { duration: 1400 }), -1, true);
    ring2Scale.value   = withRepeat(withTiming(1.38, { duration: 1900, easing: Easing.inOut(Easing.ease) }), -1, true);
    ring2Opacity.value = withRepeat(withTiming(0.06, { duration: 1900 }), -1, true);
  }, [running]);

  const circleStyle = useAnimatedStyle(() => ({ transform: [{ scale: circleScale.value }] }));
  const ring1Style  = useAnimatedStyle(() => ({ transform: [{ scale: ring1Scale.value }], opacity: ring1Opacity.value }));
  const ring2Style  = useAnimatedStyle(() => ({ transform: [{ scale: ring2Scale.value }], opacity: ring2Opacity.value }));

  // ── Encadeia fases via callback do withTiming (tudo na UI thread) ──
  function startPhase(pIdx: number, cNum: number) {
    // Ciclos concluídos
    if (cNum > TOTAL_CYCLES) {
      setDone(true);
      setRunning(false);
      return;
    }
    // Fim de um ciclo → próximo ciclo
    if (pIdx >= PHASES.length) {
      startPhase(0, cNum + 1);
      return;
    }

    // Atualiza labels de texto
    setPhaseIdx(pIdx);
    if (pIdx === 0) setCycle(cNum);

    const phase = PHASES[pIdx];

    // Círculo: anima suavemente até o toScale da fase
    // Ao terminar, runOnJS dispara a próxima fase no JS thread
    circleScale.value = withTiming(
      phase.toScale,
      { duration: phase.dur, easing: Easing.inOut(Easing.ease) },
      (finished) => {
        'worklet';
        if (finished) runOnJS(startPhase)(pIdx + 1, cNum);
      },
    );

    // Anéis expandem/contraem em sincronia com o círculo
    ring1Scale.value   = withTiming(phase.expanding ? 1.28 : 0.88, { duration: phase.dur, easing: Easing.inOut(Easing.ease) });
    ring2Scale.value   = withTiming(phase.expanding ? 1.48 : 0.94, { duration: phase.dur, easing: Easing.inOut(Easing.ease) });
    ring1Opacity.value = withTiming(phase.expanding ? 0.42 : 0.10, { duration: phase.dur });
    ring2Opacity.value = withTiming(phase.expanding ? 0.18 : 0.04, { duration: phase.dur });
  }

  function handleStart() {
    cancelAnimation(circleScale);
    cancelAnimation(ring1Scale);
    cancelAnimation(ring2Scale);
    cancelAnimation(ring1Opacity);
    cancelAnimation(ring2Opacity);

    setRunning(true);
    setPhaseIdx(0);
    setCycle(1);
    setDone(false);

    circleScale.value = 0.5;
    startPhase(0, 1);
  }

  function goToExercise() {
    router.push({ pathname: '/treinar', params: { dificuldade } });
  }

  const phase = PHASES[phaseIdx];

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={c1} />
        </TouchableOpacity>
        <View style={styles.headerMid}>
          <Text style={styles.headerTitle}>Exercício de Respiração</Text>
          <View style={[styles.stepBadge, { backgroundColor: c1 + '18' }]}>
            <Text style={[styles.stepBadgeText, { color: c1 }]}>
              ETAPA 1 · {LEVEL_LABELS[dificuldade].toUpperCase()}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={goToExercise} style={styles.skipBtn}>
          <Text style={[styles.skipText, { color: c1 }]}>Pular</Text>
        </TouchableOpacity>
      </View>

      {/* Mascot card */}
      <View style={styles.mascotCard}>
        <View style={[styles.mascotIconWrap, { backgroundColor: '#dd962b18' }]}>
          <Ionicons name="leaf-outline" size={18} color="#845400" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.mascotLabel}>DESTRAVAR DIZ:</Text>
          <Text style={styles.mascotText}>
            Respirar fundo antes de falar relaxa as cordas vocais e reduz bloqueios.
          </Text>
        </View>
      </View>

      {/* Círculo de respiração */}
      <View style={styles.circleArea}>
        <View style={styles.ringsContainer}>
          <Animated.View style={[styles.ring2, { borderColor: c2 }, ring2Style]} />
          <Animated.View style={[styles.ring1, { borderColor: c1 }, ring1Style]} />
          <Animated.View style={[styles.circle, { backgroundColor: c1, shadowColor: c1 }, circleStyle]}>
            <Ionicons name="leaf" size={44} color="#fff" />
          </Animated.View>
        </View>
      </View>

      {/* Texto da fase */}
      <View style={styles.phaseArea}>
        {running && !done ? (
          <>
            <Text style={[styles.phaseLabel, { color: c1 }]}>{phase.label}</Text>
            <Text style={styles.phaseHint}>{phase.hint}</Text>
            <View style={[styles.cycleTrack, { backgroundColor: c1 + '18' }]}>
              <Text style={[styles.cycleText, { color: c1 }]}>
                Ciclo {cycle} de {TOTAL_CYCLES}
              </Text>
            </View>
          </>
        ) : done ? (
          <>
            <Text style={[styles.phaseLabel, { color: '#16a34a' }]}>Muito bem! 🌿</Text>
            <Text style={styles.phaseHint}>Sua respiração está calibrada. Agora vamos praticar.</Text>
          </>
        ) : (
          <>
            <Text style={[styles.phaseLabel, { color: c1 }]}>Vamos respirar</Text>
            <Text style={styles.phaseHint}>
              {TOTAL_CYCLES} ciclos · inspire, segure, expire e relaxe
            </Text>
          </>
        )}
      </View>

      {/* Botão de ação */}
      <View style={styles.actions}>
        {done ? (
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: '#16a34a', shadowColor: '#16a34a' }]}
            onPress={goToExercise}
            activeOpacity={0.85}
          >
            <Text style={styles.btnText}>Iniciar o exercício de voz →</Text>
          </TouchableOpacity>
        ) : !running ? (
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: c1, shadowColor: c1 }]}
            onPress={handleStart}
            activeOpacity={0.85}
          >
            <Text style={styles.btnText}>Começar respiração</Text>
          </TouchableOpacity>
        ) : null}
      </View>
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
  stepBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  stepBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  skipBtn: { width: 46, alignItems: 'flex-end' },
  skipText: { fontSize: 13, fontWeight: '600' },

  mascotCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 20, marginTop: 8,
    backgroundColor: '#fffbeb',
    borderRadius: 16, padding: 14,
    borderLeftWidth: 3, borderLeftColor: '#dd962b',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  mascotIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
  },
  mascotLabel: { fontSize: 10, fontWeight: '800', color: '#845400', letterSpacing: 0.6, marginBottom: 3 },
  mascotText:  { fontSize: 13, color: '#404751', fontWeight: '500', lineHeight: 18 },

  circleArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  ringsContainer: {
    width: 300, height: 300,
    alignItems: 'center', justifyContent: 'center',
  },
  ring2: {
    position: 'absolute',
    width: 266, height: 266, borderRadius: 133, borderWidth: 1.5,
    top: 17, left: 17,
  },
  ring1: {
    position: 'absolute',
    width: 200, height: 200, borderRadius: 100, borderWidth: 2,
    top: 50, left: 50,
  },
  circle: {
    width: 140, height: 140, borderRadius: 70,
    justifyContent: 'center', alignItems: 'center',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28, shadowRadius: 22, elevation: 12,
  },

  phaseArea: { alignItems: 'center', paddingHorizontal: 36, paddingBottom: 28, gap: 8 },
  phaseLabel: { fontSize: 34, fontWeight: '900', letterSpacing: -0.5 },
  phaseHint:  { fontSize: 15, color: '#707883', fontWeight: '500', textAlign: 'center', lineHeight: 21 },
  cycleTrack: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 5, marginTop: 2 },
  cycleText:  { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },

  actions: { paddingHorizontal: 24, paddingBottom: 46 },
  btn: {
    paddingVertical: 17, borderRadius: 999, alignItems: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28, shadowRadius: 14, elevation: 6,
  },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
