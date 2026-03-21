import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  label: string;
  color: string;
  bgColor: string;
  size?: 'sm' | 'md';
}

export function Badge({ label, color, bgColor, size = 'md' }: Props) {
  const isSmall = size === 'sm';
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: bgColor },
        isSmall && styles.badgeSm,
      ]}
    >
      <Text
        style={[
          styles.label,
          { color },
          isSmall && styles.labelSm,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  labelSm: {
    fontSize: 11,
  },
});
