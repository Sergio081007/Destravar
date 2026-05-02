import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { getProfileData, getUserName, getLevelProgress, clearAllData, getUserChar } from '../utils/storage';
import { supabase } from '../utils/supabase';
import { calcularNivel } from '../utils/calcularXP';
import AppHeader from '../components/AppHeader';

const CHARS = {
  1: require('../../assets/characters/char1.png'),
  2: require('../../assets/characters/char2.png'),
  3: require('../../assets/characters/char3.png'),
  4: require('../../assets/characters/char4.png'),
  5: require('../../assets/characters/char5.png'),
} as const;

const XP_THRESHOLDS = [500, 1200, 2500, 5000];

function getXpProgress(xp: number, nivel: number) {
  const prev = nivel > 1 ? XP_THRESHOLDS[nivel - 2] : 0;
  const next = XP_THRESHOLDS[nivel - 1] ?? XP_THRESHOLDS[XP_THRESHOLDS.length - 1];
  return { current: xp - prev, needed: next - prev };
}

const LEVEL_TITLES = ['', 'Iniciante das Palavras', 'Explorador de Palavras', 'Mestre das Palavras', 'Elite das Palavras', 'Lendário das Palavras'];
const MOCK_XPS = [2890, 2450, 2100, 1950, 1740, 1600];

const ACHIEVEMENTS = [
  { id: 'leitora', icon: 'book'      as const, title: 'Leitora',  bg: '#fff7ed', color: '#ea580c', check: (p: any) => p.totalActivities >= 1 },
  { id: 'oradora', icon: 'megaphone' as const, title: 'Oradora',  bg: '#eff6ff', color: '#2563eb', check: (p: any) => p.streak >= 3 },
  { id: 'mestre',  icon: 'medal'     as const, title: 'Mestre',   bg: '#f0fdf4', color: '#16a34a', check: (p: any) => p.nivel1 >= 3 },
  { id: 'elite',   icon: 'star'      as const, title: 'Elite',    bg: '#fdf4ff', color: '#9333ea', check: (p: any) => p.xp >= 500 },
];

