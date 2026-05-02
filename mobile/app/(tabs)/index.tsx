import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, Platform, Dimensions,
} from 'react-native';
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { getProfileData, getLevelProgress, getUserName, getUserChar } from '../utils/storage';
import AppHeader from '../components/AppHeader';

const CHARS = {
  1: require('../../assets/characters/char1.png'),
  2: require('../../assets/characters/char2.png'),
  3: require('../../assets/characters/char3.png'),
  4: require('../../assets/characters/char4.png'),
  5: require('../../assets/characters/char5.png'),
} as const;

const { width: SCREEN_W } = Dimensions.get('window');

// SVG path that passes through each node center with cubic Bézier curves
function buildSvgPath(): string {
  const cx = SCREEN_W / 2;
  const pts = ACTIVITY_NODES.map((n, i) => ({
    x: cx + n.offset,
    y: SVG_PATH_TOP + i * NODE_ROW_H + NODE_ROW_H / 2,
  }));

  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const curr = pts[i];
    const next = pts[i + 1];
    const cy = (curr.y + next.y) / 2;
    d += ` C ${curr.x} ${cy}, ${next.x} ${cy}, ${next.x} ${next.y}`;
  }
  return d;
}

// Each node defines its horizontal offset (px) from center — offsets match Stitch design
const ACTIVITY_NODES = [
  { id: 'f1', title: 'Aventura Inicial',   dif: 'facil',   lvl: 0, step: 0, offset:   0, label: 'Aventura Inicial' },
  { id: 'f2', title: 'Trava-língua',        dif: 'facil',   lvl: 0, step: 1, offset:  80, label: undefined },
  { id: 'f3', title: 'Texto Simples',       dif: 'facil',   lvl: 0, step: 2, offset: -48, label: undefined },
  { id: 'm1', title: 'Ritmo das Palavras',  dif: 'medio',   lvl: 1, step: 0, offset:  64, label: undefined },
  { id: 'm2', title: 'Discurso Formal',     dif: 'medio',   lvl: 1, step: 1, offset: -16, label: undefined },
  { id: 'm3', title: 'Texto Médio',         dif: 'medio',   lvl: 1, step: 2, offset:  48, label: undefined },
  { id: 'd1', title: 'Nível Avançado',      dif: 'dificil', lvl: 2, step: 0, offset: -64, label: undefined },
  { id: 'd2', title: 'Discurso Elite',      dif: 'dificil', lvl: 2, step: 1, offset:  48, label: undefined },
  { id: 'd3', title: 'Mestre Final',        dif: 'dificil', lvl: 2, step: 2, offset:   0, label: undefined },
] as const;

type NodeType = 'completed' | 'active' | 'locked' | 'special';

const NODE_ROW_H = 155;
const SVG_PATH_TOP = 20;

