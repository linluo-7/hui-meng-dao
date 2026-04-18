import React from 'react';
import { StyleSheet, Text } from 'react-native';

export function SettingChevron() {
  return <Text style={styles.chevron}>›</Text>;
}

const styles = StyleSheet.create({
  chevron: {
    color: '#9CA3AF',
    fontWeight: '900',
    fontSize: 18,
  },
});
