import React, { useState, useEffect, useCallback } from 'react';
import {
  Pressable, ScrollView, StyleSheet, Text, TextInput, View,
  Image, FlatList, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { albumsApi, AlbumListItem } from '@/src/services/albumsApi';
import { toast } from '@/src/components/toast';

type FilterTab = 'all' | 'my' | 'joined' | 'applications';

interface ApplicationItem {
  id: string;
  album_id: string;
  album_title: string;
  album_cover_url?: string;
  status: 'pending' | 'approved' | 'rejected';
  feedback?: string;
  reviewer_nickname?: string;
  created_at: string;
}

const STATUS_LABEL: Record<string, string> = {
  draft: '草稿', recruiting: '招募中', active: '进行中', finished: '已完结',
};

const STATUS_COLOR: Record<string, string> = {
  draft: '#9CA3AF', recruiting: '#F59E0B', active: '#10B981', finished: '#6B7280',
};

export default function AlbumsListPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterTab>('all');
  const [albums, setAlbums] = useState<AlbumListItem[]>([]);
  const [myApps, setMyApps] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loadAlbums = useCallback(async (pageNum = 1, refresh = false) => {
    if (refresh) setRefreshing(true);
    else if (pageNum === 1) setLoading(true);

    try {
      if (filter === 'applications') {
        const res = await albumsApi.getMyApplications();
        setMyApps(res.list ?? []);
        setHasMore(false);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      const filterMap = { all: undefined, my: 'my', joined: 'joined' } as const;
      const res = await albumsApi.getAlbums({
        filter: filter === 'all' ? undefined : filterMap[filter],
        page: pageNum,
        pageSize: 20,
      });
      const items = res.list ?? [];
      setAlbums(prev => pageNum === 1 ? items : [...prev, ...items]);
      setHasMore(items.length >= 20);
      setPage(pageNum);
    } catch (err: any) {
      toast(err?.message ?? '加载失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => { loadAlbums(1); }, [filter]);

  const onRefresh = () => loadAlbums(1, true);
  const onEndReached = () => { if (!loading && hasMore) loadAlbums(page + 1); };

  const renderItem = ({ item }: { item: AlbumListItem }) => (
    <Pressable style={styles.card} onPress={() => router.push(`/albums/${item.id}` as any)}>
      {item.cover_url ? (
        <Image source={{ uri: item.cover_url }} style={styles.cover} />
      ) : (
        <View style={[styles.cover, styles.coverPlaceholder]}>
          <Text style={styles.coverPlaceholderText}>企划封面</Text>
        </View>
      )}
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.cardSummary} numberOfLines={2}>{item.summary || '暂无简介'}</Text>
        <View style={styles.cardMeta}>
          <Text style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[item.status] + '22', color: STATUS_COLOR[item.status] }]}>
            {STATUS_LABEL[item.status]}
          </Text>
          <Text style={styles.metaText}>👥 {item.members_count}  📷 {item.works_count}</Text>
        </View>
        <View style={styles.cardFooter}>
          {item.owner_avatar ? (
            <Image source={{ uri: item.owner_avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]} />
          )}
          <Text style={styles.ownerName}>{item.owner_nickname}</Text>
          <View style={styles.tags}>
            {(item.tags ?? []).slice(0, 2).map(tag => (
              <Text key={tag} style={styles.tag}>#{tag}</Text>
            ))}
          </View>
        </View>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.safe}>
      {/* 顶部Tab */}
      <View style={styles.tabBar}>
        {[
          { key: 'all', label: '发现' },
          { key: 'my', label: '我创建的' },
          { key: 'joined', label: '我加入的' },
          { key: 'applications', label: '我的申请' },
        ].map(tab => (
          <Pressable key={tab.key} onPress={() => setFilter(tab.key as FilterTab)}
            style={[styles.tab, filter === tab.key && styles.tabOn]}>
            <Text style={[styles.tabText, filter === tab.key && styles.tabTextOn]}>{tab.label}</Text>
          </Pressable>
        ))}
      </View>

      {loading && albums.length === 0 ? (
        <View style={styles.center}><ActivityIndicator size="large" /></View>
      ) : filter === 'applications' ? (
        <ApplicationsList apps={myApps} refreshing={refreshing} onRefresh={onRefresh} />
      ) : albums.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>还没有企划</Text>
          <Pressable style={styles.createBtn} onPress={() => router.push('/albums/create' as any)}>
            <Text style={styles.createBtnText}>创建第一个企划</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={albums}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loading && hasMore ? <ActivityIndicator style={{ marginVertical: 16 }} /> : null}
        />
      )}

      {/* 底部创建按钮 */}
      <Pressable style={styles.fab} onPress={() => router.push('/albums/create' as any)}>
        <Text style={styles.fabText}>+ 创建企划</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F8FA' },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#EEF1F4' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabOn: { borderBottomWidth: 2, borderBottomColor: '#111827' },
  tabText: { fontWeight: '700', color: '#9CA3AF', fontSize: 13 },
  tabTextOn: { color: '#111827' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  emptyText: { color: '#9CA3AF', fontSize: 16, fontWeight: '700' },
  createBtn: { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#2563EB', borderRadius: 999 },
  createBtnText: { color: '#fff', fontWeight: '900' },
  list: { padding: 12, paddingBottom: 80, gap: 12 },
  card: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#EEF1F4' },
  cover: { width: '100%', height: 160, backgroundColor: '#EEF1F4' },
  coverPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  coverPlaceholderText: { color: '#9CA3AF', fontWeight: '700' },
  cardBody: { padding: 12, gap: 8 },
  cardTitle: { fontWeight: '900', color: '#111827', fontSize: 16 },
  cardSummary: { color: '#6B7280', fontSize: 13, lineHeight: 18 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, fontSize: 11, fontWeight: '900' },
  metaText: { color: '#9CA3AF', fontSize: 12 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  avatar: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#EEF1F4' },
  avatarPlaceholder: {},
  ownerName: { color: '#6B7280', fontSize: 12, fontWeight: '700' },
  tags: { flexDirection: 'row', gap: 4, marginLeft: 'auto' },
  tag: { color: '#2563EB', fontSize: 11, fontWeight: '700' },
  fab: {
    position: 'absolute', bottom: 20, right: 20,
    backgroundColor: '#111827', borderRadius: 999, paddingHorizontal: 20, paddingVertical: 14,
    elevation: 4, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },
  fabText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  // 申请卡片
  appCard: {
    backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: '#EEF1F4',
    flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12,
  },
  appCover: { width: 60, height: 60, borderRadius: 10, backgroundColor: '#EEF1F4' },
  appBody: { flex: 1, gap: 2 },
  appTitle: { fontWeight: '900', color: '#111827', fontSize: 15 },
  appDate: { color: '#9CA3AF', fontSize: 12 },
  appFeedback: { color: '#EF4444', fontSize: 12 },
  appBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  appBadgeText: { fontWeight: '900', fontSize: 12 },
});

// =============================================================
// 申请记录列表
// =============================================================
const APP_STATUS = {
  pending: { label: '待审核', color: '#F59E0B', bg: '#FEF3C7' },
  approved: { label: '已通过', color: '#10B981', bg: '#D1FAE5' },
  rejected: { label: '已拒绝', color: '#EF4444', bg: '#FEE2E2' },
};

function ApplicationsList({ apps, refreshing, onRefresh }: {
  apps: ApplicationItem[];
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const router = useRouter();
  const fmtDate = (d: string) => new Date(d).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

  return (
    <FlatList
      data={apps}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.emptyText}>暂无申请记录</Text>
          <Text style={{ color: '#9CA3AF', fontSize: 13 }}>去发现感兴趣的企划吧</Text>
        </View>
      }
      renderItem={({ item }) => {
        const st = APP_STATUS[item.status];
        return (
          <Pressable style={styles.appCard} onPress={() => router.push(`/albums/${item.album_id}` as any)}>
            {item.album_cover_url ? (
              <Image source={{ uri: item.album_cover_url }} style={styles.appCover} />
            ) : (
              <View style={[styles.appCover, styles.coverPlaceholder]}>
                <Text style={styles.coverPlaceholderText}>企划封面</Text>
              </View>
            )}
            <View style={styles.appBody}>
              <Text style={styles.appTitle} numberOfLines={1}>{item.album_title}</Text>
              <Text style={styles.appDate}>申请时间：{fmtDate(item.created_at)}</Text>
              {item.feedback && (
                <Text style={styles.appFeedback} numberOfLines={1}>理由：{item.feedback}</Text>
              )}
            </View>
            <View style={[styles.appBadge, { backgroundColor: st.bg }]}>
              <Text style={[styles.appBadgeText, { color: st.color }]}>{st.label}</Text>
            </View>
          </Pressable>
        );
      }}
    />
  );
}
