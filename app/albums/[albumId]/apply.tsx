import React, { useState, useEffect } from 'react';
import {
  Alert, Image, Modal, Pressable, ScrollView, StyleSheet,
  Text, TextInput, View, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { toast } from '@/src/components/toast';
import { albumsApi } from '@/src/services/albumsApi';
import type { ApplicationField } from '@/src/models/types';
import * as ImagePicker from 'expo-image-picker';

interface FormValues {
  [key: string]: string;
}

export default function ApplyToAlbumPage() {
  const { albumId } = useLocalSearchParams<{ albumId: string }>();
  const router = useRouter();

  const [album, setAlbum] = useState<any>(null);
  const [formFields, setFormFields] = useState<ApplicationField[]>([]);
  const [values, setValues] = useState<FormValues>({});
  const [imageValues, setImageValues] = useState<{ [key: string]: string[] }>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!albumId) return;
    albumsApi.getAlbumDetail(albumId).then(res => {
      setAlbum(res.data);
      const fields = res.data.application_form ?? [];
      setFormFields(fields);
      // 初始化默认值
      const init: FormValues = {};
      const initImg: { [k: string]: string[] } = {};
      fields.forEach((f: ApplicationField) => {
        init[f.key] = '';
        initImg[f.key] = [];
      });
      setValues(init);
      setImageValues(initImg);
    }).catch(() => {
      toast('加载失败');
    }).finally(() => setLoading(false));
  }, [albumId]);

  const setValue = (key: string, val: string) => {
    setValues(prev => ({ ...prev, [key]: val }));
  };

  const pickImage = async (fieldKey: string) => {
    const imgs = imageValues[fieldKey] ?? [];
    if (imgs.length >= 3) {
      toast('最多3张图片');
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { toast('需要相册权限'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets) {
      const remaining = 3 - imgs.length;
      const added = result.assets.slice(0, remaining).map(a => a.uri);
      setImageValues(prev => ({ ...prev, [fieldKey]: [...imgs, ...added] }));
    }
  };

  const removeImage = (fieldKey: string, idx: number) => {
    setImageValues(prev => ({
      ...prev,
      [fieldKey]: (prev[fieldKey] ?? []).filter((_, i) => i !== idx),
    }));
  };

  const handleSubmit = async () => {
    // 验证必填
    for (const f of formFields) {
      if (f.required) {
        const val = values[f.key] ?? '';
        if (f.type !== 'image' && !val.trim()) {
          toast(`请填写: ${f.label}`);
          return;
        }
        if (f.type === 'image') {
          const imgs = imageValues[f.key] ?? [];
          if (imgs.length === 0) {
            toast(`请上传: ${f.label}`);
            return;
          }
        }
      }
    }

    // 构建 payload：文本字段用 string，图片字段暂传 URI 数组
    const payload: Record<string, any> = {};
    for (const f of formFields) {
      if (f.type === 'image') {
        payload[f.key] = imageValues[f.key] ?? [];
      } else {
        payload[f.key] = values[f.key] ?? '';
      }
    }

    setSubmitting(true);
    try {
      const res = await albumsApi.applyToAlbum(albumId!, payload);
      if (res.joined) {
        toast('加入成功！');
        router.back();
      } else {
        toast('申请已提交，等待审核');
        router.back();
      }
    } catch (err: any) {
      toast(err?.message ?? '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" /></View>;

  const hasForm = formFields.length > 0;

  return (
    <ScrollView style={styles.safe} contentContainerStyle={styles.content}>
      {/* 企划封面 */}
      {album?.cover_url && (
        <Image source={{ uri: album.cover_url }} style={styles.cover} />
      )}

      {/* 企划标题 */}
      <View style={styles.header}>
        <Text style={styles.albumTitle}>{album?.title}</Text>
        <Text style={styles.hint}>
          {hasForm ? '请填写下方报名表' : '此企划无需填写报名表，确认后即可提交申请'}
        </Text>
      </View>

      {/* 动态表单 */}
      {formFields.map(field => (
        <View key={field.id} style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>
            {field.label}
            {field.required && <Text style={styles.required}> *</Text>}
          </Text>
          {field.helperText && <Text style={styles.helper}>{field.helperText}</Text>}

          {field.type === 'text' && (
            <TextInput
              value={values[field.key] ?? ''}
              onChangeText={v => setValue(field.key, v)}
              placeholder={`请输入${field.label}`}
              placeholderTextColor="#9CA3AF"
              style={styles.input}
              maxLength={field.maxLength ?? 200}
            />
          )}

          {field.type === 'textarea' && (
            <TextInput
              value={values[field.key] ?? ''}
              onChangeText={v => setValue(field.key, v)}
              placeholder={`请输入${field.label}`}
              placeholderTextColor="#9CA3AF"
              style={[styles.input, styles.textarea]}
              multiline
              textAlignVertical="top"
              maxLength={field.maxLength ?? 1000}
            />
          )}

          {field.type === 'select' && (
            <View style={styles.options}>
              {(field.options ?? []).map(opt => (
                <Pressable
                  key={opt}
                  onPress={() => setValue(field.key, opt)}
                  style={[styles.option, values[field.key] === opt && styles.optionOn]}
                >
                  <Text style={[styles.optionText, values[field.key] === opt && styles.optionTextOn]}>
                    {opt}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {field.type === 'image' && (
            <View style={styles.imageRow}>
              {(imageValues[field.key] ?? []).map((uri, i) => (
                <View key={i} style={styles.imgWrap}>
                  <Image source={{ uri }} style={styles.imgThumb} />
                  <Pressable onPress={() => removeImage(field.key, i)} style={styles.imgRemove}>
                    <Text style={styles.imgRemoveText}>×</Text>
                  </Pressable>
                </View>
              ))}
              {((imageValues[field.key] ?? []).length < 3) && (
                <Pressable onPress={() => pickImage(field.key)} style={styles.addImg}>
                  <Text style={styles.addImgText}>+</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      ))}

      {/* 提交按钮 */}
      <Pressable
        onPress={handleSubmit}
        disabled={submitting}
        style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
      >
        <Text style={styles.submitText}>
          {submitting ? '提交中...' : hasForm ? '提交申请' : '确认申请加入'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F8FA' },
  content: { paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  cover: { width: '100%', height: 180, backgroundColor: '#EEF1F4' },
  header: { padding: 16, gap: 6 },
  albumTitle: { fontSize: 20, fontWeight: '900', color: '#111827' },
  hint: { color: '#6B7280', fontSize: 13 },
  fieldGroup: { padding: 16, paddingTop: 0, gap: 6 },
  fieldLabel: { fontWeight: '700', color: '#374151', fontSize: 14 },
  required: { color: '#EF4444' },
  helper: { color: '#9CA3AF', fontSize: 12, marginBottom: 4 },
  input: {
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1,
    borderColor: '#E5E7EB', paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#111827',
  },
  textarea: { minHeight: 100, paddingTop: 12 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB',
  },
  optionOn: { backgroundColor: '#111827', borderColor: '#111827' },
  optionText: { fontWeight: '700', color: '#374151', fontSize: 13 },
  optionTextOn: { color: '#fff' },
  imageRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  imgWrap: { position: 'relative' },
  imgThumb: { width: 80, height: 80, borderRadius: 10, backgroundColor: '#EEF1F4' },
  imgRemove: {
    position: 'absolute', top: -8, right: -8,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center',
  },
  imgRemoveText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  addImg: {
    width: 80, height: 80, borderRadius: 10,
    borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },
  addImgText: { fontSize: 24, color: '#9CA3AF' },
  submitBtn: {
    marginHorizontal: 16, marginTop: 16, height: 50, borderRadius: 14,
    backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center',
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontWeight: '900', fontSize: 16 },
});
