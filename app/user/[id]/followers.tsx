import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { toast } from '@/src/components/toast';
import { socialApi, type UserSummary } from '@/src/services/socialApi';
import { scale, verticalScale } from '@/src/utils/uiScale';

export default function FollowersPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const load = useCallback(async (reset = false) => {
    if (!id) return;
    const targetPage = reset ? 1 : page;
    setLoading(true);
    try {
      const resp = await socialApi.getFollowers(id, targetPage, 20);
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
  }, [id, page]);

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

  const renderItem = ({ item }: { item: UserSummary }) => (
    <Pressable
      style={styles.userItem}
      onPress={() => router.push(`/user/${item.id}` as any)}
    >
      <Image
        source={{ uri: item.avatar_url ?? undefined }}
        style={styles.avatar}
      />
      <View style={styles.userInfo}>
        <Text style={styles.nickname} numberOfLines={1}>{item.nickname}</Text>
        {item.bio ? <Text style={styles.bio} numberOfLines={1}>{item.bio}</Text> : null}
        <Text style={styles.stats}>
          <Text style={styles.statNum}>{item.followers_count}</Text> 粉丝 · <Text style={styles.statNum}>{item.following_count}</Text> 关注
        </Text>
      </View>
      <Pressable
        style={[styles.followBtn, item.is_following && styles.followingBtn]}
        onPress={async () => {
          try {
            if (item.is_following) {
              await socialApi.unfollow(item.id);
              setUsers(prev => prev.map(u => u.id === item.id ? { ...u, is_following: 0 } : u));
            } else {
              await socialApi.follow(item.id);
              setUsers(prev => prev.map(u => u.id === item.id ? { ...u, is_following: 1 } : u));
            }
          } catch { toast('操作失败'); }
        }}
      >
        <Text style={[styles.followText, item.is_following && styles.followingText]}>
          {item.is_following ? '已关注' : '关注'}
        </Text>
      </Pressable>
    </Pressable>
  );

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>粉丝</Text>
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
          <View style={styles.empty}><Text style={styles.emptyText}>暂无粉丝</Text></View>
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
  stats: { fontSize: scale(12), color: '#9CA3AF', marginTop: 2 },
  statNum: { fontWeight: '700', color: '#374151' },
  followBtn: { paddingHorizontal: scale(14), paddingVertical: verticalScale(6), borderRadius: 999, backgroundColor: '#111827' },
  followingBtn: { backgroundColor: '#F3F4F6' },
  followText: { fontSize: scale(13), fontWeight: '600', color: '#fff' },
  followingText: { color: '#374151' },
  empty: { alignItems: 'center', paddingTop: verticalScale(40) },
  emptyText: { color: '#9CA3AF', fontSize: 14 },
});
