import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { getProfileData, getLevelProgress, getUserName } from '../utils/storage';
import { calcularNivel } from '../utils/calcularXP';

const LEVELS = [
  {
    key: 'facil',
    label: 'Fácil',
    title: 'Trava-línguas',
    subtitle: 'Pratique dicção com frases simples e divertidas',
    emoji: '🌱',
    thumbGrad: ['#4CAF6E', '#3D9659'] as const,
    tag: 'Iniciante',
    xp: '+40 XP',
    time: '2 min',
    requiredKey: null as string | null,
  },
  {
    key: 'medio',
    label: 'Médio',
    title: 'Textos Fluentes',
    subtitle: 'Leia com fluidez, sem pausas ou hesitações',
    emoji: '🚀',
    thumbGrad: ['#3DAA8F', '#2D9278'] as const,
    tag: 'Intermediário',
    xp: '+55 XP',
    time: '3 min',
    requiredKey: 'facil',
  },
  {
    key: 'dificil',
    label: 'Difícil',
    title: 'Expressão Avançada',
    subtitle: 'Domine técnicas de dicção avançadas',
    emoji: '🔥',
    thumbGrad: ['#F07D52', '#D96A3F'] as const,
    tag: 'Avançado',
    xp: '+100 XP',
    time: '5 min',
    requiredKey: 'medio',
  },
];

const CATEGORIES = ['Todos', 'Fácil', 'Médio', 'Difícil'];

