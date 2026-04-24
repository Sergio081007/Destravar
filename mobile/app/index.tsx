import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { getOnboardingComplete } from './utils/storage';

export default function Root() {
  const [ready, setReady] = useState(false);
  const [onboarded, setOnboarded] = useState(false);

  useEffect(() => {
    getOnboardingComplete().then((done) => {
      setOnboarded(done);
      setReady(true);
    });
  }, []);

  if (!ready) return <View style={{ flex: 1, backgroundColor: '#7c3aed' }} />;
  if (!onboarded) return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)" />;
}
