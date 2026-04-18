import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { toast } from '@/src/components/toast';

export default function ProjectOpsPage() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const [heat, setHeat] = useState(42);

  return (
    <ScrollView style={styles.safe} contentContainerStyle={styles.content}>
      <Text style={styles.h}>运营后台（mock）</Text>
      <Text style={styles.sub}>projectId = {String(projectId)}</Text>

      <Card title="公告板（富文本占位）">
        <Text style={styles.p}>这里将接入富文本编辑器/渲染（M4 细化）。</Text>
        <Pressable onPress={() => toast('编辑公告（mock）')} style={styles.btn}>
          <Text style={styles.btnText}>编辑公告</Text>
        </Pressable>
      </Card>

      <Card title="相册管理（占位）">
        <Text style={styles.p}>上传/排序/删除（mock）</Text>
      </Card>

      <Card title="话题管理 / 投票 / 接龙 / Ask（占位）">
        <Text style={styles.p}>模块骨架已预留。</Text>
      </Card>

      <Card title="活跃热力图（mock）">
        <Text style={styles.p}>当前热度：{heat}</Text>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
          <Pressable onPress={() => setHeat((v) => Math.max(0, v - 5))} style={styles.btnGhost}>
            <Text style={styles.btnGhostText}>-5</Text>
          </Pressable>
          <Pressable onPress={() => setHeat((v) => v + 5)} style={styles.btnGhost}>
            <Text style={styles.btnGhostText}>+5</Text>
          </Pressable>
        </View>
      </Card>
    </ScrollView>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F8FA' },
  content: { padding: 16, paddingBottom: 28, gap: 12 },
  h: { fontSize: 18, fontWeight: '900', color: '#111827' },
  sub: { marginTop: 6, color: '#6B7280' },
  card: { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#EEF1F4', padding: 14, gap: 10 },
  cardTitle: { fontWeight: '900', color: '#111827' },
  p: { color: '#6B7280', fontSize: 12, lineHeight: 16 },
  btn: { height: 38, borderRadius: 12, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start', paddingHorizontal: 12 },
  btnText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  btnGhost: { height: 38, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#111827', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  btnGhostText: { color: '#111827', fontWeight: '900', fontSize: 12 },
});

