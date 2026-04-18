import React, { useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { toast } from '@/src/components/toast';
import { dataGateway } from '@/src/services/dataGateway';
import { useSessionStore } from '@/src/stores/sessionStore';

export default function DeactivateAccountPage() {
  const router = useRouter();
  const { logout } = useSessionStore();
  const [password, setPassword] = useState('');
  const [working, setWorking] = useState(false);

  const onDeactivate = async () => {
    if (!password) return toast('请输入登录密码确认');
    setWorking(true);
    try {
      await dataGateway.me.deactivate({ password });
      await logout();
      toast('账号已注销');
      router.replace('/auth' as any);
    } catch (error) {
      toast(error instanceof Error ? error.message : '注销失败');
    } finally {
      setWorking(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Text style={styles.warn}>注销后将无法恢复账号，请谨慎操作。</Text>
        <Text style={styles.label}>请输入登录密码确认</Text>
        <TextInput value={password} onChangeText={setPassword} secureTextEntry style={styles.input} placeholder="登录密码" />
        <Pressable style={[styles.btn, working && { opacity: 0.7 }]} onPress={() => void onDeactivate()} disabled={working}>
          <Text style={styles.btnText}>{working ? '处理中...' : '确认注销账号'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F8FA' },
  content: { padding: 16 },
  warn: { color: '#B91C1C', marginBottom: 12, lineHeight: 20 },
  label: { color: '#111827', fontWeight: '700', marginBottom: 8 },
  input: { height: 46, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#fff', paddingHorizontal: 12 },
  btn: { marginTop: 16, height: 46, borderRadius: 12, backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontWeight: '900' },
});
