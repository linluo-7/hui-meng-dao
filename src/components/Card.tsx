import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Project, Work } from '@/src/models/types';
import { StatusPill } from '@/src/components/StatusPill';
import { Tag } from '@/src/components/Tag';

export function ProjectCard({ project, onPress }: { project: Project; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}>
      <View style={styles.row}>
        <Text style={styles.title} numberOfLines={1}>
          {project.title}
        </Text>
        <StatusPill status={project.status} />
      </View>
      <Text style={styles.sub} numberOfLines={2}>
        {project.summary}
      </Text>
      <View style={styles.tagsRow}>
        {project.tags.slice(0, 4).map((t) => (
          <Tag key={t} label={t} tone="neutral" />
        ))}
      </View>
      <View style={styles.footer}>
        <Text style={styles.meta}>主办方：{project.organizerName}</Text>
        <Text style={styles.meta}>参与：{project.membersCount}</Text>
      </View>
    </Pressable>
  );
}

export function WorkCard({
  work,
  onPress,
}: {
  work: Work;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}>
      <Text style={styles.title} numberOfLines={1}>
        {work.title}
      </Text>
      <Text style={styles.sub} numberOfLines={3}>
        {work.content}
      </Text>
      <View style={styles.footer}>
        <Text style={styles.meta}>❤️ {work.likes}</Text>
        <Text style={styles.meta}>💬 {work.commentsCount}</Text>
        <Text style={styles.meta}>↗ 分享</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EEF1F4',
    marginBottom: 12,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  title: { fontSize: 16, fontWeight: '800', color: '#111827', flex: 1 },
  sub: { fontSize: 13, color: '#4B5563', marginTop: 8, lineHeight: 18 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  meta: { fontSize: 12, color: '#6B7280' },
});

