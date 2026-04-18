import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View, Pressable, Image, Alert, Dimensions, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { toast } from '@/src/components/toast';
import { dataGateway } from '@/src/services/dataGateway';
import { useSessionStore } from '@/src/stores/sessionStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

interface TimelineItem {
  id: string;
  title: string;
  content: string;
  imageUrls: string[];
  createdAt: string;
}

export default function RoleCreatePage() {
  const router = useRouter();
  const { user } = useSessionStore();

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
  const [showRelationshipEditor, setShowRelationshipEditor] = useState(false);

  // 时间轴
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [showTimelineEditor, setShowTimelineEditor] = useState(false);
  const [editingTimelineItem, setEditingTimelineItem] = useState<TimelineItem | null>(null);

  // 保存中
  const [saving, setSaving] = useState(false);

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

  // 删除图片
  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  // 上传图片到服务器
  const uploadImages = async (localUris: string[]): Promise<string[]> => {
    const urls: string[] = [];
    for (const uri of localUris) {
      const formData = new FormData();
      formData.append('images', {
        uri,
        type: 'image/jpeg',
        name: 'image.jpg',
      } as any);

      console.log('Uploading image:', uri);
      try {
        const result = await dataGateway.roles.uploadImages(formData);
        console.log('Upload result:', result);
        if (result.urls && result.urls[0]) {
          urls.push(result.urls[0]);
        }
      } catch (err) {
        console.error('Upload failed:', err);
      }
    }
    console.log('Uploaded URLs:', urls);
    return urls;
  };

  // 保存角色
  const onSubmit = async () => {
    if (!name.trim()) {
      toast('请输入角色名');
      return;
    }

    setSaving(true);
    try {
      // 上传图片
      let uploadedUrls: string[] = [];
      if (images.length > 0) {
        uploadedUrls = await uploadImages(images);
      }

      // 构建关系网数据
      const relationship = relationshipNodes.length > 0 ? {
        nodes: relationshipNodes,
        edges: relationshipEdges,
      } : null;

      await dataGateway.roles.createRole({
        name: name.trim(),
        imageUrls: uploadedUrls,
        description: description.trim(),
        relationship,
        timeline: timeline,
        isPublic,
      });
      console.log('Role created successfully');

      toast('创建成功');
      router.back();
    } catch (err) {
      toast('创建失败');
    } finally {
      setSaving(false);
    }
  };

  // 添加关系节点
  const addRelatedNode = () => {
    const newNode: RelationshipNode = {
      id: `node_${Date.now()}`,
      name: '',
      relation: '', // 与主角色的关系
      role: 'related',
    };
    setRelationshipNodes([...relationshipNodes, newNode]);
  };

  // 更新关系节点 - 名称
  const updateNodeName = (id: string, newName: string) => {
    setRelationshipNodes(prev => prev.map(n => n.id === id ? { ...n, name: newName } : n));
  };

  // 更新关系节点 - 关系
  const updateNodeRelation = (id: string, newRelation: string) => {
    setRelationshipNodes(prev => prev.map(n => n.id === id ? { ...n, relation: newRelation } : n));
  };

  // 删除关系节点
  const removeNode = (id: string) => {
    setRelationshipNodes(prev => prev.filter(n => n.id !== id));
    // 同时删除相关的边
    setRelationshipEdges(prev => prev.filter(e => e.source !== id && e.target !== id));
  };

  // 添加关系边
  const addEdge = () => {
    if (relationshipNodes.length < 2) {
      toast('至少需要2个角色才能添加关系');
      return;
    }
    const newEdge: RelationshipEdge = {
      source: relationshipNodes[0].id,
      target: relationshipNodes[1].id,
      label: '',
    };
    setRelationshipEdges([...relationshipEdges, newEdge]);
  };

  // 添加时间点
  const addTimelineItem = () => {
    setEditingTimelineItem({
      id: `timeline_${Date.now()}`,
      title: '',
      content: '',
      imageUrls: [],
      createdAt: new Date().toISOString(),
    });
    setShowTimelineEditor(true);
  };

  // 保存时间点
  const saveTimelineItem = (item: TimelineItem) => {
    const existingIndex = timeline.findIndex(t => t.id === item.id);
    if (existingIndex >= 0) {
      setTimeline(prev => prev.map((t, i) => i === existingIndex ? item : t));
    } else {
      setTimeline(prev => [...prev, item]);
    }
    setShowTimelineEditor(false);
    setEditingTimelineItem(null);
  };

  // 删除时间点
  const deleteTimelineItem = (id: string) => {
    setTimeline(prev => prev.filter(t => t.id !== id));
  };

  return (
    <ScrollView style={styles.safe} contentContainerStyle={styles.content}>
      <Text style={styles.h}>创建角色</Text>

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
      <Pressable onPress={() => setShowRelationshipEditor(true)} style={styles.sectionBtn}>
        <Text style={styles.sectionBtnText}>
          {relationshipNodes.length > 0 ? `已添加 ${relationshipNodes.length} 个角色` : '添加关联角色'}
        </Text>
      </Pressable>

      {/* 时间轴 */}
      <Text style={styles.label}>时间轴</Text>
      {timeline.map((item, index) => (
        <Pressable
          key={item.id}
          onPress={() => { setEditingTimelineItem(item); setShowTimelineEditor(true); }}
          style={styles.sectionBtn}
        >
          <Text style={styles.sectionBtnText}>
            时间点 {index + 1}: {item.title || '未命名'}
          </Text>
        </Pressable>
      ))}
      <Pressable onPress={addTimelineItem} style={styles.sectionBtn}>
        <Text style={styles.sectionBtnText}>+ 添加时间点</Text>
      </Pressable>

      {/* 提交 */}
      <Pressable
        onPress={onSubmit}
        disabled={!name.trim() || saving}
        style={[styles.btn, (!name.trim() || saving) && { opacity: 0.6 }]}
      >
        <Text style={styles.btnText}>{saving ? '创建中...' : '创建角色'}</Text>
      </Pressable>

      {/* 关系网编辑器 Modal */}
      <Modal visible={showRelationshipEditor} animationType="slide" transparent>
        <Pressable style={styles.modalOverlay} onPress={() => setShowRelationshipEditor(false)}>
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>关系网编辑</Text>
              <Pressable onPress={() => setShowRelationshipEditor(false)}>
                <Text style={styles.modalClose}>关闭</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.modalBody}>
              {relationshipNodes.map((node) => (
                <View key={node.id} style={styles.nodeRow}>
                  <View style={styles.nodeInputs}>
                    <TextInput
                      value={node.name}
                      onChangeText={(v) => updateNodeName(node.id, v)}
                      style={[styles.input, { flex: 1 }]}
                      placeholder="角色名"
                    />
                    <TextInput
                      value={node.relation}
                      onChangeText={(v) => updateNodeRelation(node.id, v)}
                      style={[styles.input, { flex: 1 }]}
                      placeholder="与主角的关系"
                    />
                  </View>
                  <Pressable onPress={() => removeNode(node.id)} style={styles.delBtn}>
                    <Text style={styles.delText}>删</Text>
                  </Pressable>
                </View>
              ))}
              <Pressable onPress={addRelatedNode} style={styles.addNodeBtn}>
                <Text style={styles.addNodeText}>+ 添加角色</Text>
              </Pressable>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 时间轴编辑器 Modal */}
      <TimelineEditorModal
        visible={showTimelineEditor}
        item={editingTimelineItem}
        onSave={(item) => {
          saveTimelineItem(item);
          setShowTimelineEditor(false);
        }}
        onCancel={() => {
          setShowTimelineEditor(false);
          setEditingTimelineItem(null);
        }}
      />
    </ScrollView>
  );
}

