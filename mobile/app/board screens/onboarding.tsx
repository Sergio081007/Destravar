import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';
import { useFonts } from 'expo-font';

export default function OnboardingScreen() {
  // 1. Carregamos as duas fontes simultaneamente
  const [fontsLoaded] = useFonts({
    'Fredoka-Destaque': require('../../assets/fonts/Fredoka-Bold.ttf'),
    'Nunito-Corpo': require('../../assets/fonts/Nunito-Regular.ttf'),
  });

  // Aguarda as fontes carregarem para não dar erro de tela branca
  if (!fontsLoaded) return null;

  return (
    <View style={styles.container}>
      <LottieView
        source={require('../animations/lock.json')}
        autoPlay
        loop={false}
        style={styles.lottie}
      />

      <View style={styles.textContainer}>
        {/* Título com Fredoka */}
        <Text style={styles.title}>
          Olá! o meu nome é Destravar
        </Text>

        {/* Subtítulo com Nunito */}
        <Text style={styles.subtitle}>
          O aplicativo mais divertido para distúrbios de fluência
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lottie: {
    width: 300,
    height: 300,
  },
  textContainer: {
    paddingHorizontal: 30,
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Fredoka-Destaque', // Nome que definimos no useFonts
    fontSize: 30,
    color: '#3c3c3c',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: 'Nunito-Corpo', // Nome que definimos no useFonts
    fontSize: 18,
    color: '#777',
    textAlign: 'center',
    lineHeight: 24,
  },
});