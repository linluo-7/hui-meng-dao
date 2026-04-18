import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { StatusPill } from '@/src/components/StatusPill';
import { Tag } from '@/src/components/Tag';
import { toast } from '@/src/components/toast';
import type { Album, AlbumItem, Announcement, Application, NpcCard, Project, ProjectHomeModule, Work } from '@/src/models/types';
import { useProjectsStore } from '@/src/stores/projectsStore';
import { useSessionStore } from '@/src/stores/sessionStore';
import { useTasksStore } from '@/src/stores/tasksStore';
import { useWorksStore } from '@/src/stores/worksStore';
import { formatRuleSetHumanReadable, parseRuleSet } from '@/src/utils/ruleset';

type AlbumUiState = {
  expanded: boolean;
  items: AlbumItem[];
  loading: boolean;
  newImageUrl: string;
  newCaption: string;
  likedIds: string[]; // 当前登录用户已点赞的图片（仅本地 UI，用于 toggle）
};

export default function ProjectDetailPage() {
  const router = useRouter();
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const pid = String(projectId ?? '');

  const { user } = useSessionStore();
  const applicantUserId = user?.id ?? 'u_demo';

  const projects = useProjectsStore();
  const worksStore = useWorksStore();
  const tasksStore = useTasksStore();

  const [project, setProject] = useState<Project | null>(null);
  const [apps, setApps] = useState<Application[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [albumUi, setAlbumUi] = useState<Record<string, AlbumUiState>>({});
  const [repLow, setRepLow] = useState(false);

  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');

  const myTaskProgress = tasksStore.myProgress;
  const taskSummaries = tasksStore.summaries;

  const myApp = useMemo(() => apps.find((a) => a.applicantUserId === applicantUserId), [apps, applicantUserId]);

  const applyBtnText = useMemo(() => {
    if (!myApp) return '申请加入';
    if (myApp.status === 'submitted' || myApp.status === 'reviewing') return '已提交（审核中）';
    if (myApp.status === 'approved') return '已通过';
    if (myApp.status === 'rejected') return '未通过（可重投）';
    return '申请加入';
  }, [myApp]);

  const load = async () => {
    if (!pid) return;
    const [p, listApps, listAnns, listAlbums, rep] = await Promise.all([
      projects.getProject(pid),
      projects.listApplications(pid),
      projects.listAnnouncements(pid),
      projects.listAlbums(pid),
      projects.getReputation(pid, applicantUserId),
    ]);
    setProject(p);
    setApps(listApps);
    setAnnouncements(listAnns);
    setAlbums(listAlbums);
    setRepLow(rep.lowScoreMarked || rep.score < 40);

    // Keep album UI entries in sync
    setAlbumUi((prev) => {
      const next: Record<string, AlbumUiState> = { ...prev };
      for (const al of listAlbums) {
        if (!next[al.id]) {
          next[al.id] = {
            expanded: false,
            items: [],
            loading: false,
            newImageUrl: '',
            newCaption: '',
            likedIds: [],
          };
        }
      }
      return next;
    });

    await Promise.all([
      worksStore.refresh({ projectId: pid }),
      tasksStore.listMyTaskProgress(pid, applicantUserId),
      tasksStore.summarizeTaskProgress(pid),
    ]);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pid]);

  const works: Work[] = worksStore.items;

  const homepageModules: ProjectHomeModule[] = useMemo(() => {
    const raw = project?.homepageModules ?? [];
    return [...raw].sort((a, b) => a.order - b.order);
  }, [project?.homepageModules]);

  const worldDoc = project?.worldbuilding?.doc ?? '';
  const npcs: NpcCard[] = project?.npcs ?? [];
  const rulesetJson = project?.rulesetJson ?? '';
  const parsedRuleset = useMemo(() => parseRuleSet(rulesetJson), [rulesetJson]);

  const isAdmin = useMemo(() => {
    if (!user || !project) return false;
    const admins = project.adminUserIds ?? [];
    return project.ownerUserId === user.id || admins.includes(user.id);
  }, [project, user]);

  const getTaskStatusLabel = (taskId: string): string => {
    const s = myTaskProgress[taskId]?.status;
    if (!s || s === 'todo') return '标记完成';
    if (s === 'doing') return '进行中';
    return '已完成';
  };

  const getTaskStatusNext = (taskId: string): 'todo' | 'doing' | 'done' => {
    const s = myTaskProgress[taskId]?.status;
    if (!s || s === 'todo') return 'done';
    if (s === 'doing') return 'done';
    return 'todo';
  };

  const onToggleTask = async (taskId: string) => {
    if (!project) return;
    if (!user) {
      toast('请先登录后再标记任务进度（mock）');
      return;
    }
    const next = getTaskStatusNext(taskId);
    await tasksStore.updateMyTaskProgress(project.id, taskId, user.id, next);
    await tasksStore.summarizeTaskProgress(project.id);
  };

  const totalTasksCount = project?.tasks?.length ?? 0;
  const doneForMeCount = project?.tasks?.filter((t) => myTaskProgress[t.id]?.status === 'done').length ?? 0;

  const onApply = () => {
    if (!project) return;
    if (repLow) {
      toast('信誉分过低，暂无法报名（mock 软限制）');
      return;
    }
    if (project.membersCount >= project.memberLimit) {
      toast('已满员，报名已关闭（mock）');
      return;
    }

    // M3：跳转到独立报名页，由报名页按模板动态渲染
    if (!myApp || myApp.status === 'rejected') {
      router.push(`/projects/apply/${project.id}` as any);
      return;
    }

    toast('你已提交报名，请等待审核');
  };

  const onCreateAnnouncement = async () => {
    if (!isAdmin) return toast('无权限：仅管理员可以发布公告');
    if (!pid) return;
    if (!annTitle.trim()) return toast('请输入公告标题');
    await projects.createAnnouncement(pid, { title: annTitle.trim(), content: annContent.trim() });
    setAnnTitle('');
    setAnnContent('');
    toast('已发布公告（mock）');
    setAnnouncements(await projects.listAnnouncements(pid));
  };

  const onPin = async (a: Announcement) => {
    if (!isAdmin) return toast('无权限：仅管理员可以置顶公告');
    await projects.pinAnnouncement(a.projectId, a.id, !a.isPinned);
    setAnnouncements(await projects.listAnnouncements(a.projectId));
  };

  const onCreateAlbum = async () => {
    if (!isAdmin) return toast('无权限：仅管理员可以创建相册');
    if (!pid) return;
    const album = await projects.createAlbum(pid, { name: `相册${albums.length + 1}` });
    toast('已创建相册（mock）');
    setAlbums([album, ...albums]);
    setAlbumUi((prev) => ({ ...prev, [album.id]: { expanded: false, items: [], loading: false, newImageUrl: '', newCaption: '' } }));
  };

  const toggleAlbum = async (albumId: string) => {
    const st = albumUi[albumId];
    const nextExpanded = !st?.expanded;
    setAlbumUi((prev) => ({
      ...prev,
      [albumId]: {
        ...(prev[albumId] ?? {
          expanded: false,
          items: [],
          loading: false,
          newImageUrl: '',
          newCaption: '',
          likedIds: [],
        }),
        expanded: nextExpanded,
      },
    }));
    if (nextExpanded) {
      setAlbumUi((prev) => ({ ...prev, [albumId]: { ...prev[albumId], loading: true } }));
      const items = await projects.listAlbumItems(albumId);
      setAlbumUi((prev) => ({ ...prev, [albumId]: { ...prev[albumId], items, loading: false } }));
    }
  };

  const addAlbumItem = async (albumId: string) => {
    if (!isAdmin) return toast('无权限：仅管理员可以添加图片');
    const st = albumUi[albumId];
    const imageUrl = st?.newImageUrl?.trim();
    if (!imageUrl) return toast('请输入图片 URL（本地可先填任意字符串）');
    const caption = st?.newCaption?.trim();
    await projects.addAlbumItem(albumId, { imageUrl, caption });
    const items = await projects.listAlbumItems(albumId);
    setAlbumUi((prev) => ({
      ...prev,
      [albumId]: { ...prev[albumId], items, newImageUrl: '', newCaption: '' },
    }));
    toast('已添加图片（mock）');
  };

  const likeAlbumItem = async (albumId: string, albumItemId: string) => {
    const st = albumUi[albumId];
    const likedIds = st?.likedIds ?? [];
    const hasLiked = likedIds.includes(albumItemId);

    // 由于后端是 mock，这里只在前端做可见的 +1/-1，刷新后会回到后端计数
    setAlbumUi((prev) => {
      const cur = prev[albumId];
      if (!cur) return prev;
      const nextLiked = hasLiked ? likedIds.filter((id) => id !== albumItemId) : [...likedIds, albumItemId];
      const nextItems = cur.items.map((it) =>
        it.id === albumItemId ? { ...it, likes: it.likes + (hasLiked ? -1 : 1) } : it,
      );
      return {
        ...prev,
        [albumId]: {
          ...cur,
          likedIds: nextLiked,
          items: nextItems,
        },
      };
    });
  };

  if (!project) {
    return (
      <View style={styles.loading}>
        <Text style={{ color: '#6B7280' }}>加载中…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.safe} contentContainerStyle={styles.content}>
      <View style={styles.head}>
        <Text style={styles.title}>{project.title}</Text>
        <StatusPill status={project.status} />
        <Text style={styles.meta}>
          主办方：{project.organizerName} · 参与 {project.membersCount}/{project.memberLimit}
        </Text>
        <View style={styles.tags}>
          {project.tags.map((t) => (
            <Tag key={t} label={t} />
          ))}
        </View>

        {repLow && (
          <View style={styles.warn}>
            <Text style={styles.warnText}>⚠️ 信誉分偏低：报名入口已限制（mock）</Text>
          </View>
        )}
      </View>

      <Section title="主页模块（M2）">
        {homepageModules.length === 0 ? (
          <Text style={styles.muted}>暂无模块</Text>
        ) : (
          homepageModules
            .filter((m) => m.enabled)
            .map((m) => (
              <View key={m.key} style={styles.moduleBlock}>
                <Text style={styles.moduleTitle}>{m.title}</Text>
                {m.key === 'mainline' || m.key === 'sideline' ? (
                  (() => {
                    const items = (m.content || '')
                      .split('\n')
                      .map((s) => s.trim())
                      .filter(Boolean);
                    if (items.length === 0) return <Text style={styles.sectionText}>（未填写）</Text>;
                    return (
                      <View style={styles.tags}>
                        {items.map((it, idx) => (
                          <Tag key={`${m.key}_${idx}`} label={it} />
                        ))}
                      </View>
                    );
                  })()
                ) : (
                  <Text style={styles.sectionText}>{m.content || '（未填写）'}</Text>
                )}
              </View>
            ))
        )}
        {isAdmin ? (
          <Pressable onPress={() => router.push(`/projects/edit/${project.id}` as any)} style={styles.inlineBtn}>
            <Text style={styles.inlineBtnText}>去编辑模块 →</Text>
          </Pressable>
        ) : (
          <Text style={styles.muted}>仅管理员可编辑企划内容</Text>
        )}
      </Section>

      <Section title="世界观（快速字段）">{project.worldview}</Section>
      <Section title="规则（快速字段）">{project.rules}</Section>
      <Section title="招募要求">{project.recruitRequirements}</Section>

      <Section title="世界观文档（M2）">
        <Text style={styles.sectionText}>{worldDoc || '（未填写）'}</Text>
      </Section>

      <Section title={`NPC 档案（${npcs.length}）`}>
        {npcs.length === 0 ? (
          <Text style={styles.muted}>暂无 NPC</Text>
        ) : (
          npcs.slice(0, 8).map((n) => (
            <View key={n.id} style={styles.npcRow}>
              <Text style={styles.npcName}>{n.name}</Text>
              <Text style={styles.npcMeta}>{n.gender ? `性别：${n.gender}` : '（性别未填写）'}</Text>
              {n.extraAttributes?.length ? (
                <View style={[styles.tags, { marginTop: 8 }]}>
                  {n.extraAttributes.map((a, idx) => (
                    <Tag
                      key={`${n.id}_${a.key}_${idx}`}
                      label={`${a.key}：${a.value}`}
                    />
                  ))}
                </View>
              ) : null}
            </View>
          ))
        )}
        {npcs.length > 8 && <Text style={styles.muted}>仅展示前 8 条</Text>}
      </Section>

      <Section title="规则配置（rulesetJson）">
        {rulesetJson ? (
          <>
            {parsedRuleset.ok ? (
              <Text style={styles.sectionText}>
                {formatRuleSetHumanReadable(parsedRuleset.value)}
              </Text>
            ) : (
              <Text style={[styles.sectionText, { color: '#DC2626' }]}>
                规则配置格式有误：{parsedRuleset.error}
              </Text>
            )}
            <Text
              style={[
                styles.sectionText,
                { fontFamily: 'monospace', marginTop: 8 },
              ]}
            >
              {rulesetJson}
            </Text>
          </>
        ) : (
          <Text style={styles.sectionText}>（未配置）</Text>
        )}
      </Section>

      <Section title="时间轴">
        {project.timeline.map((x) => (
          <Text key={x.title} style={styles.listItem}>
            - {x.title}
          </Text>
        ))}
      </Section>

      <Section title="任务列表（mock）">
        {/* 参与度概览：当前用户完成数 / 总任务数 */}
        {totalTasksCount > 0 && (
          <Text style={[styles.muted, { marginBottom: 6 }]}>
            我的完成度：已完成 {doneForMeCount} / 总任务数 {totalTasksCount}
          </Text>
        )}
        {project.tasks.map((t) => {
          const status = myTaskProgress[t.id]?.status ?? 'todo';
          const summary = taskSummaries.find((s) => s.taskId === t.id);
          const doneCount = summary?.doneCount ?? 0;
          const totalCount = summary?.totalCount ?? 0;
          return (
            <View key={t.id} style={styles.taskRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.taskTitle}>
                  {t.isMainline ? '主线' : '支线'} · {t.title}
                </Text>
                <Text style={styles.taskMeta}>
                  完成玩家：{doneCount}/{Math.max(totalCount, 1)}
                </Text>
              </View>
              <Pressable
                onPress={() => onToggleTask(t.id)}
                style={[
                  styles.taskBtn,
                  status === 'done' && styles.taskBtnDone,
                ]}
              >
                <Text
                  style={[
                    styles.taskBtnText,
                    status === 'done' && styles.taskBtnTextDone,
                  ]}
                >
                  {getTaskStatusLabel(t.id)}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </Section>

      <Section title={`作品画廊（${works.length}）`}>
        {works.length === 0 ? (
          <Text style={styles.muted}>暂无作品（mock）</Text>
        ) : (
          works.slice(0, 6).map((w) => (
            <Pressable key={w.id} onPress={() => router.push(`/works/${w.id}` as any)} style={({ pressed }) => [styles.workRow, pressed && { opacity: 0.92 }]}>
              <Text style={styles.workTitle}>{w.title}</Text>
              <Text style={styles.workMeta}>❤ {w.likes} · 💬 {w.commentsCount}</Text>
            </Pressable>
          ))
        )}
        {works.length > 6 && <Text style={styles.muted}>仅展示前 6 条（mock）</Text>}
      </Section>

      <Section title="公告板（mock）">
        {isAdmin ? (
          <>
            <View style={styles.formRow}>
              <TextInput value={annTitle} onChangeText={setAnnTitle} placeholder="公告标题" style={styles.input} />
            </View>
            <View style={styles.formRow}>
              <TextInput value={annContent} onChangeText={setAnnContent} placeholder="公告内容" style={[styles.input, styles.textarea]} multiline />
            </View>
            <Pressable onPress={onCreateAnnouncement} style={styles.primaryBtn}>
              <Text style={styles.primaryBtnText}>发布公告</Text>
            </Pressable>
          </>
        ) : (
          <Text style={styles.muted}>仅管理员可发布公告</Text>
        )}

        <View style={{ marginTop: 10, gap: 10 }}>
          {announcements.length === 0 ? (
            <Text style={styles.muted}>暂无公告</Text>
          ) : (
            announcements.slice(0, 6).map((a) => (
              <View key={a.id} style={styles.annCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                  <Text style={styles.annTitle} numberOfLines={1}>
                    {a.isPinned ? '📌 ' : ''}
                    {a.title}
                  </Text>
                  <Pressable onPress={() => onPin(a)} hitSlop={8}>
                    <Text style={{ color: isAdmin ? '#2563EB' : '#9CA3AF', fontWeight: '900' }}>
                      {a.isPinned ? '取消置顶' : '置顶'}
                    </Text>
                  </Pressable>
                </View>
                <Text style={styles.annContent} numberOfLines={3}>
                  {a.content || '（无内容）'}
                </Text>
              </View>
            ))
          )}
        </View>
      </Section>

      <Section title="相册（mock，可加图/点赞）">
        {isAdmin ? (
          <Pressable onPress={onCreateAlbum} style={styles.ghostBtn}>
            <Text style={styles.ghostBtnText}>+ 创建相册</Text>
          </Pressable>
        ) : (
          <Text style={styles.muted}>仅管理员可创建相册与添加图片</Text>
        )}

        <View style={{ marginTop: 10, gap: 10 }}>
          {albums.length === 0 ? (
            <Text style={styles.muted}>暂无相册</Text>
          ) : (
            albums.slice(0, 6).map((al) => {
              const st =
                albumUi[al.id] ?? {
                  expanded: false,
                  items: [],
                  loading: false,
                  newImageUrl: '',
                  newCaption: '',
                  likedIds: [],
                };
              return (
                <View key={al.id} style={styles.albumCard}>
                  <Pressable onPress={() => toggleAlbum(al.id)} style={({ pressed }) => [styles.albumHead, pressed && { opacity: 0.92 }]}>
                    <Text style={styles.albumTitle}>{al.name}</Text>
                    <Text style={styles.muted}>{st.expanded ? '收起' : '展开'}</Text>
                  </Pressable>

                  {st.expanded && (
                    <View style={{ marginTop: 10, gap: 10 }}>
                      {isAdmin ? (
                        <>
                          <TextInput
                            value={st.newImageUrl}
                            onChangeText={(v) => setAlbumUi((prev) => ({ ...prev, [al.id]: { ...prev[al.id], newImageUrl: v } }))}
                            placeholder="图片 URL（mock）"
                            style={styles.input}
                          />
                          <TextInput
                            value={st.newCaption}
                            onChangeText={(v) => setAlbumUi((prev) => ({ ...prev, [al.id]: { ...prev[al.id], newCaption: v } }))}
                            placeholder="描述（可选）"
                            style={styles.input}
                          />
                          <Pressable onPress={() => addAlbumItem(al.id)} style={styles.primaryBtn}>
                            <Text style={styles.primaryBtnText}>添加图片</Text>
                          </Pressable>
                        </>
                      ) : (
                        <Text style={styles.muted}>仅管理员可添加图片</Text>
                      )}

                      {st.loading ? (
                        <Text style={styles.muted}>加载中…</Text>
                      ) : st.items.length === 0 ? (
                        <Text style={styles.muted}>暂无图片</Text>
                      ) : (
                        st.items.slice(0, 6).map((it) => (
                          <View key={it.id} style={styles.albumItem}>
                            <Text style={styles.albumItemTitle} numberOfLines={1}>
                              {it.caption || it.imageUrl}
                            </Text>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Text style={styles.muted}>❤ {it.likes}</Text>
                              <Pressable onPress={() => likeAlbumItem(al.id, it.id)} hitSlop={8}>
                                <Text style={{ color: '#2563EB', fontWeight: '900' }}>点赞</Text>
                              </Pressable>
                            </View>
                          </View>
                        ))
                      )}
                      {st.items.length > 6 && <Text style={styles.muted}>仅展示前 6 条</Text>}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      </Section>

      <View style={styles.actions}>
        <Pressable onPress={onApply} style={[styles.btn, repLow && { backgroundColor: '#9CA3AF' }]}>
          <Text style={styles.btnText}>{applyBtnText}</Text>
        </Pressable>

        {/* 管理入口：仅管理员可见 */}
        {isAdmin && (
          <Pressable
            onPress={() => router.push(`/projects/admin/${project.id}` as any)}
            style={[styles.btn, styles.btnGhost]}
          >
            <Text style={[styles.btnText, styles.btnGhostText]}>进入企划后台</Text>
          </Pressable>
        )}

        {isAdmin && (
          <Pressable onPress={() => router.push(`/projects/review/${project.id}` as any)} style={[styles.btn, styles.btnGhost]}>
            <Text style={[styles.btnText, styles.btnGhostText]}>进入审核页</Text>
          </Pressable>
        )}

        {isAdmin && (
          <Pressable onPress={() => router.push(`/projects/edit/${project.id}` as any)} style={[styles.btn, styles.btnGhost]}>
            <Text style={[styles.btnText, styles.btnGhostText]}>编辑企划</Text>
          </Pressable>
        )}

        <Pressable onPress={() => router.push(`/chat/rp/${project.id}` as any)} style={[styles.btn, styles.btnGhost]}>
          <Text style={[styles.btnText, styles.btnGhostText]}>进入戏群</Text>
        </Pressable>
        <Pressable onPress={() => router.push(`/chat/water/${project.id}` as any)} style={[styles.btn, styles.btnGhost]}>
          <Text style={[styles.btnText, styles.btnGhostText]}>进入水群</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {typeof children === 'string' ? <Text style={styles.sectionText}>{children}</Text> : children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F8FA' },
  content: { padding: 16, paddingBottom: 28 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  head: { backgroundColor: '#fff', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: '#EEF1F4', gap: 10 },
  title: { fontSize: 18, fontWeight: '900', color: '#111827' },
  meta: { color: '#6B7280', fontSize: 12 },
  tags: { flexDirection: 'row', flexWrap: 'wrap' },
  warn: { backgroundColor: '#FEF3C7', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#FDE68A' },
  warnText: { color: '#92400E', fontWeight: '800', fontSize: 12 },

  section: { marginTop: 12, backgroundColor: '#fff', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: '#EEF1F4' },
  sectionTitle: { fontWeight: '900', color: '#111827', marginBottom: 8 },
  sectionText: { color: '#4B5563', fontSize: 13, lineHeight: 18 },
  listItem: { color: '#4B5563', fontSize: 13, lineHeight: 18 },
  muted: { color: '#6B7280', fontSize: 12 },

  moduleBlock: { marginTop: 10 },
  moduleTitle: { fontWeight: '900', color: '#111827', marginBottom: 6 },
  inlineBtn: { marginTop: 10, alignSelf: 'flex-start' },
  inlineBtnText: { color: '#2563EB', fontWeight: '900' },

  npcRow: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  npcName: { fontWeight: '900', color: '#111827' },
  npcMeta: { marginTop: 6, color: '#6B7280', fontSize: 12 },

  actions: { marginTop: 14, gap: 10 },
  btn: { height: 46, borderRadius: 14, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontWeight: '900' },
  btnGhost: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#111827' },
  btnGhostText: { color: '#111827' },

  workRow: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#EEF2F7' },
  workTitle: { fontWeight: '900', color: '#111827' },
  workMeta: { marginTop: 6, color: '#6B7280', fontSize: 12 },

  formRow: { marginTop: 10 },
  input: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#EEF1F4', paddingHorizontal: 12, paddingVertical: 10, minHeight: 44 },
  textarea: { minHeight: 90, textAlignVertical: 'top' },
  primaryBtn: { marginTop: 10, minHeight: 44, borderRadius: 14, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '900' },
  annCard: { borderRadius: 16, borderWidth: 1, borderColor: '#EEF1F4', padding: 12, backgroundColor: '#fff' },
  annTitle: { fontWeight: '900', color: '#111827', flex: 1 },
  annContent: { marginTop: 8, color: '#4B5563', fontSize: 12, lineHeight: 16 },

  ghostBtn: { height: 42, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: '#111827', alignItems: 'center', justifyContent: 'center' },
  ghostBtnText: { color: '#111827', fontWeight: '900' },

  albumCard: { borderRadius: 16, borderWidth: 1, borderColor: '#EEF1F4', padding: 12, backgroundColor: '#fff' },
  albumHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  albumTitle: { fontWeight: '900', color: '#111827' },
  albumItem: { borderRadius: 14, borderWidth: 1, borderColor: '#EEF1F4', padding: 10, backgroundColor: '#fff' },
  albumItemTitle: { fontWeight: '800', color: '#111827' },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F7',
    gap: 10,
  },
  taskTitle: { fontWeight: '900', color: '#111827', fontSize: 13 },
  taskMeta: { marginTop: 4, color: '#6B7280', fontSize: 11 },
  taskBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#111827',
    backgroundColor: '#FFFFFF',
  },
  taskBtnDone: {
    borderColor: '#10B981',
    backgroundColor: '#D1FAE5',
  },
  taskBtnText: { fontSize: 12, color: '#111827', fontWeight: '700' },
  taskBtnTextDone: { color: '#047857' },
});

