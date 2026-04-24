import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { getLevelProgress } from '../utils/storage';

const ACTIVITIES = [
  { id: 1, title: 'Trava-língua: Sibilantes', meta: '+40 XP · 2 min', icon: '🗣️', iconBg: '#eff6ff', level: 'facil', step: 0 },
  { id: 2, title: 'Texto: Notícia do Dia', meta: '+55 XP · 3 min', icon: '📄', iconBg: '#ecfdf5', level: 'facil', step: 1 },
  { id: 3, title: 'Texto com Pausas', meta: '+60 XP · 4 min', icon: '⏸️', iconBg: '#f5f3ff', level: 'facil', step: 2 },
  { id: 4, title: 'Trava-língua: Ritmados', meta: '+65 XP · 3 min', icon: '🎙️', iconBg: '#fffbeb', level: 'medio', step: 0 },
  { id: 5, title: 'Texto: Discurso Formal', meta: '+75 XP · 4 min', icon: '📖', iconBg: '#eff6ff', level: 'medio', step: 1 },
  { id: 6, title: 'Texto com Pausas (Médio)', meta: '+85 XP · 5 min', icon: '🎯', iconBg: '#ecfdf5', level: 'medio', step: 2 },
  { id: 7, title: 'Expressão Avançada', meta: '+100 XP · 5 min', icon: '🔥', iconBg: '#fef2f2', level: 'dificil', step: 0 },
  { id: 8, title: 'Discurso Impactante', meta: '+110 XP · 6 min', icon: '⚡', iconBg: '#f5f3ff', level: 'dificil', step: 1 },
  { id: 9, title: 'Apresentação Completa', meta: '+120 XP · 7 min', icon: '🏆', iconBg: '#fffbeb', level: 'dificil', step: 2 },
];

const LEVEL_META: Record<string, { label: string; color: string }> = {
  facil: { label: 'Nível 1 — Fácil', color: '#3b82f6' },
  medio: { label: 'Nível 2 — Médio', color: '#10b981' },
  dificil: { label: 'Nível 3 — Difícil', color: '#8b5cf6' },
};

export default function AtividadesTab() {
  const router = useRouter();
  const [progress, setProgress] = useState({ nivel1_completos: 0, nivel2_completos: 0, nivel3_completos: 0 });

  useFocusEffect(
    useCallback(() => {
      getLevelProgress().then(setProgress);
    }, [])
  );

  const getCompletedCount = (level: string) => {
    if (level === 'facil') return progress.nivel1_completos;
    if (level === 'medio') return progress.nivel2_completos;
    return progress.nivel3_completos;
  };

  const isLevelUnlocked = (level: string) => {
    if (level === 'facil') return true;
    if (level === 'medio') return progress.nivel1_completos >= 3;
    return progress.nivel2_completos >= 3;
  };

  const getBadge = (level: string, step: number) => {
    if (!isLevelUnlocked(level)) return { label: '🔒', bg: '#f3f4f6', color: '#9ca3af' };
    const done = getCompletedCount(level);
    if (step < done) return { label: '✓ Feito', bg: '#ecfdf5', color: '#059669' };
    if (step === done) return { label: 'Agora!', bg: '#ede9fe', color: '#7c3aed' };
    return { label: 'Em breve', bg: '#f3f4f6', color: '#9ca3af' };
  };

  let lastLevel = '';

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Text style={styles.pageTitle}>Atividades</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {ACTIVITIES.map((act) => {
          const showSection = act.level !== lastLevel;
          if (showSection) lastLevel = act.level;
          const meta = LEVEL_META[act.level];
          const unlocked = isLevelUnlocked(act.level);
          const badge = getBadge(act.level, act.step);

          return (
            <View key={act.id}>
              {showSection && (
                <View style={[styles.sectionHeader, { borderLeftColor: meta.color }]}>
                  <Text style={[styles.sectionLabel, { color: meta.color }]}>{meta.label}</Text>
                </View>
              )}
              <TouchableOpacity
                style={[styles.card, !unlocked && styles.cardLocked]}
                disabled={!unlocked}
                activeOpacity={0.8}
                onPress={() => router.push({ pathname: '/treinar', params: { dificuldade: act.level } })}
              >
                <View style={[styles.iconWrap, { backgroundColor: act.iconBg }]}>
                  <Text style={styles.iconEmoji}>{act.icon}</Text>
                </View>
                <View style={styles.info}>
                  <Text style={[styles.actTitle, !unlocked && styles.actTitleLocked]}>{act.title}</Text>
                  <Text style={styles.actMeta}>{act.meta}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                  <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
                </View>
              </TouchableOpacity>
            </View>
          );
        })}
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fafafa' },
  topBar: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f0edf8',
    shadowColor: '#5a32b4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  pageTitle: { fontWeight: '800', fontSize: 26, color: '#1a1a2e' },
  list: { padding: 16 },
  sectionHeader: {
    borderLeftWidth: 3, paddingLeft: 10,
    marginTop: 16, marginBottom: 10,
  },
  sectionLabel: { fontWeight: '700', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginBottom: 10,
    shadowColor: '#5a32b4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardLocked: { opacity: 0.45 },
  iconWrap: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  iconEmoji: { fontSize: 22 },
  info: { flex: 1 },
  actTitle: { fontWeight: '700', fontSize: 14, color: '#1a1a2e', marginBottom: 3 },
  actTitleLocked: { color: '#9ca3af' },
  actMeta: { fontSize: 12, color: '#9ca3af' },
  badge: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700' },
});
