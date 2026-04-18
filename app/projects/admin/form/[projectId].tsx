import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { toast } from '@/src/components/toast';
import type { ApplicationFieldType, ApplicationFormField, ApplicationFormTemplate } from '@/src/models/types';
import { useProjectsStore } from '@/src/stores/projectsStore';

const FIELD_TYPES: { label: string; value: ApplicationFieldType }[] = [
  { label: '单行文本', value: 'text' },
  { label: '多行文本', value: 'textarea' },
  { label: '下拉选择', value: 'select' },
  { label: '图片 URL', value: 'image' },
];

export default function ProjectFormAdminPage() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const pid = String(projectId ?? '');

  const projects = useProjectsStore();

  const [template, setTemplate] = useState<ApplicationFormTemplate | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!pid) return;
    try {
      const tpl = await projects.getApplicationForm(pid);
      setTemplate(tpl);
    } catch (e) {
      console.error(e);
      toast('加载报名表模板失败');
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pid]);

  const updateField = (id: string, patch: Partial<ApplicationFormField>) => {
    if (!template) return;
    setTemplate({
      ...template,
      fields: template.fields.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    });
  };

  const addField = () => {
    if (!template) return;
    const id = `fld_${template.projectId}_${Date.now()}`;
    const next: ApplicationFormField = {
      id,
      key: `field_${template.fields.length + 1}`,
      label: `字段 ${template.fields.length + 1}`,
      type: 'text',
      required: false,
    };
    setTemplate({ ...template, fields: [...template.fields, next] });
  };

  const removeField = (id: string) => {
    if (!template) return;
    setTemplate({ ...template, fields: template.fields.filter((f) => f.id !== id) });
  };

  const moveField = (id: string, direction: 'up' | 'down') => {
    if (!template) return;
    const idx = template.fields.findIndex((f) => f.id === id);
    if (idx === -1) return;
    const target = direction === 'up' ? idx - 1 : idx + 1;
    if (target < 0 || target >= template.fields.length) return;
    const next = [...template.fields];
    const [cur] = next.splice(idx, 1);
    next.splice(target, 0, cur);
    setTemplate({ ...template, fields: next });
  };

  const onSave = async () => {
    if (!template) return;
    if (template.fields.length === 0) {
      toast('至少保留一个字段（系统会自动生成一个默认字段）');
    }
    setSaving(true);
    try {
      const saved = await projects.updateApplicationForm(template.projectId, template);
      setTemplate(saved);
      toast('已保存报名表模板（mock）');
    } catch (e) {
      console.error(e);
      toast('保存失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  const fields = template?.fields ?? [];

  return (
    <ScrollView style={styles.safe} contentContainerStyle={styles.content}>
      <Text style={styles.h}>编辑报名表模板</Text>
      <Text style={styles.sub}>projectId = {pid}</Text>

      {fields.length === 0 && (
        <Text style={[styles.sub, { marginTop: 12 }]}>当前暂无字段，保存时系统会自动生成一个默认“角色名 / OC 名称”字段。</Text>
      )}

      {fields.map((f, index) => (
        <View key={f.id} style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>
              字段 {index + 1}：{f.label || f.key}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable onPress={() => moveField(f.id, 'up')} hitSlop={8}>
                <Text style={styles.smallAction}>上移</Text>
              </Pressable>
              <Pressable onPress={() => moveField(f.id, 'down')} hitSlop={8}>
                <Text style={styles.smallAction}>下移</Text>
              </Pressable>
              <Pressable onPress={() => removeField(f.id)} hitSlop={8}>
                <Text style={[styles.smallAction, { color: '#DC2626' }]}>删除</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.label}>字段名（label）</Text>
            <TextInput
              style={styles.input}
              value={f.label}
              onChangeText={(v) => updateField(f.id, { label: v })}
              placeholder="例如：角色名 / OC 名称"
            />
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.label}>字段键（key）</Text>
            <TextInput
              style={styles.input}
              value={f.key}
              onChangeText={(v) => updateField(f.id, { key: v })}
              placeholder="例如：oc_name（仅英文与下划线）"
            />
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.label}>字段类型</Text>
            <View style={styles.typeRow}>
              {FIELD_TYPES.map((t) => {
                const active = f.type === t.value;
                return (
                  <Pressable
                    key={t.value}
                    onPress={() => updateField(f.id, { type: t.value })}
                    style={[styles.typeChip, active && styles.typeChipActive]}
                  >
                    <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>{t.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.label}>是否必填</Text>
            <Pressable
              onPress={() => updateField(f.id, { required: !f.required })}
              style={[styles.switch, f.required && styles.switchOn]}
            >
              <View style={[styles.switchKnob, f.required && styles.switchKnobOn]} />
              <Text style={[styles.switchText, f.required && styles.switchTextOn]}>{f.required ? '必填' : '选填'}</Text>
            </Pressable>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.label}>帮助说明（可选）</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              multiline
              value={f.helperText ?? ''}
              onChangeText={(v) => updateField(f.id, { helperText: v })}
              placeholder="例如：简单描述一下角色背景、性格等"
            />
          </View>

          {(f.type === 'text' || f.type === 'textarea') && (
            <View style={styles.fieldRow}>
              <Text style={styles.label}>最大长度（可选）</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={f.maxLength != null ? String(f.maxLength) : ''}
                onChangeText={(v) => {
                  const trimmed = v.trim();
                  const num = trimmed ? Number(trimmed) : undefined;
                  updateField(f.id, { maxLength: Number.isNaN(num as number) ? undefined : (num as number | undefined) });
                }}
                placeholder="例如：32"
              />
            </View>
          )}

          {f.type === 'select' && (
            <View style={styles.fieldRow}>
              <Text style={styles.label}>选项（以英文逗号分隔）</Text>
              <TextInput
                style={styles.input}
                value={(f.options ?? []).join(',')}
                onChangeText={(v) =>
                  updateField(f.id, {
                    options: v
                      .split(',')
                      .map((x) => x.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="例如：主角, 配角, 路人"
              />
            </View>
          )}
        </View>
      ))}

      <Pressable onPress={addField} style={styles.addBtn}>
        <Text style={styles.addBtnText}>+ 添加字段</Text>
      </Pressable>

      <Pressable disabled={saving} onPress={onSave} style={[styles.saveBtn, saving && { opacity: 0.7 }]}>
        <Text style={styles.saveText}>{saving ? '保存中…' : '保存模板'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F8FA' },
  content: { padding: 16, paddingBottom: 32 },
  h: { fontSize: 18, fontWeight: '900', color: '#111827' },
  sub: { marginTop: 6, color: '#6B7280', fontSize: 12 },
  card: {
    marginTop: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    padding: 14,
  },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 14, fontWeight: '800', color: '#111827', flex: 1, marginRight: 8 },
  smallAction: { fontSize: 12, color: '#2563EB', fontWeight: '700' },
  fieldRow: { marginTop: 10 },
  label: { fontSize: 13, fontWeight: '700', color: '#111827' },
  input: {
    marginTop: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  textarea: { minHeight: 60, textAlignVertical: 'top' },
  typeRow: { marginTop: 6, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  typeChipActive: {
    borderColor: '#2563EB',
    backgroundColor: '#DBEAFE',
  },
  typeChipText: { fontSize: 12, color: '#4B5563' },
  typeChipTextActive: { color: '#1D4ED8', fontWeight: '700' },
  switch: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  switchOn: {
    borderColor: '#2563EB',
    backgroundColor: '#DBEAFE',
  },
  switchKnob: {
    width: 16,
    height: 16,
    borderRadius: 999,
    backgroundColor: '#D1D5DB',
    marginRight: 6,
  },
  switchKnobOn: {
    backgroundColor: '#2563EB',
  },
  switchText: { fontSize: 12, color: '#4B5563' },
  switchTextOn: { color: '#1D4ED8', fontWeight: '700' },
  addBtn: {
    marginTop: 20,
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
  },
  addBtnText: { color: '#1D4ED8', fontWeight: '900' },
  saveBtn: {
    marginTop: 16,
    height: 46,
    borderRadius: 16,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: { color: '#FFFFFF', fontWeight: '900' },
});

