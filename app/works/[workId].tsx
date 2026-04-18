import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { toast } from '@/src/components/toast';
import { mockApi } from '@/src/services/mockApi';
import type { Work } from '@/src/models/types';

type Comment = { id: string; user: string; text: string };

export default function WorkDetailPage() {
  const { workId } = useLocalSearchParams<{ workId: string }>();
  const [work, setWork] = useState<Work | null>(null);
  const [likes, setLikes] = useState(0);

  const comments = useMemo<Comment[]>(
    () => [
      { id: 'c1', user: '岛民 1024', text: '氛围太好了！' },
      { id: 'c2', user: '岛民 2333', text: '想看后续～' },
    ],
    []
  );

  useEffect(() => {
    mockApi.listWorks().then((all) => {
      const found = all.find((w) => w.id === String(workId)) ?? null;
      setWork(found);
      setLikes(found?.likes ?? 0);
    });
  }, [workId]);

  if (!work) {
    return (
      <View style={styles.loading}>
        <Text style={{ color: '#6B7280' }}>加载中…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={comments}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        ListHeaderComponent={
          <View style={styles.card}>
            <Text style={styles.title}>{work.title}</Text>
            <Text style={styles.body}>{work.content}</Text>
            <View style={styles.actions}>
              <Pressable onPress={() => setLikes((v) => v + 1)} style={styles.actionBtn}>
                <Text style={styles.actionText}>❤️ {likes}</Text>
              </Pressable>
              <Pressable onPress={() => toast('评论（mock）')} style={styles.actionBtn}>
                <Text style={styles.actionText}>💬 {work.commentsCount}</Text>
              </Pressable>
              <Pressable onPress={() => toast('分享（mock）')} style={styles.actionBtn}>
                <Text style={styles.actionText}>↗ 分享</Text>
              </Pressable>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.comment}>
            <Text style={styles.commentUser}>{item.user}</Text>
            <Text style={styles.commentText}>{item.text}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F8FA' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#EEF1F4', padding: 14, gap: 10, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '900', color: '#111827' },
  body: { color: '#374151', lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  actionBtn: { height: 36, borderRadius: 12, backgroundColor: '#F3F4F6', paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  actionText: { fontWeight: '900', color: '#111827' },
  comment: { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#EEF1F4', padding: 14, marginBottom: 12, gap: 8 },
  commentUser: { fontWeight: '900', color: '#111827' },
  commentText: { color: '#6B7280', lineHeight: 18 },
});

