import { useSharedValue, withTiming, Easing, runOnJS } from 'react-native-reanimated';
import { Dimensions } from 'react-native';

const SCREEN_W = Dimensions.get('window').width;

export function useExerciseTransition() {
  const slideX      = useSharedValue(0);
  const checkScale  = useSharedValue(0);
  const progressAnim = useSharedValue(0.5); // 0–1; começa em 50% (etapa 1 de 2)

  function completeAndAdvance(onAdvance: () => void) {
    // Microinteração (600 ms): check aparece + barra vai a 100%
    checkScale.value  = withTiming(1, { duration: 250, easing: Easing.out(Easing.back(2)) });
    progressAnim.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.ease) });

    setTimeout(() => {
      // Slide horizontal de ambos os painéis para a esquerda (300 ms)
      slideX.value = withTiming(
        -SCREEN_W,
        { duration: 300, easing: Easing.inOut(Easing.ease) },
        (finished) => { if (finished) runOnJS(onAdvance)(); },
      );
    }, 600);
  }

  return { slideX, checkScale, progressAnim, completeAndAdvance };
}
