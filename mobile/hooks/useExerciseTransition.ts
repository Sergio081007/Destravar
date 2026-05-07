import { Dimensions } from 'react-native';
import { useSharedValue, withTiming, runOnJS } from 'react-native-reanimated';

const SCREEN_W = Dimensions.get('window').width;

export function useExerciseTransition() {
  const slideX = useSharedValue(0);
  const checkScale = useSharedValue(0);

  function completeAndAdvance(onDone: () => void, _step: number) {
    const targetX = slideX.value - SCREEN_W;
    slideX.value = withTiming(targetX, { duration: 400 }, (finished) => {
      if (finished) runOnJS(onDone)();
    });
    checkScale.value = withTiming(1, { duration: 200 });
  }

  return { slideX, checkScale, completeAndAdvance };
}
