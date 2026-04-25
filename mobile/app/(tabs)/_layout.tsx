import { Tabs } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const TAB_CONFIG = [
  {
    name: 'index',
    label: 'Desafios',
    icon: 'extension-puzzle-outline' as const,
    iconActive: 'extension-puzzle' as const,
  },
  {
    name: 'ranking',
    label: 'Ranking',
    icon: 'podium-outline' as const,
    iconActive: 'podium' as const,
  },
  {
    name: 'perfil',
    label: 'Perfil',
    icon: 'person-outline' as const,
    iconActive: 'person' as const,
  },
];

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  return (
    <View style={styles.tabBar}>
      {TAB_CONFIG.map((tab) => {
        const isFocused = state.routes[state.index]?.name === tab.name;
        return (
          <TouchableOpacity
            key={tab.name}
            style={[styles.tabItem, isFocused && styles.tabItemActive]}
            onPress={() => navigation.navigate(tab.name)}
            activeOpacity={0.75}
          >
            <Ionicons
              name={isFocused ? tab.iconActive : tab.icon}
              size={22}
              color={isFocused ? '#0061a2' : '#9CA3AF'}
            />
            <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: 'Desafios' }} />
      <Tabs.Screen name="atividades" options={{ href: null }} />
      <Tabs.Screen name="sequencia" options={{ href: null }} />
      <Tabs.Screen name="ranking" options={{ title: 'Ranking' }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: 'rgba(192,199,211,0.3)',
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 14,
    paddingHorizontal: 16,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    gap: 3,
  },
  tabItemActive: {
    backgroundColor: 'rgba(0,97,162,0.1)',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  tabLabelActive: {
    color: '#0061a2',
    fontWeight: '700',
  },
});
