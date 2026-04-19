import React, { useEffect, useState, useCallback, useLayoutEffect } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable, TextInput, Image, Dimensions, FlatList, Alert, Keyboard, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { toast } from '@/src/components/toast';
import { ImageCarousel } from '@/src/components/ImageCarousel';
import { RelationshipGraph } from '@/src/components/RelationshipGraph';
import { TimelineView } from '@/src/components/Timeline';
import { dataGateway } from '@/src/services/dataGateway';
import { useSessionStore } from '@/src/stores/sessionStore';

type TabType = 'description' | 'relationship' | 'timeline' | 'comments';

const TABS: { key: TabType; label: string }[] = [
  { key: 'description', label: '人物设定' },
  { key: 'relationship', label: '关系网' },
  { key: 'timeline', label: '时间轴' },
  { key: 'comments', label: '评论区' },
];

interface RoleDetail {
  id: string;
  name: string;
  avatarUrl?: string;
  ownerUserId: string;
  ownerNickname: string;
  ownerAvatarUrl?: string;
  imageUrls: string[];
  coverAspectRatio: number;
  maxCoverHeight: number;
  description: string;
  relationship: { nodes: any[]; edges: any[] } | null;
  timeline: { id: string; title: string; content: string; imageUrls: string[]; createdAt: string }[];
  followersCount: number;
  likesCount: number;
  isLiked: boolean;
  isFavorited: boolean;
  createdAt: string;
}

interface Comment {
  id: string;
  authorUserId: string;
  authorNickname: string;
  authorAvatarUrl?: string;
  content: string;
  likesCount: number;
  createdAt: string;
  repliesCount: number;
}

