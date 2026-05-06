import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, interpolate } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

const LEVEL_LABELS: Record<string, string> = {
  facil: 'Fácil', medio: 'Médio', dificil: 'Difícil',
};

type Props = {
  dificuldade: string;
  c1: string;
  phase: 'breathing' | 'speech';
  progressAnim: SharedValue<number>;
  checkScale: SharedValue<number>;
  onBack: () => void;
};

export default function ChallengeHeader({ dificuldade, c1, phase, progressAnim, checkScale, onBack }: Props) {
  const step1Done = phase === 'speech';

  return (
    <View style={styles.container}>
      {/* Linha superior: voltar | título | espaço */}
      <View style={styles.topRow}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={c1} />
        </TouchableOpacity>
        <View style={styles.mid}>
          <Text style={styles.title}>Desafio</Text>
          <View style={[styles.badge, { backgroundColor: c1 + '18' }]}>
            <Text style={[styles.badgeText, { color: c1 }]}>
              {(LEVEL_LABELS[dificuldade] || 'Fácil').toUpperCase()}
            </Text>
          </View>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* Indicador de etapas */}
      <View style={styles.stepRow}>
        {/* Step 1 */}
        <View style={styles.stepItem}>
          <View style={[styles.stepCircle, { backgroundColor: step1Done ? '#16a34a' : c1 }]}>
            {step1Done
              ? <Ionicons name="checkmark" size={13} color="#fff" />
              : <Text style={styles.stepNum}>1</Text>}
          </View>
          <Text style={[styles.stepLabel, { color: step1Done ? '#16a34a' : c1 }]}>Respiração</Text>
        </View>

        <View style={[styles.stepLine, step1Done && { backgroundColor: '#16a34a' }]} />

        {/* Step 2 */}
        <View style={styles.stepItem}>
          <View style={[styles.stepCircle, phase === 'speech' ? { backgroundColor: c1 } : styles.stepInactive]}>
            <Text style={[styles.stepNum, phase !== 'speech' && { color: '#9ca3af' }]}>2</Text>
          </View>
          <Text style={[styles.stepLabel, { color: phase === 'speech' ? c1 : '#9ca3af' }]}>Exercício</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    paddingTop: 52,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 3,
  },
  topRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 10,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#f7fafd',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 4, elevation: 2,
  },
  mid: { flex: 1, alignItems: 'center', gap: 3 },
  title: { fontSize: 15, fontWeight: '700', color: '#181c1e', letterSpacing: 0.2 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },

  progressTrack: {
    height: 4, backgroundColor: '#e5e8eb',
    marginHorizontal: 20, borderRadius: 2,
    overflow: 'hidden', marginBottom: 10,
  },
  progressFill: { height: '100%', borderRadius: 2 },

  stepRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, paddingHorizontal: 60,
    borderTopWidth: 1, borderTopColor: '#f0f2f4',
  },
  stepItem: { alignItems: 'center', gap: 4 },
  stepCircle: {
    width: 26, height: 26, borderRadius: 13,
    justifyContent: 'center', alignItems: 'center',
  },
  stepInactive: { backgroundColor: '#e5e8eb' },
  stepNum: { fontSize: 12, fontWeight: '800', color: '#fff' },
  stepLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },
  stepLine: {
    flex: 1, height: 2, backgroundColor: '#e5e8eb',
    marginHorizontal: 10, marginBottom: 14,
  },
  checkBubble: {
    position: 'absolute', top: -26,
  },
});