// 时间轴编辑 Modal
function TimelineEditorModal({
  visible,
  item,
  onSave,
  onCancel,
}: {
  visible: boolean;
  item: TimelineItem | null;
  onSave: (item: TimelineItem) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);

  // 当 item 变化时，更新内部状态
  useEffect(() => {
    setTitle(item?.title || '');
    setContent(item?.content || '');
    setImages(item?.imageUrls || []);
  }, [item]);

  const pickImages = async () => {
    if (images.length >= 9) {
      toast('最多9张图片');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 9 - images.length,
    });
    if (!result.canceled) {
      setImages(prev => [...prev, ...result.assets.map(a => a.uri)].slice(0, 9));
    }
  };

  const handleSave = async () => {
    if (!item) return;

    console.log('Timeline handleSave, local images:', images);

    // 上传时间点图片
    const localImages = images.filter(u => u.startsWith('file://') || u.startsWith('content://'));
    console.log('Local images to upload:', localImages);
    const uploadedUrls = await uploadImages(localImages);
    console.log('Uploaded URLs:', uploadedUrls);

    // 合并已有图片和新上传的图片
    const existingImages = images.filter(u => u.startsWith('http'));
    console.log('Existing images:', existingImages);
    const allImages = [...existingImages, ...uploadedUrls];
    console.log('All images:', allImages);

    onSave({
      ...item,
      title: title.trim() || '未命名',
      content: content.trim(),
      imageUrls: allImages,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <Pressable style={styles.modalOverlay} onPress={onCancel}>
        <Pressable style={styles.modalContent} onPress={() => {}}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>时间点编辑</Text>
            <Pressable onPress={onCancel}>
              <Text style={styles.modalClose}>取消</Text>
            </Pressable>
          </View>
          <ScrollView style={styles.modalBody}>
            <Text style={styles.label}>标题</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              style={styles.input}
              placeholder="时间点标题"
            />

            <Text style={styles.label}>内容</Text>
            <TextInput
              value={content}
              onChangeText={setContent}
              style={[styles.input, styles.textArea]}
              placeholder="时间点内容"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <Text style={styles.label}>图片（可选）</Text>
            <View style={styles.imageGrid}>
              {images.map((uri, index) => (
                <View key={index} style={styles.imageWrapper}>
                  <Image source={{ uri }} style={styles.image} />
                  <Pressable onPress={() => setImages(prev => prev.filter((_, i) => i !== index))} style={styles.removeBtn}>
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

            <Pressable onPress={handleSave} style={styles.btn}>
              <Text style={styles.btnText}>保存</Text>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F8FA' },
  content: { padding: 16, paddingBottom: 28, gap: 12 },
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
  textArea: { minHeight: 120, paddingTop: 12 },
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
  sectionBtn: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  sectionBtnText: { color: '#374151', fontWeight: '600' },
  btn: { height: 48, borderRadius: 12, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  btnText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  modalTitle: { fontSize: 16, fontWeight: '900', color: '#111827' },
  modalClose: { color: '#6B7280', fontSize: 14 },
  modalBody: { padding: 16 },
  nodeRow: { flexDirection: 'row', gap: 10, marginBottom: 10, alignItems: 'center' },
  nodeInputs: { flex: 1, flexDirection: 'row', gap: 8 },
  delBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
  delText: { color: '#EF4444', fontWeight: '900' },
  addNodeBtn: { paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, borderStyle: 'dashed' },
  addNodeText: { color: '#2563EB', fontWeight: '600' },
});