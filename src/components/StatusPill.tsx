import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { ProjectStatus } from '@/src/models/types';

export function StatusPill({ status }: { status: ProjectStatus }) {
  const tone = statusTone[status];
  return (
    <View style={[styles.base, tone.bg]}>
      <Text style={[styles.text, tone.text]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  text: { fontSize: 12, fontWeight: '700' },
});

const statusTone: Record<ProjectStatus, { bg: object; text: object }> = {
  招募中: { bg: { backgroundColor: '#FFF4E5' }, text: { color: '#9A5A00' } },
  进行中: { bg: { backgroundColor: '#E9F4FF' }, text: { color: '#1D5FA8' } },
  已完结: { bg: { backgroundColor: '#F0F1F3' }, text: { color: '#5A6169' } },
};

