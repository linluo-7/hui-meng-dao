import React, { useState, useEffect, useCallback } from 'react';
import {
  Pressable, ScrollView, StyleSheet, Text, TextInput, View,
  Image, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { toast } from '@/src/components/toast';
import type { AlbumPrivacy, AlbumStatus, AlbumModule } from '@/src/models/types';
import { albumsApi } from '@/src/services/albumsApi';

const PRIVACY_OPTIONS: { value: AlbumPrivacy; label: string }[] = [
  { value: 'public', label: '所有人可见' },
  { value: 'friends', label: '仅好友可见' },
  { value: 'private', label: '仅自己可见' },
];

const STATUS_OPTIONS: { value: AlbumStatus; label: string }[] = [
  { value: 'draft', label: '草稿' },
  { value: 'recruiting', label: '招募中' },
  { value: 'active', label: '进行中' },
  { value: 'finished', label: '已完结' },
];

export default function AlbumEditPage() {
  const { albumId } = useLocalSearchParams<{ albumId: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [privacy, setPrivacy] = useState<AlbumPrivacy>('public');
  const [requireReview, setRequireReview] = useState(true);
  const [status, setStatus] = useState<AlbumStatus>('draft');
  const [tagsText, setTagsText] = useState('');
  const [memberLimitText, setMemberLimitText] = useState('');
  const [modules, setModules] = useState<AlbumModule[]>([]);

  useEffect(() => {
    if (!albumId) return;
    albumsApi.getAlbumDetail(albumId).then(res => {
      const a = res.data;
      setTitle(a.title);
      setSummary(a.summary ?? '');
      setPrivacy(a.privacy ?? 'public');
      setRequireReview(a.require_review ?? true);
      setStatus(a.status ?? 'draft');
      setTagsText((a.tags ?? []).join(', '));
      setMemberLimitText(a.member_limit ? String(a.member_limit) : '');
      setModules(a.modules ?? []);
    }).catch(err => {
      toast(err?.message ?? '加载失败');
    }).finally(() => setLoading(false));
  }, [albumId]);

  const setModuleContent = useCallback((key: string, content: string) => {
    setModules(prev => prev.map(m => m.key === key ? { ...m, content } : m));
  }, []);

  const toggleModule = useCallback((key: string) => {
    setModules(prev => prev.map(m => m.key === key ? { ...m, enabled: !m.enabled } : m));
  }, []);

  const onSubmit = async () => {
    if (!title.trim()) { toast('标题不能为空'); return; }
    setSubmitting(true);
    try {
      const tags = tagsText.split(',').map(t => t.trim()).filter(Boolean);
      const memberLimit = memberLimitText ? parseInt(memberLimitText) : undefined;
      const enabledModules = modules.filter(m => m.enabled);

      await albumsApi.updateAlbum(albumId!, {
        title: title.trim(),
        summary: summary.trim(),
        privacy,
        requireReview,
        status,
        tags,
        memberLimit,
        modules: enabledModules,
      });

      toast('保存成功');
      router.back();
    } catch (err: any) {
      toast(err?.message ?? '保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" /></View>;

  return (
    <ScrollView style={styles.safe} contentContainerStyle={styles.content}>
      <Text style={styles.h}>编辑企划</Text>

      <Text style={styles.label}>企划标题 *</Text>
      <TextInput value={title} onChangeText={setTitle} style={styles.input} placeholder="企划标题" maxLength={200} />

      <Text style={styles.label}>简介</Text>
      <TextInput value={summary} onChangeText={setSummary} style={[styles.input, styles.textarea]} multiline placeholder="简介" />

      <Text style={styles.label}>可见性</Text>
      <View style={styles.row}>
        {PRIVACY_OPTIONS.map(opt => (
          <Pressable key={opt.value} onPress={() => setPrivacy(opt.value)}
            style={[styles.pill, privacy === opt.value && styles.pillOn]}>
            <Text style={[styles.pillText, privacy === opt.value && styles.pillTextOn]}>{opt.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>状态</Text>
      <View style={styles.row}>
        {STATUS_OPTIONS.map(opt => (
          <Pressable key={opt.value} onPress={() => setStatus(opt.value)}
            style={[styles.pill, status === opt.value && styles.pillOn]}>
            <Text style={[styles.pillText, status === opt.value && styles.pillTextOn]}>{opt.label}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable onPress={() => setRequireReview(!requireReview)} style={[styles.toggleRow, requireReview && styles.toggleRowOn]}>
        <View style={[styles.toggleKnob, requireReview && styles.toggleKnobOn]} />
        <Text style={[styles.toggleText, requireReview && styles.toggleTextOn]}>加入需要审核 {requireReview ? '✓' : ''}</Text>
      </Pressable>

      <Text style={styles.label}>标签（逗号分隔）</Text>
      <TextInput value={tagsText} onChangeText={setTagsText} style={styles.input} placeholder="例如：官方,共创" />

      <Text style={styles.label}>成员人数上限（留空=无限制）</Text>
      <TextInput value={memberLimitText} onChangeText={setMemberLimitText} style={styles.input}
        keyboardType="number-pad" placeholder="例如：20" />

      {/* 模块编辑 */}
      {modules.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>展示模块</Text>
          {modules.map(m => (
            <View key={m.key} style={styles.moduleCard}>
              <View style={styles.moduleTop}>
                <Text style={styles.moduleTitle}>{m.enabled ? '✅' : '⬜'} {m.title}</Text>
                <Pressable onPress={() => toggleModule(m.key)}>
                  <Text style={styles.link}>{m.enabled ? '禁用' : '启用'}</Text>
                </Pressable>
              </View>
              {m.enabled && (
                <TextInput value={m.content} onChangeText={v => setModuleContent(m.key, v)}
                  style={[styles.input, styles.textarea]} multiline placeholder={`填写${m.title}内容`} />
              )}
            </View>
          ))}
        </View>
      )}

      <Pressable onPress={onSubmit} disabled={submitting}
        style={[styles.btn, submitting && styles.btnDisabled]}>
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>保存修改</Text>}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F8FA' },
  content: { padding: 16, paddingBottom: 40, gap: 10 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  h: { fontSize: 20, fontWeight: '900', color: '#111827' },
  label: { marginTop: 10, fontWeight: '800', color: '#111827', fontSize: 14 },
  input: {
    backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#EEF1F4',
    paddingHorizontal: 12, paddingVertical: 10, minHeight: 44, fontSize: 15,
  },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  pill: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#EEF1F4',
  },
  pillOn: { backgroundColor: '#111827', borderColor: '#111827' },
  pillText: { fontWeight: '900', color: '#111827', fontSize: 12 },
  pillTextOn: { color: '#fff' },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 14, borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: '#fff', marginTop: 4,
  },
  toggleRowOn: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  toggleKnob: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#9CA3AF' },
  toggleKnobOn: { backgroundColor: '#2563EB' },
  toggleText: { fontWeight: '800', color: '#374151', fontSize: 14 },
  toggleTextOn: { color: '#1D4ED8' },
  section: { marginTop: 8, gap: 8 },
  sectionTitle: { fontWeight: '900', color: '#111827', fontSize: 15 },
  moduleCard: { marginTop: 8, gap: 8, backgroundColor: '#fff', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#EEF1F4' },
  moduleTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  moduleTitle: { fontWeight: '900', color: '#111827', fontSize: 14 },
  link: { color: '#2563EB', fontWeight: '800', fontSize: 12 },
  btn: {
    height: 50, borderRadius: 14, backgroundColor: '#2563EB',
    alignItems: 'center', justifyContent: 'center', marginTop: 16,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
});
