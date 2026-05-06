import { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';

import ChallengeHeader from './components/ChallengeHeader';
import BreathingExercise from './exercicio1';
import Treinar from './treinar';
import ConfirmExitModal from './components/ConfirmExitModal';
import { useExerciseTransition } from './hooks/useExerciseTransition';

const SCREEN_W = Dimensions.get('window').width;

const LEVEL_COLORS: Record<string, string> = {
  facil: '#0061a2', medio: '#10b981', dificil: '#5e41d0',
};

export default function Desafio() {
  const router = useRouter();
  const navigation = useNavigation();
  const { dificuldade: rawDiff } = useLocalSearchParams<{ dificuldade: string }>();
  const dificuldade = rawDiff || 'facil';
  const c1 = LEVEL_COLORS[dificuldade] || '#0061a2';

  const [phase, setPhase] = useState<'breathing' | 'speech'>('breathing');
  const [showExitModal, setShowExitModal] = useState(false);
  const pendingExitAction = useRef<any>(null);

  const { slideX, checkScale, progressAnim, completeAndAdvance } = useExerciseTransition();

  // Intercepta hardware back / gesto de swipe — o modal de saída fica aqui
  useEffect(() => {
    const unsubscribe = (navigation as any).addListener('beforeRemove', (e: any) => {
      e.preventDefault();
      pendingExitAction.current = e.data.action;
      setShowExitModal(true);
    });
    return unsubscribe;
  }, [navigation]);

  // Slide: breathing vai para -SCREEN_W, speech entra de +SCREEN_W
  const breathStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slideX.value }],
  }));
  const speechStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slideX.value + SCREEN_W }],
  }));

  function handleBreathingComplete() {
    completeAndAdvance(() => setPhase('speech'));
  }

  function handleExit() {
    setShowExitModal(false);
    navigation.dispatch(pendingExitAction.current ?? { type: 'GO_BACK' });
  }

  return (
    <View style={styles.root}>
      {/* Cabeçalho fixo — nunca animado, permanece durante o slide */}
      <ChallengeHeader
        dificuldade={dificuldade}
        c1={c1}
        phase={phase}
        progressAnim={progressAnim}
        checkScale={checkScale}
        onBack={() => setShowExitModal(true)}
      />

      {/* Área de conteúdo: dois painéis sobrepostos que deslizam juntos */}
      <View style={styles.panelContainer}>
        <Animated.View style={[StyleSheet.absoluteFill, breathStyle]}>
          <BreathingExercise
            isPanel
            onComplete={handleBreathingComplete}
          />
        </Animated.View>

        <Animated.View style={[StyleSheet.absoluteFill, speechStyle]}>
          {/* Painel montado apenas após a transição para poupar memória */}
          {phase === 'speech' && (
            <Treinar
              isPanel
              onExit={() => setShowExitModal(true)}
            />
          )}
        </Animated.View>
      </View>

      {/* Modal de saída gerenciado pelo container, não pelos painéis */}
      <ConfirmExitModal
        visible={showExitModal}
        onCancel={() => setShowExitModal(false)}
        onConfirm={handleExit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f7fafd' },
  panelContainer: { flex: 1, overflow: 'hidden' },
});