export default function PerfilTab() {
  const router = useRouter();
  const [xp, setXp]                   = useState(0);
  const [streak, setStreak]           = useState(0);
  const [nivel, setNivel]             = useState(1);
  const [name, setName]               = useState('Aprendiz');
  const [charIdx, setCharIdx]  = useState<1|2|3|4|5>(1);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [progress, setProgress] = useState({
    nivel1_completos: 0, nivel2_completos: 0, nivel3_completos: 0,
  });

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [data, userName, prog, char] = await Promise.all([
          getProfileData(), getUserName(), getLevelProgress(), getUserChar(),
        ]);
        setXp(data.xp);
        setStreak(data.streak);
        setNivel(calcularNivel(data.xp));
        setName(userName);
        setProgress(prog);
        setCharIdx((char >= 1 && char <= 5 ? char : 1) as 1|2|3|4|5);
      })();
    }, [])
  );

  const { current, needed } = getXpProgress(xp, nivel);
  const progressPct     = Math.min((current / needed) * 100, 100);
  const initials        = name.trim().slice(0, 2).toUpperCase() || 'AP';
  const subtitle        = LEVEL_TITLES[Math.min(nivel, 5)] || 'Explorador de Palavras';
  const myRank          = [...MOCK_XPS, xp].sort((a, b) => b - a).indexOf(xp) + 1;
  const xpDisplay       = xp >= 1000 ? `${(xp / 1000).toFixed(1)}k` : String(xp);
  const totalActivities = progress.nivel1_completos + progress.nivel2_completos + progress.nivel3_completos;
  const achieveData     = { xp, streak, totalActivities, nivel1: progress.nivel1_completos, nivel2: progress.nivel2_completos, nivel3: progress.nivel3_completos };

  async function confirmSignOut() {
    setShowSignOutModal(false);
    await supabase.auth.signOut();
    await clearAllData();
    router.replace('/login');
  }

  return (
    <View style={styles.root}>
      {/* Sign-out confirmation modal */}
      <Modal transparent animationType="fade" visible={showSignOutModal} onRequestClose={() => setShowSignOutModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <LinearGradient colors={['#fef2f2', '#fce4e4']} style={styles.modalIconBg}>
                <Ionicons name="log-out-outline" size={32} color="#dc2626" />
              </LinearGradient>
            </View>
            <Text style={styles.modalTitle}>Sair da conta?</Text>
            <Text style={styles.modalBody}>
              Todo o seu progresso será apagado e você voltará ao início. Tem certeza?
            </Text>
            <TouchableOpacity style={styles.modalBtnDanger} onPress={confirmSignOut} activeOpacity={0.85}>
              <Text style={styles.modalBtnDangerText}>Sim, sair</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setShowSignOutModal(false)} activeOpacity={0.85}>
              <Text style={styles.modalBtnCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <AppHeader
        initials={initials}
        avatarSource={CHARS[charIdx]}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Profile card */}
        <View style={styles.card}>
          {/* Avatar */}
          <View style={styles.avatarWrap}>
            <LinearGradient
              colors={['#0061a2', '#5e41d0']}
              style={styles.avatarRing}
            >
              <View style={styles.avatarWhiteBorder}>
                <Image source={CHARS[charIdx]} style={styles.avatarImage} />
              </View>
            </LinearGradient>
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>NÍVEL {nivel}</Text>
            </View>
          </View>

          <Text style={styles.heroName}>{name}</Text>
          <Text style={styles.heroSubtitle}>{subtitle}</Text>

          <TouchableOpacity activeOpacity={0.85} style={styles.editBtnWrap}>
            <LinearGradient
              colors={['#0061a2', '#5e41d0']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.editBtn}
            >
              <Text style={styles.editBtnText}>Editar Perfil</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Stats bento */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="flame" size={28} color="#ea580c" />
            <Text style={styles.statVal}>{streak}</Text>
            <Text style={styles.statLabel}>Dias</Text>
          </View>
          <View style={[styles.statCard, styles.statCardHighlight]}>
            <Ionicons name="flash" size={28} color="#0061a2" />
            <Text style={[styles.statVal, { color: '#0061a2' }]}>{xpDisplay}</Text>
            <Text style={styles.statLabel}>Total XP</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="trophy" size={28} color="#ca8a04" />
            <Text style={styles.statVal}>#{myRank}</Text>
            <Text style={styles.statLabel}>Ranking</Text>
          </View>
        </View>

        {/* Achievements */}
        <View style={styles.card}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Conquistas</Text>
            <Text style={styles.sectionLink}>Ver Todas</Text>
          </View>
          <View style={styles.achieveGrid}>
            {ACHIEVEMENTS.map((a) => {
              const unlocked = a.check(achieveData);
              return (
                <View key={a.id} style={[styles.achieveItem, !unlocked && { opacity: 0.45 }]}>
                  <View style={[
                    styles.achieveCircle,
                    unlocked ? { backgroundColor: a.bg } : styles.achieveCircleLocked,
                  ]}>
                    {unlocked
                      ? <Ionicons name={a.icon} size={24} color={a.color} />
                      : <Ionicons name="lock-closed" size={18} color="#c0c7d3" />
                    }
                  </View>
                  <Text style={styles.achieveLabel}>{a.title}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* XP Progress */}
        <View style={styles.card}>
          <Text style={styles.progressTitle}>Caminho do Sucesso</Text>
          <View style={styles.progressLabelRow}>
            <Text style={styles.progressLabel}>Próximo nível</Text>
            <Text style={styles.progressXpVal}>{current} / {needed} XP</Text>
          </View>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${progressPct}%` as any }]} />
          </View>
        </View>

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={() => setShowSignOutModal(true)} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={20} color="#dc2626" />
          <Text style={styles.signOutText}>Sair da conta</Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f7fafd' },

  scroll: { padding: 20, paddingBottom: 8, gap: 14 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#0061a2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },

  // Avatar
  avatarWrap: {
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarRing: {
    width: 104,
    height: 104,
    borderRadius: 52,
    padding: 4,
    shadowColor: '#0061a2',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 7,
  },
  avatarWhiteBorder: {
    flex: 1,
    borderRadius: 48,
    backgroundColor: '#fff',
    padding: 2.5,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 46,
  },
  levelBadge: {
    marginTop: 8,
    backgroundColor: '#ffddb6',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#845400',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  levelBadgeText: { fontSize: 11, fontWeight: '800', color: '#845400', letterSpacing: 0.5 },

  heroName: { fontSize: 22, fontWeight: '800', color: '#181c1e', textAlign: 'center', marginBottom: 4 },
  heroSubtitle: { fontSize: 14, color: '#707883', textAlign: 'center', marginBottom: 20 },

  editBtnWrap: { borderRadius: 999, overflow: 'hidden', width: '100%' },
  editBtn: { paddingVertical: 14, alignItems: 'center', borderRadius: 999 },
  editBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 20,
    paddingVertical: 16, alignItems: 'center', gap: 4,
    shadowColor: '#0061a2', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  statCardHighlight: { backgroundColor: '#eff6ff' },
  statVal: { fontSize: 22, fontWeight: '900', color: '#181c1e' },
  statLabel: { fontSize: 10, fontWeight: '700', color: '#707883', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Achievements
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, width: '100%' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#181c1e' },
  sectionLink: { fontSize: 13, fontWeight: '600', color: '#0061a2' },
  achieveGrid: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  achieveItem: { alignItems: 'center', gap: 6, flex: 1 },
  achieveCircle: {
    width: 56, height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center',
  },
  achieveCircleLocked: {
    backgroundColor: '#ebeef1',
    borderWidth: 2, borderColor: '#c0c7d3', borderStyle: 'dashed',
  },
  achieveLabel: { fontSize: 10, fontWeight: '700', color: '#404751', textAlign: 'center' },

  // Progress
  progressTitle: { fontSize: 16, fontWeight: '700', color: '#181c1e', marginBottom: 12, alignSelf: 'flex-start' },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, width: '100%' },
  progressLabel: { fontSize: 12, fontWeight: '600', color: '#707883' },
  progressXpVal: { fontSize: 12, fontWeight: '700', color: '#0061a2' },
  progressBg: { height: 12, backgroundColor: '#ebeef1', borderRadius: 999, overflow: 'hidden', width: '100%' },
  progressFill: {
    height: '100%', backgroundColor: '#0061a2', borderRadius: 999,
    shadowColor: '#0061a2', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 6,
  },

  // Sign out
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16, borderRadius: 999,
    borderWidth: 1.5, borderColor: '#fca5a5', backgroundColor: '#fef2f2',
  },
  signOutText: { color: '#dc2626', fontSize: 15, fontWeight: '700' },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(24,28,30,0.45)',
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 32,
  },
  modalCard: {
    width: '100%', backgroundColor: '#fff',
    borderRadius: 28, padding: 28,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18, shadowRadius: 32, elevation: 16,
  },
  modalIconWrap: { marginBottom: 20 },
  modalIconBg: {
    width: 72, height: 72, borderRadius: 36,
    justifyContent: 'center', alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22, fontWeight: '800', color: '#181c1e',
    textAlign: 'center', marginBottom: 10,
  },
  modalBody: {
    fontSize: 15, color: '#707883', textAlign: 'center',
    lineHeight: 22, marginBottom: 28,
  },
  modalBtnDanger: {
    width: '100%', paddingVertical: 16, borderRadius: 999,
    backgroundColor: '#dc2626', alignItems: 'center', marginBottom: 10,
    shadowColor: '#dc2626', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25, shadowRadius: 12, elevation: 5,
  },
  modalBtnDangerText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  modalBtnCancel: {
    width: '100%', paddingVertical: 16, borderRadius: 999,
    backgroundColor: '#f1f4f7', alignItems: 'center',
  },
  modalBtnCancelText: { color: '#404751', fontWeight: '700', fontSize: 16 },
});
