import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { toast } from '@/src/components/toast';
import type { Application, ApplicationFormTemplate } from '@/src/models/types';
import { useProjectsStore } from '@/src/stores/projectsStore';
import { useSessionStore } from '@/src/stores/sessionStore';

export default function ProjectReviewPage() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const pid = String(projectId ?? '');

  const projects = useProjectsStore();
  const { user } = useSessionStore();
  const reviewerUserId = user?.id ?? 'u_team';
  const [isAdmin, setIsAdmin] = useState(false);

  const [apps, setApps] = useState<Application[]>([]);
  const [template, setTemplate] = useState<ApplicationFormTemplate | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [scores, setScores] = useState<Record<string, string>>({});
  const [feedbacks, setFeedbacks] = useState<Record<string, string>>({});

  const selectedIds = useMemo(() => Object.entries(selected).filter(([, v]) => v).map(([id]) => id), [selected]);

  const load = async () => {
    if (!pid) return;

    // 并行拉取报名列表与模板 + 企划信息（用于权限判断）
    const [list, tpl, p] = await Promise.all([
      projects.listApplications(pid),
      projects.getApplicationForm(pid),
      projects.getProject(pid),
    ]);
    setTemplate(tpl);

    const admins = p?.adminUserIds ?? [];
    setIsAdmin(!!user && !!p && (p.ownerUserId === user.id || admins.includes(user.id)));

    // 审核页只展示待处理的申请（submitted/reviewing），通过或拒绝后从列表中消失
    const pending = list.filter((a) => a.status === 'submitted' || a.status === 'reviewing');
    setApps(pending);
    setSelected({});
    setScores(
      Object.fromEntries(
        pending.map((a) => [a.id, a.score != null ? String(a.score) : '']),
      ),
    );
    setFeedbacks(
      Object.fromEntries(
        pending.map((a) => [a.id, a.feedback ?? '']),
      ),
    );
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pid]);

  const toggle = (id: string) => setSelected((prev) => ({ ...prev, [id]: !prev[id] }));

  const reviewOne = async (app: Application, action: 'approve' | 'reject') => {
    const rawScore = scores[app.id]?.trim();
    const numScore = rawScore ? Number(rawScore) : undefined;
    if (rawScore && (Number.isNaN(numScore) || numScore! < 0 || numScore! > 100)) {
      return toast('评分需为 0-100 的数字');
    }

    await projects.reviewApplication({
      projectId: app.projectId,
      applicationId: app.id,
      action,
      score: numScore,
      feedback: feedbacks[app.id]?.trim() || undefined,
      reviewerUserId,
    });
    toast(action === 'approve' ? '已通过（mock）' : '已拒绝（mock）');
    await load();
  };

  const batch = async (action: 'approve' | 'reject') => {
    if (selectedIds.length === 0) return toast('请先勾选申请');

    // 简单串行，确保错误提示更清晰
    for (const id of selectedIds) {
      const app = apps.find((a) => a.id === id);
      if (!app) continue;
      const rawScore = scores[id]?.trim();
      const numScore = rawScore ? Number(rawScore) : undefined;
      if (rawScore && (Number.isNaN(numScore) || numScore! < 0 || numScore! > 100)) {
        toast(`申请 ${id} 的评分需为 0-100 的数字`);
        return;
      }
      // 这里不做 await all，逐个发送
      // eslint-disable-next-line no-await-in-loop
      await projects.reviewApplication({
        projectId: pid,
        applicationId: id,
        action,
        score: numScore,
        feedback: feedbacks[id]?.trim() || undefined,
        reviewerUserId,
      });
    }
    toast(action === 'approve' ? `批量通过：${selectedIds.length} 条` : `批量拒绝：${selectedIds.length} 条`);
    await load();
  };

  return (
    <ScrollView style={styles.safe} contentContainerStyle={styles.content}>
      <Text style={styles.h}>审核页（企划组后台·mock）</Text>
      <Text style={styles.sub}>projectId = {pid}</Text>
      {!isAdmin && <Text style={[styles.sub, { color: '#DC2626' }]}>无权限：仅管理员可进入审核页。</Text>}

      {!isAdmin ? null : (
      <View style={styles.batchRow}>
        <Pressable onPress={() => batch('approve')} style={styles.btn}>
          <Text style={styles.btnText}>批量通过</Text>
        </Pressable>
        <Pressable onPress={() => batch('reject')} style={[styles.btn, styles.btnGhost]}>
          <Text style={[styles.btnText, styles.btnGhostText]}>批量拒绝</Text>
        </Pressable>
        <Pressable onPress={load} style={[styles.btn, styles.btnGhost]}>
          <Text style={[styles.btnText, styles.btnGhostText]}>刷新</Text>
        </Pressable>
      </View>
      )}

      {!isAdmin ? (
        <View style={{ marginTop: 30, alignItems: 'center' }}>
          <Text style={{ color: '#6B7280' }}>请使用管理员账号访问此页面</Text>
        </View>
      ) : apps.length === 0 ? (
        <View style={{ marginTop: 30, alignItems: 'center' }}>
          <Text style={{ color: '#6B7280' }}>暂无报名</Text>
        </View>
      ) : (
        apps.map((a) => (
          <Pressable key={a.id} onPress={() => toggle(a.id)} style={styles.card}>
            <View style={styles.checkbox}>{selected[a.id] && <Text style={styles.tick}>✓</Text>}</View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>
                申请人：{a.applicantUserId} · 状态：{a.status}
              </Text>
              {/* 按模板字段逐项展示报名信息；若无模板则回退到 intro 文案 */}
              {template?.fields && template.fields.length > 0 ? (
                <View style={styles.fieldsBlock}>
                  {template.fields.map((f) => {
                    const raw = a.payload?.[f.key];
                    const value =
                      raw === null || raw === undefined || (typeof raw === 'string' && raw.trim().length === 0)
                        ? '（未填写）'
                        : String(raw);
                    return (
                      <View key={f.id} style={styles.fieldLine}>
                        <Text style={styles.fieldName}>{f.label || f.key}</Text>
                        <Text style={styles.fieldValue} numberOfLines={2}>
                          {value}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <Text style={styles.reason} numberOfLines={2}>
                  {String(a.payload?.intro ?? '（无简介）')}
                </Text>
              )}

              {/* M3: 评分 + 备注 */}
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>评分（0-100，可选）</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={scores[a.id] ?? ''}
                  onChangeText={(v) => setScores((prev) => ({ ...prev, [a.id]: v }))}
                  placeholder={a.score != null ? String(a.score) : '例如 85'}
                />
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>审核备注（可选）</Text>
                <TextInput
                  style={[styles.input, styles.textarea]}
                  multiline
                  value={feedbacks[a.id] ?? ''}
                  onChangeText={(v) => setFeedbacks((prev) => ({ ...prev, [a.id]: v }))}
                  placeholder={a.feedback || '可以写下对角色/设定的简短评价'}
                />
              </View>

              <View style={styles.row}>
                <Pressable onPress={() => reviewOne(a, 'approve')} style={styles.smallBtn}>
                  <Text style={styles.smallBtnText}>通过</Text>
                </Pressable>
                <Pressable onPress={() => reviewOne(a, 'reject')} style={[styles.smallBtn, styles.smallBtnGhost]}>
                  <Text style={[styles.smallBtnText, styles.smallBtnGhostText]}>拒绝</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F8FA' },
  content: { padding: 16, paddingBottom: 28 },
  h: { fontSize: 18, fontWeight: '900', color: '#111827' },
  sub: { marginTop: 6, color: '#6B7280' },
  batchRow: { flexDirection: 'row', gap: 10, marginTop: 12, flexWrap: 'wrap' },
  btn: { height: 38, borderRadius: 12, backgroundColor: '#111827', paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  btnGhost: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#111827' },
  btnGhostText: { color: '#111827' },
  card: {
    marginTop: 12,
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EEF1F4',
    padding: 14,
    flexDirection: 'row',
    gap: 12,
  },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center' },
  tick: { color: '#2563EB', fontWeight: '900' },
  name: { fontWeight: '900', color: '#111827' },
  reason: { marginTop: 6, color: '#6B7280', fontSize: 12 },
  fieldsBlock: { marginTop: 6, gap: 4 },
  fieldLine: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 2 },
  fieldName: { minWidth: 80, fontSize: 12, color: '#4B5563', fontWeight: '700' },
  fieldValue: { flex: 1, fontSize: 12, color: '#6B7280' },
  fieldRow: { marginTop: 10 },
  fieldLabel: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  textarea: { minHeight: 60, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 10, marginTop: 10 },
  smallBtn: { height: 34, borderRadius: 12, backgroundColor: '#2563EB', paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  smallBtnText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  smallBtnGhost: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#2563EB' },
  smallBtnGhostText: { color: '#2563EB' },
});

