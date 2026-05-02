import { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  ImageSourcePropType, Dimensions,
} from 'react-native';

// Jogadores base — ficam no ranking até usuários reais os superarem em XP
const MOCK_PLAYERS = [
  { name: 'Lucas Ferreira', initials: 'LF', xp: 2890, color: '#E8650A', char: 1 },
  { name: 'Gabriel Costa',  initials: 'GC', xp: 2450, color: '#E07BB5', char: 2 },
  { name: 'Juliana Rocha',  initials: 'JR', xp: 2100, color: '#D4A720', char: 3 },
  { name: 'Ricardo Alves',  initials: 'RA', xp: 1950, color: '#5DADA0', char: 4 },
  { name: 'Tiago Souza',    initials: 'TS', xp: 1740, color: '#2B3FA0', char: 5 },
  { name: 'Beatriz Mendes', initials: 'BM', xp: 1600, color: '#E07BB5', char: 2 },
];
import Svg, { Polygon, Rect } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { getProfileData, getUserName, getUserId, getUserChar } from '../utils/storage';
import { API_BASE_URL } from '../config';
import Avatar from '../components/Avatar';
import AppHeader from '../components/AppHeader';

const { width: SCREEN_W } = Dimensions.get('window');
const CONTENT_W = SCREEN_W - 40;
const COL1_W  = Math.floor(CONTENT_W * 1.2 / 3.2);
const COL23_W = Math.floor(CONTENT_W / 3.2);

const CHARS: Record<number, ImageSourcePropType> = {
  1: require('../../assets/characters/char1.png'),
  2: require('../../assets/characters/char2.png'),
  3: require('../../assets/characters/char3.png'),
  4: require('../../assets/characters/char4.png'),
  5: require('../../assets/characters/char5.png'),
};

const PLAYER_COLORS = [
  '#E8650A', '#E07BB5', '#D4A720', '#5DADA0',
  '#2B3FA0', '#8B5CF6', '#10B981', '#F59E0B',
];

type Player = {
  name: string; initials: string; xp: number;
  color: string; char?: number; isMe?: boolean; rank?: number;
};

const PODIUM_CFG = {
  1: { color: '#FFD700', shade: '#B8860B', blockH: 220, colW: COL1_W,  tl: 0.15, tr: 0,    numLabel: 'I',   numSize: 60 },
  2: { color: '#E0E3E6', shade: '#A0A5AA', blockH: 148, colW: COL23_W, tl: 0.10, tr: 0,    numLabel: 'II',  numSize: 36 },
  3: { color: '#CD7F32', shade: '#8B4513', blockH: 112, colW: COL23_W, tl: 0,    tr: 0.20, numLabel: 'III', numSize: 28 },
} as const;

function PodiumBlock({ player, cfg }: {
  player: Player & { rank: 1 | 2 | 3 };
  cfg: typeof PODIUM_CFG[1 | 2 | 3];
}) {
  const isFirst = player.rank === 1;
  const W = cfg.colW;
  const H = cfg.blockH;
  const tlY = H * cfg.tl;
  const trY = H * cfg.tr;
  const polyPts = `0,${tlY} ${W},${trY} ${W},${H} 0,${H}`;
  const numPaddingTop = Math.max(tlY, trY) + 12;

  return (
    <View style={[styles.podiumCol, { width: W, zIndex: isFirst ? 20 : 10 }]}>
      <View style={[styles.podiumAvatarWrap, { marginBottom: isFirst ? 10 : 6 }]}>
        <Avatar
          initials={player.initials}
          color={player.color}
          source={player.char ? CHARS[player.char] : undefined}
          width={isFirst ? 88 : 70}
          height={isFirst ? 110 : 88}
          borderRadius={isFirst ? 44 : 35}
          borderWidth={isFirst ? 5 : 3}
          borderColor={cfg.color}
        />
        <Text style={[styles.podiumName, { fontSize: isFirst ? 13 : 11 }]} numberOfLines={1}>
          {player.name.split(' ')[0]}
        </Text>
        <Text style={[styles.podiumXp, { color: cfg.shade, fontSize: isFirst ? 13 : 11 }]}>
          {player.xp.toLocaleString()} XP
        </Text>
      </View>

      <View style={{ width: W, height: H }}>
        <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
          <Polygon points={polyPts} fill={cfg.color} />
          <Rect x={0} y={H - 10} width={W} height={10} fill={cfg.shade} />
        </Svg>
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', paddingTop: numPaddingTop }]}>
          <Text style={{ fontSize: cfg.numSize, fontWeight: '900', color: cfg.shade, opacity: 0.4, lineHeight: cfg.numSize * 1.15 }}>
            {cfg.numLabel}
          </Text>
        </View>
      </View>
    </View>
  );
}

