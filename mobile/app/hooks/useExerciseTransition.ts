import { useSharedValue, withTiming, Easing, runOnJS } from 'react-native-reanimated';
import { Dimensions } from 'react-native';

const SCREEN_W = Dimensions.get('window').width;

export function useExerciseTransition() {
  const slideX      = useSharedValue(0);
  const checkScale  = useSharedValue(0);

  function completeAndAdvance(onAdvance: () => void, nextIndex: number = 1) {
    // Microinteração (600 ms): check aparece
    checkScale.value  = withTiming(1, { duration: 250, easing: Easing.out(Easing.back(2)) });

    setTimeout(() => {
      // Slide horizontal do container inteiro
      slideX.value = withTiming(
        -SCREEN_W * nextIndex,
        { duration: 300, easing: Easing.inOut(Easing.ease) },
        (finished) => { 
          if (finished) {
            runOnJS(onAdvance)(); 
            checkScale.value = 0; // Reseta o check para a próxima etapa
          }
        },
      );
    }, 600);
  }

  return { slideX, checkScale, completeAndAdvance };
}
