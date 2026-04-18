import React, { useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { toast } from '@/src/components/toast';
import { dataGateway } from '@/src/services/dataGateway';

export default function ChangePhonePage() {
  const router = useRouter();
  const [regionCode, setRegionCode] = useState<'+86' | '+852'>('+86');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    if (!phone) return toast('请输入手机号');
    if (!password) return toast('请输入登录密码');
    setSaving(true);
    try {
      await dataGateway.me.changePhone({ regionCode, phone, password });
      toast('手机号修改成功');
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
        <Text style={styles.label}>区号</Text>
        <View style={styles.regionRow}>
          {(['+86', '+852'] as const).map((code) => (
            <Pressable key={code} style={[styles.regionBtn, regionCode === code && styles.regionBtnActive]} onPress={() => setRegionCode(code)}>
              <Text style={[styles.regionText, regionCode === code && styles.regionTextActive]}>{code}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.label}>新手机号</Text>
        <TextInput value={phone} onChangeText={(v) => setPhone(v.replace(/\D/g, ''))} keyboardType="number-pad" style={styles.input} placeholder="请输入新手机号" />
        <Text style={styles.label}>登录密码</Text>
        <TextInput value={password} onChangeText={setPassword} secureTextEntry style={styles.input} placeholder="请输入登录密码确认" />
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
  regionRow: { flexDirection: 'row', gap: 10 },
  regionBtn: { height: 36, borderRadius: 10, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E5E7EB' },
  regionBtnActive: { backgroundColor: '#111827' },
  regionText: { color: '#111827', fontWeight: '700' },
  regionTextActive: { color: '#fff' },
});
