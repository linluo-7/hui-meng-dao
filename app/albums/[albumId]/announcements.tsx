import React, { useState, useEffect, useCallback } from 'react';
import {
  Alert, ActivityIndicator, FlatList, Modal, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { toast } from '@/src/components/toast';
import { albumsApi } from '@/src/services/albumsApi';

interface Announcement {
  id: string;
  album_id: string;
  author_id: string;
  author_nickname: string;
  title: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
}

function formatDate(d: string) {
  return new Date(d).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function AnnouncementsPage() {
  const { albumId } = useLocalSearchParams<{ albumId: string }>();
  const router = useRouter();

  const [anns, setAnns] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<Announcement | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 创建/编辑表单
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formPinned, setFormPinned] = useState(false);

  const isAdmin = false; // 暂时设为false，需要从父组件传入

  const load = useCallback(async (pg = 1) => {
    if (pg === 1) setLoading(true);
    try {
      const res = await albumsApi.getAnnouncements(albumId!, pg, 20);
      const list = res.list ?? [];
      if (pg === 1) setAnns(list);
      else setAnns(prev => [...prev, ...list]);
      setHasMore(list.length === 20);
      setPage(pg);
    } catch { toast('加载失败'); }
    finally { setLoading(false); }
  }, [albumId]);

  useEffect(() => { if (albumId) load(); }, [albumId]);

  const openCreate = () => {
    setFormTitle(''); setFormContent(''); setFormPinned(false);
    setEditItem(null); setShowCreate(true);
  };

  const openEdit = (item: Announcement) => {
    setFormTitle(item.title); setFormContent(item.content); setFormPinned(!!item.is_pinned);
    setEditItem(item); setShowCreate(true);
  };

  const handleSubmit = async () => {
    if (!formTitle.trim()) { toast('请输入标题'); return; }
    if (!formContent.trim()) { toast('请输入内容'); return; }
    setSubmitting(true);
    try {
      if (editItem) {
        await albumsApi.updateAnnouncement(albumId!, editItem.id, { title: formTitle, content: formContent, isPinned: formPinned });
        toast('更新成功');
      } else {
        await albumsApi.createAnnouncement(albumId!, { title: formTitle, content: formContent, isPinned: formPinned });
        toast('发布成功');
      }
      setShowCreate(false);
      load(1);
    } catch (err: any) { toast(err?.message ?? '操作失败'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = (item: Announcement) => {
    Alert.alert('删除公告', `确定删除「${item.title}」？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除', style: 'destructive',
        onPress: async () => {
          try {
            await albumsApi.deleteAnnouncement(albumId!, item.id);
            toast('已删除');
            load(1);
          } catch (err: any) { toast(err?.message ?? '删除失败'); }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: Announcement }) => (
    <View style={styles.annItem}>
      <View style={styles.annHeader}>
        {item.is_pinned && <Text style={styles.pinnedBadge}>置顶</Text>}
        <Text style={styles.annTitle}>{item.title}</Text>
      </View>
      <Text style={styles.annContent}>{item.content}</Text>
      <View style={styles.annMeta}>
        <Text style={styles.annAuthor}>{item.author_nickname}</Text>
        <Text style={styles.annDate}>{formatDate(item.created_at)}</Text>
      </View>
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ title: '企划公告' }} />
      {loading && anns.length === 0 ? (
        <View style={styles.center}><ActivityIndicator size="large" /></View>
      ) : (
        <FlatList
          data={anns}
          keyExtractor={i => i.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          onEndReached={() => hasMore && load(page + 1)}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={<Text style={styles.empty}>暂无公告</Text>}
          refreshControl={undefined}
        />
      )}

      {/* 创建/编辑弹窗 */}
      <Modal visible={showCreate} animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editItem ? '编辑公告' : '发布公告'}</Text>
            <Pressable onPress={() => setShowCreate(false)}>
              <Text style={styles.closeBtn}>×</Text>
            </Pressable>
          </View>
          <ScrollView style={styles.modalBody}>
            <Text style={styles.fieldLabel}>标题 *</Text>
            <TextInput value={formTitle} onChangeText={setFormTitle} placeholder="公告标题"
              placeholderTextColor="#9CA3AF" style={styles.input} maxLength={100} />

            <Text style={styles.fieldLabel}>内容 *</Text>
            <TextInput value={formContent} onChangeText={setFormContent} placeholder="公告内容"
              placeholderTextColor="#9CA3AF" style={[styles.input, styles.textarea]} multiline textAlignVertical="top" />

            <Pressable onPress={() => setFormPinned(p => !p)} style={styles.pinnedRow}>
              <View style={[styles.checkbox, formPinned && styles.checkboxOn]} />
              <Text style={styles.pinnedLabel}>置顶公告</Text>
            </Pressable>
          </ScrollView>
          <Pressable onPress={handleSubmit} disabled={submitting} style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}>
            <Text style={styles.submitText}>{submitting ? '提交中...' : editItem ? '保存修改' : '立即发布'}</Text>
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  list: { padding: 16, gap: 12 },
  empty: { color: '#9CA3AF', textAlign: 'center', marginTop: 40 },
  annItem: { backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 8, borderWidth: 1, borderColor: '#EEF1F4' },
  annHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pinnedBadge: { backgroundColor: '#EF4444', color: '#fff', fontSize: 10, fontWeight: '900', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  annTitle: { fontWeight: '900', color: '#111827', fontSize: 16, flex: 1 },
  annContent: { color: '#374151', fontSize: 14, lineHeight: 22 },
  annMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  annAuthor: { color: '#6B7280', fontSize: 12 },
  annDate: { color: '#9CA3AF', fontSize: 12 },
  modal: { flex: 1, backgroundColor: '#F7F8FA' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#EEF1F4' },
  modalTitle: { fontWeight: '900', fontSize: 18, color: '#111827' },
  closeBtn: { fontSize: 28, color: '#9CA3AF', lineHeight: 28 },
  modalBody: { flex: 1, padding: 16, gap: 12 },
  fieldLabel: { fontWeight: '700', color: '#374151', fontSize: 14 },
  input: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111827' },
  textarea: { minHeight: 120, paddingTop: 12 },
  pinnedRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: '#D1D5DB' },
  checkboxOn: { backgroundColor: '#111827', borderColor: '#111827' },
  pinnedLabel: { color: '#374151', fontWeight: '700', fontSize: 14 },
  submitBtn: { margin: 16, height: 50, borderRadius: 14, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center' },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontWeight: '900', fontSize: 16 },
});
