import React, { useState, useEffect, useCallback } from 'react';
import {
  Pressable, ScrollView, StyleSheet, Text, TextInput, View,
  Image, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';

import { toast } from '@/src/components/toast';
import type { AlbumDetail, AlbumModule } from '@/src/models/types';
import { albumsApi } from '@/src/services/albumsApi';

const STATUS_LABEL: Record<string, string> = {
  draft: '草稿', recruiting: '招募中', active: '进行中', finished: '已完结',
};

const PRIVACY_LABEL: Record<string, string> = {
  private: '仅自己可见', friends: '仅好友可见', public: '所有人可见',
};

const ROLE_LABEL: Record<string, string> = {
  owner: '创建者', admin: '管理员', member: '成员',
};

type Tab = 'info' | 'gallery' | 'members';

export default function AlbumDetailPage() {
  const { albumId } = useLocalSearchParams<{ albumId: string }>();
  const router = useRouter();

  const [album, setAlbum] = useState<AlbumDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<Tab>('info');
  const [joinLoading, setJoinLoading] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await albumsApi.getAlbumDetail(albumId!);
      setAlbum(res.data);
    } catch (err: any) {
      toast(err?.message ?? '加载失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [albumId]);

  useEffect(() => { if (albumId) load(); }, [albumId]);

  const onJoin = async () => {
    if (!album) return;
    if (album.my_role) { toast('你已是企划成员'); return; }

    if (album.require_review) {
      // 有报名表：跳转到申请页（后续实现）
      Alert.alert('申请加入', '报名表单功能开发中，请等待后续更新');
    } else {
      setJoinLoading(true);
      try {
        const res = await albumsApi.applyToAlbum(albumId!);
        if (res.joined) {
          toast('加入成功！');
          load();
        } else {
          toast('申请已提交，等待审核');
          load();
        }
      } catch (err: any) {
        toast(err?.message ?? '加入失败');
      } finally {
        setJoinLoading(false);
      }
    }
  };

  const onApply = () => {
    // TODO: 申请表单页
    Alert.alert('申请加入', '报名表单功能开发中');
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" /></View>;
  if (!album) return <View style={styles.center}><Text style={styles.emptyText}>企划不存在</Text></View>;

  const isAdmin = album.my_role === 'owner' || album.my_role === 'co_creator' || album.my_role === 'admin';
  const isMember = !!album.my_role;

  return (
    <>
      <Stack.Screen options={{ title: album.title, headerRight: () =>
        isAdmin ? (
          <Pressable onPress={() => router.push(`/albums/${albumId}/edit` as any)}>
            <Text style={styles.editBtn}>编辑</Text>
          </Pressable>
        ) : null
      } />
      <ScrollView
        style={styles.safe}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
      >
        {/* 封面 */}
        {album.cover_url ? (
          <Image source={{ uri: album.cover_url }} style={styles.cover} />
        ) : (
          <View style={[styles.cover, styles.coverPlaceholder]}>
            <Text style={styles.coverPlaceholderText}>企划封面</Text>
          </View>
        )}

        {/* 头部信息 */}
        <View style={styles.header}>
          <Text style={styles.title}>{album.title}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>
              {STATUS_LABEL[album.status]} · {PRIVACY_LABEL[album.privacy]}
            </Text>
            {album.my_role && (
              <Text style={styles.roleBadge}>{ROLE_LABEL[album.my_role]}</Text>
            )}
          </View>
          <Text style={styles.summary}>{album.summary || '暂无简介'}</Text>

          {/* 简介图片 */}
          {(album.summary_images ?? []).length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
              {album.summary_images.map((url, i) => (
                <Image key={i} source={{ uri: url }} style={styles.summaryImg} />
              ))}
            </ScrollView>
          )}

          {/* 标签 */}
          {album.tags?.length > 0 && (
            <View style={styles.tags}>
              {album.tags.map(tag => (
                <Text key={tag} style={styles.tag}>#{tag}</Text>
              ))}
            </View>
          )}

          {/* 统计 */}
          <View style={styles.stats}>
            <Text style={styles.statItem}>👥 {album.members_count} 成员</Text>
            <Text style={styles.statItem}>📷 {album.works_count} 作品</Text>
          </View>

          {/* 创建者 */}
          <Pressable style={styles.ownerRow} onPress={() => router.push(`/user/${album.owner_user_id}` as any)}>
            {album.owner_avatar ? (
              <Image source={{ uri: album.owner_avatar }} style={styles.ownerAvatar} />
            ) : (
              <View style={[styles.ownerAvatar, styles.avatarPlaceholder]} />
            )}
            <Text style={styles.ownerName}>{album.owner_nickname}</Text>
            <Text style={styles.ownerRole}>创建者</Text>
          </Pressable>

          {/* 加入按钮 */}
          {!isMember && (
            <Pressable
              style={[styles.joinBtn, joinLoading && styles.joinBtnDisabled]}
              onPress={album.require_review ? onApply : onJoin}
              disabled={joinLoading}
            >
              {joinLoading ? <ActivityIndicator color="#fff" /> : (
                <Text style={styles.joinBtnText}>
                  {album.require_review ? '申请加入' : '加入企划'}
                </Text>
              )}
            </Pressable>
          )}
        </View>

        {/* Tab切换 */}
        <View style={styles.tabBar}>
          {[
            { key: 'info' as Tab, label: '详情' },
            { key: 'gallery' as Tab, label: '画廊' },
            { key: 'members' as Tab, label: '成员' },
          ].map(t => (
            <Pressable key={t.key} onPress={() => setTab(t.key)}
              style={[styles.tab, tab === t.key && styles.tabOn]}>
              <Text style={[styles.tabText, tab === t.key && styles.tabTextOn]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Tab内容 */}
        {tab === 'info' && (
          <View style={styles.infoTab}>
            {/* 模块化展示 */}
            {album.modules?.filter(m => m.enabled).map(m => (
              <ModuleBlock key={m.key} module={m} />
            ))}
            {(!album.modules || album.modules.filter(m => m.enabled).length === 0) && (
              <Text style={styles.muted}>暂无展示内容</Text>
            )}
          </View>
        )}

        {tab === 'gallery' && (
          <GalleryTab albumId={albumId!} isMember={isMember} />
        )}

        {tab === 'members' && (
          <MembersTab albumId={albumId!} isAdmin={isAdmin} onRefresh={() => load()} />
        )}
      </ScrollView>
    </>
  );
}

// =============================================================
// 模块内容块
// =============================================================
function ModuleBlock({ module }: { module: AlbumModule }) {
  return (
    <View style={styles.moduleBlock}>
      <Text style={styles.moduleTitle}>{module.title}</Text>
      {module.content && <Text style={styles.moduleContent}>{module.content}</Text>}
      {module.imageUrls?.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
          {module.imageUrls.map((url, i) => (
            <Image key={i} source={{ uri: url }} style={styles.moduleImg} />
          ))}
        </ScrollView>
      )}
      {module.moduleType === 'qa' && (
        <View style={styles.qaBlock}>
          <Text style={styles.qaHint}>Q&A 模块（功能开发中）</Text>
        </View>
      )}
    </View>
  );
}

// =============================================================
// 画廊Tab
// =============================================================
function GalleryTab({ albumId, isMember }: { albumId: string; isMember: boolean }) {
  const [works, setWorks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<'all' | 'direct' | 'post_related'>('all');

  useEffect(() => {
    albumsApi.getWorks(albumId, type === 'all' ? undefined : { type }).then(res => {
      setWorks(res.list ?? []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [albumId, type]);

  return (
    <View style={{ padding: 12, gap: 12 }}>
      {/* 类型筛选 */}
      <View style={styles.row}>
        {[{ k: 'all', l: '全部' }, { k: 'direct', l: '直接上传' }, { k: 'post_related', l: '关联帖子' }].map(t => (
          <Pressable key={t.k} onPress={() => setType(t.k as typeof type)}
            style={[styles.pill, type === t.k && styles.pillOn]}>
            <Text style={[styles.pillText, type === t.k && styles.pillTextOn]}>{t.l}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? <ActivityIndicator /> :
        works.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.muted}>暂无作品</Text>
            {isMember && <Text style={styles.muted}>成为成员后可以上传作品</Text>}
          </View>
        ) : (
          <View style={styles.galleryGrid}>
            {works.map(work => (
              <Pressable key={work.id} style={styles.galleryItem}>
                {work.image_urls?.[0] ? (
                  <Image source={{ uri: work.image_urls[0] }} style={styles.galleryImg} />
                ) : (
                  <View style={[styles.galleryImg, styles.galleryPlaceholder]} />
                )}
                <Text style={styles.galleryTitle} numberOfLines={1}>{work.title}</Text>
              </Pressable>
            ))}
          </View>
        )
      }
    </View>
  );
}

// =============================================================
// 成员Tab
// =============================================================
function MembersTab({ albumId, isAdmin, onRefresh }: { albumId: string; isAdmin: boolean; onRefresh: () => void }) {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    albumsApi.getMembers(albumId).then(res => {
      setMembers(res.list ?? []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [albumId]);

  const onRemoveMember = async (userId: string) => {
    Alert.alert('移除成员', '确定要将该成员移出企划吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '移除', style: 'destructive',
        onPress: async () => {
          try {
            await albumsApi.removeMember(albumId, userId);
            toast('已移除');
            const res = await albumsApi.getMembers(albumId);
            setMembers(res.list ?? []);
          } catch (err: any) {
            toast(err?.message ?? '移除失败');
          }
        },
      },
    ]);
  };

  return (
    <View style={{ padding: 12, gap: 8 }}>
      {loading ? <ActivityIndicator /> :
        members.map(m => (
          <View key={m.id} style={styles.memberRow}>
            {m.avatar_url ? (
              <Image source={{ uri: m.avatar_url }} style={styles.memberAvatar} />
            ) : (
              <View style={[styles.memberAvatar, styles.avatarPlaceholder]} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.memberName}>{m.nickname}</Text>
              <Text style={styles.memberRole}>{ROLE_LABEL[m.role] ?? m.role}</Text>
            </View>
            {isAdmin && m.role !== 'owner' && (
              <Pressable onPress={() => onRemoveMember(m.user_id)}>
                <Text style={styles.removeBtn}>移除</Text>
              </Pressable>
            )}
          </View>
        ))
      }
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F8FA' },
  content: { paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyText: { color: '#9CA3AF', fontSize: 16 },
  muted: { color: '#9CA3AF', fontSize: 13, textAlign: 'center' },
  cover: { width: '100%', height: 200, backgroundColor: '#EEF1F4' },
  coverPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  coverPlaceholderText: { color: '#9CA3AF', fontWeight: '700' },
  header: { padding: 16, gap: 8 },
  title: { fontSize: 22, fontWeight: '900', color: '#111827' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaText: { color: '#6B7280', fontSize: 13 },
  roleBadge: { backgroundColor: '#111827', color: '#fff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, fontSize: 11, fontWeight: '900' },
  summary: { color: '#374151', fontSize: 15, lineHeight: 22 },
  summaryImg: { width: 200, height: 150, borderRadius: 10, marginRight: 8, backgroundColor: '#EEF1F4' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { color: '#2563EB', fontSize: 12, fontWeight: '700' },
  stats: { flexDirection: 'row', gap: 16 },
  statItem: { color: '#6B7280', fontSize: 13 },
  ownerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  ownerAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#EEF1F4' },
  avatarPlaceholder: {},
  ownerName: { fontWeight: '800', color: '#111827', fontSize: 14 },
  ownerRole: { color: '#9CA3AF', fontSize: 12 },
  joinBtn: { height: 46, borderRadius: 14, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  joinBtnDisabled: { opacity: 0.6 },
  joinBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#EEF1F4' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabOn: { borderBottomWidth: 2, borderBottomColor: '#111827' },
  tabText: { fontWeight: '700', color: '#9CA3AF', fontSize: 14 },
  tabTextOn: { color: '#111827' },
  infoTab: { padding: 12, gap: 12 },
  moduleBlock: { backgroundColor: '#fff', borderRadius: 14, padding: 14, gap: 8, borderWidth: 1, borderColor: '#EEF1F4' },
  moduleTitle: { fontWeight: '900', color: '#111827', fontSize: 16 },
  moduleContent: { color: '#374151', fontSize: 14, lineHeight: 22 },
  moduleImg: { width: 160, height: 120, borderRadius: 10, marginRight: 8, backgroundColor: '#EEF1F4' },
  qaBlock: { backgroundColor: '#F3F4F6', borderRadius: 10, padding: 12, marginTop: 8 },
  qaHint: { color: '#9CA3AF', fontSize: 12, textAlign: 'center' },
  row: { flexDirection: 'row', gap: 8 },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: '#EEF1F4' },
  pillOn: { backgroundColor: '#111827', borderColor: '#111827' },
  pillText: { fontWeight: '900', color: '#111827', fontSize: 12 },
  pillTextOn: { color: '#fff' },
  galleryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  galleryItem: { width: '31%', gap: 4 },
  galleryImg: { width: '100%', aspectRatio: 1, borderRadius: 10, backgroundColor: '#EEF1F4' },
  galleryPlaceholder: {},
  galleryTitle: { fontSize: 11, color: '#6B7280', fontWeight: '700' },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#EEF1F4' },
  memberAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EEF1F4' },
  memberName: { fontWeight: '800', color: '#111827', fontSize: 14 },
  memberRole: { color: '#9CA3AF', fontSize: 12 },
  removeBtn: { color: '#EF4444', fontWeight: '800', fontSize: 13 },
  editBtn: { color: '#2563EB', fontWeight: '900', fontSize: 15 },
});
