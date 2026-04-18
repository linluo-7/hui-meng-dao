import React from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { SettingChevron } from '@/src/components/SettingChevron';
import { toast } from '@/src/components/toast';
import { useSessionStore } from '@/src/stores/sessionStore';

export default function SettingsPage() {
  const router = useRouter();
  const { logout } = useSessionStore();

  const onLogout = async () => {
    await logout();
    toast('已退出登录');
    router.replace('/auth' as any);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Group>
          <Cell title="账号与安全" onPress={() => router.push('/settings/account-security' as any)} />
          <Cell title="账号认证" onPress={() => toast('敬请期待')} />
        </Group>

        <Group>
          <Cell title="通用设置" onPress={() => toast('敬请期待')} />
          <Cell title="通知设置" onPress={() => toast('敬请期待')} />
          <Cell title="隐私设置" onPress={() => toast('敬请期待')} />
          <Cell title="清理缓存" onPress={() => toast('敬请期待')} />
          <Cell title="收货地址" onPress={() => toast('敬请期待')} />
        </Group>

        <Group>
          <Cell title="约稿指南" onPress={() => toast('敬请期待')} />
          <Cell title="建议反馈" onPress={() => toast('敬请期待')} />
          <Cell title="处罚与纠纷指南" onPress={() => toast('敬请期待')} />
        </Group>

        <Group>
          <Cell title="帮助与客服" onPress={() => toast('敬请期待')} />
          <Cell title="关于我们" onPress={() => toast('绘梦岛 · DreamIsle')} />
        </Group>

        <Group>
          <Cell title="切换账号" onPress={() => toast('敬请期待')} />
          <Pressable onPress={onLogout} style={({ pressed }) => [styles.logoutRow, pressed && { opacity: 0.92 }]}>
            <Text style={styles.logoutText}>退出登录</Text>
            <SettingChevron />
          </Pressable>
        </Group>
      </ScrollView>
    </SafeAreaView>
  );
}

function Group({ children }: { children: React.ReactNode }) {
  return <View style={styles.group}>{children}</View>;
}

function Cell({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.cell, pressed && { opacity: 0.92 }]}>
      <Text style={styles.cellTitle}>{title}</Text>
      <SettingChevron />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F8FA' },
  content: { padding: 16, paddingBottom: 28 },
  group: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#EEF1F4', marginBottom: 12, overflow: 'hidden' },
  cell: { minHeight: 50, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  cellTitle: { color: '#111827', fontWeight: '700' },
  logoutRow: { minHeight: 50, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logoutText: { color: '#DC2626', fontWeight: '800' },
});

