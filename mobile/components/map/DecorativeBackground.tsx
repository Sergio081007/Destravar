import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export function DecorativeBackground() {
  const floatAnim1 = useRef(new Animated.Value(0)).current;
  const floatAnim2 = useRef(new Animated.Value(0)).current;
  const floatAnim3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const float1 = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim1, { toValue: -10, duration: 3000, useNativeDriver: true }),
        Animated.timing(floatAnim1, { toValue: 0, duration: 3000, useNativeDriver: true }),
      ])
    );
    const float2 = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim2, { toValue: -8, duration: 4000, useNativeDriver: true }),
        Animated.timing(floatAnim2, { toValue: 0, duration: 4000, useNativeDriver: true }),
      ])
    );
    const float3 = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim3, { toValue: -12, duration: 3500, useNativeDriver: true }),
        Animated.timing(floatAnim3, { toValue: 0, duration: 3500, useNativeDriver: true }),
      ])
    );

    float1.start();
    float2.start();
    float3.start();

    return () => {
      float1.stop();
      float2.stop();
      float3.stop();
    };
  }, []);

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.decoLayer]}>
      {/* Nuvens Superiores */}
      <Animated.View style={[styles.deco, { top: 70, left: '8%', transform: [{ translateY: floatAnim1 }] }]}>
        <MaterialCommunityIcons name="cloud" size={80} color="rgba(0,97,162,0.10)" />
      </Animated.View>
      <Animated.View style={[styles.deco, { top: 300, right: '10%', transform: [{ translateY: floatAnim2 }] }]}>
        <MaterialCommunityIcons name="cloud" size={60} color="rgba(94,65,208,0.10)" />
      </Animated.View>
      <Animated.View style={[styles.deco, { top: 600, left: '5%', transform: [{ translateY: floatAnim1 }] }]}>
        <MaterialCommunityIcons name="cloud" size={70} color="rgba(0,97,162,0.10)" />
      </Animated.View>
      
      {/* Árvores Superiores */}
      <View style={[styles.deco, { top: 200, left: '14%' }]}>
        <MaterialCommunityIcons name="tree" size={36} color="rgba(0,97,162,0.15)" />
      </View>
      <View style={[styles.deco, { top: 430, right: '10%' }]}>
        <MaterialCommunityIcons name="tree" size={44} color="rgba(0,97,162,0.15)" />
      </View>
      
      {/* Nuvens e Árvores Inferiores */}
      <Animated.View style={[styles.deco, { top: 850, right: '8%', transform: [{ translateY: floatAnim2 }] }]}>
        <MaterialCommunityIcons name="cloud" size={65} color="rgba(0,97,162,0.10)" />
      </Animated.View>
      <View style={[styles.deco, { top: 720, left: '10%' }]}>
        <MaterialCommunityIcons name="tree" size={44} color="rgba(94,65,208,0.15)" />
      </View>
      <View style={[styles.deco, { top: 1000, right: '8%' }]}>
        <MaterialCommunityIcons name="tree" size={40} color="rgba(0,97,162,0.15)" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  decoLayer: { zIndex: 0 },
  deco: { position: 'absolute' },
});
