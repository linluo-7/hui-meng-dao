import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export function Tag({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'brand' | 'success' }) {
  return (
    <View style={[styles.base, toneStyles[tone]]}>
      <Text style={[styles.text, toneTextStyles[tone]]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 6,
  },
  text: { fontSize: 12, fontWeight: '600' },
});

const toneStyles = {
  neutral: { backgroundColor: '#F5F6F8', borderColor: '#E2E6EA' },
  brand: { backgroundColor: '#E9F4FF', borderColor: '#B8DBFF' },
  success: { backgroundColor: '#E9FAF0', borderColor: '#BEEAD1' },
} as const;

const toneTextStyles = {
  neutral: { color: '#3A3F45' },
  brand: { color: '#1D5FA8' },
  success: { color: '#1E7A4B' },
} as const;

