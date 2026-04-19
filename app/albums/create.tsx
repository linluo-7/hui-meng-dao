import React, { useState, useCallback } from 'react';
import {
  Pressable, ScrollView, StyleSheet, Text, TextInput, View,
  Image, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';

import { toast } from '@/src/components/toast';
import type { AlbumPrivacy, AlbumStatus, AlbumModule } from '@/src/models/types';
import { albumsApi } from '@/src/services/albumsApi';

// =============================================================
// 企划模块预设模板(复用企划模块设计Demo)
// =============================================================
const MODULE_TEMPLATES: Record<string, AlbumModule[]> = {
  default: [
    { key: 'background', title: '背景设定', moduleType: 'rich_text', content: '', imageUrls: [], orderIndex: 1, enabled: true },
    { key: 'theme', title: '主旨', moduleType: 'rich_text', content: '', imageUrls: [], orderIndex: 2, enabled: true },
    { key: 'mainline', title: '主线', moduleType: 'rich_text', content: '', imageUrls: [], orderIndex: 3, enabled: true },
    { key: 'gameplay', title: '玩法', moduleType: 'rich_text', content: '', imageUrls: [], orderIndex: 4, enabled: true },
    { key: 'qa', title: 'Q&A', moduleType: 'qa', content: '', imageUrls: [], orderIndex: 5, enabled: false },
  ],
  trpg: [
    { key: 'background', title: '背景设定', moduleType: 'rich_text', content: '', imageUrls: [], orderIndex: 1, enabled: true },
    { key: 'rules', title: '规则', moduleType: 'rich_text', content: '', imageUrls: [], orderIndex: 2, enabled: true },
    { key: 'tasks', title: '任务', moduleType: 'rich_text', content: '', imageUrls: [], orderIndex: 3, enabled: true },
    { key: 'gallery', title: '素材图库', moduleType: 'gallery', content: '', imageUrls: [], orderIndex: 4, enabled: true },
    { key: 'qa', title: 'Q&A', moduleType: 'qa', content: '', imageUrls: [], orderIndex: 5, enabled: false },
  ],
  novel: [
    { key: 'worldview', title: '世界观', moduleType: 'rich_text', content: '', imageUrls: [], orderIndex: 1, enabled: true },
    { key: 'mainline', title: '主线大纲', moduleType: 'rich_text', content: '', imageUrls: [], orderIndex: 2, enabled: true },
    { key: 'gallery', title: '素材图库', moduleType: 'gallery', content: '', imageUrls: [], orderIndex: 3, enabled: false },
    { key: 'qa', title: 'Q&A', moduleType: 'qa', content: '', imageUrls: [], orderIndex: 4, enabled: false },
  ],
};

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

export default function AlbumCreatePage() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [privacy, setPrivacy] = useState<AlbumPrivacy>('public');
  const [requireReview, setRequireReview] = useState(true);
  const [status, setStatus] = useState<AlbumStatus>('draft');
  const [tagsText, setTagsText] = useState('');
  const [memberLimitText, setMemberLimitText] = useState('');
  const [summaryImages, setSummaryImages] = useState<{ uri: string; id: string }[]>([]);
  const [template, setTemplate] = useState<string>('default');
  const [modules, setModules] = useState<AlbumModule[]>(MODULE_TEMPLATES.default);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = title.trim().length >= 2;

  const setModuleContent = useCallback((key: string, content: string) => {
    setModules(prev => prev.map(m => m.key === key ? { ...m, content } : m));
  }, []);

  const toggleModule = useCallback((key: string) => {
    setModules(prev => prev.map(m => m.key === key ? { ...m, enabled: !m.enabled } : m));
  }, []);

  const onSelectTemplate = (t: string) => {
    setTemplate(t);
    setModules(MODULE_TEMPLATES[t] ?? MODULE_TEMPLATES.default);
  };

  const addSummaryImage = () => {
    if (summaryImages.length >= 9) { toast('最多9张图片'); return; }
    setSummaryImages(prev => [...prev, { uri: `https://picsum.photos/400/300?r=${Date.now()}`, id: `img_${Date.now()}` }]);
  };

  const removeSummaryImage = (id: string) => {
    setSummaryImages(prev => prev.filter(i => i.id !== id));
  };

  const tags = tagsText.split(',').map(t => t.trim()).filter(Boolean);
  const memberLimit = memberLimitText ? parseInt(memberLimitText) : undefined;

  const onSubmit = async () => {
    if (!canSubmit) { toast('请填写企划标题（至少2字）'); return; }

    setSubmitting(true);
    try {
      const enabledModules = modules
        .filter(m => m.enabled)
        .map((m, i) => ({ ...m, orderIndex: i + 1 }));

      const res = await albumsApi.createAlbum({
        title: title.trim(),
        summary: summary.trim(),
        privacy,
        requireReview,
        status,
        tags,
        memberLimit,
        modules: enabledModules,
      });

      toast('企划创建成功！');
      router.replace(`/albums/${res.data.id}` as any);
    } catch (err: any) {
      toast(err?.message ?? '创建失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.safe} contentContainerStyle={styles.content}>
      <Text style={styles.h}>创建企划</Text>

      <Text style={styles.label}>企划标题 *</Text>
      <TextInput value={title} onChangeText={setTitle} style={styles.input} placeholder="给你的企划起个名字" maxLength={200} />

      <Text style={styles.label}>简介</Text>
      <TextInput value={summary} onChangeText={setSummary} style={[styles.input, styles.textarea]} multiline placeholder="一句话介绍你的企划" />

      <Text style={styles.label}>简介图片（最多9张）</Text>
      <View style={styles.imagesRow}>
        {summaryImages.map(img => (
          <View key={img.id} style={styles.imgWrap}>
            <Image source={{ uri: img.uri }} style={styles.imgThumb} />
            <Pressable style={styles.imgRemove} onPress={() => removeSummaryImage(img.id)}>
              <Text style={styles.imgRemoveText}>×</Text>
            </Pressable>
          </View>
        ))}
        {summaryImages.length < 9 && (
          <Pressable style={styles.imgAdd} onPress={addSummaryImage}>
            <Text style={styles.imgAddText}>+ 图片</Text>
          </Pressable>
        )}
      </View>

      <Text style={styles.label}>可见性</Text>
      <View style={styles.row}>
        {PRIVACY_OPTIONS.map(opt => (
          <Pressable key={opt.value} onPress={() => setPrivacy(opt.value)}
            style={[styles.pill, privacy === opt.value && styles.pillOn]}>
            <Text style={[styles.pillText, privacy === opt.value && styles.pillTextOn]}>{opt.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>企划状态</Text>
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
        <Text style={[styles.toggleText, requireReview && styles.toggleTextOn]}>
          加入需要审核 {requireReview ? '✓' : ''}
        </Text>
      </Pressable>

      <Text style={styles.label}>标签（逗号分隔）</Text>
      <TextInput value={tagsText} onChangeText={setTagsText} style={styles.input} placeholder="例如：官方,共创,跑团" />

      <Text style={styles.label}>成员人数上限（留空=无限制）</Text>
      <TextInput value={memberLimitText} onChangeText={setMemberLimitText} style={styles.input}
        keyboardType="number-pad" placeholder="例如：20" />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>展示模块模板</Text>
        <Text style={styles.muted}>选择一个模板，后续可在企划详情页自由调整模块</Text>
        <View style={styles.row}>
          {[{ key: 'default', label: '综合型' }, { key: 'trpg', label: '跑团企划' }, { key: 'novel', label: '小说共创' }].map(t => (
            <Pressable key={t.key} onPress={() => onSelectTemplate(t.key)}
              style={[styles.pill, template === t.key && styles.pillOn]}>
              <Text style={[styles.pillText, template === t.key && styles.pillTextOn]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>

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

      <Pressable onPress={onSubmit} disabled={!canSubmit || submitting}
        style={[styles.btn, (!canSubmit || submitting) && styles.btnDisabled]}>
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>创建企划</Text>}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F8FA' },
  content: { padding: 16, paddingBottom: 40, gap: 10 },
  h: { fontSize: 20, fontWeight: '900', color: '#111827', marginBottom: 4 },
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
  section: { marginTop: 8, gap: 8 },
  sectionTitle: { fontWeight: '900', color: '#111827', fontSize: 15 },
  muted: { color: '#6B7280', fontSize: 12, lineHeight: 16 },
  link: { color: '#2563EB', fontWeight: '800', fontSize: 12 },
  imagesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  imgWrap: { position: 'relative' },
  imgThumb: { width: 80, height: 80, borderRadius: 10, backgroundColor: '#eee' },
  imgRemove: {
    position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center',
  },
  imgRemoveText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  imgAdd: {
    width: 80, height: 80, borderRadius: 10, borderWidth: 2, borderColor: '#D1D5DB',
    borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center',
  },
  imgAddText: { color: '#9CA3AF', fontSize: 12, fontWeight: '700' },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 14, borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: '#fff', marginTop: 4,
  },
  toggleRowOn: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  toggleKnob: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#9CA3AF' },
  toggleKnobOn: { backgroundColor: '#2563EB' },
  toggleText: { fontWeight: '800', color: '#374151', fontSize: 14 },
  toggleTextOn: { color: '#1D4ED8' },
  moduleCard: { marginTop: 8, gap: 8, backgroundColor: '#fff', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#EEF1F4' },
  moduleTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  moduleTitle: { fontWeight: '900', color: '#111827', fontSize: 14 },
  btn: {
    height: 50, borderRadius: 14, backgroundColor: '#2563EB',
    alignItems: 'center', justifyContent: 'center', marginTop: 16,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
});
