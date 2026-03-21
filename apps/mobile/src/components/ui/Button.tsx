import React, { ReactNode } from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { Colors } from '@/constants/colors';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  style?: ViewStyle;
}

const VARIANT_STYLES: Record<Variant, { container: ViewStyle; text: TextStyle }> = {
  primary: {
    container: { backgroundColor: Colors.brand[500] },
    text: { color: '#ffffff' },
  },
  secondary: {
    container: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: Colors.brand[500],
    },
    text: { color: Colors.brand[500] },
  },
  danger: {
    container: { backgroundColor: '#ef4444' },
    text: { color: '#ffffff' },
  },
  ghost: {
    container: { backgroundColor: 'transparent' },
    text: { color: Colors.text.secondary },
  },
};

const SIZE_STYLES: Record<Size, { container: ViewStyle; text: TextStyle }> = {
  sm: { container: { height: 36, paddingHorizontal: 12 }, text: { fontSize: 13 } },
  md: { container: { height: 46, paddingHorizontal: 18 }, text: { fontSize: 15 } },
  lg: { container: { height: 54, paddingHorizontal: 24 }, text: { fontSize: 17 } },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
}: Props) {
  const variantStyle = VARIANT_STYLES[variant];
  const sizeStyle = SIZE_STYLES[size];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variantStyle.container,
        sizeStyle.container,
        isDisabled && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'danger' ? '#fff' : Colors.brand[500]}
        />
      ) : (
        <View style={styles.row}>
          {icon && <View style={styles.iconWrap}>{icon}</View>}
          <Text style={[styles.text, variantStyle.text, sizeStyle.text]}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    marginRight: 8,
  },
  text: {
    fontWeight: '600',
  },
});
