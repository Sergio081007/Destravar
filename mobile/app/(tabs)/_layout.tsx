import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme';

function TabIcon({ name, focused }: { name: keyof typeof Ionicons.glyphMap; focused: boolean }) {
  return (
    <View style={focused ? styles.activeIcon : styles.icon}>
      <Ionicons name={name} size={22} color={focused ? Colors.primary : Colors.gray} />
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.gray,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#f0edf8',
          height: 68,
          paddingBottom: 10,
          paddingTop: 4,
          shadowColor: '#5a32b4',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.07,
          shadowRadius: 12,
          elevation: 12,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'home' : 'home-outline'} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="atividades"
        options={{
          title: 'Atividades',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'book' : 'book-outline'} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="sequencia"
        options={{
          title: 'Sequência',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'flash' : 'flash-outline'} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="ranking"
        options={{
          title: 'Ranking',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'trophy' : 'trophy-outline'} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  icon: { padding: 6 },
  activeIcon: {
    backgroundColor: '#ede9fe',
    borderRadius: 12,
    padding: 6,
  },
});
