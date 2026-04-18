import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { toast } from '@/src/components/toast';

export default function WorkSubmitPage() {
  const router = useRouter();
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [pickedTask, setPickedTask] = useState<'主线任务 1' | '主线任务 2' | '支线任务'>('主线任务 1');

  const canSubmit = useMemo(() => title.trim().length > 0 && content.trim().length > 0, [title, content]);

  return (
    <ScrollView style={styles.safe} contentContainerStyle={styles.content}>
      <Text style={styles.h}>作品提交（mock）</Text>
      <Text style={styles.sub}>projectId = {String(projectId)}</Text>

      <Text style={styles.label}>标题</Text>
      <TextInput value={title} onChangeText={setTitle} style={styles.input} placeholder="作品标题" />

      <Text style={styles.label}>内容（富文本占位）</Text>
      <TextInput
        value={content}
        onChangeText={setContent}
        style={[styles.input, { height: 140, textAlignVertical: 'top' }]}
        multiline
        placeholder="用多行输入代替富文本（M4 再接富文本）"
      />

      <Text style={styles.label}>图片上传（占位）</Text>
      <Pressable onPress={() => toast('图片选择/上传占位（mock）')} style={styles.ghostBtn}>
        <Text style={styles.ghostText}>+ 选择图片</Text>
      </Pressable>

      <Text style={styles.label}>关联任务（占位）</Text>
      <View style={styles.row}>
        {(['主线任务 1', '主线任务 2', '支线任务'] as const).map((t) => (
          <Pressable key={t} onPress={() => setPickedTask(t)} style={[styles.pill, pickedTask === t && styles.pillOn]}>
            <Text style={[styles.pillText, pickedTask === t && styles.pillTextOn]}>{t}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        disabled={!canSubmit}
        onPress={() => {
          toast('发布成功（mock）');
          router.back();
        }}
        style={[styles.btn, !canSubmit && { backgroundColor: '#93C5FD' }]}>
        <Text style={styles.btnText}>发布</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F8FA' },
  content: { padding: 16, paddingBottom: 28, gap: 10 },
  h: { fontSize: 18, fontWeight: '900', color: '#111827' },
  sub: { color: '#6B7280' },
  label: { marginTop: 8, fontWeight: '900', color: '#111827' },
  input: { height: 44, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: '#EEF1F4', paddingHorizontal: 12 },
  ghostBtn: { height: 44, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: '#EEF1F4', alignItems: 'center', justifyContent: 'center' },
  ghostText: { fontWeight: '900', color: '#111827' },
  row: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  pill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: '#EEF1F4' },
  pillOn: { backgroundColor: '#111827' },
  pillText: { fontWeight: '900', color: '#111827', fontSize: 12 },
  pillTextOn: { color: '#fff' },
  btn: { height: 46, borderRadius: 14, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  btnText: { color: '#fff', fontWeight: '900' },
});

