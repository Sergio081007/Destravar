import React from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type NodeType = 'completed' | 'active' | 'locked';

interface ActivityNodeProps {
  id: string;
  title: string;
  type: NodeType;
  offset: number;
  label?: string;
  noLives?: boolean;
  bounceAnim?: Animated.Value;
  onPress: () => void;
}

export function ActivityNode({ id, title, type, offset, label, noLives = false, bounceAnim, onPress }: ActivityNodeProps) {
  const isActive = type === 'active';
  const isCompleted = type === 'completed';
  const canTap = (isActive && !noLives) || isCompleted;

  return (
    <View style={styles.nodeRow}>
      {label && !isActive && (
        <View style={[styles.labelPill, { transform: [{ translateX: offset }] }]}>
          <Text style={styles.labelText}>{label}</Text>
        </View>
      )}

      <TouchableOpacity
        disabled={!canTap || isCompleted}
        activeOpacity={0.8}
        onPress={onPress}
        style={{ transform: [{ translateX: offset }], alignItems: 'center' }}
      >
        {isCompleted ? (
          <View style={styles.nodeCompleted}>
            <Ionicons name="star" size={28} color="#fff" />
          </View>
        ) : isActive ? (
          <View style={[styles.nodeActive, noLives && styles.nodeActiveDepleted]}>
            <Ionicons
              name={noLives ? 'heart-outline' : 'extension-puzzle'}
              size={32}
              color="#fff"
            />
          </View>
        ) : (
          <View style={styles.nodeLocked}>
            <Ionicons name="lock-closed" size={22} color="#404751" />
          </View>
        )}

        {isActive && !noLives && bounceAnim && (
          <Animated.View style={[styles.startBadge, { transform: [{ translateY: bounceAnim }] }]}>
            <Text style={styles.startBadgeText}>Começar</Text>
            <Ionicons name="play" size={11} color="#fff" />
          </Animated.View>
        )}
        
        {noLives && isActive && (
          <View style={styles.noLivesBadge}>
            <Ionicons name="heart-outline" size={11} color="#fff" />
            <Text style={styles.startBadgeText}>Sem vidas</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  nodeRow: {
    height: 155,
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
    fontSize: 10, fontWeight: '700', color: '#5e41d0',
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  startBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#0061a2', paddingHorizontal: 20, paddingVertical: 8,
    borderRadius: 999, marginTop: 20,
    shadowColor: '#0061a2', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 14, elevation: 8,
  },
  startBadgeText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  nodeCompleted: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#5e41d0', justifyContent: 'center', alignItems: 'center',
    borderWidth: 4, borderColor: '#fff',
    shadowColor: '#5e41d0', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  nodeActive: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#0061a2', justifyContent: 'center', alignItems: 'center',
    borderWidth: 8, borderColor: 'rgba(77,169,255,0.3)',
    shadowColor: '#0061a2', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 20, elevation: 12,
  },
  nodeActiveDepleted: {
    backgroundColor: '#ba1a1a', borderColor: 'rgba(186,26,26,0.2)',
    shadowColor: '#ba1a1a', opacity: 0.75,
  },
  nodeLocked: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#e0e3e6', justifyContent: 'center', alignItems: 'center',
    borderWidth: 4, borderColor: 'rgba(192,199,211,0.6)',
  },
  noLivesBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#ba1a1a', paddingHorizontal: 20, paddingVertical: 8,
    borderRadius: 999, marginTop: 20,
    shadowColor: '#ba1a1a', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 14, elevation: 8,
  },
});
