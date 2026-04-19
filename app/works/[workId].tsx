import React, { useEffect, useState, useCallback } from 'react';
import {
  Dimensions, FlatList, Image, Pressable, SafeAreaView,
  ScrollView, StyleSheet, Text, TextInput, View, KeyboardAvoidingView, Platform, RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { toast } from '@/src/components/toast';
import { worksApi } from '@/src/services/worksApi';
import type { WorkItem, WorkComment } from '@/src/services/worksApi';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function WorkDetailPage() {
  const { workId } = useLocalSearchParams<{ workId: string }>();
  const router = useRouter();
  const wid = String(workId ?? '');

  const [work, setWork] = useState<WorkItem | null>(null);
  const [comments, setComments] = useState<WorkComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentLoading, setCommentLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loadWork = useCallback(async () => {
    if (!wid) return;
    try {
      const resp = await worksApi.getWorkDetail(wid);
      setWork(resp.data);
    } catch {
      toast('加载失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [wid]);

  const loadComments = useCallback(async (p = 1, reset = false) => {
    if (!wid) return;
    setCommentLoading(true);
    try {
      const resp = await worksApi.getComments(wid, p, 20);
      if (reset) {
        setComments(resp.list);
      } else {
        setComments(prev => [...prev, ...resp.list]);
      }
      setHasMore(resp.list.length === 20);
      if (reset) setPage(1);
    } catch {
      toast('评论加载失败');
    } finally {
      setCommentLoading(false);
      setRefreshing(false);
    }
  }, [wid]);

  useEffect(() => { void loadWork(); }, [loadWork]);
  useEffect(() => { void loadComments(1, true); }, [loadComments]);

  const handleLike = async () => {
    if (!work) return;
    try {
      const resp = await worksApi.toggleLike(work.id);
      setWork(prev => prev ? {
        ...prev,
        isLiked: resp.liked,
        likes: resp.liked ? prev.likes + 1 : prev.likes - 1,
      } : null);
    } catch {
      toast('操作失败');
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim() || !work) return;
    setSubmitting(true);
    try {
      await worksApi.postComment(work.id, { content: newComment.trim() });
      setNewComment('');
      toast('评论成功');
      await loadComments(1, true);
      setWork(prev => prev ? { ...prev, comments_count: prev.comments_count + 1 } : null);
    } catch {
      toast('评论失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    void loadWork();
    void loadComments(1, true);
  };

  const handleLoadMore = () => {
    if (!hasMore || commentLoading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    void loadComments(nextPage, false);
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <Text style={{ color: '#6B7280' }}>加载中…</Text>
      </View>
    );
  }

  if (!work) {
    return (
      <View style={styles.loading}>
        <Text style={{ color: '#9CA3AF' }}>作品不存在</Text>
      </View>
    );
  }

  const imageUrls: string[] = work.image_urls ?? [];

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={comments}
        keyExtractor={c => c.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListHeaderComponent={
          <>
            {/* 顶部导航 */}
            <View style={styles.navBar}>
              <Pressable onPress={() => router.back()}>
                <Text style={styles.backBtn}>← 返回</Text>
              </Pressable>
              <Text style={styles.navTitle}>作品详情</Text>
              <View style={{ width: 40 }} />
            </View>

            {/* 作品头部 */}
            <View style={styles.workCard}>
              <Text style={styles.workTitle}>{work.title}</Text>
              <View style={styles.authorRow}>
                <Text style={styles.authorName}>{work.author_nickname ?? '匿名作者'}</Text>
              </View>
              {work.content && <Text style={styles.workContent}>{work.content}</Text>}

              {/* 图片轮播 */}
              {imageUrls.length > 0 && (
                <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.imagesScroll}>
                  {imageUrls.map((url, i) => (
                    <Image
                      key={i}
                      source={{ uri: url.startsWith('http') ? url : `http://localhost:4000${url}` }}
                      style={[styles.workImage, { width: SCREEN_WIDTH - 32, height: Math.min(300, (SCREEN_WIDTH - 32) * 0.8) }]}
                      resizeMode="cover"
                    />
                  ))}
                </ScrollView>
              )}

              {/* 操作栏 */}
              <View style={styles.actions}>
                <Pressable onPress={handleLike} style={styles.actionBtn}>
                  <Text style={styles.actionText}>{work.isLiked ? '❤️' : '🤍'} {work.likes}</Text>
                </Pressable>
                <View style={styles.actionBtn}>
                  <Text style={styles.actionText}>💬 {work.comments_count}</Text>
                </View>
              </View>
            </View>

            {/* 评论区域标题 */}
            <View style={styles.commentsHeader}>
              <Text style={styles.commentsTitle}>评论 ({work.comments_count})</Text>
            </View>
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.comment}>
            <View style={styles.commentHeader}>
              <Text style={styles.commentAuthor}>{item.author_nickname}</Text>
              <Text style={styles.commentTime}>
                {new Date(item.created_at).toLocaleDateString('zh-CN')}
              </Text>
            </View>
            <Text style={styles.commentText}>{item.content}</Text>
            {item.replies?.map(reply => (
              <View key={reply.id} style={styles.reply}>
                <Text style={styles.replyAuthor}>{reply.author_nickname}：</Text>
                <Text style={styles.replyText}>{reply.content}</Text>
              </View>
            ))}
          </View>
        )}
        ListEmptyComponent={
          !commentLoading ? (
            <View style={styles.emptyComments}>
              <Text style={styles.emptyText}>暂无评论，快来抢沙发</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          commentLoading && hasMore ? (
            <Text style={styles.loadingMore}>加载中…</Text>
          ) : null
        }
      />

      {/* 评论区输入框 */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <View style={styles.inputRow}>
          <TextInput
            value={newComment}
            onChangeText={setNewComment}
            placeholder="写评论..."
            style={styles.input}
            multiline
          />
          <Pressable
            onPress={handlePostComment}
            disabled={!newComment.trim() || submitting}
            style={[styles.sendBtn, (!newComment.trim() || submitting) && styles.sendBtnDisabled]}
          >
            <Text style={styles.sendText}>{submitting ? '...' : '发送'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F8FA' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { color: '#2563EB', fontSize: 15, fontWeight: '600' },
  navTitle: { fontSize: 16, fontWeight: '900', color: '#111827' },
  workCard: { backgroundColor: '#fff', margin: 16, borderRadius: 18, padding: 16, gap: 12 },
  workTitle: { fontSize: 18, fontWeight: '900', color: '#111827' },
  authorRow: { flexDirection: 'row', alignItems: 'center' },
  authorName: { color: '#6B7280', fontSize: 13 },
  workContent: { color: '#374151', lineHeight: 22 },
  imagesScroll: { marginTop: 8 },
  workImage: { borderRadius: 12, marginRight: 8 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  actionBtn: { height: 36, borderRadius: 12, backgroundColor: '#F3F4F6', paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  actionText: { fontWeight: '900', color: '#111827' },
  commentsHeader: { paddingHorizontal: 16, marginBottom: 8 },
  commentsTitle: { fontSize: 15, fontWeight: '900', color: '#111827' },
  comment: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 10, borderRadius: 14, padding: 12, gap: 6 },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  commentAuthor: { fontWeight: '900', color: '#111827', fontSize: 13 },
  commentTime: { color: '#9CA3AF', fontSize: 11 },
  commentText: { color: '#374151', fontSize: 14, lineHeight: 20 },
  reply: { marginTop: 6, paddingLeft: 12, borderLeftWidth: 2, borderLeftColor: '#E5E7EB' },
  replyAuthor: { fontWeight: '700', color: '#6B7280', fontSize: 12 },
  replyText: { color: '#6B7280', fontSize: 12 },
  emptyComments: { alignItems: 'center', paddingVertical: 24 },
  emptyText: { color: '#9CA3AF', fontSize: 13 },
  loadingMore: { textAlign: 'center', paddingVertical: 12, color: '#9CA3AF', fontSize: 12 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 36,
    maxHeight: 80,
    backgroundColor: '#F3F4F6',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
  },
  sendBtn: {
    height: 36,
    paddingHorizontal: 16,
    backgroundColor: '#2563EB',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#93C5FD' },
  sendText: { color: '#fff', fontWeight: '900', fontSize: 14 },
});
