import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { toast } from '@/src/components/toast';
import { parseDiceCommand } from '@/src/services/diceParser';

type ChatMsg = {
  id: string;
  sender: string;
  text: string;
  at: string;
  dice?: { expr: string; rolls: number[]; total: number };
};

export default function RpChatPage() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const [input, setInput] = useState('');
  const [msgs, setMsgs] = useState<ChatMsg[]>([
    { id: 'm1', sender: '系统', text: `欢迎进入戏群（projectId=${String(projectId)}）。可用 /r d6 掷骰。`, at: new Date().toISOString() },
    { id: 'm2', sender: '角色·岚', text: '（轻声）雾海边的灯亮了。', at: new Date().toISOString() },
  ]);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    const id = `m_${Date.now()}`;
    const dice = parseDiceCommand(text);
    if (dice.isDice) {
      const res = dice.result;
      if (!res || !res.ok) {
        toast(res?.error ?? '掷骰失败');
        return;
      }
      setMsgs((prev) => [
        ...prev,
        {
          id,
          sender: '我（角色）',
          text,
          at: new Date().toISOString(),
          dice: { expr: res.expr, rolls: res.rolls, total: res.total },
        },
      ]);
      setInput('');
      return;
    }
    setMsgs((prev) => [...prev, { id, sender: '我（角色）', text, at: new Date().toISOString() }]);
    setInput('');
  };

  const display = useMemo(() => msgs, [msgs]);

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={display}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 90 }}
        renderItem={({ item }) => (
          <View style={styles.msg}>
            <Text style={styles.sender}>{item.sender}</Text>
            <Text style={styles.text}>{item.text}</Text>
            {!!item.dice && (
              <View style={styles.diceBox}>
                <Text style={styles.diceTitle}>掷骰：{item.dice.expr}</Text>
                <Text style={styles.diceText}>
                  结果：[{item.dice.rolls.join(', ')}] → 总计 {item.dice.total}
                </Text>
              </View>
            )}
          </View>
        )}
      />

      <View style={styles.inputBar}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="以角色发言…（/r d6 掷骰）"
          placeholderTextColor="#9CA3AF"
          style={styles.input}
        />
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
  diceBox: { marginTop: 10, backgroundColor: '#111827', borderRadius: 14, padding: 10 },
  diceTitle: { color: '#fff', fontWeight: '900', fontSize: 12 },
  diceText: { marginTop: 6, color: '#D1D5DB', fontSize: 12 },
  inputBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#EEF1F4',
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  input: { flex: 1, height: 44, borderRadius: 14, backgroundColor: '#F3F4F6', paddingHorizontal: 12, color: '#111827' },
  sendBtn: { height: 44, borderRadius: 14, backgroundColor: '#2563EB', paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  sendText: { color: '#fff', fontWeight: '900' },
});

