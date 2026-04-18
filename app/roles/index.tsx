import React, { useCallback, useEffect, useState } from 'react';
import { Dimensions, FlatList, Image, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { toast } from '@/src/components/toast';
import { useSessionStore } from '@/src/stores/sessionStore';
import { useRolesStore } from '@/src/stores/rolesStore';
import type { Role } from '@/src/models/types';

const { width: screenWidth } = Dimensions.get('window');
const COLUMN_GAP = 10;
const PADDING = 16;
const COLUMN_COUNT = 2;
const CARD_WIDTH = (screenWidth - PADDING * 2 - COLUMN_GAP) / COLUMN_COUNT;

export default function RolesPage() {
  const router = useRouter();
  const rolesStore = useRolesStore();
  const { user } = useSessionStore();

  useEffect(() => {
    rolesStore.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleRoles = rolesStore.items; // 显示所有公开角色

  const handlePress = useCallback((roleId: string) => {
    router.push(`/roles/${roleId}` as any);
  }, [router]);

  // 我的角色（仅用于编辑/删除）
  const myRoles = user ? rolesStore.items.filter((r) => r.ownerUserId === user.id) : [];

  const renderItem = useCallback(({ item }: { item: Role }) => {
    // 优先使用 coverImageUrl，否则从 attributes 中获取
    const coverImageUrl = item.coverImageUrl || (item.attributes as any)?.imageUrls?.[0];
    console.log('Role card:', item.id, 'name:', item.name, 'coverImageUrl:', coverImageUrl);
    const ratio = (item.attributes as any)?.coverAspectRatio || 1;
    const coverHeight = CARD_WIDTH / ratio;

    return (
      <Pressable
        onPress={() => handlePress(item.id)}
        style={({ pressed }) => [styles.card, { width: CARD_WIDTH }, pressed && { opacity: 0.92 }]}
      >
        <View style={[styles.cover, { height: coverHeight }]}>
          {coverImageUrl ? (
            <Image source={{ uri: coverImageUrl }} style={styles.coverImage} />
          ) : (
            <View style={styles.coverPlaceholder}>
              <Text style={{ fontSize: 32 }}>🎭</Text>
            </View>
          )}
          <View style={[styles.badge, { backgroundColor: '#00B2FF' }]}>
            <Text style={styles.badgeText}>人设卡</Text>
          </View>
        </View>
        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={2}>
            {item.name}
          </Text>
          <View style={styles.metaRow}>
            <View style={styles.followerBadge}>
              <Text style={styles.followerText}>{item.followersCount} 关注</Text>
            </View>
          </View>
        </View>
      </Pressable>
    );
  }, [handlePress]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.h1}>角色广场</Text>
        {user && (
          <Pressable onPress={() => router.push('/roles/create' as any)} style={styles.createBtn}>
            <Text style={styles.createText}>+ 创建</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        data={visibleRoles}
        keyExtractor={(r) => r.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        refreshing={rolesStore.loading}
        onRefresh={rolesStore.refresh}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>还没有角色</Text>
            <Pressable onPress={() => router.push('/roles/create' as any)} style={styles.emptyBtn}>
              <Text style={styles.emptyBtnText}>创建第一个角色</Text>
            </Pressable>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F8FA' },
  header: { paddingHorizontal: PADDING, paddingTop: 10, paddingBottom: 8, flexDirection: 'row', justifyContent: 'space-between' },
  h1: { fontSize: 18, fontWeight: '900', color: '#111827' },
  createBtn: { height: 34, borderRadius: 999, backgroundColor: '#111827', paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  createText: { color: '#fff', fontWeight: '900' },
  list: { padding: PADDING, paddingBottom: 24 },
  row: { gap: COLUMN_GAP, marginBottom: COLUMN_GAP },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  cover: {
    position: 'relative',
    backgroundColor: '#E5E7EB',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  coverPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    right: 8,
    top: 8,
    paddingHorizontal: 8,
    height: 18,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  body: {
    padding: 10,
  },
  title: {
    color: '#111827',
    fontWeight: '900',
    fontSize: 13,
    lineHeight: 18,
  },
  metaRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  followerBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  followerText: {
    color: '#6B7280',
    fontSize: 10,
    fontWeight: '600',
  },
  empty: {
    paddingTop: 60,
    alignItems: 'center',
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
  },
  emptyBtn: {
    marginTop: 16,
    backgroundColor: '#111827',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyBtnText: {
    color: '#fff',
    fontWeight: '900',
  },
});