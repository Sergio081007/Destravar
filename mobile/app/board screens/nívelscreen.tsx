import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import LottieView from 'lottie-react-native';
import { useFonts } from 'expo-font';

export default function NivelScreen() {
  const [fontsLoaded] = useFonts({
    'Fredoka-Destaque': require('../../assets/fonts/Fredoka-Bold.ttf'),
    'Nunito-Corpo': require('../../assets/fonts/Nunito-Regular.ttf'),
  });

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        
        {/* O Mascote Feliz */}
        <View style={styles.animationContainer}>
          <LottieView
            source={require('../animations/Happy Dog.json')}
            autoPlay
            loop
            style={styles.dogAnimation}
          />
        </View>

        {/* Textos de Instrução */}
        <View style={styles.textSection}>
          <Text style={styles.title}>Determinando o seu nível</Text>
          <Text style={styles.subtitle}>
            Vou te fazer algumas perguntas para entender como podemos destravar sua fala juntos!
          </Text>
        </View>

        {/* Botão de Começar - Estilo Duolingo/Lúdico */}
        <TouchableOpacity 
          style={styles.button}
          onPress={() => console.log("Iniciar diagnóstico")}
        >
          <Text style={styles.buttonText}>COMEÇAR</Text>
          {/* Efeito de sombra interna/borda inferior do botão */}
          <View style={styles.buttonShadow} />
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF', // Mantendo o fundo limpo e calmo
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  animationContainer: {
    width: 250,
    height: 250,
    marginBottom: 40,
  },
  dogAnimation: {
    width: '100%',
    height: '100%',
  },
  textSection: {
    alignItems: 'center',
    marginBottom: 50,
  },
  title: {
    fontFamily: 'Fredoka-Destaque',
    fontSize: 26,
    color: '#3c3c3c',
    textAlign: 'center',
    marginBottom: 15,
  },
  subtitle: {
    fontFamily: 'Nunito-Corpo',
    fontSize: 18,
    color: '#777',
    textAlign: 'center',
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#FFD600', // Um amarelo vibrante que combina com "Happy Dog"
    width: '100%',
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    // Sombra do botão
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  buttonText: {
    fontFamily: 'Fredoka-Destaque',
    fontSize: 20,
    color: '#3c3c3c',
    zIndex: 2,
  },
  buttonShadow: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: 5,
    backgroundColor: '#E6C100', // Tom mais escuro para o efeito 3D
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  }
});