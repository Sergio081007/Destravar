import { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';

import ChallengeHeader from '../components/ChallengeHeader';
import BreathingExercise from './Exercicio1Page';
import Treinar from './TrainingPage';
import Exercicio3 from './Exercicio3Page';
import ConfirmExitModal from '../components/ConfirmExitModal';
import { useExerciseTransition } from '../hooks/useExerciseTransition';

const SCREEN_W = Dimensions.get('window').width;



export default function Desafio() {
  const router = useRouter();
  const navigation = useNavigation();
  const { dificuldade: rawDiff, startAt, fase: rawFase, exercicio: rawEx } = useLocalSearchParams<{ dificuldade: string, startAt?: string, fase?: string, exercicio?: string }>();
  const dificuldade = rawDiff || 'facil';
  const fase = parseInt(rawFase || '1', 10);
  const exercicio = parseInt(rawEx || '1', 10);
  const c1 = '#0061a2';

  const [phase, setPhase] = useState<'breathing' | 'speech' | 'smoothing'>(
    startAt === 'speech' ? 'speech' : 'breathing'
  );
  const [showExitModal, setShowExitModal] = useState(false);
  const [allowExit, setAllowExit] = useState(false);
  const pendingExitAction = useRef<any>(null);

  const { slideX, checkScale, completeAndAdvance } = useExerciseTransition();

  // Intercepta hardware back / gesto de swipe — o modal de saída fica aqui
  useEffect(() => {
    const unsubscribe = (navigation as any).addListener('beforeRemove', (e: any) => {
      if (allowExit) return;
      e.preventDefault();
      pendingExitAction.current = e.data.action;
      setShowExitModal(true);
    });
    return unsubscribe;
  }, [navigation, allowExit]);

  // Se o usuário entrou no modo Replay (startAt === 'speech'), desloca a tela inicial
  useEffect(() => {
    if (startAt === 'speech') {
      slideX.value = -SCREEN_W;
    }
  }, [startAt]);

  // Slide: breathing vai para -SCREEN_W, speech entra de +SCREEN_W
  const breathStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slideX.value }],
  }));
  const speechStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slideX.value + SCREEN_W }],
  }));
  const smoothingStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slideX.value + SCREEN_W * 2 }],
  }));

  function handleBreathingComplete() {
    completeAndAdvance(() => setPhase('speech'), 1);
  }

  function handleSpeechComplete() {
    completeAndAdvance(() => setPhase('smoothing'), 2);
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
        checkScale={checkScale}
        onBack={() => setShowExitModal(true)}
      />

      {/* Área de conteúdo: dois painéis sobrepostos que deslizam juntos */}
      <View style={styles.panelContainer}>
        <Animated.View style={[StyleSheet.absoluteFill, breathStyle]}>
          <BreathingExercise
            isPanel
            fase={fase}
            onComplete={handleBreathingComplete}
          />
        </Animated.View>

        <Animated.View style={[StyleSheet.absoluteFill, speechStyle]}>
          {/* Painel montado apenas após a transição para poupar memória */}
          {(phase === 'speech' || phase === 'smoothing') && (
            <Treinar
              isPanel
              fase={fase}
              onExit={() => setShowExitModal(true)}
              onComplete={handleSpeechComplete}
            />
          )}
        </Animated.View>

        <Animated.View style={[StyleSheet.absoluteFill, smoothingStyle]}>
          {phase === 'smoothing' && (
            <Exercicio3
              dificuldade={dificuldade}
              onExit={() => setShowExitModal(true)}
              onFinalExit={() => {
                setAllowExit(true);
                setTimeout(() => router.replace('/(tabs)'), 0);
              }}
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
