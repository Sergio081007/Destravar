import { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSpring, 
  withSequence,
  withDelay
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  visible: boolean;
  heartsLeft: number;
  onClose: () => void;
  onExit: () => void;
};

const MAX_HEARTS = 5;

export default function HeartLostModal({ visible, heartsLeft, onClose, onExit }: Props) {
  const overlayOpacity = useSharedValue(0);
  const cardScale = useSharedValue(0.8);
  const cardTranslateY = useSharedValue(50);
  
  // Animação de tremor (shake) para o coração que quebrou
  const shakeAnim = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      overlayOpacity.value = withTiming(1, { duration: 300 });
      cardScale.value = withSpring(1, { damping: 15, stiffness: 200 });
      cardTranslateY.value = withSpring(0, { damping: 15, stiffness: 200 });
      
      // Tremor no coração que acabou de quebrar
      shakeAnim.value = withDelay(
        400,
        withSequence(
          withTiming(-10, { duration: 50 }),
          withTiming(10, { duration: 50 }),
          withTiming(-10, { duration: 50 }),
          withTiming(10, { duration: 50 }),
          withTiming(0, { duration: 50 })
        )
      );
    } else {
      overlayOpacity.value = withTiming(0, { duration: 250 });
      cardScale.value = withTiming(0.9, { duration: 250 });
      cardTranslateY.value = withTiming(20, { duration: 250 });
    }
  }, [visible]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
    transform: [
      { scale: cardScale.value },
      { translateY: cardTranslateY.value }
    ]
  }));
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeAnim.value }]
  }));

  if (!visible) return null;

  const outOfLives = heartsLeft <= 0;

  return (
    <Animated.View style={[styles.overlay, overlayStyle]}>
      <Animated.View style={[styles.card, cardStyle]}>
        
        <View style={styles.iconRing}>
          <View style={styles.iconCircle}>
            <Ionicons name="warning" size={40} color="#ef4444" />
          </View>
        </View>

        <Text style={styles.title}>Ops, você perdeu uma vida!</Text>
        <Text style={styles.subtitle}>
          {outOfLives 
            ? 'Você ficou sem vidas. Volte mais tarde para tentar novamente!' 
            : 'Não se preocupe, errar faz parte do aprendizado.'}
        </Text>

        <View style={styles.heartsContainer}>
          {Array.from({ length: MAX_HEARTS }).map((_, i) => {
            // Os corações são preenchidos da esquerda para a direita (índices 0 a heartsLeft-1)
            // Se eu tenho 3 vidas, índices 0, 1, 2 estão cheios. O 3 acabou de quebrar. O 4 já estava quebrado.
            const isRemaining = i < heartsLeft;
            const isJustLost = i === heartsLeft; // O coração que acabei de perder
            
            let iconName: keyof typeof Ionicons.glyphMap = 'heart';
            let iconColor = '#ef4444';

            if (isRemaining) {
              iconName = 'heart';
              iconColor = '#ef4444';
            } else if (isJustLost) {
              iconName = 'heart-dislike'; // Coração partido
              iconColor = '#ef4444';
            } else {
              iconName = 'heart-outline';
              iconColor = '#d1d5db'; // Cinza para os já perdidos anteriormente
            }

            return (
              <Animated.View 
                key={i} 
                style={[styles.heartSlot, isJustLost && shakeStyle]}
              >
                <Ionicons name={iconName} size={42} color={iconColor} />
              </Animated.View>
            );
          })}
        </View>

        <Text style={styles.countText}>
          {heartsLeft} de {MAX_HEARTS} vidas restantes
        </Text>

        {outOfLives ? (
          <TouchableOpacity style={[styles.btn, styles.btnExit]} onPress={onExit}>
            <Text style={styles.btnExitText}>Sair</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.btn, styles.btnContinue]} onPress={onClose}>
            <Text style={styles.btnContinueText}>Entendi</Text>
          </TouchableOpacity>
        )}

      </Animated.View>
    </Animated.View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    paddingHorizontal: 20,
  },
  card: {
    width: width - 40,
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  iconRing: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: '#fee2e2',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: '#fca5a5',
    justifyContent: 'center', alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#181c1e',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#707883',
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
    marginBottom: 24,
  },
  heartsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  heartSlot: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  countText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9ca3af',
    marginBottom: 32,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  btn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnContinue: {
    backgroundColor: '#ef4444',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnContinueText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.3,
  },
  btnExit: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  btnExitText: {
    color: '#4b5563',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.3,
  },
});