export default function RoleDetailPage() {
  const router = useRouter();
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { roleId } = useLocalSearchParams<{ roleId: string }>();
  const rid = String(roleId ?? '');
  const { user } = useSessionStore();

  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<RoleDetail | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('description');
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentLoading, setCommentLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // 监听键盘高度
  useEffect(() => {
    // 使用 didShow 更可靠
    const show = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // 加载角色详情
  const loadRole = useCallback(async () => {
    if (!rid) return;
    setLoading(true);
    try {
      const data = await dataGateway.roles.getRole(rid);
      setRole(data);
    } catch (err) {
      toast('加载失败');
    } finally {
      setLoading(false);
    }
  }, [rid]);

  // 加载评论
  const loadComments = useCallback(async () => {
    if (!rid) return;
    setCommentLoading(true);
    try {
      const data = await dataGateway.roles.getComments(rid);
      setComments(data);
    } catch (err) {
      console.error('Failed to load comments:', err);
    } finally {
      setCommentLoading(false);
    }
  }, [rid]);

  useEffect(() => {
    loadRole();
  }, [loadRole]);

  useEffect(() => {
    if (activeTab === 'comments') {
      loadComments();
    }
  }, [activeTab, loadComments]);

  // 收藏/关注角色
  const handleFavorite = async () => {
    if (!rid || !role) return;
    try {
      const result = await dataGateway.roles.favoriteRole(rid);
      setRole({ ...role, isFavorited: result.favorited, followersCount: result.favorited ? role.followersCount + 1 : role.followersCount - 1 });
      toast(result.favorited ? '已关注' : '已取消关注');
    } catch (err) {
      toast('操作失败');
    }
  };

  // 点赞角色
  const handleLike = async () => {
    if (!rid || !role) return;
    try {
      const result = await dataGateway.roles.likeRole(rid);
      setRole({ ...role, isLiked: result.liked, likesCount: result.likesCount });
      toast(result.liked ? '已点赞' : '已取消点赞');
    } catch (err) {
      toast('操作失败');
    }
  };

  // 底部交互栏
  const handleFocus = () => setInputFocused(true);
  const handleBlur = () => setInputFocused(false);

  const handleAddImage = async () => {
    // TODO: 选择图片
    toast('选择图片功能（待接入）');
  };

  const handleMention = async () => {
    // TODO: @用户
    toast('@用户功能（待接入）');
  };
  const handleSendComment = async () => {
    if (!rid || !newComment.trim()) return;
    try {
      const comment = await dataGateway.roles.createComment(rid, newComment.trim());
      setComments([comment, ...comments]);
      setNewComment('');
      toast('评论成功');
    } catch (err) {
      toast('评论失败');
    }
  };

  // 删除角色
  const handleDeleteRole = async () => {
    if (!rid || !role) return;
    try {
      await dataGateway.roles.deleteRole(rid);
      toast('已删除');
      router.back();
    } catch (err) {
      toast('删除失败');
    }
  };

  // 是否是角色所有者
  const isOwner = user?.id === role?.ownerUserId;

  // 设置右上角菜单按钮
  useLayoutEffect(() => {
    if (isOwner) {
      navigation.setOptions({
        headerRight: () => (
          <Pressable onPress={() => Alert.alert('选择操作', undefined, [
            { text: '编辑角色', onPress: () => router.push(`/roles/edit/${role?.id}` as any) },
            { text: '删除角色', style: 'destructive', onPress: handleDeleteRole },
            { text: '取消', style: 'cancel' },
          ])}>
            <Text style={{ fontSize: 20 }}>⋮</Text>
          </Pressable>
        ),
      });
    }
    return () => {
      navigation.setOptions({ headerRight: undefined });
    };
  }, [isOwner, role, navigation]);

  if (loading || !role) {
    return (
      <View style={styles.loading}>
        <Text style={{ color: '#6B7280' }}>加载中…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'android' ? 100 : 0} style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* 图片轮播 */}
        <ImageCarousel images={role.imageUrls} height={280} />

        {/* 角色信息 */}
        <View style={styles.card}>
          <View style={styles.headRow}>
            {role.imageUrls && role.imageUrls[0] ? (
              <Image source={{ uri: role.imageUrls[0] }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={{ fontSize: 20 }}>🎭</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{role.name}</Text>
              <Pressable onPress={() => router.push(`/user/${role.ownerUserId}` as any)}>
                <Text style={styles.meta}>
                  {role.ownerNickname} · {role.followersCount} 关注
                </Text>
              </Pressable>
            </View>
            <Pressable onPress={handleFavorite} style={[styles.followBtn, role.isFavorited && styles.followBtnActive]}>
              <Text style={[styles.followText, role.isFavorited && styles.followTextActive]}>
                {role.isFavorited ? '已关注' : '关注'}
              </Text>
            </Pressable>
          </View>
          {isOwner && (
            <Pressable onPress={() => router.push(`/roles/edit/${role.id}` as any)} style={styles.editBtn}>
              <Text style={styles.editText}>编辑角色</Text>
            </Pressable>
          )}
        </View>

        {/* Tab 切换 */}
        <View style={styles.tabBar}>
          {TABS.map((tab) => (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Tab 内容 */}
        <View style={styles.tabContent}>
          {activeTab === 'description' && (
            <View style={styles.description}>
              {role.description ? (
                <Text style={styles.descriptionText}>{role.description}</Text>
              ) : (
                <Text style={styles.emptyText}>暂无人物设定</Text>
              )}
            </View>
          )}

          {activeTab === 'relationship' && (
            <RelationshipGraph data={role.relationship} mainRoleName={role.name} mainRoleAvatar={role.imageUrls?.[0]} />
          )}

          {activeTab === 'timeline' && (
            <TimelineView items={role.timeline} />
          )}

          {activeTab === 'comments' && (
            <View style={styles.comments}>
              {/* 只显示评论列表，评论输入移到页面底部 */}
              {commentLoading ? (
                <Text style={styles.loadingText}>加载中...</Text>
              ) : comments.length === 0 ? (
                <Text style={styles.emptyText}>暂无评论</Text>
              ) : (
                comments.map((comment) => (
                  <View key={comment.id} style={styles.commentItem}>
                    {comment.authorAvatarUrl ? (
                      <Image source={{ uri: comment.authorAvatarUrl }} style={styles.commentAvatar} />
                    ) : (
                      <View style={styles.commentAvatarPlaceholder} />
                    )}
                    <View style={styles.commentContent}>
                      <Text style={styles.commentAuthor}>{comment.authorNickname}</Text>
                      <Text style={styles.commentText}>{comment.content}</Text>
                      <Text style={styles.commentDate}>
                        {new Date(comment.createdAt).toLocaleDateString('zh-CN')}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* 底部交互栏 */}
      <View style={[styles.bottomBar, { paddingBottom: keyboardHeight > 0 ? 0 : 8 }]}>
        {inputFocused || keyboardHeight > 0 ? (
          /* 展开状态 */
          <View style={styles.bottomExpanded}>
            <TextInput
              style={styles.bottomInputExpanded}
              placeholder="说点什么..."
              value={newComment}
              onChangeText={setNewComment}
              onFocus={handleFocus}
              onBlur={handleBlur}
              autoFocus
            />
            <View style={styles.bottomExpandedActions}>
              <Pressable onPress={handleAddImage} style={styles.bottomExpAction}>
                <Text style={styles.bottomExpIcon}>🖼️</Text>
              </Pressable>
              <Pressable onPress={handleMention} style={styles.bottomExpAction}>
                <Text style={styles.bottomExpIcon}>@</Text>
              </Pressable>
              <Pressable onPress={handleSendComment} disabled={!newComment.trim()} style={[styles.bottomExpSend, !newComment.trim() && styles.bottomExpSendDisabled]}>
                <Text style={[styles.bottomExpSendText, !newComment.trim() && styles.bottomExpSendTextDisabled]}>发送</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          /* 收起状态 */
          <View style={styles.bottomCollapsed}>
            <Pressable onPress={handleFocus} style={styles.bottomInputCollapsed}>
              <Text style={styles.bottomInputCollapsedText}>说点什么...</Text>
            </Pressable>
            <View style={styles.bottomActions}>
              <Pressable onPress={handleLike} style={styles.bottomAction}>
                <Text style={[styles.bottomActionIcon, role.isLiked && styles.bottomActionIconActive]}>
                  {role.isLiked ? '❤️' : '🤍'}
                </Text>
                <Text style={[styles.bottomCount, role.isLiked && styles.bottomCountActive]}>
                  {role.likesCount > 0 ? role.likesCount : ''}
                </Text>
              </Pressable>
              <Pressable onPress={handleFavorite} style={styles.bottomAction}>
                <Text style={[styles.bottomActionIcon, role.isFavorited && styles.bottomActionIconActive]}>
                  {role.isFavorited ? '⭐' : '☆'}
                </Text>
                <Text style={[styles.bottomCount, role.isFavorited && styles.bottomCountActive]}>
                  {role.followersCount > 0 ? role.followersCount : ''}
                </Text>
              </Pressable>
              <Pressable onPress={() => toast('不感兴趣')} style={styles.bottomAction}>
                <Text style={styles.bottomActionIcon}>👎</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F8FA' },
  scroll: { flex: 1 },
  content: { paddingBottom: 28 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: {
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 0,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  headRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  avatar: { width: 56, height: 56, borderRadius: 20, backgroundColor: '#E5E7EB' },
  avatarPlaceholder: { width: 56, height: 56, borderRadius: 20, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center' },
  name: { fontWeight: '900', color: '#111827', fontSize: 18 },
  meta: { marginTop: 4, color: '#6B7280', fontSize: 12 },
  followBtn: { height: 36, paddingHorizontal: 16, borderRadius: 999, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center' },
  followBtnActive: { backgroundColor: '#111827' },
  followText: { color: '#1D4ED8', fontWeight: '900', fontSize: 13 },
  followTextActive: { color: '#fff' },
  editBtn: { backgroundColor: '#F3F4F6', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  editText: { color: '#374151', fontWeight: '600' },
  tabBar: { flexDirection: 'row', marginHorizontal: 16, marginTop: 16, backgroundColor: '#fff', borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#111827' },
  tabText: { color: '#6B7280', fontWeight: '600', fontSize: 13 },
  tabTextActive: { color: '#fff' },
  tabContent: { margin: 16 },
  description: { backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  descriptionText: { fontSize: 14, color: '#374151', lineHeight: 22 },
  emptyText: { color: '#9CA3AF', fontSize: 14, textAlign: 'center', paddingVertical: 20 },
  comments: { gap: 12 },
  commentInput: { flexDirection: 'row', gap: 8, backgroundColor: '#fff', borderRadius: 12, padding: 12 },
  input: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 8, padding: 10, maxHeight: 80, fontSize: 14 },
  sendBtn: { backgroundColor: '#111827', paddingHorizontal: 16, borderRadius: 8, justifyContent: 'center' },
  sendText: { color: '#fff', fontWeight: '900', fontSize: 13 },
  loadingText: { textAlign: 'center', color: '#6B7280', padding: 20 },
  commentItem: { flexDirection: 'row', gap: 10, backgroundColor: '#fff', borderRadius: 12, padding: 12 },
  commentAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E5E7EB' },
  commentAvatarPlaceholder: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E5E7EB' },
  commentContent: { flex: 1 },
  commentAuthor: { fontWeight: '900', color: '#111827', fontSize: 13 },
  commentText: { marginTop: 4, color: '#374151', fontSize: 13, lineHeight: 18 },
  commentDate: { marginTop: 6, color: '#9CA3AF', fontSize: 11 },

  // 底部交互栏
  bottomBar: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 12,
    // paddingBottom 在有键盘时设为 0
  },
  // 收起状态
  bottomCollapsed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bottomInputCollapsed: {
    flex: 1,
    height: 36,
    backgroundColor: '#F3F4F6',
    borderRadius: 18,
    justifyContent: 'center',
    paddingLeft: 14,
  },
  bottomInputCollapsedText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  bottomActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bottomAction: {
    alignItems: 'center',
    minWidth: 30,
  },
  bottomActionIcon: {
    fontSize: 18,
  },
  bottomActionIconActive: {},
  bottomCount: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  bottomCountActive: {
    color: '#111827',
  },
  // 展开状态
  bottomExpanded: {
    gap: 8,
  },
  bottomInputExpanded: {
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  bottomExpandedActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottomExpAction: {
    padding: 8,
  },
  bottomExpIcon: {
    fontSize: 20,
  },
  bottomExpSend: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#111827',
    borderRadius: 16,
  },
  bottomExpSendDisabled: {
    opacity: 0.5,
  },
  bottomExpSendText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  bottomExpSendTextDisabled: {},

  // 旧样式（保留兼容性）
  bottomInput: {
    flex: 1,
    height: 36,
    backgroundColor: '#F3F4F6',
    borderRadius: 18,
    paddingHorizontal: 14,
    fontSize: 14,
  },
});