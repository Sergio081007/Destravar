import React, { useState, useRef } from 'react'; // Adicionamos o useRef
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform, 
  TouchableWithoutFeedback, 
  Keyboard,
  TouchableOpacity 
} from 'react-native';
import LottieView from 'lottie-react-native';
import { useFonts } from 'expo-font';
import { useRouter } from 'expo-router';

export default function ConhecerScreen() {
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [mostrarBoasVindas, setMostrarBoasVindas] = useState(false);
  
  // Controle remoto da animação
  const animationRef = useRef<LottieView>(null);

  const [fontsLoaded] = useFonts({
    'Fredoka-Destaque': require('../../assets/fonts/Fredoka-Bold.ttf'),
    'Nunito-Corpo': require('../../assets/fonts/Nunito-Regular.ttf'),
  });

  if (!fontsLoaded) return null;

  const confirmarNome = () => {
    if (nome.trim().length > 0) {
      Keyboard.dismiss();
      setMostrarBoasVindas(true);
      
      // Para a animação no frame atual ou final para ela ficar "estável"
      animationRef.current?.pause(); 
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.container}
      >
        <View style={styles.inner}>
          <Text style={styles.headerLabel}>CONHECER</Text>
          <Text style={styles.title}>Qual é o seu nome?</Text>

          <TextInput
            style={styles.input}
            placeholder="Seu nome"
            value={nome}
            onChangeText={(text) => {
              setNome(text);
              if (mostrarBoasVindas) {
                setMostrarBoasVindas(false);
                animationRef.current?.play(); // Volta a animar se ele mudar o nome
              }
            }}
            placeholderTextColor="#CCC"
            onSubmitEditing={confirmarNome} 
          />

          {/* Balão de fala estilizado */}
          {mostrarBoasVindas && (
            <View style={styles.speechBubbleContainer}>
              <View style={styles.speechBubble}>
                <Text style={styles.speechBubbleText}>
                  Olá, {nome.trim()}! Prazer em conhecer você
                </Text>
                {/* A pontinha do balão */}
                <View style={styles.speechBubblePointer} />
              </View>
            </View>
          )}

          {/* Mesma animação, controlada pela Ref */}
          <LottieView
            ref={animationRef}
            source={require('../animations/personagem.json')}
            autoPlay
            loop={!mostrarBoasVindas} // Para de repetir quando mostra as boas-vindas
            speed={-1} 
            style={styles.characterAnimation}
          />

          {!mostrarBoasVindas ? (
            <TouchableOpacity 
              style={[
                styles.button, 
                { backgroundColor: nome.trim().length > 0 ? '#1CB0F6' : '#E5E5E5' }
              ]}
              disabled={nome.trim().length === 0}
              onPress={confirmarNome}
            >
              <Text style={[
                styles.buttonText,
                { color: nome.trim().length > 0 ? '#FFF' : '#AFAFAF' }
              ]}>
                CONTINUAR
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.button, { backgroundColor: '#1CB0F6' }]}
              onPress={() => router.push('/board screens/onboarding')}
            >
              <Text style={[styles.buttonText, { color: '#FFF' }]}>
                AVANÇAR
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  inner: { padding: 30, flex: 1, paddingTop: 60 },
  headerLabel: { fontFamily: 'Nunito-Corpo', fontSize: 14, fontWeight: 'bold', color: '#000', marginBottom: 8 },
  title: { fontFamily: 'Fredoka-Destaque', fontSize: 28, color: '#000', marginBottom: 25 },
  input: { height: 55, borderWidth: 2, borderColor: '#E5E5E5', borderRadius: 16, paddingHorizontal: 20, fontFamily: 'Nunito-Corpo', fontSize: 18, color: '#333', marginBottom: 20 },
  
  // Estilo do Balão de Fala
  speechBubbleContainer: {
    position: 'absolute',
    top: '45%', // Ajuste conforme a altura da mão da personagem
    right: 30,
    zIndex: 10,
    alignItems: 'center',
  },
  speechBubble: {
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#000',
    borderRadius: 20,
    padding: 15,
    maxWidth: 200,
  },
  speechBubbleText: { fontFamily: 'Nunito-Corpo', fontSize: 16, textAlign: 'center' },
  speechBubblePointer: {
    position: 'absolute',
    bottom: -10,
    left: 20,
    width: 20,
    height: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1.5,
    borderRightWidth: 1.5,
    borderColor: '#000',
    transform: [{ rotate: '45deg' }], // Cria o triângulo com um quadrado rotacionado
  },

  button: { height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  buttonText: { fontFamily: 'Fredoka-Destaque', fontSize: 16, fontWeight: 'bold' },
  characterAnimation: { width: '100%', height: 400, marginTop: 'auto' },
});