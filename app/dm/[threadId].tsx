import React, { useEffect, useMemo, useState, useRef } from 'react';
import { FlatList, Image, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { toast } from '@/src/components/toast';
import { useMessagesStore } from '@/src/stores/messagesStore';
import { dataGateway } from '@/src/services/dataGateway';

export default function DmChatPage() {

  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  const { dmThreads, threadMessages, loadThreadMessages, sendMessage } = useMessagesStore();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const key = String(threadId || '');
  const flatListRef = useRef<FlatList>(null);

  // 获取当前会话的对方信息
  const thread = dmThreads.find((t) => t.id === key);

  useEffect(() => {
    if (!key) return;
    void loadThreadMessages(key);
  }, [key, loadThreadMessages]);

  const send = async () => {
    const text = input.trim();
    if (!text && !selectedImage) return;
    if (!key) return;
    setSending(true);
    try {
      // 如果有图片，先上传
      if (selectedImage) {
        try {
          await dataGateway.me.uploadImages([selectedImage]);
          // TODO: 后端支持图片消息后可扩展
        } catch {
          toast('图片上传失败');
          setSending(false);
          return;
        }
      }
      if (text) {
        await sendMessage(key, text);
      }
      setInput('');
      setSelectedImage(null);
    } finally {
      setSending(false);
    }
  };

  // 选择图片
  const handleAddImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      toast('需要相册权限');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const data = useMemo(() => threadMessages[key] ?? [], [key, threadMessages]);
  const canSend = (input.trim().length > 0 || selectedImage !== null) && !sending;

  return (
    <SafeAreaView style={styles.safe}>
      {/* 顶部栏 */}
      <View style={styles.header}>
        {thread?.peerAvatarUrl ? (
          <Image source={{ uri: thread.peerAvatarUrl }} style={styles.headerAvatar} />
        ) : (
          <View style={styles.headerAvatarPlaceholder}>
            <Text style={{ fontSize: 16 }}>👤</Text>
          </View>
        )}
        <Text style={styles.headerName}>{thread?.peerName ?? '私信'}</Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={data}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.from === 'me' ? styles.me : styles.peer]}>
            <Text style={[styles.text, item.from === 'me' ? { color: '#fff' } : { color: '#111827' }]}>{item.text}</Text>
          </View>
        )}
      />

      {/* 输入栏 */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.inputBar}>
          {selectedImage && (
            <View style={styles.selectedImageWrap}>
              <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
              <Pressable onPress={() => setSelectedImage(null)} style={styles.removeImageBtn}>
                <Text style={styles.removeImageText}>✕</Text>
              </Pressable>
            </View>
          )}
          <Pressable onPress={handleAddImage} style={styles.attachBtn}>
            <Text style={styles.attachIcon}>🖼️</Text>
          </Pressable>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="输入消息…"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
          />
          <Pressable
            onPress={send}
            disabled={!canSend}
            style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
          >
            <Text style={[styles.sendText, !canSend && styles.sendTextDisabled]}>发送</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F8FA' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#EEF1F4', gap: 10 },
  headerAvatar: { width: 32, height: 32, borderRadius: 16 },
  headerAvatarPlaceholder: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  headerName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  bubble: { maxWidth: '78%', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 16, marginBottom: 10 },
  me: { alignSelf: 'flex-end', backgroundColor: '#2563EB' },
  peer: { alignSelf: 'flex-start', backgroundColor: '#fff', borderWidth: 1, borderColor: '#EEF1F4' },
  text: { fontWeight: '700', lineHeight: 18 },
  inputBar: { padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#EEF1F4', flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  input: { flex: 1, minHeight: 44, maxHeight: 100, borderRadius: 14, backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 10, color: '#111827', fontSize: 15 },
  attachBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  attachIcon: { fontSize: 20 },
  sendBtn: { height: 44, borderRadius: 14, backgroundColor: '#111827', paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: '#D1D5DB' },
  sendText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  sendTextDisabled: { color: '#9CA3AF' },
  selectedImageWrap: { position: 'relative', marginBottom: 6 },
  selectedImage: { width: 60, height: 60, borderRadius: 8, backgroundColor: '#D9D9D9' },
  removeImageBtn: { position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center' },
  removeImageText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
});
