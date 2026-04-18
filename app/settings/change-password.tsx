import React, { useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { dataGateway } from '@/src/services/dataGateway';
import { toast } from '@/src/components/toast';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    if (newPassword.length < 6) return toast('新密码至少 6 位');
    if (newPassword !== confirmPassword) return toast('两次输入的新密码不一致');
    setSaving(true);
    try {
      await dataGateway.me.changePassword({ oldPassword, newPassword });
      toast('密码修改成功');
      router.back();
    } catch (error) {
      toast(error instanceof Error ? error.message : '修改失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Text style={styles.label}>旧密码</Text>
        <TextInput value={oldPassword} onChangeText={setOldPassword} secureTextEntry style={styles.input} placeholder="请输入旧密码" />
        <Text style={styles.label}>新密码</Text>
        <TextInput value={newPassword} onChangeText={setNewPassword} secureTextEntry style={styles.input} placeholder="请输入新密码（至少 6 位）" />
        <Text style={styles.label}>确认新密码</Text>
        <TextInput value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry style={styles.input} placeholder="再次输入新密码" />
        <Pressable style={[styles.btn, saving && { opacity: 0.7 }]} onPress={() => void onSave()} disabled={saving}>
          <Text style={styles.btnText}>{saving ? '保存中...' : '保存'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F8FA' },
  content: { padding: 16, gap: 8 },
  label: { marginTop: 8, color: '#111827', fontWeight: '700', fontSize: 13 },
  input: { height: 46, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 12 },
  btn: { marginTop: 18, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827' },
  btnText: { color: '#fff', fontWeight: '800' },
});
