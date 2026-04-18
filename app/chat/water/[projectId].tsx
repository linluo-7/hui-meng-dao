import React, { useState } from 'react';
import { FlatList, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

type ChatMsg = { id: string; sender: string; text: string };

export default function WaterChatPage() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const [input, setInput] = useState('');
  const [msgs, setMsgs] = useState<ChatMsg[]>([
    { id: 'w1', sender: '系统', text: `欢迎进入水群（projectId=${String(projectId)}）` },
    { id: 'w2', sender: '我', text: '大家好～' },
  ]);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    setMsgs((prev) => [...prev, { id: `w_${Date.now()}`, sender: '我', text }]);
    setInput('');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={msgs}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 90 }}
        renderItem={({ item }) => (
          <View style={styles.msg}>
            <Text style={styles.sender}>{item.sender}</Text>
            <Text style={styles.text}>{item.text}</Text>
          </View>
        )}
      />

      <View style={styles.inputBar}>
        <TextInput value={input} onChangeText={setInput} placeholder="聊天…" placeholderTextColor="#9CA3AF" style={styles.input} />
        <Pressable onPress={send} style={({ pressed }) => [styles.sendBtn, pressed && { opacity: 0.9 }]}>
          <Text style={styles.sendText}>发送</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F8FA' },
  msg: { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#EEF1F4', padding: 12, marginBottom: 12 },
  sender: { fontWeight: '900', color: '#111827' },
  text: { marginTop: 6, color: '#374151', lineHeight: 18 },
  inputBar: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#EEF1F4', flexDirection: 'row', gap: 10, alignItems: 'center' },
  input: { flex: 1, height: 44, borderRadius: 14, backgroundColor: '#F3F4F6', paddingHorizontal: 12, color: '#111827' },
  sendBtn: { height: 44, borderRadius: 14, backgroundColor: '#111827', paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  sendText: { color: '#fff', fontWeight: '900' },
});

