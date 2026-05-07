import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { supabase } from '../utils/supabase';
import { getOnboardingComplete, setOnboardingComplete } from '../utils/storage';

export default function Root() {
  const [ready, setReady]           = useState(false);
  const [destination, setDestination] = useState('/login');

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setDestination('/login');
      } else {
        const localOnboarded = await getOnboardingComplete();
        const serverOnboarded = session.user.user_metadata?.onboarding_complete === true;
        if (!localOnboarded && serverOnboarded) {
          await setOnboardingComplete();
        }
        setDestination(localOnboarded || serverOnboarded ? '/(tabs)' : '/onboarding');
      }
      setReady(true);
    })();
  }, []);

  if (!ready) return <View style={{ flex: 1, backgroundColor: '#0061a2' }} />;
  return <Redirect href={destination as any} />;
}
