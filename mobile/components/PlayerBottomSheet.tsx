import { useEffect, useRef } from 'react';
import {
  Modal, View, Text, TouchableOpacity, Animated, StyleSheet,
  ScrollView, ImageSourcePropType,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from './Avatar';
import { Colors, Shadow } from '../constants/theme';
import { calcularNivel } from '../utils/calcularXP';

const CHARS: Record<number, ImageSourcePropType> = {
  1: require('../assets/characters/char1.png'),
  2: require('../assets/characters/char2.png'),
  3: require('../assets/characters/char3.png'),
  4: require('../assets/characters/char4.png'),
  5: require('../assets/characters/char5.png'),
};

const LEVEL_TITLES = [
  '',
  'Iniciante das Palavras',
  'Explorador de Palavras',
  'Mestre das Palavras',
  'Elite das Palavras',
  'Lendário das Palavras',
];

const ACHIEVEMENTS = [
  { id: 'voz',      xp: 250,  icon: 'mic'       as const, title: 'Primeira Voz', bg: '#eff6ff', color: '#2563eb' },
  { id: 'conf',     xp: 500,  icon: 'chatbubble' as const, title: 'Confiante',    bg: '#f0fdf4', color: '#16a34a' },
  { id: 'mestre',   xp: 750,  icon: 'medal'      as const, title: 'Mestre',       bg: '#fffbeb', color: '#d97706' },
  { id: 'orador',   xp: 1000, icon: 'megaphone'  as const, title: 'Avançado',     bg: '#fdf4ff', color: '#9333ea' },
  { id: 'elite',    xp: 1250, icon: 'star'       as const, title: 'Elite',        bg: '#fff7ed', color: '#ea580c' },
  { id: 'campeao',  xp: 1500, icon: 'trophy'     as const, title: 'Campeão',      bg: '#fefce8', color: '#ca8a04' },
  { id: 'lendario', xp: 1750, icon: 'flame'      as const, title: 'Lendário',     bg: '#fef2f2', color: '#dc2626' },
];

export type PlayerSheetData = {
  name: string;
  xp: number;
  char?: number;
  color: string;
  initials: string;
  rank?: number;
};

type Props = {
  player: PlayerSheetData | null;
  onClose: () => void;
};

export default function PlayerBottomSheet({ player, onClose }: Props) {
  const translateY = useRef(new Animated.Value(600)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  const visible = player !== null;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 22,
          stiffness: 200,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 600,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!player) return null;

  const nivel = calcularNivel(player.xp);
  const levelTitle = LEVEL_TITLES[nivel] ?? '';
  const charSource = player.char ? CHARS[player.char] : undefined;

  return (
    <Modal transparent visible={visible} onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root} pointerEvents="box-none">
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        </Animated.View>

        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          <View style={styles.handle} />

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
            bounces={false}
          >
            {/* Avatar + identity */}
            <View style={styles.header}>
              <View style={styles.avatarWrap}>
                <Avatar
                  initials={player.initials}
                  color={player.color}
                  source={charSource}
                  size={96}
                  borderRadius={48}
                  borderWidth={4}
                  borderColor={Colors.primary}
                />
                {player.rank != null && (
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankBadgeText}>#{player.rank}</Text>
                  </View>
                )}
              </View>

              <Text style={styles.playerName}>{player.name}</Text>

              <View style={styles.levelRow}>
                <View style={styles.levelPill}>
                  <Text style={styles.levelPillText}>Nível {nivel}</Text>
                </View>
                <Text style={styles.levelTitle}>{levelTitle}</Text>
              </View>

              <View style={styles.xpRow}>
                <Ionicons name="flash" size={16} color={Colors.tertiaryContainer} />
                <Text style={styles.xpValue}>{player.xp.toLocaleString()}</Text>
                <Text style={styles.xpLabel}> XP</Text>
              </View>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Conquistas */}
            <Text style={styles.sectionTitle}>Conquistas</Text>
            <View style={styles.achievementGrid}>
              {ACHIEVEMENTS.map((a) => {
                const unlocked = player.xp >= a.xp;
                return (
                  <View
                    key={a.id}
                    style={[
                      styles.achievementItem,
                      { backgroundColor: unlocked ? a.bg : Colors.surfaceContainerLow, opacity: unlocked ? 1 : 0.5 },
                    ]}
                  >
                    <Ionicons
                      name={a.icon}
                      size={22}
                      color={unlocked ? a.color : Colors.gray}
                    />
                    <Text
                      style={[styles.achievementLabel, { color: unlocked ? a.color : Colors.gray }]}
                      numberOfLines={1}
                    >
                      {a.title}
                    </Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>

          {/* Fechar */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.75}>
            <Text style={styles.closeBtnText}>Fechar</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },

  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
    maxHeight: '85%',
    ...Shadow.lg,
  },

  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.outlineVariant,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },

  content: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },

  header: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },

  avatarWrap: {
    position: 'relative',
    marginBottom: 4,
  },

  rankBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  rankBadgeText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '800',
  },

  playerName: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.dark,
    textAlign: 'center',
  },

  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  levelPill: {
    backgroundColor: Colors.primaryContainer,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  levelPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },

  levelTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },

  xpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  xpValue: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.dark,
  },
  xpLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.outline,
  },

  divider: {
    height: 1,
    backgroundColor: Colors.surfaceVariant,
    marginBottom: 20,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.dark,
    marginBottom: 12,
  },

  achievementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  achievementItem: {
    width: '30%',
    flexGrow: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
  },
  achievementLabel: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },

  closeBtn: {
    marginHorizontal: 24,
    marginTop: 16,
    paddingVertical: 13,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.onSurfaceVariant,
  },
});
