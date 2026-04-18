import React, { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useMessagesStore } from '@/src/stores/messagesStore';
import { scale, verticalScale } from '@/src/utils/uiScale';

type InnerTab = '企划' | '消息' | '交易';
type MsgItem = { id: string; title: string; subtitle: string };

const PAGE_SIDE_PADDING = 15;
const LIST_ROW_H = 74;
const AVATAR_SIZE = 58;

function RowItem({ item, showFollow = false }: { item: MsgItem; showFollow?: boolean }) {
  return (
    <View style={styles.rowItem}>
      <View style={styles.avatar} />
      <View style={styles.rowTextWrap}>
        <Text style={styles.rowTitle}>{item.title}</Text>
        <Text style={styles.rowSub} numberOfLines={1}>
          {item.subtitle}
        </Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.rowDate}>日期</Text>
        {showFollow ? <Pressable style={styles.followBtn}><Text style={styles.followText}>关注</Text></Pressable> : <View style={styles.unreadDot} />}
      </View>
    </View>
  );
}

export default function MessagesHomePage() {
  const router = useRouter();
  const [tab, setTab] = useState<InnerTab>('消息');
  const { dmThreads, refreshDmThreads, loading, error } = useMessagesStore();
  const listItems = useMemo<MsgItem[]>(() => {
    if (tab !== '消息') {
      return Array.from({ length: 8 }).map((_, i) => ({
        id: `m-${i}`,
        title: tab === '企划' ? '企划名' : '用户名',
        subtitle: 'xxxxxxxxxxxxxxxxxxxxxx',
      }));
    }
    return dmThreads.map((thread) => ({ id: thread.id, title: thread.peerName, subtitle: thread.lastMessage }));
  }, [dmThreads, tab]);
  const suggestItems = useMemo<MsgItem[]>(
    () => [
      { id: 's1', title: '用户名', subtitle: '介绍' },
      { id: 's2', title: '用户名', subtitle: '介绍' },
    ],
    []
  );
  useEffect(() => {
    void refreshDmThreads();
  }, [refreshDmThreads]);

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => void refreshDmThreads()} style={styles.refreshBtn}>
          <Text style={styles.refreshText}>{loading ? '刷新中...' : '刷新消息'}</Text>
        </Pressable>
        <View style={styles.topTabsBar}>
          <View style={styles.topTabs}>
            {(['企划', '消息', '交易'] as const).map((t) => (
              <Pressable key={t} onPress={() => setTab(t)} style={styles.topTabBtn}>
                <Text style={[styles.topTabText, tab === t ? styles.topTabActive : styles.topTabInactive]}>{t}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable style={styles.createBtn} hitSlop={10}>
            <Image source={require('../../../assets/images/home-dot.png')} style={styles.createDot} />
            <Image source={require('../../../assets/images/home-dot-plus.png')} style={styles.createPlus} />
          </Pressable>
        </View>
        <View style={styles.divider} />

        {tab === '消息' ? (
          <>
            <View style={styles.quickRow}>
              <View style={styles.quickItem}>
                <Image source={require('../../../assets/images/msg-like-fav.png')} style={styles.quickIconImg} />
                <Text style={styles.quickLabel}>赞和收藏</Text>
              </View>
              <View style={styles.quickItem}>
                <Image source={require('../../../assets/images/msg-new-follow.png')} style={styles.quickIconImg} />
                <Text style={styles.quickLabel}>新增关注</Text>
              </View>
              <View style={styles.quickItem}>
                <Image source={require('../../../assets/images/msg-reply-at.png')} style={styles.quickIconImg} />
                <Text style={styles.quickLabel}>回复和@</Text>
              </View>
            </View>

            <View style={styles.listWrap}>
              {listItems.slice(0, 4).map((item) => (
                <Pressable key={item.id} onPress={() => router.push(`/dm/${item.id}` as any)}>
                  <RowItem item={item} />
                </Pressable>
              ))}
            </View>
            {error ? <Text style={styles.errorText}>加载失败：{error}</Text> : null}

            <View style={styles.suggestHeader}>
              <Text style={styles.suggestTitle}>你可能感兴趣的人</Text>
              <Text style={styles.suggestClose}>关闭</Text>
            </View>
            <View style={styles.listWrap}>
              {suggestItems.map((item) => (
                <RowItem key={item.id} item={item} showFollow />
              ))}
            </View>
          </>
        ) : (
          <View style={styles.listWrap}>
            {listItems.map((item) => (
              <RowItem key={item.id} item={item} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  content: {
    paddingHorizontal: scale(PAGE_SIDE_PADDING),
    paddingTop: 0,
    paddingBottom: verticalScale(24),
  },
  refreshBtn: { marginTop: verticalScale(6), alignSelf: 'flex-end', backgroundColor: '#F2F2F2', borderRadius: 999, paddingHorizontal: scale(12), paddingVertical: verticalScale(6) },
  refreshText: { color: '#333', fontSize: scale(13) },

  topTabsBar: {
    height: verticalScale(48),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(4),
  },
  topTabs: { flexDirection: 'row', gap: scale(38), marginLeft: scale(74) },
  topTabBtn: { paddingVertical: verticalScale(4) },
  topTabText: { fontSize: scale(40 / 2), lineHeight: scale(40 / 2), fontWeight: '700' },
  topTabActive: { color: '#111111' },
  topTabInactive: { color: '#838383' },
  createBtn: {
    width: scale(33),
    height: scale(33),
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createDot: {
    position: 'absolute',
    width: scale(33),
    height: scale(33),
    resizeMode: 'contain',
  },
  createPlus: {
    position: 'absolute',
    width: scale(15),
    height: scale(15),
    resizeMode: 'contain',
  },
  divider: { borderTopWidth: 1, borderTopColor: '#DEDEDE' },

  quickRow: {
    marginTop: verticalScale(18),
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  quickItem: { alignItems: 'center', width: scale(90) },
  quickIconImg: {
    width: scale(38),
    height: scale(38),
    resizeMode: 'contain',
  },
  quickLabel: { marginTop: verticalScale(8), fontSize: scale(17), color: '#111827', fontWeight: '500' },

  listWrap: { marginTop: verticalScale(10), gap: verticalScale(8) },
  rowItem: {
    minHeight: verticalScale(LIST_ROW_H),
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: { width: scale(AVATAR_SIZE), height: scale(AVATAR_SIZE), borderRadius: 99, backgroundColor: '#666666' },
  rowTextWrap: { marginLeft: scale(14), flex: 1, paddingRight: scale(10) },
  rowTitle: { fontSize: scale(34 / 2), lineHeight: scale(34 / 2), color: '#111827', fontWeight: '700' },
  rowSub: { marginTop: verticalScale(10), fontSize: scale(16), color: '#111827' },
  rowRight: { alignItems: 'flex-end', justifyContent: 'center', gap: verticalScale(12), minWidth: scale(56) },
  rowDate: { fontSize: scale(16), color: '#111827', fontWeight: '500' },
  unreadDot: { width: scale(16), height: scale(16), borderRadius: 99, backgroundColor: '#FF0000' },

  suggestHeader: {
    marginTop: verticalScale(4),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(2),
  },
  suggestTitle: { fontSize: scale(36 / 2), color: '#111827', fontWeight: '600' },
  suggestClose: { fontSize: scale(32 / 2), color: '#838383' },
  followBtn: {
    width: scale(84),
    height: verticalScale(30),
    borderRadius: 999,
    backgroundColor: '#FF0000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  followText: { color: '#000000', fontSize: scale(30 / 2), fontWeight: '700' },
  errorText: { color: '#B91C1C', marginTop: verticalScale(8), fontSize: scale(12) },
});

