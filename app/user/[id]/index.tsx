import React, { useEffect } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { toast } from '@/src/components/toast';
import { useUserProfileStore } from '@/src/stores/userProfileStore';
import { scale, verticalScale } from '@/src/utils/uiScale';

export default function UserProfilePage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const {
    userDetail,
    userDetailLoading,
    userDetailError,
    loadUserDetail,
    follow,
    unfollow,
    block,
  } = useUserProfileStore();

  useEffect(() => {
    if (id) {
      void loadUserDetail(id);
    }
  }, [id, loadUserDetail]);

  const handleFollowToggle = async () => {
    if (!userDetail) return;
    if (userDetail.isFollowing) {
      await unfollow(userDetail.id);
      toast('已取消关注');
    } else {
      await follow(userDetail.id);
      toast('关注成功');
    }
  };

  const handleBlock = async () => {
    if (!userDetail) return;
    if (userDetail.isBlocked) {
      toast('已解除拉黑');
    } else {
      await block(userDetail.id);
      toast('已拉黑');
    }
  };

  if (userDetailLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}><Text style={styles.loadingText}>加载中...</Text></View>
      </SafeAreaView>
    );
  }

  if (userDetailError || !userDetail) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}><Text style={styles.errorText}>{userDetailError ?? '用户不存在'}</Text></View>
      </SafeAreaView>
    );
  }

  const isMe = userDetail.isMe;

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.topBar}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backIcon}>←</Text>
            </Pressable>
            <Text style={styles.headerTitle} numberOfLines={1}>{userDetail.nickname}</Text>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.profileRow}>
            <Image
              source={{ uri: userDetail.avatarUrl ?? undefined }}
              style={styles.avatar}
            />
            <View style={styles.statsRow}>
              <Pressable style={styles.statItem} onPress={() => router.push(`/user/${id}/followers` as any)}>
                <Text style={styles.statNum}>{userDetail.followersCount}</Text>
                <Text style={styles.statLabel}>粉丝</Text>
              </Pressable>
              <Pressable style={styles.statItem} onPress={() => router.push(`/user/${id}/following` as any)}>
                <Text style={styles.statNum}>{userDetail.followingCount}</Text>
                <Text style={styles.statLabel}>关注</Text>
              </Pressable>
              <View style={styles.statItem}>
                <Text style={styles.statNum}>0</Text>
                <Text style={styles.statLabel}>获赞</Text>
              </View>
            </View>
          </View>

          <View style={styles.nameRow}>
            <Text style={styles.nickname}>{userDetail.nickname}</Text>
            {userDetail.ipLocation && <Text style={styles.ipText}>IP属地：{userDetail.ipLocation}</Text>}
          </View>

          {userDetail.bio ? <Text style={styles.bio}>{userDetail.bio}</Text> : null}

          {userDetail.titles.length > 0 && (
            <View style={styles.titlesRow}>
              {userDetail.titles.map((title, i) => (
                <Text key={i} style={styles.titleTag}>{title}</Text>
              ))}
            </View>
          )}

          <View style={styles.actionRow}>
            {isMe ? (
              <Pressable style={styles.editBtn} onPress={() => router.push('/(tabs)/me' as any)}>
                <Text style={styles.editText}>编辑资料</Text>
              </Pressable>
            ) : (
              <>
                <Pressable
                  style={[styles.followBtn, userDetail.isFollowing && styles.followingBtn]}
                  onPress={handleFollowToggle}
                >
                  <Text style={[styles.followText, userDetail.isFollowing && styles.followingText]}>
                    {userDetail.isFollowing ? '已关注' : '关注'}
                  </Text>
                </Pressable>
                <Pressable style={styles.msgBtn}>
                  <Text style={styles.msgText}>私信</Text>
                </Pressable>
                <Pressable
                  style={[styles.blockBtn, userDetail.isBlocked && styles.unblockBtn]}
                  onPress={handleBlock}
                >
                  <Text style={[styles.blockText, userDetail.isBlocked && styles.unblockText]}>
                    {userDetail.isBlocked ? '解除拉黑' : '拉黑'}
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        </View>

        <View style={styles.contentSection}>
          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Ta的发布</Text></View>

          {userDetail.posts.length > 0 ? (
            <View style={styles.postsGrid}>
              {userDetail.posts.map((post) => (
                <Pressable
                  key={post.id}
                  style={styles.postCard}
                  onPress={() => router.push(`/posts/${post.id}` as any)}
                >
                  {post.imageUrl ? (
                    <Image source={{ uri: post.imageUrl }} style={styles.postCover} resizeMode="cover" />
                  ) : (
                    <View style={styles.postCoverPlaceholder}><Text style={styles.postCoverText}>无图</Text></View>
                  )}
                  <Text style={styles.postTitle} numberOfLines={2}>{post.title}</Text>
                  <View style={styles.postMeta}>
                    <Text style={styles.postMetaText}>❤️ {post.likesCount}</Text>
                    <Text style={styles.postMetaText}>💬 {post.commentsCount}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={styles.emptySection}><Text style={styles.emptyText}>暂无发布内容</Text></View>
          )}

          {userDetail.roles.length > 0 && (
            <>
              <View style={[styles.sectionHeader, { marginTop: verticalScale(16) }]}>
                <Text style={styles.sectionTitle}>人设卡</Text>
              </View>
              <View style={styles.rolesList}>
                {userDetail.roles.map((role) => (
                  <Pressable
                    key={role.id}
                    style={styles.roleCard}
                    onPress={() => router.push(`/roles/${role.id}` as any)}
                  >
                    <Image source={{ uri: role.avatarUrl ?? undefined }} style={styles.roleAvatar} />
                    <Text style={styles.roleName}>{role.name}</Text>
                    <Text style={styles.roleFollowers}>{role.followersCount} 粉丝</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const AVATAR_SIZE = 84;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#9CA3AF', fontSize: 15 },
  errorText: { color: '#EF4444', fontSize: 15 },
  header: { paddingHorizontal: scale(16), paddingBottom: verticalScale(20) },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: verticalScale(44) },
  backBtn: { width: scale(30), height: verticalScale(30), justifyContent: 'center' },
  backIcon: { fontSize: scale(22), color: '#111' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: scale(17), fontWeight: '600', color: '#111' },
  placeholder: { width: scale(30) },
  profileRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: verticalScale(8), gap: scale(16) },
  avatar: { width: scale(AVATAR_SIZE), height: scale(AVATAR_SIZE), borderRadius: 99, backgroundColor: '#E5E7EB' },
  statsRow: { flex: 1, flexDirection: 'row', justifyContent: 'space-around', paddingTop: verticalScale(8) },
  statItem: { alignItems: 'center', gap: 2 },
  statNum: { fontSize: scale(18), fontWeight: '800', color: '#111' },
  statLabel: { fontSize: scale(12), color: '#6B7280' },
  nameRow: { marginTop: verticalScale(10), flexDirection: 'row', alignItems: 'center', gap: scale(8) },
  nickname: { fontSize: scale(18), fontWeight: '700', color: '#111' },
  ipText: { fontSize: scale(12), color: '#9CA3AF' },
  bio: { marginTop: verticalScale(6), fontSize: scale(14), color: '#374151', lineHeight: 20 },
  titlesRow: { marginTop: verticalScale(8), flexDirection: 'row', flexWrap: 'wrap', gap: scale(6) },
  titleTag: { backgroundColor: '#F3F4F6', color: '#374151', fontSize: scale(12), paddingHorizontal: scale(8), paddingVertical: verticalScale(3), borderRadius: 999 },
  actionRow: { marginTop: verticalScale(14), flexDirection: 'row', gap: scale(10) },
  editBtn: { flex: 1, height: verticalScale(36), borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  editText: { fontSize: scale(14), fontWeight: '600', color: '#374151' },
  followBtn: { flex: 1, height: verticalScale(36), borderRadius: 8, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center' },
  followingBtn: { backgroundColor: '#F3F4F6' },
  followText: { fontSize: scale(14), fontWeight: '700', color: '#fff' },
  followingText: { color: '#374151' },
  msgBtn: { width: scale(60), height: verticalScale(36), borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  msgText: { fontSize: scale(14), fontWeight: '600', color: '#374151' },
  blockBtn: { width: scale(60), height: verticalScale(36), borderRadius: 8, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
  unblockBtn: { backgroundColor: '#F3F4F6' },
  blockText: { fontSize: scale(14), fontWeight: '600', color: '#EF4444' },
  unblockText: { color: '#374151' },
  contentSection: { borderTopWidth: 8, borderTopColor: '#F7F8FA', paddingTop: verticalScale(16) },
  sectionHeader: { paddingHorizontal: scale(16), marginBottom: verticalScale(12) },
  sectionTitle: { fontSize: scale(16), fontWeight: '700', color: '#111' },
  postsGrid: { paddingHorizontal: scale(16), flexDirection: 'row', flexWrap: 'wrap', gap: scale(8) },
  postCard: { width: '48%', backgroundColor: '#F9FAFB', borderRadius: 12, overflow: 'hidden' },
  postCover: { width: '100%', height: scale(120), backgroundColor: '#E5E7EB' },
  postCoverPlaceholder: { width: '100%', height: scale(120), backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  postCoverText: { color: '#9CA3AF', fontSize: 13 },
  postTitle: { paddingHorizontal: scale(8), paddingTop: verticalScale(6), fontSize: scale(13), color: '#111', fontWeight: '500' },
  postMeta: { paddingHorizontal: scale(8), paddingVertical: verticalScale(4), flexDirection: 'row', gap: scale(10) },
  postMetaText: { fontSize: scale(11), color: '#6B7280' },
  rolesList: { paddingHorizontal: scale(16), gap: scale(10) },
  roleCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 12, padding: scale(12), gap: scale(12) },
  roleAvatar: { width: scale(48), height: scale(48), borderRadius: 99, backgroundColor: '#E5E7EB' },
  roleName: { flex: 1, fontSize: scale(14), fontWeight: '600', color: '#111' },
  roleFollowers: { fontSize: scale(12), color: '#6B7280' },
  emptySection: { paddingVertical: verticalScale(32), alignItems: 'center' },
  emptyText: { color: '#9CA3AF', fontSize: 14 },
});
