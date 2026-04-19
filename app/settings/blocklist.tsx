import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { toast } from '@/src/components/toast';
import { socialApi, type UserSummary } from '@/src/services/socialApi';
import { scale, verticalScale } from '@/src/utils/uiScale';

export default function BlocklistPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const load = useCallback(async (reset = false) => {
    const targetPage = reset ? 1 : page;
    setLoading(true);
    try {
      const resp = await socialApi.getBlocklist(targetPage, 20);
      if (reset) {
        setUsers(resp.list);
      } else {
        setUsers(prev => [...prev, ...resp.list]);
      }
      setHasMore(resp.list.length === 20);
      if (reset) setPage(1);
    } catch {
      toast('加载失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page]);

  useEffect(() => {
    setPage(1);
    setUsers([]);
    void load(true);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    setPage(1);
    void load(true);
  };

  const handleLoadMore = () => {
    if (!hasMore || loading) return;
    setPage(p => p + 1);
    void load(false);
  };

  const handleUnblock = async (userId: string) => {
    try {
      await socialApi.unblock(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
      toast('已解除拉黑');
    } catch {
      toast('操作失败');
    }
  };

  const renderItem = ({ item }: { item: UserSummary }) => (
    <View style={styles.userItem}>
      <Image source={{ uri: item.avatar_url ?? undefined }} style={styles.avatar} />
      <View style={styles.userInfo}>
        <Text style={styles.nickname} numberOfLines={1}>{item.nickname}</Text>
        {item.bio ? <Text style={styles.bio} numberOfLines={1}>{item.bio}</Text> : null}
      </View>
      <Pressable
        style={styles.unblockBtn}
        onPress={() => handleUnblock(item.id)}
      >
        <Text style={styles.unblockText}>解除拉黑</Text>
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>黑名单</Text>
        <View style={styles.placeholder} />
      </View>

      <FlatList
        data={users}
        keyExtractor={u => u.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: verticalScale(20) }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>暂无黑名单</Text>
            <Text style={styles.emptySub}>被拉黑的用户将不会收到你的任何通知</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: verticalScale(44), paddingHorizontal: scale(10) },
  backBtn: { width: scale(30), height: verticalScale(30), justifyContent: 'center' },
  backIcon: { fontSize: scale(22), color: '#111' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: scale(17), fontWeight: '700', color: '#111' },
  placeholder: { width: scale(30) },
  userItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(16), paddingVertical: verticalScale(12), gap: scale(12), borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F3F4F6' },
  avatar: { width: scale(48), height: scale(48), borderRadius: 99, backgroundColor: '#E5E7EB' },
  userInfo: { flex: 1, gap: 2 },
  nickname: { fontSize: scale(15), fontWeight: '600', color: '#111' },
  bio: { fontSize: scale(12), color: '#6B7280' },
  unblockBtn: { paddingHorizontal: scale(14), paddingVertical: verticalScale(6), borderRadius: 999, backgroundColor: '#FEE2E2' },
  unblockText: { fontSize: scale(13), fontWeight: '600', color: '#EF4444' },
  empty: { alignItems: 'center', paddingTop: verticalScale(60) },
  emptyText: { color: '#9CA3AF', fontSize: 14 },
  emptySub: { color: '#D1D5DB', fontSize: 13, marginTop: 8, paddingHorizontal: scale(40), textAlign: 'center' },
});
