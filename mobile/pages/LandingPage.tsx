import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { supabase } from '../utils/supabase';
import { getOnboardingComplete } from '../utils/storage';

export default function Root() {
  const [ready, setReady]           = useState(false);
  const [destination, setDestination] = useState('/login');

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setDestination('/login');
      } else {
        const onboarded = await getOnboardingComplete(session.user.id);
        setDestination(onboarded ? '/(tabs)' : '/onboarding');
      }
      setReady(true);
    })();
  }, []);

  if (!ready) return <View style={{ flex: 1, backgroundColor: '#0061a2' }} />;
  return <Redirect href={destination as any} />;
}