export default function HomeTab() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [nivel, setNivel] = useState(1);
  const [progress, setProgress] = useState({ nivel1_completos: 0, nivel2_completos: 0, nivel3_completos: 0 });
  const [activeCategory, setActiveCategory] = useState('Todos');

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const [profile, prog, userName] = await Promise.all([
          getProfileData(),
          getLevelProgress(),
          getUserName(),
        ]);
        setXp(profile.xp);
        setStreak(profile.streak);
        setNivel(calcularNivel(profile.xp));
        setProgress(prog);
        setName(userName);
      }
      load();
    }, [])
  );

  const getCompleted = (key: string) => {
    if (key === 'facil') return progress.nivel1_completos;
    if (key === 'medio') return progress.nivel2_completos;
    return progress.nivel3_completos;
  };

  const isUnlocked = (level: typeof LEVELS[number]) => {
    if (!level.requiredKey) return true;
    return getCompleted(level.requiredKey) >= 3;
  };

  const filteredLevels = activeCategory === 'Todos'
    ? LEVELS
    : LEVELS.filter(l => l.label === activeCategory);

  const initials = name.trim().slice(0, 2).toUpperCase() || 'AP';

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Header */}
        <LinearGradient colors={['#F07D52', '#E06235']} style={styles.header}>
          <View style={styles.bubble1} />
          <View style={styles.bubble2} />
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.greeting}>Olá de volta! 👋</Text>
              <Text style={styles.userName}>{name}</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/profile')} style={styles.avatarBtn}>
              <Text style={styles.avatarText}>{initials}</Text>
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <View style={styles.searchWrap}>
            <Ionicons name="search-outline" size={17} color="#9CA3AF" />
            <Text style={styles.searchPlaceholder}>Buscar módulo...</Text>
            <Ionicons name="options-outline" size={17} color="#F07D52" />
          </View>
        </LinearGradient>

        {/* Stats card */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statEmoji}>🔥</Text>
            <Text style={styles.statVal}>{streak}</Text>
            <Text style={styles.statLab}>Dias</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statEmoji}>⚡</Text>
            <Text style={styles.statVal}>{xp}</Text>
            <Text style={styles.statLab}>XP</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statEmoji}>🏅</Text>
            <Text style={styles.statVal}>{nivel}</Text>
            <Text style={styles.statLab}>Nível</Text>
          </View>
        </View>

        {/* Categories */}
        <Text style={styles.sectionTitle}>Categorias</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.catChip, activeCategory === cat && styles.catChipActive]}
              onPress={() => setActiveCategory(cat)}
              activeOpacity={0.8}
            >
              <Text style={[styles.catText, activeCategory === cat && styles.catTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Popular Courses – horizontal scroll */}
        <Text style={styles.sectionTitle}>Módulos Populares</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardsScroll}>
          {filteredLevels.map((lvl) => {
            const unlocked = isUnlocked(lvl);
            return (
              <TouchableOpacity
                key={lvl.key}
                style={[styles.courseCard, !unlocked && styles.courseCardLocked]}
                activeOpacity={unlocked ? 0.88 : 1}
                onPress={() => {
                  if (unlocked) router.push({ pathname: '/treinar', params: { dificuldade: lvl.key } });
                }}
              >
                <LinearGradient
                  colors={unlocked ? lvl.thumbGrad : ['#D1D5DB', '#9CA3AF']}
                  style={styles.cardThumb}
                >
                  <Text style={styles.cardThumbEmoji}>{unlocked ? lvl.emoji : '🔒'}</Text>
                  <View style={styles.cardTagBadge}>
                    <Text style={styles.cardTagText}>{lvl.tag}</Text>
                  </View>
                </LinearGradient>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{lvl.title}</Text>
                  <Text style={styles.cardSubtitle} numberOfLines={2}>{lvl.subtitle}</Text>
                  <View style={styles.cardMeta}>
                    <Ionicons name="time-outline" size={11} color="#9CA3AF" />
                    <Text style={styles.cardMetaText}>{lvl.time}</Text>
                    <View style={styles.metaDot} />
                    <Text style={styles.cardXp}>{lvl.xp}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Progress list – "Latest Learned" style */}
        <Text style={styles.sectionTitle}>Seu Progresso</Text>
        <View style={styles.progressList}>
          {LEVELS.map((lvl) => {
            const completed = getCompleted(lvl.key);
            const pct = Math.min((completed / 3) * 100, 100);
            const unlocked = isUnlocked(lvl);
            return (
              <TouchableOpacity
                key={lvl.key}
                style={styles.progressItem}
                activeOpacity={unlocked ? 0.8 : 1}
                onPress={() => {
                  if (unlocked) router.push({ pathname: '/treinar', params: { dificuldade: lvl.key } });
                }}
              >
                <LinearGradient
                  colors={unlocked ? lvl.thumbGrad : ['#D1D5DB', '#9CA3AF']}
                  style={styles.progressThumb}
                >
                  <Text style={{ fontSize: 20 }}>{unlocked ? lvl.emoji : '🔒'}</Text>
                </LinearGradient>
                <View style={styles.progressInfo}>
                  <View style={styles.progressTopRow}>
                    <Text style={styles.progressItemTitle}>{lvl.title}</Text>
                    <Text style={[styles.progressPct, { color: unlocked ? lvl.thumbGrad[0] : '#9CA3AF' }]}>
                      {Math.round(pct)}%
                    </Text>
                  </View>
                  <Text style={styles.progressAuthor}>{completed}/3 Video</Text>
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${pct}%`, backgroundColor: unlocked ? lvl.thumbGrad[0] : '#D1D5DB' },
                      ]}
                    />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAF5F0' },
  scroll: { paddingBottom: 36 },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
    position: 'relative',
  },
  bubble1: {
    position: 'absolute', top: -30, right: -30,
    width: 150, height: 150, borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  bubble2: {
    position: 'absolute', top: 60, right: 70,
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 16,
  },
  greeting: { color: 'rgba(255,255,255,0.82)', fontSize: 13, fontWeight: '600', marginBottom: 2 },
  userName: { color: '#fff', fontSize: 22, fontWeight: '800' },
  avatarBtn: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.45)',
  },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  searchWrap: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 13,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  searchPlaceholder: { flex: 1, color: '#9CA3AF', fontSize: 14 },

  // Stats
  statsCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20, marginTop: 16,
    borderRadius: 18, paddingVertical: 16,
    shadowColor: '#D96A3F', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 3,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statEmoji: { fontSize: 22, marginBottom: 2 },
  statVal: { fontWeight: '800', fontSize: 17, color: '#2D2D3E' },
  statLab: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', marginTop: 1 },
  statDivider: { width: 1, height: 36, backgroundColor: '#F0EBE6' },

  // Sections
  sectionTitle: {
    fontWeight: '800', fontSize: 17, color: '#2D2D3E',
    paddingHorizontal: 20, paddingTop: 22, paddingBottom: 12,
  },

  // Categories
  catScroll: { paddingHorizontal: 20, gap: 8 },
  catChip: {
    paddingVertical: 9, paddingHorizontal: 20, borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1.5, borderColor: '#E8E3DF',
  },
  catChipActive: { backgroundColor: '#F07D52', borderColor: '#F07D52' },
  catText: { fontWeight: '700', fontSize: 13, color: '#6B7280' },
  catTextActive: { color: '#fff' },

  // Course Cards horizontal
  cardsScroll: { paddingHorizontal: 20, gap: 14, paddingBottom: 4 },
  courseCard: {
    width: 172,
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#D96A3F', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.09, shadowRadius: 12, elevation: 3,
  },
  courseCardLocked: { opacity: 0.55 },
  cardThumb: {
    height: 112,
    justifyContent: 'center', alignItems: 'center',
    position: 'relative',
  },
  cardThumbEmoji: { fontSize: 42 },
  cardTagBadge: {
    position: 'absolute', top: 8, left: 8,
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingVertical: 3, paddingHorizontal: 8, borderRadius: 999,
  },
  cardTagText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  cardBody: { padding: 12 },
  cardTitle: { fontWeight: '700', fontSize: 13, color: '#2D2D3E', marginBottom: 4 },
  cardSubtitle: { fontSize: 11, color: '#9CA3AF', lineHeight: 15, marginBottom: 8 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardMetaText: { fontSize: 11, color: '#9CA3AF' },
  metaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#D1D5DB' },
  cardXp: { fontSize: 11, color: '#F07D52', fontWeight: '700' },

  // Progress list
  progressList: { paddingHorizontal: 20, gap: 12 },
  progressItem: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    shadowColor: '#D96A3F', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  progressThumb: {
    width: 52, height: 52, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  progressInfo: { flex: 1 },
  progressTopRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2,
  },
  progressItemTitle: { fontWeight: '700', fontSize: 13, color: '#2D2D3E' },
  progressPct: { fontWeight: '700', fontSize: 12 },
  progressAuthor: { fontSize: 11, color: '#9CA3AF', marginBottom: 7 },
  progressBarBg: {
    height: 6, backgroundColor: '#F0EBE6', borderRadius: 999, overflow: 'hidden',
  },
  progressBarFill: { height: '100%', borderRadius: 999 },
});
