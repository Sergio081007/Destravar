import { View, Text, Image, StyleSheet, ViewStyle, ImageSourcePropType } from 'react-native';

type Props = {
  initials: string;
  color: string;
  source?: ImageSourcePropType;
  size?: number;          // shorthand quando width == height
  width?: number;         // sobrescreve size (para formatos ovais/arch)
  height?: number;        // sobrescreve size (para formatos ovais/arch)
  borderRadius?: number;
  borderColor?: string;
  borderWidth?: number;
  style?: ViewStyle;
};

export default function Avatar({
  initials,
  color,
  source,
  size,
  width,
  height,
  borderRadius,
  borderColor,
  borderWidth = 0,
  style,
}: Props) {
  const w = width  ?? size ?? 44;
  const h = height ?? size ?? 44;
  const r = borderRadius ?? w / 2;

  const containerStyle: ViewStyle = {
    width: w,
    height: h,
    borderRadius: r,
    backgroundColor: color,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    ...(borderColor ? { borderWidth, borderColor } : {}),
  };

  return (
    <View style={[containerStyle, style]}>
      {source ? (
        <Image source={source} style={styles.image} resizeMode="cover" />
      ) : (
        <Text style={[styles.initials, { fontSize: w * 0.34 }]}>
          {initials}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  image:    { width: '100%', height: '100%' },
  initials: { color: '#fff', fontWeight: '800' },
});
