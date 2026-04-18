import React, { useMemo } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { SettingChevron } from '@/src/components/SettingChevron';
import { toast } from '@/src/components/toast';
import { useSessionStore } from '@/src/stores/sessionStore';

export default function AccountSecurityPage() {
  const router = useRouter();
  const { user } = useSessionStore();

  const maskedPhone = useMemo(() => {
    const phone = user?.phone ?? '';
    if (!phone || phone.length < 7) return '未设置';
    return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
  }, [user?.phone]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Group>
          <Cell title="手机号" value={maskedPhone} onPress={() => router.push('/settings/change-phone' as any)} />
          <Cell title="密码设置" value="******" onPress={() => router.push('/settings/change-password' as any)} />
        </Group>

        <Group>
          <Cell title="微信账号" value="未绑定" onPress={() => toast('敬请期待')} />
          <Cell title="QQ账号" value="未绑定" onPress={() => toast('敬请期待')} />
        </Group>

        <Group>
          <Cell title="登录设备管理" onPress={() => router.push('/settings/login-devices' as any)} />
        </Group>

        <Group>
          <Cell title="注销账号" onPress={() => router.push('/settings/deactivate-account' as any)} danger />
        </Group>
      </ScrollView>
    </SafeAreaView>
  );
}

function Group({ children }: { children: React.ReactNode }) {
  return <View style={styles.group}>{children}</View>;
}

function Cell({
  title,
  value,
  onPress,
  danger = false,
}: {
  title: string;
  value?: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.cell, pressed && { opacity: 0.92 }]}>
      <Text style={[styles.cellTitle, danger && styles.cellDanger]}>{title}</Text>
      <View style={styles.right}>
        {value ? <Text style={styles.value}>{value}</Text> : null}
        <SettingChevron />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F8FA' },
  content: { padding: 16, paddingBottom: 28 },
  group: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EEF1F4',
    marginBottom: 12,
    overflow: 'hidden',
  },
  cell: {
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cellTitle: { color: '#111827', fontWeight: '700' },
  cellDanger: { color: '#DC2626' },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  value: { color: '#111827', opacity: 0.45, fontSize: 13 },
});
