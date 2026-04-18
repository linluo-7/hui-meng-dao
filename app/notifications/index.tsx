import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { toast } from '@/src/components/toast';
import { mockApi } from '@/src/services/mockApi';
import type { Notification } from '@/src/models/types';

type Tab = '评论' | '点赞' | '系统';

const tabToType: Record<Tab, Notification['type']> = { 评论: 'comment', 点赞: 'like', 系统: 'system' };

export default function NotificationsPage() {
  const [tab, setTab] = useState<Tab>('评论');
  const [items, setItems] = useState<Notification[]>([]);

  useEffect(() => {
    mockApi.listNotifications().then(setItems);
  }, []);

  const filtered = useMemo(() => items.filter((n) => n.type === tabToType[tab]), [items, tab]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.tabs}>
        {(['评论', '点赞', '系统'] as Tab[]).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabOn]}>
            <Text style={[styles.tabText, tab === t && styles.tabTextOn]}>{t}</Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(n) => n.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => toast('已读（mock）')}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}>
            <View style={styles.row}>
              <Text style={styles.title}>{item.title}</Text>
              {!item.isRead && <View style={styles.dot} />}
            </View>
            <Text style={styles.content}>{item.content}</Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F8FA' },
  tabs: { flexDirection: 'row', gap: 10, padding: 16, paddingBottom: 8 },
  tab: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: '#EEF1F4' },
  tabOn: { backgroundColor: '#111827' },
  tabText: { fontWeight: '900', color: '#111827' },
  tabTextOn: { color: '#fff' },
  card: { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#EEF1F4', padding: 14, marginBottom: 12, gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontWeight: '900', color: '#111827', flex: 1, paddingRight: 10 },
  dot: { width: 8, height: 8, borderRadius: 99, backgroundColor: '#EF4444' },
  content: { color: '#6B7280', fontSize: 12, lineHeight: 16 },
});

