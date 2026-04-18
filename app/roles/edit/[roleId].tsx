import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View, Pressable, Image, Modal, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { toast } from '@/src/components/toast';
import { dataGateway } from '@/src/services/dataGateway';

interface TimelineItem {
  id: string;
  title: string;
  content: string;
  imageUrls: string[];
  createdAt: string;
}

interface RelationshipNode {
  id: string;
  name: string;
  avatarUrl?: string;
  role: 'main' | 'related';
}

interface RelationshipEdge {
  source: string;
  target: string;
  label?: string;
}

interface RoleDetail {
  id: string;
  name: string;
  avatarUrl?: string;
  imageUrls: string[];
  description: string;
  relationship: { nodes: RelationshipNode[]; edges: RelationshipEdge[] } | null;
  timeline: TimelineItem[];
  isPublic: boolean;
}

export default function RoleEditPage() {
  const router = useRouter();
  const { roleId } = useLocalSearchParams<{ roleId: string }>();
  const rid = String(roleId ?? '');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [role, setRole] = useState<RoleDetail | null>(null);

  // 基础信息
  const [name, setName] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  // 图片
  const [images, setImages] = useState<string[]>([]);

  // 人物设定
  const [description, setDescription] = useState('');

  // 关系网
  const [relationshipNodes, setRelationshipNodes] = useState<RelationshipNode[]>([]);
  const [relationshipEdges, setRelationshipEdges] = useState<RelationshipEdge[]>([]);

  // 时间轴
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);

  // 加载角色详情
  useEffect(() => {
    (async () => {
      if (!rid) return;
      setLoading(true);
      try {
        const data = await dataGateway.roles.getRole(rid);
        setRole(data);
        setName(data.name);
        setIsPublic(data.isPublic);
        setImages(data.imageUrls || []);
        setDescription(data.description || '');
        if (data.relationship) {
          setRelationshipNodes(data.relationship.nodes || []);
          setRelationshipEdges(data.relationship.edges || []);
        }
        setTimeline(data.timeline || []);
      } catch (err) {
        toast('加载失败');
      } finally {
        setLoading(false);
      }
    })();
  }, [rid]);

  // 选择图片
  const pickImages = async () => {
    if (images.length >= 9) {
      toast('最多上传9张图片');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 9 - images.length,
    });
    if (!result.canceled) {
      const newImages = result.assets.map(a => a.uri);
      setImages(prev => [...prev, ...newImages].slice(0, 9));
    }
  };

  // 删除本地图片
  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  // 上传新图片到服务器
  const uploadNewImages = async (localUris: string[]): Promise<string[]> => {
    const urls: string[] = [];
    for (const uri of localUris) {
      const formData = new FormData();
      formData.append('images', {
        uri,
        type: 'image/jpeg',
        name: 'image.jpg',
      } as any);
      try {
        const result = await dataGateway.roles.uploadImages(formData);
        urls.push(result.urls[0]);
      } catch (err) {
        console.error('Upload failed:', err);
      }
    }
    return urls;
  };

  // 保存角色
  const onSave = async () => {
    if (!role || !name.trim()) {
      toast('请输入角色名');
      return;
    }

    setSaving(true);
    try {
      // 只上传新添加的本地图片（以 file:// 或 content:// 开头）
      const newImages = images.filter(u => u.startsWith('file://') || u.startsWith('content://'));
      const uploadedUrls = await uploadNewImages(newImages);

      // 合并已有图片（http 开头的）和新上传的图片
      const existingImages = images.filter(u => u.startsWith('http'));
      const allImages = [...existingImages, ...uploadedUrls];

      // 构建关系网数据
      const relationship = relationshipNodes.length > 0 ? {
        nodes: relationshipNodes,
        edges: relationshipEdges,
      } : null;

      await dataGateway.roles.updateRole(rid, {
        name: name.trim(),
        imageUrls: allImages,
        description: description.trim(),
        relationship,
        timeline: timeline,
        isPublic,
      });

      toast('保存成功');
      router.back();
    } catch (err) {
      toast('保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 添加关系节点
  const addRelatedNode = () => {
    const newNode: RelationshipNode = {
      id: `node_${Date.now()}`,
      name: '',
      role: 'related',
    };
    setRelationshipNodes([...relationshipNodes, newNode]);
  };

  // 更新关系节点
  const updateNodeName = (id: string, newName: string) => {
    setRelationshipNodes(prev => prev.map(n => n.id === id ? { ...n, name: newName } : n));
  };

  // 删除关系节点
  const removeNode = (id: string) => {
    setRelationshipNodes(prev => prev.filter(n => n.id !== id));
    setRelationshipEdges(prev => prev.filter(e => e.source !== id && e.target !== id));
  };

  // 添加时间点
  const addTimelineItem = () => {
    const newItem: TimelineItem = {
      id: `timeline_${Date.now()}`,
      title: '',
      content: '',
      imageUrls: [],
      createdAt: new Date().toISOString(),
    };
    setTimeline(prev => [...prev, newItem]);
  };

  // 更新时间点
  const updateTimelineItem = (id: string, updates: Partial<TimelineItem>) => {
    setTimeline(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  // 删除时间点
  const deleteTimelineItem = (id: string) => {
    setTimeline(prev => prev.filter(t => t.id !== id));
  };

  const onDelete = async () => {
    Alert.alert('确认删除', '确定要删除这个角色吗？此操作不可恢复。', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            await dataGateway.roles.deleteRole(rid);
            toast('已删除');
            router.back();
          } catch (err) {
            toast('删除失败');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <Text style={{ color: '#6B7280' }}>加载中…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.safe} contentContainerStyle={styles.content}>
      <Text style={styles.h}>编辑角色</Text>

      {/* 角色名 */}
      <Text style={styles.label}>角色名 *</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        style={styles.input}
        placeholder="输入角色名"
        maxLength={50}
      />

      {/* 图片上传 */}
      <Text style={styles.label}>角色图片（最多9张）</Text>
      <View style={styles.imageGrid}>
        {images.map((uri, index) => (
          <View key={index} style={styles.imageWrapper}>
            <Image source={{ uri }} style={styles.image} />
            <Pressable onPress={() => removeImage(index)} style={styles.removeBtn}>
              <Text style={styles.removeText}>×</Text>
            </Pressable>
          </View>
        ))}
        {images.length < 9 && (
          <Pressable onPress={pickImages} style={styles.addImageBtn}>
            <Text style={styles.addImageText}>+</Text>
          </Pressable>
        )}
      </View>

      {/* 公开展示 */}
      <Text style={styles.label}>公开展示</Text>
      <View style={styles.row}>
        <Pressable onPress={() => setIsPublic(true)} style={[styles.pill, isPublic && styles.pillOn]}>
          <Text style={[styles.pillText, isPublic && styles.pillTextOn]}>公开</Text>
        </Pressable>
        <Pressable onPress={() => setIsPublic(false)} style={[styles.pill, !isPublic && styles.pillOn]}>
          <Text style={[styles.pillText, !isPublic && styles.pillTextOn]}>私密</Text>
        </Pressable>
      </View>

      {/* 人物设定 */}
      <Text style={styles.label}>人物设定</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        style={[styles.input, styles.textArea]}
        placeholder="输入角色的人物设定..."
        multiline
        numberOfLines={6}
        textAlignVertical="top"
      />

      {/* 关系网 */}
      <Text style={styles.label}>关系网</Text>
      {relationshipNodes.map((node) => (
        <View key={node.id} style={styles.nodeRow}>
          <TextInput
            value={node.name}
            onChangeText={(v) => updateNodeName(node.id, v)}
            style={[styles.input, { flex: 1 }]}
            placeholder="角色名"
          />
          <Pressable onPress={() => removeNode(node.id)} style={styles.delBtn}>
            <Text style={styles.delText}>删</Text>
          </Pressable>
        </View>
      ))}
      <Pressable onPress={addRelatedNode} style={styles.addBtn}>
        <Text style={styles.addBtnText}>+ 添加角色</Text>
      </Pressable>

      {/* 时间轴 */}
      <Text style={styles.label}>时间轴</Text>
      {timeline.map((item) => (
        <View key={item.id} style={styles.timelineItem}>
          <TextInput
            value={item.title}
            onChangeText={(v) => updateTimelineItem(item.id, { title: v })}
            style={[styles.input, { marginBottom: 8 }]}
            placeholder="时间点标题"
          />
          <TextInput
            value={item.content}
            onChangeText={(v) => updateTimelineItem(item.id, { content: v })}
            style={[styles.input, styles.textArea, { marginBottom: 8 }]}
            placeholder="时间点内容"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          <Pressable onPress={() => deleteTimelineItem(item.id)} style={styles.deleteItemBtn}>
            <Text style={styles.deleteItemText}>删除时间点</Text>
          </Pressable>
        </View>
      ))}
      <Pressable onPress={addTimelineItem} style={styles.addBtn}>
        <Text style={styles.addBtnText}>+ 添加时间点</Text>
      </Pressable>

      {/* 提交 */}
      <Pressable
        onPress={onDelete}
        style={[styles.btn, styles.deleteBtn]}
      >
        <Text style={styles.deleteBtnText}>删除角色</Text>
      </Pressable>

      <Pressable
        onPress={onSave}
        disabled={!name.trim() || saving}
        style={[styles.btn, (!name.trim() || saving) && { opacity: 0.6 }]}
      >
        <Text style={styles.btnText}>{saving ? '保存中...' : '保存'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F8FA' },
  content: { padding: 16, paddingBottom: 28, gap: 12 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  h: { fontSize: 20, fontWeight: '900', color: '#111827', marginBottom: 8 },
  label: { fontWeight: '900', color: '#111827', marginTop: 8 },
  input: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  textArea: { minHeight: 100, paddingTop: 12 },
  row: { flexDirection: 'row', gap: 10 },
  pill: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB' },
  pillOn: { backgroundColor: '#111827', borderColor: '#111827' },
  pillText: { fontWeight: '900', color: '#374151', fontSize: 13 },
  pillTextOn: { color: '#fff' },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  imageWrapper: { position: 'relative', width: 80, height: 80 },
  image: { width: 80, height: 80, borderRadius: 8 },
  removeBtn: { position: 'absolute', top: -8, right: -8, width: 20, height: 20, borderRadius: 10, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center' },
  removeText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  addImageBtn: { width: 80, height: 80, borderRadius: 8, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  addImageText: { fontSize: 24, color: '#9CA3AF' },
  nodeRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  delBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
  delText: { color: '#EF4444', fontWeight: '900' },
  addBtn: { paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, borderStyle: 'dashed' },
  addBtnText: { color: '#2563EB', fontWeight: '600' },
  timelineItem: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  deleteItemBtn: { alignSelf: 'flex-end' },
  deleteItemText: { color: '#EF4444', fontSize: 12, fontWeight: '600' },
  btn: { height: 48, borderRadius: 12, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  deleteBtn: { height: 48, borderRadius: 12, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  deleteBtnText: { color: '#EF4444', fontWeight: '900', fontSize: 15 },
  btnText: { color: '#fff', fontWeight: '900', fontSize: 15 },
});