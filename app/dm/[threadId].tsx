import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { useMessagesStore } from '@/src/stores/messagesStore';

export default function DmChatPage() {
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  const { threadMessages, loadThreadMessages, sendMessage } = useMessagesStore();
  const [input, setInput] = useState('');
  const key = String(threadId || '');

  useEffect(() => {
    if (!key) return;
    void loadThreadMessages(key);
  }, [key, loadThreadMessages]);

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    if (!key) return;
    await sendMessage(key, text);
    setInput('');
  };

  const data = useMemo(() => threadMessages[key] ?? [], [key, threadMessages]);

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={data}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 90 }}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.from === 'me' ? styles.me : styles.peer]}>
            <Text style={[styles.text, item.from === 'me' ? { color: '#fff' } : { color: '#111827' }]}>{item.text}</Text>
          </View>
        )}
      />
      <View style={styles.inputBar}>
        <TextInput value={input} onChangeText={setInput} placeholder="输入消息…" placeholderTextColor="#9CA3AF" style={styles.input} />
        <Pressable onPress={send} style={({ pressed }) => [styles.sendBtn, pressed && { opacity: 0.9 }]}>
          <Text style={styles.sendText}>发送</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F8FA' },
  bubble: { maxWidth: '78%', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 16, marginBottom: 10 },
  me: { alignSelf: 'flex-end', backgroundColor: '#2563EB' },
  peer: { alignSelf: 'flex-start', backgroundColor: '#fff', borderWidth: 1, borderColor: '#EEF1F4' },
  text: { fontWeight: '700', lineHeight: 18 },
  inputBar: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#EEF1F4', flexDirection: 'row', gap: 10, alignItems: 'center' },
  input: { flex: 1, height: 44, borderRadius: 14, backgroundColor: '#F3F4F6', paddingHorizontal: 12, color: '#111827' },
  sendBtn: { height: 44, borderRadius: 14, backgroundColor: '#111827', paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  sendText: { color: '#fff', fontWeight: '900' },
});

