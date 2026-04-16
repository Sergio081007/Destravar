import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Audio } from 'expo-av';

export default function Index() {
  const [permissionResponse, requestPermission] = Audio.usePermissions();

  useEffect(() => {
    async function askForPermission() {
      if (!permissionResponse || permissionResponse.status !== 'granted') {
        await requestPermission();
      }
    }
    
    askForPermission();
  }, []);

  return (
    <View style={styles.container}>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});
