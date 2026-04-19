import React, { useMemo, useState } from 'react';
import {
  Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
  Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { toast } from '@/src/components/toast';
import { worksApi } from '@/src/services/worksApi';

export default function WorkSubmitPage() {
  const router = useRouter();
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const pid = String(projectId ?? '');

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState<{ uri: string; name?: string; type?: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(() => title.trim().length > 0, [title]);

  const pickImage = async () => {
    if (images.length >= 9) {
      toast('最多上传 9 张图片');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsMultipleSelection: true,
    });
    if (!result.canceled && result.assets.length > 0) {
      const remaining = 9 - images.length;
      const newImgs = result.assets.slice(0, remaining).map(a => ({
        uri: a.uri,
        name: a.uri.split('/').pop() ?? 'image.jpg',
        type: 'image/jpeg',
      }));
      setImages(prev => [...prev, ...newImgs]);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const resp = await worksApi.createWork({
        title: title.trim(),
        content: content.trim() || undefined,
        projectId: pid || undefined,
        images,
      });
      toast('发布成功！');
      router.back();
    } catch (err) {
      toast('发布失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.safe} contentContainerStyle={styles.content}>
        <Text style={styles.pageTitle}>提交作品</Text>
        {pid && <Text style={styles.projectId}>企划ID: {pid}</Text>}

        <Text style={styles.label}>标题 *</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          style={styles.input}
          placeholder="给作品起个名字"
          maxLength={80}
        />

        <Text style={styles.label}>内容描述</Text>
        <TextInput
          value={content}
          onChangeText={setContent}
          style={[styles.input, styles.textArea]}
          multiline
          placeholder="描述你的作品创作背景、心得..."
          textAlignVertical="top"
        />

        <Text style={styles.label}>图片（{images.length}/9）</Text>
        <View style={styles.imageGrid}>
          {images.map((img, i) => (
            <View key={i} style={styles.imageThumb}>
              <Image source={{ uri: img.uri }} style={styles.thumb} />
              <Pressable style={styles.removeBtn} onPress={() => removeImage(i)}>
                <Text style={styles.removeText}>×</Text>
              </Pressable>
            </View>
          ))}
          {images.length < 9 && (
            <Pressable style={styles.addImageBtn} onPress={pickImage}>
              <Text style={styles.addImageText}>+</Text>
              <Text style={styles.addImageSub}>添加图片</Text>
            </Pressable>
          )}
        </View>

        <Pressable
          disabled={!canSubmit || submitting}
          onPress={handleSubmit}
          style={[styles.submitBtn, (!canSubmit || submitting) && styles.submitBtnDisabled]}
        >
          <Text style={styles.submitText}>{submitting ? '发布中…' : '发布作品'}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F8FA' },
  content: { padding: 16, paddingBottom: 28, gap: 12 },
  pageTitle: { fontSize: 20, fontWeight: '900', color: '#111827', marginBottom: 4 },
  projectId: { color: '#9CA3AF', fontSize: 12, marginBottom: 4 },
  label: { fontWeight: '900', color: '#111827', fontSize: 14, marginTop: 4 },
  input: {
    height: 44,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#EEF1F4',
    paddingHorizontal: 12,
    fontSize: 15,
  },
  textArea: {
    height: 120,
    paddingTop: 10,
    paddingBottom: 10,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  imageThumb: {
    width: 80,
    height: 80,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  thumb: { width: '100%', height: '100%' },
  removeBtn: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: { color: '#fff', fontSize: 16, fontWeight: '900', lineHeight: 18 },
  addImageBtn: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#EEF1F4',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImageText: { fontSize: 24, color: '#9CA3AF', lineHeight: 26 },
  addImageSub: { fontSize: 10, color: '#9CA3AF', marginTop: 2 },
  submitBtn: {
    height: 48,
    borderRadius: 14,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  submitBtnDisabled: { backgroundColor: '#93C5FD' },
  submitText: { color: '#fff', fontWeight: '900', fontSize: 16 },
});
