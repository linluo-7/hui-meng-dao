import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { toast } from '@/src/components/toast';
import type { NpcCard, Project, ProjectHomeModule, ProjectStatus, RuleSet } from '@/src/models/types';
import { PROJECT_STATUSES } from '@/src/services/mockData';
import { useProjectsStore } from '@/src/stores/projectsStore';
import { formatRuleSetHumanReadable, parseRuleSet } from '@/src/utils/ruleset';
import { useSessionStore } from '@/src/stores/sessionStore';

export default function ProjectEditPage() {
  const router = useRouter();
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const pid = String(projectId ?? '');

  const projects = useProjectsStore();
  const { user } = useSessionStore();
  const [project, setProject] = useState<Project | null>(null);

  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('招募中');
  const [summary, setSummary] = useState('');
  const [worldview, setWorldview] = useState('');
  const [rules, setRules] = useState('');
  const [recruitRequirements, setRecruitRequirements] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [memberLimitText, setMemberLimitText] = useState('100');

  const [modules, setModules] = useState<ProjectHomeModule[]>([]);
  const [worldDoc, setWorldDoc] = useState('');
  const [npcs, setNpcs] = useState<NpcCard[]>([]);
  const [rulesetJson, setRulesetJson] = useState('{\n  \"dice\": \"d100\",\n  \"cooldown\": 0\n}');
  const [rulesetForm, setRulesetForm] = useState<RuleSet | null>(null);

  useEffect(() => {
    (async () => {
      if (!pid) return;
      const p = await projects.getProject(pid);
      setProject(p);
      if (!p) return;
      setTitle(p.title);
      setStatus(p.status);
      setSummary(p.summary);
      setWorldview(p.worldview);
      setRules(p.rules);
      setRecruitRequirements(p.recruitRequirements);
      setTagsText(p.tags.join(','));
      setMemberLimitText(String(p.memberLimit));

      setModules((p.homepageModules ?? []).slice().sort((a, b) => a.order - b.order));
      setWorldDoc(p.worldbuilding?.doc ?? '');
      setNpcs(p.npcs ?? []);
      const json = p.rulesetJson ?? rulesetJson;
      setRulesetJson(json);
      const parsed = parseRuleSet(json);
      if (parsed.ok) {
        setRulesetForm(parsed.value);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pid]);

  const tags = useMemo(
    () =>
      tagsText
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean),
    [tagsText]
  );

  const memberLimit = useMemo(() => {
    const n = Number(memberLimitText);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 100;
  }, [memberLimitText]);

  const canSubmit = title.trim().length >= 2;

  const onToggleModule = (key: string) => setModules((prev) => prev.map((m) => (m.key === key ? { ...m, enabled: !m.enabled } : m)));
  const onMoveModule = (key: string, dir: -1 | 1) =>
    setModules((prev) => {
      const idx = prev.findIndex((m) => m.key === key);
      if (idx < 0) return prev;
      const nextIdx = idx + dir;
      if (nextIdx < 0 || nextIdx >= prev.length) return prev;
      const copy = [...prev];
      const tmp = copy[idx];
      copy[idx] = copy[nextIdx];
      copy[nextIdx] = tmp;
      return copy.map((m, i) => ({ ...m, order: i + 1 }));
    });

  const setModuleContent = (key: string, content: string) =>
    setModules((prev) => prev.map((m) => (m.key === key ? { ...m, content } : m)));

  const setMultiLineModuleItem = (key: 'mainline' | 'sideline', index: number, value: string) => {
    setModules((prev) =>
      prev.map((m) => {
        if (m.key !== key) return m;
        const items = (m.content ?? '').split('\n').map((x) => x.trimEnd());
        while (items.length <= index) items.push('');
        items[index] = value;
        const next = items.map((x) => x.trim()).filter((x) => x.length > 0).join('\n');
        return { ...m, content: next };
      }),
    );
  };

  const addMultiLineModuleItem = (key: 'mainline' | 'sideline') => {
    setModules((prev) =>
      prev.map((m) => {
        if (m.key !== key) return m;
        const items = (m.content ?? '').split('\n').map((x) => x.trim()).filter(Boolean);
        items.push('');
        return { ...m, content: items.join('\n') };
      }),
    );
  };

  const removeMultiLineModuleItem = (key: 'mainline' | 'sideline', index: number) => {
    setModules((prev) =>
      prev.map((m) => {
        if (m.key !== key) return m;
        const items = (m.content ?? '').split('\n').map((x) => x.trim()).filter(Boolean);
        const next = items.filter((_, i) => i !== index).join('\n');
        return { ...m, content: next };
      }),
    );
  };

  const isAdmin = useMemo(() => {
    if (!user || !project) return false;
    const admins = project.adminUserIds ?? [];
    return project.ownerUserId === user.id || admins.includes(user.id);
  }, [project, user]);

  const onAddNpc = () =>
    setNpcs((prev) => [
      ...prev,
      { id: `npc_${Date.now()}`, name: '', gender: '', extraAttributes: [] },
    ]);
  const onUpdateNpc = (id: string, patch: Partial<NpcCard>) => setNpcs((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  const onRemoveNpc = (id: string) => setNpcs((prev) => prev.filter((n) => n.id !== id));

  const onSave = async () => {
    if (!project) return toast('企划不存在');
    if (!isAdmin) return toast('无权限：仅管理员可以编辑企划');
    if (!canSubmit) return toast('请至少填写标题（≥2字）');
    const parsed = parseRuleSet(rulesetJson);
    if (!parsed.ok) {
      return toast(`规则配置格式不合法：${parsed.error}`);
    }

    const updated = await projects.updateProject(project.id, {
      title: title.trim(),
      status,
      summary: summary.trim() || '（未填写简介）',
      worldview: worldview.trim() || '（未填写世界观）',
      rules: rules.trim() || '（未填写规则）',
      recruitRequirements: recruitRequirements.trim() || '（未填写招募要求）',
      tags,
      memberLimit,

      homepageModules: modules.map((m, i) => ({ ...m, order: i + 1 })),
      worldbuilding: { doc: worldDoc.trim() || '（未填写世界观文档）', maps: [] },
      npcs: npcs.map((n) => ({
        ...n,
        name: n.name.trim() || '未命名NPC',
        gender: n.gender?.trim() || undefined,
        extraAttributes:
          n.extraAttributes
            ?.map((a) => ({ key: a.key.trim(), value: a.value.trim() }))
            .filter((a) => a.key.length > 0) ?? [],
      })),
      rulesetJson,
      ruleset: parsed.value,
    });

    if (!updated) return toast('保存失败（mock）');
    toast('已保存（mockDb 持久化）');
    router.replace(`/projects/${updated.id}` as any);
  };

  if (!project) {
    return (
      <View style={styles.loading}>
        <Text style={{ color: '#6B7280' }}>加载中…</Text>
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={styles.loading}>
        <Text style={{ color: '#6B7280' }}>无权限访问：仅企划管理员可以编辑。</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.safe} contentContainerStyle={styles.content}>
      <Text style={styles.h}>编辑企划（M2 完整表单）</Text>
      <Text style={styles.sub}>projectId = {pid}</Text>

      <Text style={styles.label}>标题 *</Text>
      <TextInput value={title} onChangeText={setTitle} style={styles.input} placeholder="企划标题" />

      <Text style={styles.label}>状态</Text>
      <View style={styles.row}>
        {PROJECT_STATUSES.map((s) => (
          <Pressable key={s} onPress={() => setStatus(s)} style={[styles.pill, status === s && styles.pillOn]}>
            <Text style={[styles.pillText, status === s && styles.pillTextOn]}>{s}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>标签（逗号分隔）</Text>
      <TextInput value={tagsText} onChangeText={setTagsText} style={styles.input} placeholder="例如：官方,共创,轻松" />

      <Text style={styles.label}>人数上限</Text>
      <TextInput value={memberLimitText} onChangeText={setMemberLimitText} style={styles.input} keyboardType="number-pad" />

      <Text style={styles.label}>简介</Text>
      <TextInput value={summary} onChangeText={setSummary} style={[styles.input, styles.textarea]} multiline />

      <Text style={styles.label}>世界观（快速字段）</Text>
      <TextInput value={worldview} onChangeText={setWorldview} style={[styles.input, styles.textarea]} multiline />

      <Text style={styles.label}>规则（快速字段）</Text>
      <TextInput value={rules} onChangeText={setRules} style={[styles.input, styles.textarea]} multiline />

      <Text style={styles.label}>招募要求</Text>
      <TextInput value={recruitRequirements} onChangeText={setRecruitRequirements} style={[styles.input, styles.textarea]} multiline />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>主页模板模块（M2）</Text>
        {modules.length === 0 ? (
          <Text style={styles.muted}>该企划还没有模块（可在创建时初始化，或后续添加模块功能）。</Text>
        ) : (
          modules.map((m) => (
            <View key={m.key} style={styles.moduleCard}>
              <View style={styles.moduleTop}>
                <Text style={styles.moduleTitle}>
                  {m.enabled ? '✅' : '⬜'} {m.title}
                </Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Pressable onPress={() => onMoveModule(m.key, -1)} hitSlop={8}>
                    <Text style={styles.link}>上移</Text>
                  </Pressable>
                  <Pressable onPress={() => onMoveModule(m.key, 1)} hitSlop={8}>
                    <Text style={styles.link}>下移</Text>
                  </Pressable>
                  <Pressable onPress={() => onToggleModule(m.key)} hitSlop={8}>
                    <Text style={styles.link}>{m.enabled ? '禁用' : '启用'}</Text>
                  </Pressable>
                </View>
              </View>
              {m.key === 'mainline' || m.key === 'sideline' ? (
                <View style={{ marginTop: 8, gap: 8 }}>
                  <Text style={styles.muted}>
                    这里支持添加多条（每条会单独展示），不再把所有内容塞进一个大框里。
                  </Text>
                  {((m.content ?? '').split('\n').map((x) => x.trim()).filter(Boolean).length > 0
                    ? (m.content ?? '').split('\n').map((x) => x.trim()).filter(Boolean)
                    : ['']
                  ).map((it, i) => (
                    <View key={`${m.key}_${i}`} style={styles.multiRow}>
                      <TextInput
                        value={it}
                        onChangeText={(v) => setMultiLineModuleItem(m.key as any, i, v)}
                        style={[styles.input, { flex: 1 }]}
                        placeholder={`添加一条${m.title}内容`}
                      />
                      <Pressable onPress={() => removeMultiLineModuleItem(m.key as any, i)} style={styles.smallBtn}>
                        <Text style={styles.smallBtnText}>删</Text>
                      </Pressable>
                    </View>
                  ))}
                  <Pressable onPress={() => addMultiLineModuleItem(m.key as any)} style={styles.ghostBtn}>
                    <Text style={styles.ghostBtnText}>+ 新增一条{m.title}</Text>
                  </Pressable>
                </View>
              ) : (
                <TextInput
                  value={m.content}
                  onChangeText={(v) => setModuleContent(m.key, v)}
                  style={[styles.input, styles.textarea]}
                  multiline
                />
              )}
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>世界观文档（M2）</Text>
        <TextInput value={worldDoc} onChangeText={setWorldDoc} style={[styles.input, styles.textarea]} multiline placeholder="worldbuilding.doc" />
      </View>

      <View style={styles.section}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text style={styles.sectionTitle}>NPC 档案</Text>
          <Pressable onPress={onAddNpc} style={styles.smallBtn}>
            <Text style={styles.smallBtnText}>+ 新建 NPC</Text>
          </Pressable>
        </View>
        {npcs.length === 0 ? (
          <Text style={styles.muted}>暂无 NPC</Text>
        ) : (
          npcs.map((n, idx) => (
            <View key={n.id} style={styles.npcCard}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontWeight: '900', color: '#111827' }}>
                  NPC {idx + 1}
                </Text>
                <Pressable onPress={() => onRemoveNpc(n.id)} hitSlop={8}>
                  <Text style={{ color: '#EF4444', fontWeight: '900' }}>
                    删除
                  </Text>
                </Pressable>
              </View>
              <TextInput
                value={n.name}
                onChangeText={(v) => onUpdateNpc(n.id, { name: v })}
                style={styles.input}
                placeholder="姓名"
              />
              <TextInput
                value={n.gender ?? ''}
                onChangeText={(v) => onUpdateNpc(n.id, { gender: v })}
                style={styles.input}
                placeholder="性别（例如：男/女/不明）"
              />
              <Text style={[styles.label, { marginTop: 8 }]}>
                自定义属性
              </Text>
              {(n.extraAttributes ?? []).map((a, i) => (
                <View
                  key={`${a.key}_${i}`}
                  style={{
                    flexDirection: 'row',
                    gap: 8,
                    alignItems: 'center',
                  }}
                >
                  <TextInput
                    value={a.key}
                    onChangeText={(v) =>
                      onUpdateNpc(n.id, {
                        extraAttributes: (n.extraAttributes ?? []).map(
                          (x, idx2) =>
                            idx2 === i ? { ...x, key: v } : x,
                        ),
                      })
                    }
                    style={[styles.input, { flex: 1 }]}
                    placeholder="属性名（例如：职业）"
                  />
                  <TextInput
                    value={a.value}
                    onChangeText={(v) =>
                      onUpdateNpc(n.id, {
                        extraAttributes: (n.extraAttributes ?? []).map(
                          (x, idx2) =>
                            idx2 === i ? { ...x, value: v } : x,
                        ),
                      })
                    }
                    style={[styles.input, { flex: 1 }]}
                    placeholder="属性值（例如：酒馆老板）"
                  />
                  <Pressable
                    onPress={() =>
                      onUpdateNpc(n.id, {
                        extraAttributes: (n.extraAttributes ?? []).filter(
                          (_, idx2) => idx2 !== i,
                        ),
                      })
                    }
                    style={styles.smallBtn}
                  >
                    <Text style={styles.smallBtnText}>删</Text>
                  </Pressable>
                </View>
              ))}
              <Pressable
                onPress={() =>
                  onUpdateNpc(n.id, {
                    extraAttributes: [
                      ...(n.extraAttributes ?? []),
                      { key: '', value: '' },
                    ],
                  })
                }
                style={[styles.smallBtn, { marginTop: 6 }]}
              >
                <Text style={styles.smallBtnText}>+ 添加属性</Text>
              </Pressable>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>规则配置（Ruleset JSON v1）</Text>

        <Text style={styles.label}>掷骰系统</Text>
        <View style={styles.row}>
          {['d100', 'd20', 'rd6', 'custom'].map((sys) => {
            const active = rulesetForm?.dice.system === sys;
            return (
              <Pressable
                key={sys}
                onPress={() => {
                  const next: RuleSet = {
                    dice: {
                      system: sys as RuleSet['dice']['system'],
                      expression:
                        sys === 'custom' ? rulesetForm?.dice.expression ?? '2d6+3' : undefined,
                    },
                    cooldownSeconds: rulesetForm?.cooldownSeconds ?? 0,
                    allowPvp: rulesetForm?.allowPvp ?? false,
                    autoJudge: rulesetForm?.autoJudge ?? false,
                  };
                  setRulesetForm(next);
                  setRulesetJson(JSON.stringify(next, null, 2));
                }}
                style={[styles.pill, active && styles.pillOn]}
              >
                <Text style={[styles.pillText, active && styles.pillTextOn]}>{sys}</Text>
              </Pressable>
            );
          })}
        </View>

        {rulesetForm?.dice.system === 'custom' && (
          <>
            <Text style={styles.label}>自定义表达式</Text>
            <TextInput
              style={styles.input}
              value={rulesetForm.dice.expression ?? ''}
              onChangeText={(v) => {
                const next: RuleSet = {
                  ...(rulesetForm ?? { dice: { system: 'custom' as const } }),
                  dice: {
                    system: 'custom',
                    expression: v,
                  },
                };
                setRulesetForm(next);
                setRulesetJson(JSON.stringify(next, null, 2));
              }}
              placeholder="例如：2d6+3"
            />
          </>
        )}

        <Text style={styles.label}>冷却时间（秒，可选）</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={
            rulesetForm?.cooldownSeconds != null
              ? String(rulesetForm.cooldownSeconds)
              : ''
          }
          onChangeText={(v) => {
            const trimmed = v.trim();
            const num = trimmed ? Number(trimmed) : undefined;
            const next: RuleSet = {
              ...(rulesetForm ??
                {
                  dice: { system: 'd100' as const },
                }),
              cooldownSeconds: Number.isNaN(num as number)
                ? undefined
                : (num as number | undefined),
            };
            setRulesetForm(next);
            setRulesetJson(JSON.stringify(next, null, 2));
          }}
          placeholder="例如：2"
        />

        <Text style={styles.label}>PVP / 自动判定</Text>
        <View style={styles.row}>
          <Pressable
            onPress={() => {
              const next: RuleSet = {
                ...(rulesetForm ??
                  {
                    dice: { system: 'd100' as const },
                  }),
                allowPvp: !rulesetForm?.allowPvp,
              };
              setRulesetForm(next);
              setRulesetJson(JSON.stringify(next, null, 2));
            }}
            style={[
              styles.switch,
              rulesetForm?.allowPvp && styles.switchOn,
            ]}
          >
            <View
              style={[
                styles.switchKnob,
                rulesetForm?.allowPvp && styles.switchKnobOn,
              ]}
            />
            <Text
              style={[
                styles.switchText,
                rulesetForm?.allowPvp && styles.switchTextOn,
              ]}
            >
              PVP：{rulesetForm?.allowPvp ? '开启' : '关闭'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              const next: RuleSet = {
                ...(rulesetForm ??
                  {
                    dice: { system: 'd100' as const },
                  }),
                autoJudge: !rulesetForm?.autoJudge,
              };
              setRulesetForm(next);
              setRulesetJson(JSON.stringify(next, null, 2));
            }}
            style={[
              styles.switch,
              rulesetForm?.autoJudge && styles.switchOn,
            ]}
          >
            <View
              style={[
                styles.switchKnob,
                rulesetForm?.autoJudge && styles.switchKnobOn,
              ]}
            />
            <Text
              style={[
                styles.switchText,
                rulesetForm?.autoJudge && styles.switchTextOn,
              ]}
            >
              自动判定：{rulesetForm?.autoJudge ? '开启' : '关闭'}
            </Text>
          </Pressable>
        </View>

        <Text style={[styles.label, { marginTop: 10 }]}>rulesetJson（可直接编辑）</Text>
        <TextInput
          value={rulesetJson}
          onChangeText={(v) => {
            setRulesetJson(v);
            const parsed = parseRuleSet(v);
            if (parsed.ok) {
              setRulesetForm(parsed.value);
            }
          }}
          style={[styles.input, styles.textarea]}
          multiline
        />
        {rulesetForm && (
          <Text style={[styles.muted, { marginTop: 4 }]}>
            预览：{formatRuleSetHumanReadable(rulesetForm)}
          </Text>
        )}
      </View>

      <Pressable onPress={onSave} disabled={!canSubmit || projects.loading} style={[styles.btn, (!canSubmit || projects.loading) && { opacity: 0.6 }]}>
        <Text style={styles.btnText}>{projects.loading ? '保存中…' : '保存（mock）'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F8FA' },
  content: { padding: 16, paddingBottom: 28, gap: 10 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  h: { fontSize: 18, fontWeight: '900', color: '#111827' },
  sub: { marginTop: 6, color: '#6B7280', fontSize: 12 },
  label: { marginTop: 8, fontWeight: '900', color: '#111827' },
  input: { minHeight: 44, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: '#EEF1F4', paddingHorizontal: 12, paddingVertical: 10 },
  textarea: { minHeight: 96, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  pill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: '#EEF1F4' },
  pillOn: { backgroundColor: '#111827' },
  pillText: { fontWeight: '900', color: '#111827', fontSize: 12 },
  pillTextOn: { color: '#fff' },
  btn: { minHeight: 46, borderRadius: 14, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontWeight: '900' },

  section: { marginTop: 10 },
  sectionTitle: { fontWeight: '900', color: '#111827', marginBottom: 6 },
  muted: { color: '#6B7280', fontSize: 12, lineHeight: 16, marginBottom: 8 },
  link: { color: '#2563EB', fontWeight: '900', fontSize: 12 },
  moduleCard: { gap: 8, paddingVertical: 8 },
  moduleTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  moduleTitle: { fontWeight: '900', color: '#111827' },
  smallBtn: { height: 32, borderRadius: 999, backgroundColor: '#111827', paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  smallBtnText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  ghostBtn: { height: 38, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: '#111827', alignItems: 'center', justifyContent: 'center' },
  ghostBtnText: { color: '#111827', fontWeight: '900', fontSize: 12 },
  multiRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  switch: {
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  switchOn: {
    borderColor: '#2563EB',
    backgroundColor: '#DBEAFE',
  },
  switchKnob: { width: 14, height: 14, borderRadius: 999, backgroundColor: '#9CA3AF' },
  switchKnobOn: { backgroundColor: '#2563EB' },
  switchText: { fontSize: 12, color: '#4B5563', fontWeight: '800' },
  switchTextOn: { color: '#1D4ED8' },
  npcCard: { marginTop: 10, gap: 10, backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#EEF1F4', padding: 12 },
});

