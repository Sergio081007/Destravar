import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="treinar" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="profile" />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}