export default function DesafiosTab() {
  const router = useRouter();
  const bounceAnim  = useRef(new Animated.Value(0)).current;
  const floatAnim1  = useRef(new Animated.Value(0)).current;
  const floatAnim2  = useRef(new Animated.Value(0)).current;
  const floatAnim3  = useRef(new Animated.Value(0)).current;

  const [xp, setXp]         = useState(0);
  const [streak, setStreak] = useState(0);
  const [myInitials, setMyInitials] = useState('AP');
  const [charIdx, setCharIdx]       = useState<1|2|3|4|5>(1);
  const [progress, setProgress] = useState({
    nivel1_completos: 0, nivel2_completos: 0, nivel3_completos: 0,
  });

  // Animations
  useEffect(() => {
    const bounce = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: -8, duration: 550, useNativeDriver: true }),
        Animated.timing(bounceAnim, { toValue: 0,  duration: 550, useNativeDriver: true }),
      ])
    );
    const float1 = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim1, { toValue: -10, duration: 3000, useNativeDriver: true }),
        Animated.timing(floatAnim1, { toValue: 0,   duration: 3000, useNativeDriver: true }),
      ])
    );
    const float2 = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim2, { toValue: -8, duration: 4000, useNativeDriver: true }),
        Animated.timing(floatAnim2, { toValue: 0,  duration: 4000, useNativeDriver: true }),
      ])
    );
    const float3 = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim3, { toValue: -12, duration: 3500, useNativeDriver: true }),
        Animated.timing(floatAnim3, { toValue: 0,   duration: 3500, useNativeDriver: true }),
      ])
    );
    bounce.start();
    float1.start();
    float2.start();
    float3.start();
    return () => { bounce.stop(); float1.stop(); float2.stop(); float3.stop(); };
  }, []);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [profile, prog, name, char] = await Promise.all([getProfileData(), getLevelProgress(), getUserName(), getUserChar()]);
        setCharIdx((char >= 1 && char <= 5 ? char : 1) as 1|2|3|4|5);
        setXp(profile.xp);
        setStreak(profile.streak);
        setMyInitials(name.trim().slice(0, 2).toUpperCase() || 'AP');
        setProgress(prog);
      })();
    }, [])
  );

  // Derive node states
  const counts = [progress.nivel1_completos, progress.nivel2_completos, progress.nivel3_completos];
  let activeAssigned = false;
  const nodes = ACTIVITY_NODES.map((node, idx): typeof node & { type: NodeType } => {
    const prevDone = node.lvl === 0 ? 3 : counts[node.lvl - 1];
    if (prevDone < 3) {
      return { ...node, type: idx === ACTIVITY_NODES.length - 1 ? 'special' : 'locked' };
    }
    if (node.step < counts[node.lvl]) return { ...node, type: 'completed' };
    if (!activeAssigned) { activeAssigned = true; return { ...node, type: 'active' }; }
    return { ...node, type: 'locked' };
  });

  const xpToday  = Math.min(xp % 300, 300);
  const xpPct    = (xpToday / 300) * 100;
  const svgPath  = buildSvgPath();
  const svgH     = ACTIVITY_NODES.length * NODE_ROW_H + NODE_ROW_H;

  return (
    <ExpoLinearGradient
      colors={['#f7fafd', '#f1f4f7']}
      style={styles.root}
    >
      <AppHeader
        initials={myInitials}
        avatarSource={CHARS[charIdx]}
        rightSlot={
          <View style={styles.flameBadge}>
            <Ionicons name="flame" size={18} color="#ea580c" />
            <Text style={styles.flameNum}>{streak}</Text>
          </View>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Decorative background — floating clouds & trees */}
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.decoLayer]}>
          <Animated.View style={[styles.deco, { top: 70,  left: '8%',  transform: [{ translateY: floatAnim1 }] }]}>
            <MaterialCommunityIcons name="cloud" size={80} color="rgba(0,97,162,0.10)" />
          </Animated.View>
          <Animated.View style={[styles.deco, { top: 300, right: '10%', transform: [{ translateY: floatAnim2 }] }]}>
            <MaterialCommunityIcons name="cloud" size={60} color="rgba(94,65,208,0.10)" />
          </Animated.View>
          <Animated.View style={[styles.deco, { top: 600, left: '5%',  transform: [{ translateY: floatAnim1 }] }]}>
            <MaterialCommunityIcons name="cloud" size={70} color="rgba(0,97,162,0.10)" />
          </Animated.View>
          <View style={[styles.deco, { top: 200, left: '14%' }]}>
            <MaterialCommunityIcons name="tree" size={36} color="rgba(0,97,162,0.15)" />
          </View>
          <View style={[styles.deco, { top: 430, right: '10%' }]}>
            <MaterialCommunityIcons name="tree" size={44} color="rgba(0,97,162,0.15)" />
          </View>
          <View style={[styles.deco, { top: 720, left: '10%' }]}>
            <MaterialCommunityIcons name="tree" size={44} color="rgba(94,65,208,0.15)" />
          </View>
          <View style={[styles.deco, { top: 930, right: '12%' }]}>
            <MaterialCommunityIcons name="tree" size={44} color="rgba(0,97,162,0.15)" />
          </View>

          {/* Clouds — lower section */}
          <Animated.View style={[styles.deco, { top: 480, right: '6%', transform: [{ translateY: floatAnim3 }] }]}>
            <MaterialCommunityIcons name="cloud" size={55} color="rgba(94,65,208,0.10)" />
          </Animated.View>
          <Animated.View style={[styles.deco, { top: 850, right: '8%', transform: [{ translateY: floatAnim2 }] }]}>
            <MaterialCommunityIcons name="cloud" size={65} color="rgba(0,97,162,0.10)" />
          </Animated.View>
          <Animated.View style={[styles.deco, { top: 1100, left: '4%', transform: [{ translateY: floatAnim1 }] }]}>
            <MaterialCommunityIcons name="cloud" size={72} color="rgba(94,65,208,0.08)" />
          </Animated.View>
          <Animated.View style={[styles.deco, { top: 1310, right: '10%', transform: [{ translateY: floatAnim3 }] }]}>
            <MaterialCommunityIcons name="cloud" size={52} color="rgba(0,97,162,0.10)" />
          </Animated.View>

          {/* Trees — lower section */}
          <View style={[styles.deco, { top: 560, right: '14%' }]}>
            <MaterialCommunityIcons name="tree" size={38} color="rgba(94,65,208,0.15)" />
          </View>
          <View style={[styles.deco, { top: 1000, right: '8%' }]}>
            <MaterialCommunityIcons name="tree" size={40} color="rgba(0,97,162,0.15)" />
          </View>
          <View style={[styles.deco, { top: 1220, left: '8%' }]}>
            <MaterialCommunityIcons name="tree" size={44} color="rgba(94,65,208,0.15)" />
          </View>

        </View>

        {/* Caminho SVG sinusoidal real com gradiente */}
        <View style={[StyleSheet.absoluteFill, { top: SVG_PATH_TOP }]} pointerEvents="none">
          <Svg width={SCREEN_W} height={svgH}>
            <Defs>
              <SvgLinearGradient id="pathGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%"   stopColor="#0061a2" stopOpacity="1" />
                <Stop offset="50%"  stopColor="#5e41d0" stopOpacity="1" />
                <Stop offset="100%" stopColor="#4da9ff" stopOpacity="1" />
              </SvgLinearGradient>
            </Defs>
            <Path
              d={svgPath}
              stroke="url(#pathGrad)"
              strokeWidth={32}
              strokeLinecap="round"
              fill="none"
              opacity={0.1}
            />
          </Svg>
        </View>

        {/* Nodes */}
        <View style={styles.nodesContainer}>
          {nodes.map((node) => {
            const isActive    = node.type === 'active';
            const isCompleted = node.type === 'completed';
            const isSpecial   = node.type === 'special';
            const canTap      = isActive || isCompleted;

            return (
              <View key={node.id} style={styles.nodeRow}>
                {node.label && !isActive && (
                  <View style={[styles.labelPill, { transform: [{ translateX: node.offset }] }]}>
                    <Text style={styles.labelText}>{node.label}</Text>
                  </View>
                )}

                <TouchableOpacity
                  disabled={!canTap}
                  activeOpacity={0.8}
                  onPress={() => router.push({ pathname: '/exercicio1', params: { dificuldade: node.dif } })}
                  style={{ transform: [{ translateX: node.offset }], alignItems: 'center' }}
                >
                  {isSpecial ? (
                    <View style={styles.nodeSpecial}>
                      <Ionicons name="gift-outline" size={32} color="rgba(64,71,81,0.4)" />
                    </View>
                  ) : isCompleted ? (
                    <View style={styles.nodeCompleted}>
                      <Ionicons name="star" size={28} color="#fff" />
                    </View>
                  ) : isActive ? (
                    <View style={styles.nodeActive}>
                      <Ionicons name="extension-puzzle" size={32} color="#fff" />
                    </View>
                  ) : (
                    <View style={styles.nodeLocked}>
                      <Ionicons name="lock-closed" size={22} color="#404751" />
                    </View>
                  )}

                  {isActive && (
                    <Animated.View style={[styles.startBadge, { transform: [{ translateY: bounceAnim }] }]}>
                      <Text style={styles.startBadgeText}>Começar</Text>
                      <Ionicons name="play" size={11} color="#fff" />
                    </Animated.View>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* Stats card */}
      <View style={styles.statsCard}>
        <View style={styles.statsLeft}>
          <View style={styles.statsLabelRow}>
            <Text style={styles.statsSmLabel}>XP Hoje</Text>
            <Text style={styles.statsXpVal}>{xpToday} / 300</Text>
          </View>
          <View style={styles.statsBarBg}>
            <View style={[styles.statsBarFill, { width: `${xpPct}%` as any }]} />
          </View>
        </View>
        <View style={styles.statsDivider} />
        <View style={styles.statsRight}>
          <View>
            <Text style={styles.statsSmLabel}>Streak</Text>
            <Text style={styles.streakNum}>{streak}</Text>
          </View>
          <View style={styles.streakIconBg}>
            <Ionicons name="flame" size={22} color="#5e41d0" />
          </View>
        </View>
      </View>
    </ExpoLinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f7fafd' },

  flameBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#fff7ed', borderRadius: 999,
    paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: '#fed7aa',
  },
  flameNum: { fontSize: 13, fontWeight: '800', color: '#ea580c' },

  scroll: { paddingTop: 20, position: 'relative' },

  decoLayer: { zIndex: 0 },
  deco: { position: 'absolute' },


  nodesContainer: {
    paddingHorizontal: 40,
    paddingTop: SVG_PATH_TOP,
    alignItems: 'center',
    zIndex: 10,
  },

  nodeRow: {
    height: NODE_ROW_H,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },

  labelPill: {
    position: 'absolute',
    top: 2,
    backgroundColor: 'rgba(255,255,255,0.80)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  labelText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#5e41d0',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  startBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0061a2',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 999,
    marginTop: 20,
    shadowColor: '#0061a2',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 8,
  },
  startBadgeText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  nodeCompleted: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#5e41d0',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 4, borderColor: '#fff',
    shadowColor: '#5e41d0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },

  nodeActive: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#0061a2',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 8, borderColor: 'rgba(77,169,255,0.3)',
    shadowColor: '#0061a2',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },

  nodeLocked: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#e0e3e6',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 4, borderColor: 'rgba(192,199,211,0.6)',
  },

  nodeSpecial: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#f1f4f7',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 4, borderColor: '#c0c7d3',
    borderStyle: 'dashed',
  },

  statsCard: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#fff',
    shadowColor: '#0061a2',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 12,
  },
  statsLeft: { flex: 1 },
  statsLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  statsSmLabel: {
    fontSize: 10, fontWeight: '700',
    color: '#707883', textTransform: 'uppercase', letterSpacing: 0.5,
  },
  statsXpVal: { fontSize: 12, fontWeight: '700', color: '#0061a2' },
  statsBarBg: { height: 10, backgroundColor: '#ebeef1', borderRadius: 999, overflow: 'hidden' },
  statsBarFill: {
    height: '100%', backgroundColor: '#0061a2', borderRadius: 999,
    shadowColor: '#0061a2', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3, shadowRadius: 6,
  },
  statsDivider: { width: 1, height: 40, backgroundColor: '#c0c7d3', marginHorizontal: 16 },
  statsRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  streakNum: { fontSize: 26, fontWeight: '900', color: '#5e41d0', lineHeight: 30 },
  streakIconBg: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(94,65,208,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
});
