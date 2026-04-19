import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, SafeAreaView, StyleSheet, Text, View, RefreshControl } from 'react-native';

import { toast } from '@/src/components/toast';
import { notificationsApi } from '@/src/services/notificationsApi';
import type { Notification } from '@/src/services/notificationsApi';

type Tab = 'comment' | 'like' | 'follow' | 'system';

const TABS: { key: Tab; label: string }[] = [
  { key: 'comment', label: '评论' },
  { key: 'like', label: '点赞' },
  { key: 'follow', label: '关注' },
  { key: 'system', label: '系统' },
];

const TYPE_TO_TAB: Record<string, Tab> = {
  comment: 'comment',
  like: 'like',
  follow: 'follow',
  system: 'system',
  mention: 'comment',
  work: 'system',
};

function getNotificationIcon(type: string) {
  switch (type) {
    case 'comment': case 'mention': return '💬';
    case 'like': return '❤️';
    case 'follow': return '👤';
    case 'work': return '🎨';
    default: return '🔔';
  }
}

function getNotificationLink(item: Notification) {
  const d = item.data;
  if (d?.postId) return `/posts/${d.postId}`;
  if (d?.roleId) return `/roles/${d.roleId}`;
  if (d?.workId) return `/works/${d.workId}`;
  return null;
}

export default function NotificationsPage() {
  const [tab, setTab] = useState<Tab>('comment');
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loadNotifications = useCallback(async (reset = false) => {
    const targetPage = reset ? 1 : page;
    setLoading(true);
    try {
      const resp = await notificationsApi.getList({ type: tab, page: targetPage, pageSize: 20 });
      if (reset) {
        setItems(resp.list);
      } else {
        setItems(prev => [...prev, ...resp.list]);
      }
      setHasMore(resp.list.length === 20);
      if (reset) setPage(1);
    } catch (err) {
      toast('加载失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tab, page]);

  useEffect(() => {
    setPage(1);
    setItems([]);
    loadNotifications(true);
  }, [tab]);

  const handleRefresh = () => {
    setRefreshing(true);
    setPage(1);
    loadNotifications(true);
  };

  const handleLoadMore = () => {
    if (!hasMore || loading) return;
    setPage(p => p + 1);
    loadNotifications(false);
  };

  const handleMarkRead = async (item: Notification) => {
    if (item.is_read) return;
    try {
      await notificationsApi.markRead(item.id);
      setItems(prev => prev.map(n => n.id === item.id ? { ...n, is_read: 1 } : n));
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setItems(prev => prev.map(n => ({ ...n, is_read: 1 })));
      toast('已全部设为已读');
    } catch {
      toast('操作失败');
    }
  };

  const filtered = useMemo(() => items.filter(n => TYPE_TO_TAB[n.type] === tab), [items, tab]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>通知</Text>
        <Pressable onPress={handleMarkAllRead}>
          <Text style={styles.markAllText}>全部已读</Text>
        </Pressable>
      </View>

      <View style={styles.tabs}>
        {TABS.map(t => (
          <Pressable
            key={t.key}
            onPress={() => setTab(t.key)}
            style={[styles.tab, tab === t.key && styles.tabOn]}
          >
            <Text style={[styles.tabText, tab === t.key && styles.tabTextOn]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={n => n.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>暂无{t.name}通知</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => void handleMarkRead(item)}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
          >
            <View style={styles.cardLeft}>
              <Text style={styles.icon}>{getNotificationIcon(item.type)}</Text>
            </View>
            <View style={styles.cardContent}>
              <View style={styles.row}>
                <Text style={styles.title}>{item.title}</Text>
                {!item.is_read && <View style={styles.dot} />}
              </View>
              {item.content && <Text style={styles.content}>{item.content}</Text>}
              <Text style={styles.time}>
                {new Date(item.created_at).toLocaleDateString('zh-CN')}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F8FA' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#111827' },
  markAllText: { color: '#2563EB', fontSize: 14, fontWeight: '600' },
  tabs: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingBottom: 8 },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#EEF1F4',
  },
  tabOn: { backgroundColor: '#111827' },
  tabText: { fontWeight: '900', color: '#111827', fontSize: 13 },
  tabTextOn: { color: '#fff' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EEF1F4',
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    gap: 12,
  },
  cardLeft: { alignItems: 'center', justifyContent: 'flex-start', paddingTop: 2 },
  icon: { fontSize: 24 },
  cardContent: { flex: 1, gap: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontWeight: '900', color: '#111827', flex: 1, paddingRight: 10, fontSize: 14 },
  dot: { width: 8, height: 8, borderRadius: 99, backgroundColor: '#EF4444' },
  content: { color: '#6B7280', fontSize: 13, lineHeight: 18 },
  time: { color: '#9CA3AF', fontSize: 12, marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: 40 },
  emptyText: { color: '#9CA3AF', fontSize: 14 },
});
