import React, { useEffect, useState, useLayoutEffect } from 'react';
import { Alert, Image, Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { toast } from '@/src/components/toast';
import { dataGateway } from '@/src/services/dataGateway';
import { useSessionStore } from '@/src/stores/sessionStore';
import { scale, verticalScale } from '@/src/utils/uiScale';

interface Comment {
  id: string;
  postId: string;
  parentCommentId: string | null;
  authorUserId: string;
  authorNickname: string;
  authorAvatarUrl: string | null;
  content: string;
  imageUrl: string | null;
  likesCount: number;
  createdAt: string;
  repliesCount: number;
}

interface PostDetail {
  id: string;
  authorUserId: string;
  authorNickname: string;
  authorAvatarUrl: string | null;
  title: string;
  content: string;
  imageUrls: string[];
  coverImageUrl: string | null;
  tags: string[];
  createdAt: string;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  isFavorited: boolean;
}

export default function PostDetailPage() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const router = useRouter();
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { user } = useSessionStore();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentInputVisible, setCommentInputVisible] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // 监听键盘高度
  useEffect(() => {
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

  useEffect(() => {
    if (postId) {
      loadPost();
      loadComments();
    }
  }, [postId]);

  // 设置右上角菜单按钮
  useLayoutEffect(() => {
    if (isOwner) {
      navigation.setOptions({
        headerRight: () => (
          <Pressable onPress={() => Alert.alert('选择操作', undefined, [
            { text: '编辑帖子', onPress: () => router.push(`/posts/edit/${post?.id}` as any) },
            { text: '删除帖子', style: 'destructive', onPress: handleDelete },
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
  }, [isOwner, post, navigation]);

  const loadPost = async () => {
    try {
      const data = await dataGateway.me.getPost(postId!);
      setPost(data as any);
    } catch (error) {
      toast('加载失败');
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      const data = await dataGateway.me.getComments(postId!);
      setComments(data || []);
    } catch (error) {
      console.error('loadComments failed:', error);
    }
  };

  const handleLike = async () => {
    if (!post) return;
    try {
      const result = await dataGateway.me.likePost(post.id);
      setPost({
        ...post,
        isLiked: result.liked,
        likesCount: result.liked ? post.likesCount + 1 : Math.max(post.likesCount - 1, 0)
      });
    } catch {
      toast('操作失败');
    }
  };

  const handleFavorite = async () => {
    if (!post) return;
    try {
      const result = await dataGateway.me.favoritePost(post.id);
      setPost({ ...post, isFavorited: result.favorited });
    } catch {
      toast('操作失败');
    }
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim() || !post) return;
    setSubmitting(true);
    try {
      const newComment = await dataGateway.me.createComment(post.id, commentText.trim());
      setComments([newComment, ...comments]);
      setPost({ ...post, commentsCount: post.commentsCount + 1 });
      setCommentText('');
      setInputFocused(false);
      toast('评论成功');
    } catch (error) {
      toast('评论失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 底部栏操作
  const handleFocus = () => setInputFocused(true);
  const handleBlur = () => setInputFocused(false);
  const handleAddImage = () => toast('选择图片功能（待接入）');
  const handleMention = () => toast('@用户功能（待接入）');

  // 删除帖子
  const handleDelete = async () => {
    if (!post) return;
    try {
      await dataGateway.me.deletePost(post.id);
      toast('已删除');
      router.back();
    } catch (err) {
      toast('删除失败');
    }
  };

  // 是否是作者
  const isOwner = user?.id === post?.authorUserId;

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>加载中...</Text>
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.container}>
        <Text>帖子不存在</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        {/* 作者信息 */}
        <View style={styles.authorRow}>
          {post.authorAvatarUrl ? (
            <Image source={{ uri: post.authorAvatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder} />
          )}
          <View style={styles.authorInfo}>
            <Text style={styles.authorName}>{post.authorNickname}</Text>
            <Text style={styles.postTime}>{new Date(post.createdAt).toLocaleDateString()}</Text>
          </View>
        </View>

        {/* 标题 */}
        <Text style={styles.title}>{post.title}</Text>

        {/* 内容 */}
        {post.content ? <Text style={styles.contentText}>{post.content}</Text> : null}

        {/* 图片 */}
        {post.imageUrls && post.imageUrls.length > 0 && (
          <View style={styles.imagesGrid}>
            {post.imageUrls.map((url, index) => (
              <Image key={index} source={{ uri: url }} style={styles.image} />
            ))}
          </View>
        )}

        {/* 标签 */}
        {post.tags && post.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {post.tags.map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* 评论列表 */}
        <View style={styles.commentsSection}>
          <Text style={styles.commentsTitle}>评论 {post.commentsCount}</Text>
          {comments.length === 0 ? (
            <Text style={styles.noComments}>暂无评论，快来抢沙发吧~</Text>
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
                  <Text style={styles.commentTime}>{new Date(comment.createdAt).toLocaleDateString()}</Text>
                </View>
              </View>
            ))
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
              value={commentText}
              onChangeText={setCommentText}
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
              <Pressable onPress={handleSubmitComment} disabled={!commentText.trim() || submitting} style={[styles.bottomExpSend, (!commentText.trim() || submitting) && styles.bottomExpSendDisabled]}>
                <Text style={[styles.bottomExpSendText, (!commentText.trim() || submitting) && styles.bottomExpSendTextDisabled]}>发送</Text>
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
                <Text style={[styles.bottomActionIcon, post.isLiked && styles.bottomActionIconActive]}>
                  {post.isLiked ? '❤️' : '🤍'}
                </Text>
                <Text style={[styles.bottomCount, post.isLiked && styles.bottomCountActive]}>
                  {post.likesCount > 0 ? post.likesCount : ''}
                </Text>
              </Pressable>
              <Pressable onPress={handleFavorite} style={styles.bottomAction}>
                <Text style={[styles.bottomActionIcon, post.isFavorited && styles.bottomActionIconActive]}>
                  {post.isFavorited ? '⭐' : '☆'}
                </Text>
                <Text style={[styles.bottomCount, post.isFavorited && styles.bottomCountActive]}>
                  {post.isFavorited ? '已收藏' : ''}
                </Text>
              </Pressable>
              <Pressable onPress={() => toast('不感兴趣')} style={styles.bottomAction}>
                <Text style={styles.bottomActionIcon}>👎</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flex: 1 },
  authorRow: { flexDirection: 'row', alignItems: 'center', padding: scale(16) },
  avatar: { width: scale(44), height: scale(44), borderRadius: 22 },
  avatarPlaceholder: { width: scale(44), height: scale(44), borderRadius: 22, backgroundColor: '#D9D9D9' },
  authorInfo: { marginLeft: scale(12) },
  authorName: { fontSize: scale(16), fontWeight: '600', color: '#111827' },
  postTime: { fontSize: scale(12), color: '#9CA3AF', marginTop: verticalScale(2) },
  title: { fontSize: scale(20), fontWeight: '700', color: '#111827', paddingHorizontal: scale(16), marginBottom: verticalScale(12) },
  contentText: { fontSize: scale(15), color: '#374151', lineHeight: scale(24), paddingHorizontal: scale(16), marginBottom: verticalScale(16) },
  imagesGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: scale(16), gap: scale(8) },
  image: { width: scale(110), height: scale(110), borderRadius: scale(8), backgroundColor: '#D9D9D9' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: scale(16), gap: scale(8), marginTop: verticalScale(12) },
  tag: { backgroundColor: '#FEE2E2', paddingHorizontal: scale(12), paddingVertical: verticalScale(4), borderRadius: scale(12) },
  tagText: { color: '#DC2626', fontSize: scale(13) },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: verticalScale(20), borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB', marginTop: verticalScale(20) },
  actionBtn: { paddingHorizontal: scale(16), paddingVertical: verticalScale(8) },
  actionText: { fontSize: scale(15), color: '#6B7280' },
  actionTextActive: { color: '#FF0000' },
  commentsSection: { padding: scale(16), borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB' },
  commentsTitle: { fontSize: scale(16), fontWeight: '600', color: '#111827', marginBottom: verticalScale(12) },
  noComments: { fontSize: scale(14), color: '#9CA3AF', textAlign: 'center', paddingVertical: verticalScale(20) },
  commentItem: { flexDirection: 'row', marginBottom: verticalScale(16) },
  commentAvatar: { width: scale(32), height: scale(32), borderRadius: 16 },
  commentAvatarPlaceholder: { width: scale(32), height: scale(32), borderRadius: 16, backgroundColor: '#D9D9D9' },
  commentContent: { flex: 1, marginLeft: scale(12) },
  commentAuthor: { fontSize: scale(14), fontWeight: '600', color: '#111827' },
  commentText: { fontSize: scale(14), color: '#374151', marginTop: verticalScale(4) },
  commentTime: { fontSize: scale(12), color: '#9CA3AF', marginTop: verticalScale(4) },
  commentModalMask: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  commentModalSheet: { backgroundColor: '#FFFFFF', padding: scale(16), paddingBottom: verticalScale(34) },
  commentInputRow: { flexDirection: 'row', alignItems: 'flex-end' },
  commentInput: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: scale(20), paddingHorizontal: scale(16), paddingVertical: verticalScale(10), maxHeight: verticalScale(100), fontSize: scale(15) },
  commentSubmit: { backgroundColor: '#2563EB', borderRadius: scale(20), paddingHorizontal: scale(16), paddingVertical: verticalScale(10), marginLeft: scale(12) },
  commentSubmitDisabled: { backgroundColor: '#93C5FD' },
  commentSubmitText: { color: '#FFFFFF', fontSize: scale(14), fontWeight: '600' },

  // 底部交互栏
  bottomBar: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 12,
  },
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
});