function charFromId(id: string): 1|2|3|4|5 {
  const n = parseInt(id.replace(/-/g, '').slice(0, 2), 16);
  return ((n % 5) + 1) as 1|2|3|4|5;
}

export default function RankingTab() {
  const [allPlayers, setAllPlayers] = useState<(Player & { rank: number })[]>([]);
  const [myInitials, setMyInitials] = useState('EU');
  const [myChar, setMyChar]         = useState<1|2|3|4|5>(1);
  const [loading, setLoading]       = useState(true);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setLoading(true);
        try {
          const [profile, name, userId, char] = await Promise.all([
            getProfileData(), getUserName(), getUserId(), getUserChar(),
          ]);
          setMyChar((char >= 1 && char <= 5 ? char : 1) as 1|2|3|4|5);

          const myXp   = profile?.xp ?? 0;
          const myName = name || 'Você';
          const myInits = myName.trim().slice(0, 2).toUpperCase() || 'EU';
          setMyInitials(myInits);

          // Começa com os mocks como base
          let combined: Player[] = [...MOCK_PLAYERS];

          // Tenta buscar jogadores reais da API
          try {
            const res = await fetch(`${API_BASE_URL}/ranking`, {
              headers: { 'Bypass-Tunnel-Reminder': 'true' },
            });
            if (res.ok) {
              const data: Array<{ usuario_id: string; nome: string; xp: number }> = await res.json();
              const real: Player[] = data.map((u, i) => ({
                name:     u.nome,
                initials: u.nome.trim().slice(0, 2).toUpperCase() || '??',
                xp:       u.xp,
                color:    PLAYER_COLORS[i % PLAYER_COLORS.length],
                char:     !!userId && u.usuario_id === userId ? myChar : charFromId(u.usuario_id),
                isMe:     !!userId && u.usuario_id === userId,
              }));
              // Adiciona reais; remove mock com mesmo nome se conflitar
              const realNames = new Set(real.map(p => p.name.toLowerCase()));
              combined = [
                ...combined.filter(m => !realNames.has(m.name.toLowerCase())),
                ...real,
              ];
            }
          } catch {
            // Servidor indisponível — mantém só os mocks
          }

          // Garante que o usuário local aparece (com flag isMe)
          const alreadyIn = userId && combined.some(p => p.isMe);
          if (!alreadyIn) {
            combined.push({
              name: myName, initials: myInits,
              xp: myXp, color: '#0061a2', char: myChar, isMe: true,
            });
          }

          const sorted = combined
            .sort((a, b) => b.xp - a.xp)
            .map((p, i) => ({ ...p, rank: i + 1 })) as (Player & { rank: number })[];

          setAllPlayers(sorted);
        } catch (e) {
          console.warn('Ranking error:', e);
          // Fallback total: só mocks + usuário local
          setAllPlayers(
            MOCK_PLAYERS
              .map((p, i) => ({ ...p, rank: i + 1 })) as (Player & { rank: number })[]
          );
        } finally {
          setLoading(false);
        }
      })();
    }, [])
  );

  const top3        = allPlayers.slice(0, 3) as (Player & { rank: 1 | 2 | 3 })[];
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);
  const rest        = allPlayers.filter(p => p.rank > 3);

  return (
    <View style={styles.root}>
      <AppHeader
        initials={myInitials}
        avatarSource={CHARS[myChar]}
        rightSlot={
          <View style={styles.trophyBadge}>
            <Ionicons name="trophy" size={18} color="#ca8a04" />
          </View>
        }
      />

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#0061a2" />
          <Text style={styles.loadingText}>Carregando ranking…</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <Text style={styles.pageTitle}>Mural dos Heróis</Text>
          <Text style={styles.pageSub}>Cada palavra é uma nova conquista!</Text>

          {top3.length >= 3 && (
            <View style={styles.podiumWrap}>
              {podiumOrder.map((p) => (
                <PodiumBlock
                  key={`${p.name}-${p.rank}`}
                  player={p as Player & { rank: 1 | 2 | 3 }}
                  cfg={PODIUM_CFG[p.rank as 1 | 2 | 3]}
                />
              ))}
            </View>
          )}

          <View style={styles.listSection}>
            {rest.map((p) =>
              p.isMe ? (
                <View key={`${p.name}-${p.rank}`} style={styles.rowMe}>
                  <Text style={[styles.rankNum, styles.rankNumMe]}>{p.rank}</Text>
                  <Avatar
                    initials={p.initials}
                    color={p.color}
                    source={p.char ? CHARS[p.char] : undefined}
                    size={48}
                    borderRadius={24}
                    borderWidth={2}
                    borderColor="#0061a2"
                  />
                  <View style={styles.playerInfo}>
                    <Text style={[styles.playerName, styles.playerNameMe]}>{p.name}</Text>
                    <Text style={styles.youLabel}>Você</Text>
                  </View>
                  <Text style={[styles.xpText, styles.xpTextMe]}>
                    {p.xp.toLocaleString()}<Text style={styles.xpUnit}> XP</Text>
                  </Text>
                </View>
              ) : (
                <View key={`${p.name}-${p.rank}`} style={styles.rowRegular}>
                  <Text style={styles.rankNum}>{p.rank}</Text>
                  <Avatar
                    initials={p.initials}
                    color={p.color}
                    source={p.char ? CHARS[p.char] : undefined}
                    size={48}
                    borderRadius={24}
                  />
                  <View style={styles.playerInfo}>
                    <Text style={styles.playerName}>{p.name}</Text>
                  </View>
                  <Text style={styles.xpText}>
                    {p.xp.toLocaleString()}<Text style={styles.xpUnit}> XP</Text>
                  </Text>
                </View>
              )
            )}
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f7fafd' },

  trophyBadge: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#fefce8',
    borderWidth: 1, borderColor: '#fde68a',
    justifyContent: 'center', alignItems: 'center',
  },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: '#707883', fontWeight: '500' },

  scroll: { paddingHorizontal: 20, paddingBottom: 16 },

  pageTitle: {
    fontSize: 30, fontWeight: '800', color: '#181c1e',
    textAlign: 'center', marginTop: 20, marginBottom: 4, letterSpacing: -0.5,
  },
  pageSub: { fontSize: 14, color: '#707883', textAlign: 'center', marginBottom: 20 },

  podiumWrap: {
    flexDirection: 'row', alignItems: 'flex-end',
    justifyContent: 'center', marginBottom: 28, marginTop: 8,
  },
  podiumCol:       { alignItems: 'center' },
  podiumAvatarWrap:{ alignItems: 'center', gap: 4 },
  podiumName:      { fontWeight: '700', color: '#181c1e', textAlign: 'center', maxWidth: 80 },
  podiumXp:        { fontWeight: '600', textAlign: 'center' },

  listSection: { gap: 8 },

  rowRegular: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderRadius: 16, backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  rowMe: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderRadius: 16,
    backgroundColor: '#dbeafe',
    borderWidth: 2, borderColor: '#0061a2',
    elevation: 3,
  },

  rankNum:      { fontSize: 14, fontWeight: '800', color: '#9CA3AF', width: 22, textAlign: 'center' },
  rankNumMe:    { color: '#0061a2' },
  playerInfo:   { flex: 1 },
  playerName:   { fontSize: 14, fontWeight: '700', color: '#181c1e' },
  playerNameMe: { color: '#0061a2' },
  youLabel:     { fontSize: 10, fontWeight: '700', color: '#0061a2', letterSpacing: 0.5, marginTop: 1 },
  xpText:       { fontSize: 14, fontWeight: '700', color: '#707883' },
  xpTextMe:     { color: '#0061a2', fontWeight: '800' },
  xpUnit:       { fontSize: 11, fontWeight: '600' },
});
