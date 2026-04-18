import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { toast } from '@/src/components/toast';
import type { Application, Project, ProjectTodo } from '@/src/models/types';
import { useProjectsStore } from '@/src/stores/projectsStore';
import { useSessionStore } from '@/src/stores/sessionStore';

export default function ProjectAdminPage() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const pid = String(projectId ?? '');
  const router = useRouter();

  const projects = useProjectsStore();
  const { user } = useSessionStore();

  const [members, setMembers] = useState<Application[]>([]);
  const [todos, setTodos] = useState<ProjectTodo[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newAssignee, setNewAssignee] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [project, setProject] = useState<Project | null>(null);

  const isAdmin = useMemo(() => {
    if (!user || !project) return false;
    const admins = project.adminUserIds ?? [];
    return project.ownerUserId === user.id || admins.includes(user.id);
  }, [project, user]);

  const toggleAdmin = async (memberUserId: string) => {
    if (!project) return;
    if (!user) return;
    if (!isAdmin) return toast('无权限：仅管理员可操作');

    if (memberUserId === project.ownerUserId) {
      return toast('创建者账号不可取消管理员（mock）');
    }

    const admins = project.adminUserIds ?? [];
    const already = admins.includes(memberUserId);
    const nextAdmins = already ? admins.filter((id) => id !== memberUserId) : [...admins, memberUserId];
    const updated = await projects.updateProject(project.id, { adminUserIds: nextAdmins });
    if (!updated) {
      toast('更新失败（mock）');
      return;
    }
    setProject(updated);
    toast(already ? '已取消管理员（mock）' : '已设为管理员（mock）');
  };

  const memberOptions = useMemo(
    () =>
      members.map((m) => ({
        userId: m.applicantUserId,
        label: m.applicantUserId,
      })),
    [members],
  );

  const load = async () => {
    if (!pid) return;
    setLoading(true);
    try {
      const p = await projects.getProject(pid);
      setProject(p);

      if (!user) return;
      const admins = p.adminUserIds ?? [];
      const ok = p.ownerUserId === user.id || admins.includes(user.id);
      if (!ok) return;

      const [appsApproved, listTodos] = await Promise.all([
        projects.listApplications(pid, 'approved'),
        projects.listProjectTodos(pid),
      ]);
      setMembers(appsApproved);
      setTodos(listTodos);
    } catch (e) {
      console.error(e);
      toast('加载企划后台数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pid, user?.id]);

  if (!pid) {
    return (
      <ScrollView style={styles.safe} contentContainerStyle={styles.content}>
        <Text style={styles.h}>企划后台</Text>
        <Text style={styles.muted}>缺少 projectId</Text>
      </ScrollView>
    );
  }

  if (!loading && project && !isAdmin) {
    return (
      <ScrollView style={styles.safe} contentContainerStyle={styles.content}>
        <Text style={styles.h}>企划后台（无权限）</Text>
        <Text style={styles.muted}>无权限访问：仅企划管理员可以进入后台。</Text>
      </ScrollView>
    );
  }

  const onCreateTodo = async () => {
    const title = newTitle.trim();
    if (!pid || !title) {
      return toast('请先填写 TODO 标题');
    }
    try {
      const todo = await projects.createProjectTodo(pid, { title, assigneeUserId: newAssignee });
      setTodos((prev) => [todo, ...prev]);
      setNewTitle('');
      setNewAssignee(undefined);
      toast('已新增 TODO（mock）');
    } catch (e) {
      console.error(e);
      toast('新增 TODO 失败');
    }
  };

  const updateTodo = async (todoId: string, patch: Partial<ProjectTodo>) => {
    try {
      const updated = await projects.updateProjectTodo(todoId, patch);
      if (!updated) return;
      setTodos((prev) => prev.map((t) => (t.id === todoId ? updated : t)));
    } catch (e) {
      console.error(e);
      toast('更新 TODO 失败');
    }
  };

  const cycleStatus = (status: ProjectTodo['status']): ProjectTodo['status'] => {
    if (status === 'todo') return 'doing';
    if (status === 'doing') return 'done';
    return 'todo';
  };

  const getStatusLabel = (status: ProjectTodo['status']): string => {
    if (status === 'todo') return '待处理';
    if (status === 'doing') return '进行中';
    return '已完成';
  };

  return (
    <ScrollView style={styles.safe} contentContainerStyle={styles.content}>
      <Text style={styles.h}>企划后台（Collab Space v0 · mock）</Text>
      <Text style={styles.sub}>projectId = {pid}</Text>
      <Text style={[styles.sub, { marginTop: 4 }]}>
        本页仅为本地 mock 协作空间：成员与 TODO 数据存储在本机 AsyncStorage 中，方便演示简单分工。
      </Text>

      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>成员列表（已通过报名）</Text>
          <Pressable onPress={load} style={styles.refreshBtn}>
            <Text style={styles.refreshText}>{loading ? '刷新中…' : '刷新'}</Text>
          </Pressable>
        </View>
        {members.length === 0 ? (
          <Text style={styles.muted}>当前暂无已通过报名的成员。</Text>
        ) : (
          members.map((m) => (
            <View key={m.id} style={styles.memberRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.memberName}>{m.applicantUserId}</Text>
                <Text style={styles.memberMeta}>报名时间：{m.createdAt}</Text>
              </View>
              <Pressable
                onPress={() => toggleAdmin(m.applicantUserId)}
                style={styles.memberAction}
              >
                <Text style={styles.memberActionText}>
                  {(() => {
                    if (!project) return '设为管理员';
                    const admins = project.adminUserIds ?? [];
                    const already = admins.includes(m.applicantUserId);
                    if (m.applicantUserId === project.ownerUserId) return '创建者（管理员）';
                    return already ? '取消管理员' : '设为管理员';
                  })()}
                </Text>
              </Pressable>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>TODO / 分工列表（本地 mock）</Text>
        <Text style={styles.sub}>为企划组成员记录简单的任务与指派情况。</Text>

        <View style={styles.newTodoCard}>
          <Text style={styles.label}>TODO 标题</Text>
          <TextInput
            style={styles.input}
            value={newTitle}
            onChangeText={setNewTitle}
            placeholder="例如：整理第一幕 NPC 设定"
          />

          <Text style={[styles.label, { marginTop: 10 }]}>指派成员（可选）</Text>
          <View style={styles.assigneeRow}>
            <Pressable
              onPress={() => setNewAssignee(undefined)}
              style={[
                styles.assigneeChip,
                !newAssignee && styles.assigneeChipActive,
              ]}
            >
              <Text
                style={[
                  styles.assigneeChipText,
                  !newAssignee && styles.assigneeChipTextActive,
                ]}
              >
                未指派
              </Text>
            </Pressable>
            {memberOptions.map((m) => {
              const active = newAssignee === m.userId;
              return (
                <Pressable
                  key={m.userId}
                  onPress={() => setNewAssignee(m.userId)}
                  style={[
                    styles.assigneeChip,
                    active && styles.assigneeChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.assigneeChipText,
                      active && styles.assigneeChipTextActive,
                    ]}
                  >
                    {m.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable onPress={onCreateTodo} style={styles.createBtn}>
            <Text style={styles.createBtnText}>新增 TODO</Text>
          </Pressable>
        </View>

        {todos.length === 0 ? (
          <Text style={[styles.muted, { marginTop: 12 }]}>当前暂无 TODO，可以先添加一条。</Text>
        ) : (
          <View style={{ marginTop: 12, gap: 10 }}>
            {todos.map((t) => {
              const assigneeLabel =
                t.assigneeUserId ||
                '未指派';
              return (
                <View key={t.id} style={styles.todoCard}>
                  <Text style={styles.todoTitle}>{t.title}</Text>
                  <Text style={styles.todoMeta}>
                    指派：{assigneeLabel} · 更新时间：{t.updatedAt}
                  </Text>
                  <View style={styles.todoActionsRow}>
                    <Pressable
                      onPress={() =>
                        updateTodo(t.id, { status: cycleStatus(t.status) })
                      }
                      style={[
                        styles.statusChip,
                        t.status === 'done' && styles.statusChipDone,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusChipText,
                          t.status === 'done' && styles.statusChipTextDone,
                        ]}
                      >
                        {getStatusLabel(t.status)}
                      </Text>
                    </Pressable>

                    {memberOptions.length > 0 && (
                      <View style={styles.todoAssignRow}>
                        {memberOptions.map((m) => {
                          const active = t.assigneeUserId === m.userId;
                          return (
                            <Pressable
                              key={m.userId}
                              onPress={() =>
                                updateTodo(t.id, {
                                  assigneeUserId:
                                    active ? undefined : m.userId,
                                })
                              }
                              style={[
                                styles.assignChip,
                                active && styles.assignChipActive,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.assignChipText,
                                  active && styles.assignChipTextActive,
                                ]}
                              >
                                {m.label}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>快捷入口</Text>
        <View style={styles.linksRow}>
          <Pressable
            onPress={() =>
              router.push(`/projects/admin/form/${pid}` as any)
            }
            style={styles.linkBtn}
          >
            <Text style={styles.linkBtnText}>编辑报名表</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push(`/projects/review/${pid}` as any)}
            style={styles.linkBtn}
          >
            <Text style={styles.linkBtnText}>进入审核页</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F8FA' },
  content: { padding: 16, paddingBottom: 32 },
  h: { fontSize: 18, fontWeight: '900', color: '#111827' },
  sub: { marginTop: 6, color: '#6B7280', fontSize: 12 },
  section: {
    marginTop: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    padding: 14,
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#111827' },
  refreshBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
  },
  refreshText: { fontSize: 12, color: '#4B5563', fontWeight: '700' },
  muted: { color: '#6B7280', fontSize: 12 },
  memberRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  memberName: { fontWeight: '800', color: '#111827', fontSize: 13 },
  memberMeta: { marginTop: 4, color: '#6B7280', fontSize: 11 },
  memberAction: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2563EB',
    backgroundColor: '#DBEAFE',
  },
  memberActionText: { fontSize: 12, color: '#1D4ED8', fontWeight: '700' },
  newTodoCard: {
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    padding: 10,
  },
  label: { fontSize: 13, color: '#111827', fontWeight: '700' },
  input: {
    marginTop: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  assigneeRow: {
    marginTop: 6,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  assigneeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  assigneeChipActive: {
    borderColor: '#2563EB',
    backgroundColor: '#DBEAFE',
  },
  assigneeChipText: { fontSize: 12, color: '#4B5563' },
  assigneeChipTextActive: { color: '#1D4ED8', fontWeight: '700' },
  createBtn: {
    marginTop: 12,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createBtnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 13 },
  todoCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    padding: 12,
  },
  todoTitle: { fontSize: 13, fontWeight: '800', color: '#111827' },
  todoMeta: { marginTop: 4, color: '#6B7280', fontSize: 11 },
  todoActionsRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#111827',
    backgroundColor: '#FFFFFF',
  },
  statusChipDone: {
    borderColor: '#10B981',
    backgroundColor: '#D1FAE5',
  },
  statusChipText: { fontSize: 12, color: '#111827', fontWeight: '700' },
  statusChipTextDone: { color: '#047857' },
  todoAssignRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'flex-end',
    flex: 1,
  },
  assignChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  assignChipActive: {
    borderColor: '#2563EB',
    backgroundColor: '#DBEAFE',
  },
  assignChipText: { fontSize: 11, color: '#4B5563' },
  assignChipTextActive: { color: '#1D4ED8', fontWeight: '700' },
  linksRow: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  linkBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#111827',
    backgroundColor: '#FFFFFF',
  },
  linkBtnText: { fontSize: 12, color: '#111827', fontWeight: '800' },
});

