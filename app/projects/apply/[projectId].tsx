import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { toast } from '@/src/components/toast';
import type { ApplicationFormField, ApplicationFormTemplate } from '@/src/models/types';
import { useProjectsStore } from '@/src/stores/projectsStore';
import { useSessionStore } from '@/src/stores/sessionStore';

type FieldError = string | undefined;

export default function ProjectApplyPage() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const pid = String(projectId ?? '');
  const router = useRouter();

  const projects = useProjectsStore();
  const { user } = useSessionStore();
  const applicantUserId = user?.id ?? 'u_demo';

  const [template, setTemplate] = useState<ApplicationFormTemplate | null>(null);
  const [values, setValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, FieldError>>({});
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    if (!pid) return;
    try {
      const tpl = await projects.getApplicationForm(pid);
      setTemplate(tpl);
    } catch (e) {
      console.error(e);
      toast('加载报名表失败');
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pid]);

  const onChangeField = (key: string, v: string) => {
    setValues((prev) => ({ ...prev, [key]: v }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validateField = (field: ApplicationFormField, v: any): FieldError => {
    const text = typeof v === 'string' ? v.trim() : v;
    if (field.required) {
      if (text === null || text === undefined || (typeof text === 'string' && text.length === 0)) {
        return '必填项';
      }
    }
    if (field.maxLength && typeof text === 'string' && text.length > field.maxLength) {
      return `长度不能超过 ${field.maxLength} 字`;
    }
    return undefined;
  };

  const validateAll = (): boolean => {
    const tplFields = template?.fields ?? [];
    if (tplFields.length === 0) {
      // 没有配置模板时走一个默认的简单校验（不会阻塞）
      return true;
    }
    const nextErrors: Record<string, FieldError> = {};
    for (const f of tplFields) {
      const err = validateField(f, values[f.key]);
      if (err) nextErrors[f.key] = err;
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const onSubmit = async () => {
    if (!pid) return;
    if (!validateAll()) {
      toast('请先修正表单中的错误');
      return;
    }
    setSubmitting(true);
    try {
      await projects.submitApplication({ projectId: pid, applicantUserId, payload: values });
      toast('已提交报名（mock）');
      router.replace(`/projects/${pid}` as any);
    } catch (e: any) {
      console.error(e);
      const msg = typeof e?.message === 'string' ? e.message : '提交失败，请稍后重试';
      toast(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const fields = template?.fields ?? [];

  return (
    <ScrollView style={styles.safe} contentContainerStyle={styles.content}>
      <Text style={styles.h}>报名表</Text>
      <Text style={styles.sub}>projectId = {pid}</Text>

      {fields.length === 0 ? (
        <View style={{ marginTop: 16 }}>
          <Text style={styles.sub}>当前企划尚未配置人设卡模板，先填写一个简易报名信息：</Text>
          <View style={styles.fieldBlock}>
            <Text style={styles.label}>角色名 / OC 名称（必填）</Text>
            <TextInput
              value={values.oc_name ?? ''}
              onChangeText={(v) => onChangeField('oc_name', v)}
              style={styles.input}
              placeholder="例如：白日梦航行者"
            />
            {!!errors.oc_name && <Text style={styles.error}>{errors.oc_name}</Text>}
          </View>
          <View style={styles.fieldBlock}>
            <Text style={styles.label}>角色简介（可选）</Text>
            <TextInput
              value={values.intro ?? ''}
              onChangeText={(v) => onChangeField('intro', v)}
              style={[styles.input, styles.textarea]}
              multiline
              placeholder="简单介绍一下你的角色吧"
            />
          </View>
        </View>
      ) : (
        <View style={{ marginTop: 16 }}>
          {fields.map((f) => {
            const v = values[f.key] ?? '';
            const err = errors[f.key];

            if (f.type === 'select') {
              return (
                <View key={f.id} style={styles.fieldBlock}>
                  <Text style={styles.label}>
                    {f.label}
                    {f.required && <Text style={styles.required}> *</Text>}
                  </Text>
                  {/* 轻量实现：用一组按钮代替真正的 Picker */}
                  <View style={styles.selectRow}>
                    {(f.options ?? []).map((opt) => {
                      const active = v === opt;
                      return (
                        <Pressable
                          key={opt}
                          onPress={() => onChangeField(f.key, opt)}
                          style={[styles.chip, active && styles.chipActive]}
                        >
                          <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  {f.helperText && <Text style={styles.helper}>{f.helperText}</Text>}
                  {!!err && <Text style={styles.error}>{err}</Text>}
                </View>
              );
            }

            // text / textarea / image 均用 TextInput 承载，image 先用 URL 占位
            const isTextarea = f.type === 'textarea';
            const placeholder =
              f.type === 'image'
                ? '请输入图片 URL（上传功能后续接入）'
                : isTextarea
                ? f.helperText || '请输入内容'
                : f.helperText || `请输入${f.label}`;

            return (
              <View key={f.id} style={styles.fieldBlock}>
                <Text style={styles.label}>
                  {f.label}
                  {f.required && <Text style={styles.required}> *</Text>}
                </Text>
                <TextInput
                  style={[styles.input, isTextarea && styles.textarea]}
                  value={v}
                  onChangeText={(t) => onChangeField(f.key, t)}
                  placeholder={placeholder}
                  multiline={isTextarea}
                />
                {f.helperText && <Text style={styles.helper}>{f.helperText}</Text>}
                {!!err && <Text style={styles.error}>{err}</Text>}
              </View>
            );
          })}
        </View>
      )}

      <Pressable disabled={submitting} onPress={onSubmit} style={[styles.submitBtn, submitting && { opacity: 0.7 }]}>
        <Text style={styles.submitText}>{submitting ? '提交中…' : '提交报名'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F8FA' },
  content: { padding: 16, paddingBottom: 28 },
  h: { fontSize: 18, fontWeight: '900', color: '#111827' },
  sub: { marginTop: 6, color: '#6B7280', fontSize: 12 },
  fieldBlock: { marginTop: 16 },
  label: { fontSize: 14, fontWeight: '700', color: '#111827' },
  required: { color: '#DC2626' },
  input: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  textarea: { minHeight: 90, textAlignVertical: 'top' },
  helper: { marginTop: 4, color: '#6B7280', fontSize: 12 },
  error: { marginTop: 4, color: '#DC2626', fontSize: 12 },
  submitBtn: {
    marginTop: 24,
    height: 46,
    borderRadius: 16,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: { color: '#FFFFFF', fontWeight: '900' },
  selectRow: { marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  chipActive: {
    borderColor: '#2563EB',
    backgroundColor: '#DBEAFE',
  },
  chipText: { fontSize: 12, color: '#4B5563' },
  chipTextActive: { color: '#1D4ED8', fontWeight: '700' },
});

