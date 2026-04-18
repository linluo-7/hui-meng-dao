import React, { useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

import { toast } from '@/src/components/toast';
import { useMeStore } from '@/src/stores/meStore';
import { scale, verticalScale } from '@/src/utils/uiScale';

export default function CreatePostPage() {
  const router = useRouter();
  const { createPost } = useMeStore();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const [posting, setPosting] = useState(false);

  // 选择图片
  const handlePickImage = async () => {
    if (images.length >= 9) {
      toast('最多上传9张图片');
      return;
    }

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
      const newImages = result.assets
        .slice(0, 9 - images.length)
        .map((asset) => asset.uri);
      setImages([...images, ...newImages]);
    }
  };

  // 删除图片
  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
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
      if (images.length >= 9) {
        toast('最多上传9张图片');
        return;
      }
      setImages([...images, result.assets[0].uri]);
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

  // 发布帖子
  const handlePost = async () => {
    if (!title.trim()) {
      toast('请输入标题');
      return;
    }
    if (title.trim().length > 50) {
      toast('标题不能超过50字');
      return;
    }

    setPosting(true);
    try {
      await createPost({
        title: title.trim(),
        content: content.trim(),
        localImages: images,
        tags,
      });
      toast('发布成功');
      router.back();
    } catch (error: any) {
      console.error('发布失败:', error?.message || error);
      toast(error?.message || '发布失败');
    } finally {
      setPosting(false);
    }
  };

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
            {images.map((uri, index) => (
              <View key={index} style={styles.imageWrapper}>
                <Image source={{ uri }} style={styles.imagePreview} />
                <Pressable onPress={() => handleRemoveImage(index)} style={styles.removeBtn}>
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

        {/* 发布按钮 */}
        <Pressable
          onPress={handlePost}
          disabled={posting}
          style={[styles.postBtn, posting && styles.postBtnDisabled]}>
          <Text style={styles.postBtnText}>{posting ? '发布中...' : '发布'}</Text>
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