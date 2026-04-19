import React, { useEffect, useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

import { toast } from '@/src/components/toast';
import { meApi } from '@/src/services/meApi';
import { scale, verticalScale } from '@/src/utils/uiScale';

export default function EditPostPage() {
  const router = useRouter();
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<string[]>([]); // 新增图片（需要上传的）
  const [removedImages, setRemovedImages] = useState<string[]>([]); // 已移除的旧图片
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 加载帖子数据
  useEffect(() => {
    if (!postId) return;

    const loadPost = async () => {
      try {
        const post = await meApi.getPost(postId);
        setTitle(post.title);
        setContent(post.content || '');
        setImages(Array.isArray(post.imageUrls) ? post.imageUrls : []);
        setTags(post.tags || []);
        setIsPublic(post.isPublic ?? true);
      } catch (error: any) {
        console.error('加载帖子失败:', error?.message || error);
        toast('加载帖子失败');
        router.back();
      } finally {
        setLoading(false);
      }
    };

    loadPost();
  }, [postId]);

  // 选择图片
  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      toast('需要相册权限才能选择图片');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
      allowsMultiple: true,
    });

    if (!result.canceled && result.assets) {
      const remaining = 9 - images.length - newImages.length;
      if (remaining <= 0) {
        toast('最多上传9张图片');
        return;
      }
      const selected = result.assets.slice(0, remaining).map((asset) => asset.uri);
      setNewImages([...newImages, ...selected]);
    }
  };

  // 拍照
  const handleTakePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      toast('需要相机权限才能拍照');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]) {
      if (images.length + newImages.length >= 9) {
        toast('最多上传9张图片');
        return;
      }
      setNewImages([...newImages, result.assets[0].uri]);
    }
  };

  // 添加图片（显示选择弹窗）
  const handleAddImage = () => {
    Alert.alert(
      '添加图片',
      '选择图片来源',
      [
        { text: '相册', onPress: handlePickImage },
        { text: '拍照', onPress: handleTakePhoto },
        { text: '取消', style: 'cancel' },
      ]
    );
  };

  // 移除图片（区分新旧图片）
  const handleRemoveImage = (index: number, isNew: boolean) => {
    if (isNew) {
      setNewImages(newImages.filter((_, i) => i !== index));
    } else {
      const removed = images[index];
      setRemovedImages([...removedImages, removed]);
      setImages(images.filter((_, i) => i !== index));
    }
  };

  // 添加标签
  const handleAddTag = () => {
    const tag = tagInput.trim().replace(/^#/, '');
    if (!tag) return;
    if (tags.includes(tag)) {
      toast('标签已存在');
      return;
    }
    if (tags.length >= 5) {
      toast('最多5个标签');
      return;
    }
    setTags([...tags, tag]);
    setTagInput('');
    setShowTagInput(false);
  };

  // 删除标签
  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  // 保存修改
  const handleSave = async () => {
    if (!title.trim()) {
      toast('请输入标题');
      return;
    }
    if (title.trim().length > 50) {
      toast('标题不能超过50字');
      return;
    }

    setSaving(true);
    try {
      // 如果有新图片，先上传
      let uploadedUrls: string[] = [];
      let coverAspectRatio = 0.75; // 默认3:4竖图
      if (newImages.length > 0) {
        uploadedUrls = (await meApi.uploadImages(newImages)).urls;
        // 计算第一张新图片的宽高比
        try {
          const { width, height } = await new Promise<{ width: number; height: number }>((resolve, reject) => {
            Image.getSize(
              newImages[0],
              (w, h) => resolve({ width: w, height: h }),
              (err) => { console.warn('getSize failed:', err); reject(err); }
            );
          });
          if (height > 0) coverAspectRatio = width / height;
        } catch {
          console.warn('Could not get image dimensions, using default 0.75');
        }
      }

      // 合并：保留的旧图片 + 新上传的图片
      const allImages = [...images, ...uploadedUrls];

      await meApi.updatePost(postId!, {
        title: title.trim(),
        content: content.trim(),
        imageUrls: allImages,
        tags,
        coverAspectRatio,
        isPublic,
      });

      toast('保存成功');
      router.back();
    } catch (error: any) {
      console.error('保存失败:', error?.message || error);
      toast(error?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safe}>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* 标题输入 */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>标题</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="请输入标题（必填）"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
            maxLength={50}
          />
          <Text style={styles.count}>{title.length}/50</Text>
        </View>

        {/* 正文输入 */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>正文</Text>
          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder="写下你的想法..."
            placeholderTextColor="#9CA3AF"
            style={[styles.input, styles.textarea]}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* 图片上传 */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>图片（最多9张）</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesScroll}>
            <Pressable onPress={handleAddImage} style={styles.addImageBtn}>
              <Text style={styles.addImageText}>+</Text>
              <Text style={styles.addImageHint}>添加图片</Text>
            </Pressable>
            {/* 旧图片 */}
            {(images || []).map((uri, index) => (
              <View key={`old-${index}`} style={styles.imageWrapper}>
                <Image source={{ uri }} style={styles.imagePreview} />
                <Pressable onPress={() => handleRemoveImage(index, false)} style={styles.removeBtn}>
                  <Text style={styles.removeBtnText}>×</Text>
                </Pressable>
              </View>
            ))}
            {/* 新图片 */}
            {newImages.map((uri, index) => (
              <View key={`new-${index}`} style={styles.imageWrapper}>
                <Image source={{ uri }} style={styles.imagePreview} />
                <View style={[styles.removeBtn, styles.newImageBadge]}>
                  <Text style={styles.removeBtnText}>新</Text>
                </View>
                <Pressable onPress={() => handleRemoveImage(index, true)} style={styles.removeBtnActual}>
                  <Text style={styles.removeBtnText}>×</Text>
                </Pressable>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* 标签 */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>标签（最多5个）</Text>
          <View style={styles.tagsRow}>
            {tags.map((tag) => (
              <Pressable key={tag} onPress={() => handleRemoveTag(tag)} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
                <Text style={styles.tagRemove}>×</Text>
              </Pressable>
            ))}
            {tags.length < 5 && (
              <Pressable onPress={() => setShowTagInput(true)} style={styles.addTagBtn}>
                <Text style={styles.addTagText}>+ 添加标签</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* 公开/私密 */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>可见范围</Text>
          <View style={styles.row}>
            <Pressable onPress={() => setIsPublic(true)} style={[styles.pill, isPublic && styles.pillOn]}>
              <Text style={[styles.pillText, isPublic && styles.pillTextOn]}>公开</Text>
            </Pressable>
            <Pressable onPress={() => setIsPublic(false)} style={[styles.pill, !isPublic && styles.pillOn]}>
              <Text style={[styles.pillText, !isPublic && styles.pillTextOn]}>私密</Text>
            </Pressable>
          </View>
        </View>

        {/* 保存按钮 */}
        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={[styles.postBtn, saving && styles.postBtnDisabled]}>
          <Text style={styles.postBtnText}>{saving ? '保存中...' : '保存修改'}</Text>
        </Pressable>
      </ScrollView>

      {/* 标签输入弹窗 */}
      <Modal visible={showTagInput} transparent animationType="fade" onRequestClose={() => setShowTagInput(false)}>
        <Pressable style={styles.modalMask} onPress={() => setShowTagInput(false)}>
          <Pressable style={styles.tagModal} onPress={() => undefined}>
            <Text style={styles.tagModalTitle}>添加标签</Text>
            <TextInput
              value={tagInput}
              onChangeText={setTagInput}
              placeholder="输入标签名称"
              placeholderTextColor="#9CA3AF"
              style={styles.tagInput}
              autoFocus
            />
            <View style={styles.tagModalBtns}>
              <Pressable onPress={() => setShowTagInput(false)} style={styles.tagModalCancel}>
                <Text style={styles.tagModalCancelText}>取消</Text>
              </Pressable>
              <Pressable onPress={handleAddTag} style={styles.tagModalConfirm}>
                <Text style={styles.tagModalConfirmText}>确定</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: scale(16), color: '#6B7280' },
  content: { padding: scale(16), paddingBottom: verticalScale(40) },
  inputGroup: { marginBottom: verticalScale(20) },
  label: { fontSize: scale(15), fontWeight: '700', color: '#111827', marginBottom: verticalScale(8) },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(12),
    fontSize: scale(15),
    color: '#111827',
  },
  textarea: { minHeight: verticalScale(120), paddingTop: verticalScale(12) },
  count: { fontSize: scale(12), color: '#9CA3AF', textAlign: 'right', marginTop: verticalScale(4) },
  imagesScroll: { flexDirection: 'row' },
  addImageBtn: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(8),
  },
  addImageText: { fontSize: scale(24), color: '#9CA3AF' },
  addImageHint: { fontSize: scale(11), color: '#9CA3AF', marginTop: verticalScale(4) },
  imageWrapper: { position: 'relative', marginRight: scale(8) },
  imagePreview: { width: scale(80), height: scale(80), borderRadius: scale(12) },
  removeBtn: {
    position: 'absolute',
    top: scale(-8),
    right: scale(-8),
    width: scale(20),
    height: scale(20),
    borderRadius: 99,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: { color: '#FFFFFF', fontSize: scale(14), fontWeight: '700' },
  newImageBadge: { backgroundColor: '#10B981', right: scale(-8 + -24) },
  removeBtnActual: {
    position: 'absolute',
    top: scale(-8),
    right: scale(-8),
    width: scale(20),
    height: scale(20),
    borderRadius: 99,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(8) },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: scale(20),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
  },
  tagText: { color: '#DC2626', fontSize: scale(13), fontWeight: '600' },
  tagRemove: { color: '#DC2626', marginLeft: scale(4), fontSize: scale(14) },
  addTagBtn: {
    backgroundColor: '#F3F4F6',
    borderRadius: scale(20),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
  },
  addTagText: { color: '#6B7280', fontSize: scale(13) },
  row: { flexDirection: 'row', gap: scale(10) },
  pill: { paddingHorizontal: scale(16), paddingVertical: verticalScale(10), borderRadius: 999, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB' },
  pillOn: { backgroundColor: '#111827', borderColor: '#111827' },
  pillText: { fontWeight: '900', color: '#374151', fontSize: scale(13) },
  pillTextOn: { color: '#FFFFFF' },
  postBtn: {
    backgroundColor: '#2563EB',
    borderRadius: scale(14),
    height: verticalScale(48),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: verticalScale(20),
  },
  postBtnDisabled: { backgroundColor: '#93C5FD' },
  postBtnText: { color: '#FFFFFF', fontSize: scale(16), fontWeight: '700' },
  modalMask: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: scale(24) },
  tagModal: { backgroundColor: '#FFFFFF', borderRadius: scale(16), padding: scale(16) },
  tagModalTitle: { fontSize: scale(16), fontWeight: '700', color: '#111827', marginBottom: verticalScale(12) },
  tagInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(12),
    fontSize: scale(15),
    color: '#111827',
  },
  tagModalBtns: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: verticalScale(16), gap: scale(12) },
  tagModalCancel: { paddingHorizontal: scale(16), paddingVertical: verticalScale(8) },
  tagModalCancelText: { color: '#6B7280', fontSize: scale(14) },
  tagModalConfirm: { backgroundColor: '#2563EB', borderRadius: scale(8), paddingHorizontal: scale(16), paddingVertical: verticalScale(8) },
  tagModalConfirmText: { color: '#FFFFFF', fontSize: scale(14), fontWeight: '600' },
});
