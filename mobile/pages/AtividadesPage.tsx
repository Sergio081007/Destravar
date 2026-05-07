import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { getLevelProgress } from '../utils/storage';

const ACTIVITIES = [
  { id: 1, title: 'Trava-língua: Sibilantes', meta: '+40 XP · 2 min', icon: '🗣️', level: 'facil', step: 0, thumbGrad: ['#4CAF6E', '#3D9659'] as const },
  { id: 2, title: 'Texto: Notícia do Dia', meta: '+55 XP · 3 min', icon: '📄', level: 'facil', step: 1, thumbGrad: ['#4CAF6E', '#3D9659'] as const },
  { id: 3, title: 'Texto com Pausas', meta: '+60 XP · 4 min', icon: '⏸️', level: 'facil', step: 2, thumbGrad: ['#4CAF6E', '#3D9659'] as const },
  { id: 4, title: 'Trava-língua: Ritmados', meta: '+65 XP · 3 min', icon: '🎙️', level: 'medio', step: 0, thumbGrad: ['#3DAA8F', '#2D9278'] as const },
  { id: 5, title: 'Texto: Discurso Formal', meta: '+75 XP · 4 min', icon: '📖', level: 'medio', step: 1, thumbGrad: ['#3DAA8F', '#2D9278'] as const },
  { id: 6, title: 'Texto com Pausas (Médio)', meta: '+85 XP · 5 min', icon: '🎯', level: 'medio', step: 2, thumbGrad: ['#3DAA8F', '#2D9278'] as const },
  { id: 7, title: 'Expressão Avançada', meta: '+100 XP · 5 min', icon: '🔥', level: 'dificil', step: 0, thumbGrad: ['#F07D52', '#D96A3F'] as const },
  { id: 8, title: 'Discurso Impactante', meta: '+110 XP · 6 min', icon: '⚡', level: 'dificil', step: 1, thumbGrad: ['#F07D52', '#D96A3F'] as const },
  { id: 9, title: 'Apresentação Completa', meta: '+120 XP · 7 min', icon: '🏆', level: 'dificil', step: 2, thumbGrad: ['#F07D52', '#D96A3F'] as const },
];

const FILTERS = ['Todos', 'Fácil', 'Médio', 'Difícil'];
const LEVEL_KEY: Record<string, string> = { 'Fácil': 'facil', 'Médio': 'medio', 'Difícil': 'dificil' };

