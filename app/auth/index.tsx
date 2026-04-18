import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { toast } from '@/src/components/toast';
import { useSessionStore } from '@/src/stores/sessionStore';

type RegionCode = '+86' | '+852';
type LoginMode = 'code' | 'password';

const PHONE_RULES: Record<RegionCode, { maxLen: number; hint: string }> = {
  '+86': { maxLen: 11, hint: '请输入 11 位手机号' },
  '+852': { maxLen: 8, hint: '请输入 8 位手机号' },
};

export default function AuthPage() {
  const router = useRouter();
  const { loginPassword, registerPassword, forgotPassword } = useSessionStore();

  const [regionCode, setRegionCode] = useState<RegionCode>('+86');
  const [mode, setMode] = useState<LoginMode>('password');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [agree, setAgree] = useState(false);
  const [sending, setSending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [regionModal, setRegionModal] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const phoneMaxLen = PHONE_RULES[regionCode].maxLen;

  const canSendCode = useMemo(() => {
    return phone.length === phoneMaxLen && countdown === 0 && !sending;
  }, [phone.length, phoneMaxLen, countdown, sending]);

  const canLogin = useMemo(() => {
    if (!agree || phone.length !== phoneMaxLen) return false;
    return mode === 'code' ? code.length >= 4 : password.length >= 6;
  }, [agree, phone.length, phoneMaxLen, mode, code.length, password.length]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const sanitizeDigits = (v: string) => v.replace(/\D/g, '');

  const onSendCode = async () => {
    if (!canSendCode) return;
    setSending(true);
    await new Promise((r) => setTimeout(r, 500)); // mock "sending"
    setSending(false);
    toast('验证码已发送（本地模拟）');
    setCountdown(60);
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  const onLogin = async () => {
    if (!agree) return toast('请先勾选用户协议与隐私政策');
    if (!canLogin) return toast('请完善手机号与密码');
    await loginPassword({ regionCode, phone, password });
    router.replace('/(tabs)/home' as any);
  };

  const onThirdParty = (name: string) => toast(`${name} 登录敬请期待`);

  const onRegister = async () => {
    if (mode !== 'password') {
      toast('请先切换到密码登录后再注册');
      return;
    }
    if (phone.length !== phoneMaxLen || password.length < 6) {
      toast('请填写正确手机号与至少 6 位密码');
      return;
    }
    await registerPassword({ regionCode, phone, password, nickname: `岛民${phone.slice(-4)}` });
    toast('注册成功，已自动登录');
    router.replace('/(tabs)/home' as any);
  };

  const onForgotPassword = async () => {
    if (mode !== 'password') {
      toast('请先切换到密码登录后操作');
      return;
    }
    if (phone.length !== phoneMaxLen || password.length < 6) {
      toast('请输入手机号与新密码（至少 6 位）');
      return;
    }
    await forgotPassword({ regionCode, phone, newPassword: password });
    toast('密码已重置，请使用新密码登录');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}>
      <View style={styles.header}>
        <Text style={styles.appName}>绘梦岛</Text>
        <Text style={styles.tip}>手机号登录 / 注册（本地 mock，可离线）</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.modeSwitch}>
          <Pressable onPress={() => setMode('code')} style={[styles.modeBtn, mode === 'code' && styles.modeBtnActive]}>
            <Text style={[styles.modeText, mode === 'code' && styles.modeTextActive]}>验证码登录</Text>
          </Pressable>
          <Pressable onPress={() => setMode('password')} style={[styles.modeBtn, mode === 'password' && styles.modeBtnActive]}>
            <Text style={[styles.modeText, mode === 'password' && styles.modeTextActive]}>密码登录</Text>
          </Pressable>
        </View>
        <Text style={styles.label}>手机号</Text>
        <View style={styles.row}>
          <Pressable onPress={() => setRegionModal(true)} style={styles.regionBtn}>
            <Text style={styles.regionText}>{regionCode} ▾</Text>
          </Pressable>
          <TextInput
            value={phone}
            onChangeText={(v) => setPhone(sanitizeDigits(v).slice(0, phoneMaxLen))}
            placeholder={PHONE_RULES[regionCode].hint}
            keyboardType="number-pad"
            style={styles.input}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {mode === 'code' ? (
          <>
            <Text style={[styles.label, { marginTop: 14 }]}>验证码</Text>
            <View style={styles.row}>
              <TextInput
                value={code}
                onChangeText={(v) => setCode(sanitizeDigits(v).slice(0, 6))}
                placeholder="输入验证码"
                keyboardType="number-pad"
                style={styles.input}
                placeholderTextColor="#9CA3AF"
              />
              <Pressable
                onPress={onSendCode}
                disabled={!canSendCode}
                style={({ pressed }) => [
                  styles.codeBtn,
                  !canSendCode && { backgroundColor: '#E5E7EB' },
                  pressed && canSendCode && { opacity: 0.9 },
                ]}>
                <Text style={[styles.codeBtnText, !canSendCode && { color: '#6B7280' }]}>
                  {countdown > 0 ? `${countdown}s` : sending ? '发送中…' : '获取验证码'}
                </Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <Text style={[styles.label, { marginTop: 14 }]}>密码</Text>
            <View style={styles.row}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="请输入密码"
                secureTextEntry
                style={styles.input}
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </>
        )}

        <Pressable onPress={() => setAgree((v) => !v)} style={styles.agreeRow} hitSlop={10}>
          <View style={[styles.checkbox, agree && styles.checkboxOn]}>
            {agree && <Text style={styles.checkboxTick}>✓</Text>}
          </View>
          <Text style={styles.agreeText}>
            我已阅读并同意 <Text style={styles.link}>用户协议</Text> 与 <Text style={styles.link}>隐私政策</Text>
          </Text>
        </Pressable>

        <Pressable
          onPress={onLogin}
          disabled={!canLogin}
          style={({ pressed }) => [
            styles.loginBtn,
            !canLogin && { backgroundColor: '#93C5FD' },
            pressed && canLogin && { opacity: 0.9 },
          ]}>
          <Text style={styles.loginText}>登录 / 注册</Text>
        </Pressable>
        {mode === 'password' ? (
          <View style={styles.passwordActions}>
            <Pressable onPress={() => void onRegister()}>
              <Text style={styles.passwordActionText}>立即注册</Text>
            </Pressable>
            <Pressable onPress={() => void onForgotPassword()}>
              <Text style={styles.passwordActionText}>忘记密码</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>第三方登录</Text>
          <View style={styles.divider} />
        </View>

        <View style={styles.thirdRow}>
          <Pressable onPress={() => onThirdParty('微信')} style={styles.thirdBtn}>
            <Text style={styles.thirdIcon}>🟩</Text>
            <Text style={styles.thirdText}>微信</Text>
          </Pressable>
          <Pressable onPress={() => onThirdParty('QQ')} style={styles.thirdBtn}>
            <Text style={styles.thirdIcon}>🔵</Text>
            <Text style={styles.thirdText}>QQ</Text>
          </Pressable>
        </View>
      </View>

      <Modal visible={regionModal} transparent animationType="fade" onRequestClose={() => setRegionModal(false)}>
        <Pressable style={styles.modalMask} onPress={() => setRegionModal(false)}>
          <Pressable style={styles.modalCard} onPress={() => undefined}>
            <Text style={styles.modalTitle}>选择区号</Text>
            {(['+86', '+852'] as RegionCode[]).map((rc) => (
              <Pressable
                key={rc}
                onPress={() => {
                  setRegionCode(rc);
                  setPhone('');
                  setRegionModal(false);
                }}
                style={({ pressed }) => [styles.modalItem, pressed && { opacity: 0.9 }]}>
                <Text style={styles.modalItemText}>{rc}</Text>
                {rc === regionCode && <Text style={{ color: '#2563EB', fontWeight: '800' }}>已选</Text>}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 10 },
  appName: { fontSize: 28, fontWeight: '900', color: '#111827' },
  tip: { marginTop: 6, color: '#6B7280', fontSize: 13 },
  form: { paddingHorizontal: 20, paddingTop: 12 },
  modeSwitch: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 12, padding: 4, marginBottom: 14 },
  modeBtn: { flex: 1, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  modeBtnActive: { backgroundColor: '#FFFFFF' },
  modeText: { color: '#6B7280', fontWeight: '700', fontSize: 13 },
  modeTextActive: { color: '#111827' },
  label: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  regionBtn: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  regionText: { fontWeight: '800', color: '#111827' },
  input: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#111827',
  },
  codeBtn: {
    height: 46,
    borderRadius: 12,
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  codeBtnText: { color: '#1D4ED8', fontWeight: '900', fontSize: 13 },
  agreeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxOn: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  checkboxTick: { color: '#fff', fontSize: 12, fontWeight: '900' },
  agreeText: { color: '#6B7280', fontSize: 12, flex: 1, lineHeight: 18 },
  link: { color: '#2563EB', fontWeight: '800' },
  loginBtn: {
    marginTop: 18,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  passwordActions: { marginTop: 10, flexDirection: 'row', justifyContent: 'space-between' },
  passwordActionText: { color: '#2563EB', fontWeight: '700', fontSize: 13 },
  dividerRow: { marginTop: 18, flexDirection: 'row', alignItems: 'center', gap: 10 },
  divider: { flex: 1, height: 1, backgroundColor: '#EEF2F7' },
  dividerText: { color: '#9CA3AF', fontSize: 12, fontWeight: '700' },
  thirdRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  thirdBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  thirdIcon: { fontSize: 16 },
  thirdText: { fontWeight: '800', color: '#111827' },
  modalMask: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  modalTitle: { fontSize: 16, fontWeight: '900', color: '#111827', marginBottom: 10 },
  modalItem: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F7',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalItemText: { fontSize: 14, fontWeight: '800', color: '#111827' },
});

