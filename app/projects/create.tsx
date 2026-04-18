import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { toast } from '@/src/components/toast';
import type { NpcCard, Project, ProjectHomeModule, ProjectStatus, RuleSet, Task, Worldbuilding } from '@/src/models/types';
import { PROJECT_STATUSES } from '@/src/services/mockData';
import { formatRuleSetHumanReadable, parseRuleSet } from '@/src/utils/ruleset';
import { useProjectsStore } from '@/src/stores/projectsStore';
import { useSessionStore } from '@/src/stores/sessionStore';

const DEFAULT_MODULES: ProjectHomeModule[] = [
  { key: 'background', title: '背景设定', content: '', order: 1, enabled: true },
  { key: 'theme', title: '主旨', content: '', order: 2, enabled: true },
  { key: 'mainline', title: '主线', content: '', order: 3, enabled: true },
  { key: 'sideline', title: '支线', content: '', order: 4, enabled: true },
  { key: 'gameplay', title: '玩法', content: '', order: 5, enabled: true },
  { key: 'characterRequirements', title: '人设要求', content: '', order: 6, enabled: true },
  { key: 'rules', title: '规则', content: '', order: 7, enabled: true },
];

export default function ProjectCreatePage() {
  const router = useRouter();
  const projects = useProjectsStore();
  const { user } = useSessionStore();

  const organizerName = useMemo(() => user?.nickname ?? '绘梦岛企划组', [user?.nickname]);
  const ownerUserId = useMemo(() => user?.id ?? 'u_demo', [user?.id]);

  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('招募中');
  const [summary, setSummary] = useState('');
  const [worldview, setWorldview] = useState('');
  const [rules, setRules] = useState('');
  const [recruitRequirements, setRecruitRequirements] = useState('');
  const [tagsText, setTagsText] = useState('官方,共创');
  const [memberLimitText, setMemberLimitText] = useState('100');

  // M2: homepage/worldbuilding/npc/ruleset
  const [modules, setModules] = useState<ProjectHomeModule[]>(DEFAULT_MODULES);
  const [worldDoc, setWorldDoc] = useState('');
  const [npcs, setNpcs] = useState<NpcCard[]>([]);
  const [rulesetJson, setRulesetJson] = useState('{\n  \"dice\": { \"system\": \"d100\" },\n  \"cooldownSeconds\": 0,\n  \"allowPvp\": false,\n  \"autoJudge\": false\n}');
  const [rulesetForm, setRulesetForm] = useState<RuleSet | null>(() => {
    const parsed = parseRuleSet('{\n  \"dice\": { \"system\": \"d100\" },\n  \"cooldownSeconds\": 0,\n  \"allowPvp\": false,\n  \"autoJudge\": false\n}');
    return parsed.ok ? parsed.value : null;
  });

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
        const items = (m.content ?? '')
          .split('\n')
          .map((x) => x.trimEnd());
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

  const onAddNpc = () =>
    setNpcs((prev) => [
      ...prev,
      { id: `npc_${Date.now()}`, name: '', gender: '', extraAttributes: [] },
    ]);

  const onUpdateNpc = (id: string, patch: Partial<NpcCard>) => setNpcs((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  const onRemoveNpc = (id: string) => setNpcs((prev) => prev.filter((n) => n.id !== id));

  const syncRulesetJsonFromForm = (next: RuleSet | null) => {
    if (!next) return;
    const obj: any = {
      dice: {
        system: next.dice.system,
      },
    };
    if (next.dice.system === 'custom' && next.dice.expression) {
      obj.dice.expression = next.dice.expression;
    }
    if (typeof next.cooldownSeconds === 'number') {
      obj.cooldownSeconds = next.cooldownSeconds;
    }
    if (typeof next.allowPvp === 'boolean') {
      obj.allowPvp = next.allowPvp;
    }
    if (typeof next.autoJudge === 'boolean') {
      obj.autoJudge = next.autoJudge;
    }
    setRulesetJson(JSON.stringify(obj, null, 2));
  };

  const onSubmit = async () => {
    if (!canSubmit) return toast('请至少填写标题（≥2字）');

    // Validate rulesetJson 通过 M3 解析器，保证 schema 合法
    const parsed = parseRuleSet(rulesetJson);
    if (!parsed.ok) {
      return toast(`规则配置格式不合法：${parsed.error}`);
    }

    const now = new Date().toISOString();
    const pidPlaceholder = `p_tmp_${Date.now()}`;
    const tasks: Task[] = [
      { id: `t_${pidPlaceholder}_main_1`, projectId: pidPlaceholder, title: '主线任务 1（mock）', description: '占位任务', isMainline: true, order: 1 },
      { id: `t_${pidPlaceholder}_side_1`, projectId: pidPlaceholder, title: '支线任务（mock）', description: '占位任务', isMainline: false, order: 2 },
    ];

    const worldbuilding: Worldbuilding = { doc: worldDoc.trim() || '（未填写世界观文档）', maps: [] };
    const homepageModules = modules.map((m, i) => ({ ...m, order: i + 1 }));

    const payload: Omit<Project, 'id'> = {
      title: title.trim(),
      coverUrl: undefined,
      organizerName,
      ownerUserId,
      adminUserIds: [ownerUserId],
      status,
      membersCount: 0,
      tags,
      summary: summary.trim() || '（未填写简介）',
      worldview: worldview.trim() || '（未填写世界观）',
      rules: rules.trim() || '（未填写规则）',
      recruitRequirements: recruitRequirements.trim() || '（未填写招募要求）',
      memberLimit,
      timeline: [{ title: '创建', at: now }],
      tasks,

      homepageModules,
      worldbuilding,
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
    };

    const created = await projects.createProject(payload);

    // Fix placeholder projectId inside tasks
    await projects.updateProject(created.id, {
      tasks: created.tasks.map((t, i) => ({ ...t, id: `t_${created.id}_${t.isMainline ? 'main' : 'side'}_${i + 1}`, projectId: created.id })),
    });

    toast('创建成功（mockDb 持久化）');
    router.replace(`/projects/${created.id}` as any);
  };

  return (
    <ScrollView style={styles.safe} contentContainerStyle={styles.content}>
      <Text style={styles.h}>创建企划（M2 完整表单）</Text>
      <Text style={styles.sub}>已接入本地 mockDb：创建/编辑/报名/审核/公告/相册均可持久化。</Text>

      <Text style={styles.label}>标题 *</Text>
      <TextInput value={title} onChangeText={setTitle} style={styles.input} placeholder="企划标题" />

      <Text style={styles.label}>状态（枚举固定）</Text>
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
      <TextInput value={memberLimitText} onChangeText={setMemberLimitText} style={styles.input} keyboardType="number-pad" placeholder="例如：100" />

      <Text style={styles.label}>简介</Text>
      <TextInput value={summary} onChangeText={setSummary} style={[styles.input, styles.textarea]} multiline placeholder="一句话介绍你的企划" />

      <Text style={styles.label}>世界观（快速字段）</Text>
      <TextInput value={worldview} onChangeText={setWorldview} style={[styles.input, styles.textarea]} multiline placeholder="世界观简介（用于列表/概览）" />

      <Text style={styles.label}>规则（快速字段）</Text>
      <TextInput value={rules} onChangeText={setRules} style={[styles.input, styles.textarea]} multiline placeholder="规则简介（用于详情页快速展示）" />

      <Text style={styles.label}>招募要求</Text>
      <TextInput value={recruitRequirements} onChangeText={setRecruitRequirements} style={[styles.input, styles.textarea]} multiline placeholder="人设/参与要求" />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>主页模板模块（M2）</Text>
        <Text style={styles.muted}>支持启用/禁用与顺序调整；内容先用纯文本（后续可换富文本）。</Text>
        {modules.map((m) => (
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
                placeholder={`填写「${m.title}」内容`}
              />
            )}
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>世界观文档（M2）</Text>
        <TextInput value={worldDoc} onChangeText={setWorldDoc} style={[styles.input, styles.textarea]} multiline placeholder="世界观长文档（worldbuilding.doc）" />
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
                  style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}
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
        <Text style={styles.muted}>
          通过表单配置掷骰 / 冷却 / PVP / 自动判定，系统会自动生成合法的 rulesetJson。也可以直接编辑 JSON 字符串。
        </Text>

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
                  syncRulesetJsonFromForm(next);
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
                syncRulesetJsonFromForm(next);
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
            syncRulesetJsonFromForm(next);
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
              syncRulesetJsonFromForm(next);
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
              syncRulesetJsonFromForm(next);
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
          placeholder="{ ... }"
        />
        {rulesetForm && (
          <Text style={[styles.muted, { marginTop: 4 }]}>
            预览：{formatRuleSetHumanReadable(rulesetForm)}
          </Text>
        )}
      </View>

      <Pressable onPress={onSubmit} disabled={!canSubmit || projects.loading} style={[styles.btn, (!canSubmit || projects.loading) && { opacity: 0.6 }]}>
        <Text style={styles.btnText}>{projects.loading ? '发布中…' : '发布（mock）'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F8FA' },
  content: { padding: 16, paddingBottom: 28, gap: 10 },
  h: { fontSize: 18, fontWeight: '900', color: '#111827' },
  sub: { color: '#6B7280', fontSize: 12, lineHeight: 16 },
  label: { marginTop: 8, fontWeight: '900', color: '#111827' },
  input: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EEF1F4',
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
  },
  textarea: { minHeight: 96, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  pill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: '#EEF1F4' },
  pillOn: { backgroundColor: '#111827' },
  pillText: { fontWeight: '900', color: '#111827', fontSize: 12 },
  pillTextOn: { color: '#fff' },
  btn: { height: 46, borderRadius: 14, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontWeight: '900' },

  section: { marginTop: 10, backgroundColor: '#F7F8FA' },
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