export default function AtividadesTab() {
  const router = useRouter();
  const [progress, setProgress] = useState({ nivel1_completos: 0, nivel2_completos: 0, nivel3_completos: 0 });
  const [activeFilter, setActiveFilter] = useState('Todos');

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

  const getStatus = (level: string, step: number): 'locked' | 'done' | 'current' | 'upcoming' => {
    if (!isLevelUnlocked(level)) return 'locked';
    const done = getCompletedCount(level);
    if (step < done) return 'done';
    if (step === done) return 'current';
    return 'upcoming';
  };

  const filteredActivities = activeFilter === 'Todos'
    ? ACTIVITIES
    : ACTIVITIES.filter(a => a.level === LEVEL_KEY[activeFilter]);

  const latestPracticed = [...ACTIVITIES].reverse().find(a => {
    const done = getCompletedCount(a.level);
    return a.step < done && isLevelUnlocked(a.level);
  }) || ACTIVITIES[0];

  const BADGE = {
    locked:   { label: '🔒',       bg: '#F3F4F6', color: '#9CA3AF' },
    done:     { label: '✓ Feito',  bg: '#E8F5EC', color: '#3D9659' },
    current:  { label: 'Agora!',   bg: '#FEF3EE', color: '#F07D52' },
    upcoming: { label: 'Em breve', bg: '#F3F4F6', color: '#9CA3AF' },
  };

  return (
    <View style={styles.root}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={styles.pageTitle}>Meus Módulos</Text>
        <View style={styles.searchBtn}>
          <Ionicons name="search-outline" size={20} color="#2D2D3E" />
        </View>
      </View>

      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, activeFilter === f && styles.filterChipActive]}
            onPress={() => setActiveFilter(f)}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>

        {/* Latest Learned hero card */}
        {activeFilter === 'Todos' && (
          <>
            <Text style={styles.sectionLabel}>Última Prática</Text>
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => router.push({ pathname: '/treinar', params: { dificuldade: latestPracticed.level } })}
            >
              <LinearGradient colors={latestPracticed.thumbGrad} style={styles.heroCard}>
                <View style={styles.heroDeco1} />
                <View style={styles.heroDeco2} />
                <View style={styles.heroPlayBtn}>
                  <Ionicons name="play" size={18} color="#fff" />
                </View>
                <Text style={styles.heroTitle}>{latestPracticed.title}</Text>
                <Text style={styles.heroMeta}>{latestPracticed.meta}</Text>
              </LinearGradient>
            </TouchableOpacity>
            <Text style={styles.sectionLabel}>Todas as Atividades</Text>
          </>
        )}

        {/* Activity cards */}
        {filteredActivities.map((act) => {
          const unlocked = isLevelUnlocked(act.level);
          const status = getStatus(act.level, act.step);
          const pct = status === 'done' ? 100 : 0;
          const badge = BADGE[status];

          return (
            <TouchableOpacity
              key={act.id}
              style={[styles.actCard, !unlocked && styles.actCardLocked]}
              disabled={!unlocked}
              activeOpacity={0.8}
              onPress={() => router.push({ pathname: '/treinar', params: { dificuldade: act.level } })}
            >
              <LinearGradient
                colors={unlocked ? act.thumbGrad : ['#D1D5DB', '#9CA3AF']}
                style={styles.actThumb}
              >
                <Text style={styles.actThumbEmoji}>{act.icon}</Text>
              </LinearGradient>
              <View style={styles.actInfo}>
                <View style={styles.actTopRow}>
                  <Text style={styles.actTitle} numberOfLines={1}>{act.title}</Text>
                  <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
                  </View>
                </View>
                <Text style={styles.actMeta}>{act.meta}</Text>
                <View style={styles.actBarBg}>
                  <View
                    style={[
                      styles.actBarFill,
                      { width: `${pct}%`, backgroundColor: unlocked ? act.thumbGrad[0] : '#D1D5DB' },
                    ]}
                  />
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAF5F0' },

  topBar: {
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#FAF5F0',
  },
  pageTitle: { fontWeight: '800', fontSize: 26, color: '#2D2D3E' },
  searchBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#D96A3F', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },

  filterScroll: { paddingHorizontal: 20, gap: 8, paddingBottom: 14 },
  filterChip: {
    paddingVertical: 9, paddingHorizontal: 20, borderRadius: 999,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E8E3DF',
  },
  filterChipActive: { backgroundColor: '#F07D52', borderColor: '#F07D52' },
  filterText: { fontWeight: '700', fontSize: 13, color: '#6B7280' },
  filterTextActive: { color: '#fff' },

  list: { paddingHorizontal: 16 },
  sectionLabel: { fontWeight: '800', fontSize: 16, color: '#2D2D3E', marginBottom: 12, marginTop: 4 },

  // Hero card
  heroCard: {
    borderRadius: 20, padding: 20, height: 128,
    justifyContent: 'flex-end', overflow: 'hidden',
    marginBottom: 20, position: 'relative',
  },
  heroDeco1: {
    position: 'absolute', top: -24, right: -24,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  heroDeco2: {
    position: 'absolute', top: 20, right: 50,
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  heroPlayBtn: {
    position: 'absolute', top: 16, right: 16,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center',
  },
  heroTitle: { color: '#fff', fontWeight: '800', fontSize: 18, marginBottom: 4 },
  heroMeta: { color: 'rgba(255,255,255,0.82)', fontSize: 12 },

  // Activity cards
  actCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginBottom: 10,
    shadowColor: '#D96A3F', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  actCardLocked: { opacity: 0.5 },
  actThumb: {
    width: 52, height: 52, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  actThumbEmoji: { fontSize: 24 },
  actInfo: { flex: 1 },
  actTopRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 4,
  },
  actTitle: { flex: 1, fontWeight: '700', fontSize: 13, color: '#2D2D3E', marginRight: 8 },
  actMeta: { fontSize: 11, color: '#9CA3AF', marginBottom: 8 },
  actBarBg: { height: 5, backgroundColor: '#F0EBE6', borderRadius: 999, overflow: 'hidden' },
  actBarFill: { height: '100%', borderRadius: 999 },
  badge: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 20 },
  badgeText: { fontSize: 10, fontWeight: '700' },
});
