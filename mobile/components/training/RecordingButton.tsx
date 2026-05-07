import React, { useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, Easing } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadow } from '../../constants/theme';

interface RecordingButtonProps {
  isRecording: boolean;
  isTranscribing: boolean;
  onToggleRecording: () => void;
}

export function RecordingButton({ isRecording, isTranscribing, onToggleRecording }: RecordingButtonProps) {
  const ring1Scale = useSharedValue(1.0);
  const ring1Opacity = useSharedValue(0.4);
  const ring2Scale = useSharedValue(1.0);
  const ring2Opacity = useSharedValue(0.15);

  useEffect(() => {
    ring1Scale.value = withRepeat(
      withSequence(
        withTiming(1.22, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 900, easing: Easing.inOut(Easing.ease) })
      ), -1, false
    );
    ring1Opacity.value = withRepeat(
      withSequence(withTiming(0.15, { duration: 900 }), withTiming(0.45, { duration: 900 })),
      -1, false
    );
    ring2Scale.value = withRepeat(
      withSequence(
        withTiming(1.42, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 1400, easing: Easing.inOut(Easing.ease) })
      ), -1, false
    );
    ring2Opacity.value = withRepeat(
      withSequence(withTiming(0.05, { duration: 1400 }), withTiming(0.18, { duration: 1400 })),
      -1, false
    );
  }, []);

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring1Scale.value }], opacity: ring1Opacity.value,
  }));
  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring2Scale.value }], opacity: ring2Opacity.value,
  }));

  if (isTranscribing) {
    return <Text style={[styles.statusText, { color: Colors.primary }]}>Analisando sua voz... ⏳</Text>;
  }

  return (
    <View style={styles.recordingArea}>
      {!isRecording && (
        <>
          <Animated.View style={[styles.ring2, { borderColor: Colors.primary + '60' }, ring2Style]} />
          <Animated.View style={[styles.ring1, { borderColor: Colors.primary }, ring1Style]} />
        </>
      )}

      <TouchableOpacity
        style={[
          styles.micBtn,
          { backgroundColor: isRecording ? '#dc2626' : Colors.primary, shadowColor: isRecording ? '#dc2626' : Colors.primary },
        ]}
        onPress={onToggleRecording}
        activeOpacity={0.85}
      >
        <Ionicons name={isRecording ? 'square' : 'mic'} size={isRecording ? 38 : 44} color="#fff" />
        <Text style={styles.micBtnLabel}>{isRecording ? 'PARAR' : 'GRAVAR'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  recordingArea: {
    width: 280, height: 280, alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  ring1: {
    position: 'absolute',
    width: 192, height: 192, borderRadius: 96, borderWidth: 2,
    top: 44, left: 44,
  },
  ring2: {
    position: 'absolute',
    width: 256, height: 256, borderRadius: 128, borderWidth: 1.5,
    top: 12, left: 12,
  },
  micBtn: {
    width: 128, height: 128, borderRadius: 64,
    justifyContent: 'center', alignItems: 'center',
    ...Shadow.lg,
    gap: 4,
  },
  micBtnLabel: { color: '#fff', fontWeight: '800', fontSize: 12, letterSpacing: 0.8 },
  statusText: { fontSize: 14, fontWeight: '600', marginTop: 8 },
});
