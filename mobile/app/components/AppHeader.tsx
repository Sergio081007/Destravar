import { View, Text, StyleSheet, Platform, ImageSourcePropType } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Avatar from './Avatar';

type Props = {
  initials: string;
  avatarColor?: string;
  avatarSource?: ImageSourcePropType;
  rightSlot?: React.ReactNode;
};

export default function AppHeader({ initials, avatarColor = '#0061a2', avatarSource, rightSlot }: Props) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.bar}>
        <Avatar
          initials={initials}
          color={avatarColor}
          source={avatarSource}
          size={38}
          borderRadius={19}
          borderWidth={2}
          borderColor="#4da9ff"
        />
        <Text style={styles.logo}>Destravar</Text>
        <View style={styles.rightSlot}>
          {rightSlot ?? <View style={{ width: 40 }} />}
        </View>
      </View>
      <LinearGradient
        colors={['#0061a2', '#5e41d0', '#4da9ff']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.accentLine}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    shadowColor: '#0061a2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 6,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  logo: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0061a2',
    letterSpacing: -0.5,
  },
  rightSlot: {
    width: 40,
    alignItems: 'flex-end',
  },
  accentLine: {
    height: 3,
    width: '100%',
  },
});
