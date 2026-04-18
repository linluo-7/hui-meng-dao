import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { mockApi } from '@/src/services/mockApi';
import type { DmThread } from '@/src/models/types';

export default function DmListPage() {
  const router = useRouter();
  const [threads, setThreads] = useState<DmThread[]>([]);

  useEffect(() => {
    mockApi.listDmThreads().then(setThreads);
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={threads}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/dm/${item.id}` as any)}
            style={({ pressed }) => [styles.thread, pressed && { opacity: 0.92 }]}>
            <View style={styles.avatar}>
              <Text style={{ fontSize: 16 }}>👤</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.row}>
                <Text style={styles.peer} numberOfLines={1}>
                  {item.peerName}
                </Text>
                {item.unreadCount > 0 && <Text style={styles.unread}>{item.unreadCount}</Text>}
              </View>
              <Text style={styles.last} numberOfLines={1}>
                {item.lastMessage}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F8FA' },
  thread: { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#EEF1F4', padding: 14, flexDirection: 'row', gap: 12, marginBottom: 12 },
  avatar: { width: 44, height: 44, borderRadius: 16, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  peer: { fontSize: 15, fontWeight: '900', color: '#111827', flex: 1, paddingRight: 10 },
  unread: { color: '#EF4444', fontWeight: '900', fontSize: 12 },
  last: { marginTop: 6, color: '#6B7280', fontSize: 12 },
});

