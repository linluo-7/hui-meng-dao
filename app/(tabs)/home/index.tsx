import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, FlatList, Image, Modal, Pressable, ScrollView, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { TagBar } from '@/src/components/TagBar';
import { WaterfallCard, type WaterfallCardData } from '@/src/components/WaterfallCard';
import { toast } from '@/src/components/toast';
import { useHomeStore } from '@/src/stores/homeStore';
import { scale, verticalScale } from '@/src/utils/uiScale';

const HOME_TABS = ['发现', '热门', '关注'] as const;

// 设计稿基准：402 x 874（见 `src/utils/uiScale.ts`）。
// “发现 / 热门 / 关注”这行的底部需要距离屏幕顶部 119px（设计稿坐标）。
const CONTENT_PADDING_X = 16;

// 顶部灰色占位来自 Tabs header（见 `app/(tabs)/_layout.tsx` 的 topSpacer：61px）。
// 设计稿的 top=79 是从”整屏顶部”算，因此落到内容区需要减去 61 => 18。
const TOP_SPACER_HEIGHT = 61;
const TOP_TABS_TOP_IN_WHITE_RECT = 79 - TOP_SPACER_HEIGHT; // 18
const TOP_TABS_HEIGHT = 40;

// 轮播（设计稿）
const CAROUSEL_LEFT_FROM_SCREEN = 8;
const CAROUSEL_WIDTH = 386;
const CAROUSEL_HEIGHT = 110;
const CAROUSEL_RADIUS = 9;
const CAROUSEL_DOT_SIZE = 6;
const CAROUSEL_DOT_ACTIVE_WIDTH = 16;
const CAROUSEL_DOT_BOTTOM = 8;

const CARD_GUTTER = 6;
const CARD_SIDE_PADDING = 8; // 参照设计图内容左右 8px

// tag 栏（设计稿）
const TAG_BAR_TOP = 81;
const TAG_BAR_HEIGHT = 24;
const TAG_ARROW_SIZE = 20;

export default function HomeSquarePage() {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof HOME_TABS)[number]>('发现');
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const {
    feed,
    loading,
    refreshing,
    error,
    selectedTags,
    setTab: setStoreTab,
    toggleTag,
    clearTags,
    loadFeed,
    refreshFeed,
    likePost,
  } = useHomeStore();
  const screenW = Dimensions.get('window').width;
  const selectedTagsRef = useRef<ScrollView>(null);

  const cards = useMemo<WaterfallCardData[]>(() => {
    if (!feed) return [];
    return feed.items.map((item) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      coverImageUrl: (item as any).coverImageUrl ?? null,
      likeCount: String(item.likeCount),
      isLiked: item.isLiked ?? false,
      coverAspectRatio: item.coverAspectRatio,
      maxCoverHeight: item.maxCoverHeight,
      authorAvatarUrl: item.authorAvatarUrl ?? null,
      onPress: (id: string, type: string) => {
        if (type === '人设卡') {
          router.push(`/roles/${id}`);
        } else {
          router.push(`/posts/${id}`);
        }
      },
      onLike: (id: string) => likePost(id),
    }));
  }, [feed, router, likePost]);

  useEffect(() => {
    setStoreTab(tab);
  }, [setStoreTab, tab]);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed, tab, selectedTags]);

  // 右侧可选标签列表（排除已选）
  const availableTags = useMemo(() => {
    return (feed?.tags ?? ['推荐', '官方', '共创', '轻松']).filter((t) => !selectedTags.includes(t));
  }, [feed?.tags, selectedTags]);

  const handleTagToggle = useCallback(
    (tag: string) => {
      toggleTag(tag);
    },
    [toggleTag],
  );

  const columns = useMemo(() => {
    const left: WaterfallCardData[] = [];
    const right: WaterfallCardData[] = [];
    cards.forEach((c, i) => (i % 2 === 0 ? left : right).push(c));
    return { left, right };
  }, [cards]);

  const cardWidth = useMemo(() => {
    const w = Math.max(0, screenW - scale(CARD_SIDE_PADDING) * 2 - scale(CARD_GUTTER));
    return w / 2;
  }, [screenW]);

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refreshFeed()} />}>
        <View style={styles.header}>
          <View style={styles.topWhiteRect}>
            {HOME_TABS.map((item) => (
              <Pressable
                key={item}
                onPress={() => setTab(item)}
                style={[
                  styles.topTabItem,
                  item === '发现' && styles.topTabDiscover,
                  item === '热门' && styles.topTabHot,
                  item === '关注' && styles.topTabFollow,
                ]}>
                <Text style={[styles.topTabText, tab === item ? styles.topTabTextActive : styles.topTabTextInactive]}>
                  {item}
                </Text>
              </Pressable>
            ))}
            <Pressable onPress={() => toast('搜索（待接入）')} style={styles.topSearchBtn}>
              <Image source={require('../../../assets/images/home-search.png')} style={styles.topSearchImage} />
            </Pressable>
            <Pressable onPress={() => setShowCreateMenu(true)} style={styles.topCreateBtn}>
              <Image source={require('../../../assets/images/home-dot.png')} style={styles.topDotImage} />
              <Image source={require('../../../assets/images/home-dot-plus.png')} style={styles.topDotPlusImage} />
            </Pressable>
          </View>
        </View>

        {error ? (
          <Pressable onPress={() => void loadFeed()} style={styles.statusWrap}>
            <Text style={styles.statusText}>加载失败：{error}，点击重试</Text>
          </Pressable>
        ) : null}
        {loading && !feed ? (
          <View style={styles.statusWrap}>
            <Text style={styles.statusText}>首页加载中...</Text>
          </View>
        ) : null}

        <TagBar
          title="推荐"
          tags={['推荐', '官方', '共创', '轻松', '赛博', '群像', '中度', '童话', '治愈', '短篇']}
          onTagPress={(tag) => toast(`选中: ${tag}`)}
        />

        {/* 瀑布流卡片区（MVP 骨架） */}
        {tab !== '关注' && (
          <View style={styles.carouselWrap}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const next = Math.round(e.nativeEvent.contentOffset.x / Math.max(scale(386), 1));
                setCarouselIndex(next);
              }}>
              {(feed?.banners ?? [{ id: 'b1' }, { id: 'b2' }, { id: 'b3' }]).map((item) => (
                <View key={item.id} style={styles.carouselSlide} />
              ))}
            </ScrollView>
            <View style={styles.carouselDotsOverlay}>
              {(feed?.banners ?? [{ id: 'b1' }, { id: 'b2' }, { id: 'b3' }]).map((item, index) => (
                <View
                  key={item.id}
                  style={[styles.carouselDot, index === carouselIndex ? styles.carouselDotActive : styles.carouselDotInactive]}
                />
              ))}
            </View>
          </View>
        )}

        <View style={styles.wfWrap}>
          <View style={styles.wfRow}>
            <View style={styles.wfCol}>
              {columns.left.map((c) => (
                <WaterfallCard key={c.id} card={c} width={cardWidth} />
              ))}
            </View>
            <View style={styles.wfCol}>
              {columns.right.map((c) => (
                <WaterfallCard key={c.id} card={c} width={cardWidth} />
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* 标签下拉框 - 全屏 */}
      <Modal visible={isTagDropdownOpen} transparent animationType="slide" onRequestClose={() => setIsTagDropdownOpen(false)}>
        <View style={styles.dropdownOverlay}>
          <View style={styles.dropdownPanel}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownTitle}>选择标签</Text>
              <View style={styles.dropdownHeaderRight}>
                {selectedTags.length > 0 && (
                  <Pressable onPress={clearTags} style={styles.clearBtn}>
                    <Text style={styles.clearBtnText}>清空</Text>
                  </Pressable>
                )}
                <Pressable onPress={() => setIsTagDropdownOpen(false)} style={styles.closeBtn}>
                  <Text style={styles.closeBtnText}>完成</Text>
                </Pressable>
              </View>
            </View>
            <ScrollView style={styles.dropdownScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.dropdownTags}>
                {(feed?.tags ?? ['推荐', '官方', '共创', '轻松']).map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <Pressable
                      key={tag}
                      style={[styles.dropdownTagItem, isSelected && styles.dropdownTagItemActive]}
                      onPress={() => handleTagToggle(tag)}>
                      <Text style={[styles.dropdownTagText, isSelected && styles.dropdownTagTextActive]}>{tag}</Text>
                      {isSelected && <Text style={styles.dropdownTagCheck}>✓</Text>}
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 创建弹窗 */}
      <Modal visible={showCreateMenu} transparent animationType="fade" onRequestClose={() => setShowCreateMenu(false)}>
        <Pressable style={createMenuStyles.mask} onPress={() => setShowCreateMenu(false)}>
          <Pressable style={createMenuStyles.sheet} onPress={() => undefined}>
            <Text style={createMenuStyles.title}>选择创建类型</Text>
            <Pressable style={createMenuStyles.option} onPress={() => { setShowCreateMenu(false); router.push('/posts/create'); }}>
              <Text style={createMenuStyles.optionText}>创建帖子</Text>
            </Pressable>
            <Pressable style={createMenuStyles.option} onPress={() => { setShowCreateMenu(false); router.push('/roles/create'); }}>
              <Text style={createMenuStyles.optionText}>创建人设卡</Text>
            </Pressable>
            <Pressable style={createMenuStyles.option} onPress={() => toast('创建企划（待接入）')}>
              <Text style={createMenuStyles.optionText}>创建企划</Text>
            </Pressable>
            <Pressable style={createMenuStyles.cancel} onPress={() => setShowCreateMenu(false)}>
              <Text style={createMenuStyles.cancelText}>取消</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  content: {
    paddingHorizontal: scale(CONTENT_PADDING_X),
    // 顶部由 Tabs header 占位控制，这里不再额外加 paddingTop，避免把内容整体下推。
    paddingTop: 0,
    paddingBottom: verticalScale(24),
  },
  header: { marginBottom: 0 },
  topWhiteRect: {
    width: scale(402),
    height: verticalScale(80),
    backgroundColor: '#FFFFFF',
    marginHorizontal: -scale(CONTENT_PADDING_X),
    position: 'relative',
  },
  topTabItem: {
    position: 'absolute',
    width: scale(68),
    height: verticalScale(TOP_TABS_HEIGHT),
    top: verticalScale(TOP_TABS_TOP_IN_WHITE_RECT),
    justifyContent: 'center',
  },
  topTabDiscover: {
    left: scale(12),
  },
  topTabHot: {
    left: scale(96),
  },
  topTabFollow: {
    left: scale(180),
  },
  topTabText: {
    fontFamily: 'yyb',
    fontWeight: '400',
    fontSize: scale(32),
    lineHeight: scale(32),
    letterSpacing: 0,
  },
  topTabTextActive: {
    color: '#000000',
  },
  topTabTextInactive: {
    color: '#838383',
  },
  topSearchBtn: {
    position: 'absolute',
    width: scale(39),
    height: verticalScale(39),
    left: scale(305),
    top: verticalScale(21),
    alignItems: 'center',
    justifyContent: 'center',
  },
  topSearchImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  topDotImage: {
    position: 'absolute',
    width: scale(33),
    height: verticalScale(33),
    left: scale(357),
    top: verticalScale(25),
    resizeMode: 'contain',
    zIndex: 1,
  },
  topDotPlusImage: {
    position: 'absolute',
    width: scale(15),
    height: verticalScale(15),
    left: scale(366),
    top: verticalScale(34),
    resizeMode: 'contain',
    zIndex: 2,
  },
  tagBar: {
    position: 'absolute',
    width: scale(380),
    height: verticalScale(34),
    left: scale(11),
    top: verticalScale(172),
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'visible',
  },

  tagArrowWrap: {
    position: 'absolute',
    right: scale(8),
    width: scale(TAG_ARROW_SIZE),
    height: scale(TAG_ARROW_SIZE),
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagArrow: {
    width: scale(TAG_ARROW_SIZE),
    height: scale(TAG_ARROW_SIZE),
    resizeMode: 'contain',
  },
  tagBarTitle: {
    fontSize: scale(16),
    fontWeight: '400',
    color: '#000000',
    marginRight: scale(8),
  },
  tagList: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
  },
  tagText: {
    fontSize: scale(16),
    fontWeight: '400',
    color: '#000000',
  },
  tagChip: {
    width: scale(78),
    height: verticalScale(34),
    borderRadius: scale(9),
    backgroundColor: '#D9D9D9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(8),
  },
  carouselWrap: {
    width: scale(CAROUSEL_WIDTH),
    height: verticalScale(CAROUSEL_HEIGHT),
    // content 默认从 x=16 开始，设计稿轮播 left=8，所以需要左移 8
    marginLeft: -scale(CONTENT_PADDING_X - CAROUSEL_LEFT_FROM_SCREEN),
    borderRadius: scale(CAROUSEL_RADIUS),
    overflow: 'hidden',
  },
  carouselSlide: {
    width: scale(CAROUSEL_WIDTH),
    height: verticalScale(CAROUSEL_HEIGHT),
    backgroundColor: '#D9D9D9',
  },
  carouselDotsOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: scale(CAROUSEL_DOT_BOTTOM),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(6),
  },
  carouselDot: {
    width: scale(CAROUSEL_DOT_SIZE),
    height: scale(CAROUSEL_DOT_SIZE),
    borderRadius: 99,
  },
  carouselDotActive: {
    width: scale(CAROUSEL_DOT_ACTIVE_WIDTH),
    backgroundColor: '#FF0000',
  },
  carouselDotInactive: {
    backgroundColor: '#FFFFFF',
  },

  wfWrap: {
    marginTop: verticalScale(6),
    marginHorizontal: -scale(CONTENT_PADDING_X),
    paddingHorizontal: scale(CARD_SIDE_PADDING),
  },
  wfRow: {
    flexDirection: 'row',
    gap: scale(CARD_GUTTER),
  },
  wfCol: {
    flex: 1,
    gap: verticalScale(6),
  },
  statusWrap: { paddingVertical: verticalScale(12), alignItems: 'center' },
  statusText: { color: '#666', fontSize: scale(14) },

  // Tag dropdown styles
  tagArrowWrap: {
    position: 'absolute',
    width: scale(TAG_ARROW_SIZE),
    height: scale(TAG_ARROW_SIZE),
    left: scale(363),
    top: verticalScale(TAG_BAR_TOP) + (verticalScale(TAG_BAR_HEIGHT) - scale(TAG_ARROW_SIZE)) / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: verticalScale(120),
  },
  dropdownPanel: {
    width: scale(200),
    maxHeight: verticalScale(300),
    backgroundColor: '#FFFFFF',
    borderRadius: scale(12),
    marginRight: scale(10),
    overflow: 'hidden',
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E5',
  },
  dropdownTitle: {
    fontSize: scale(16),
    fontWeight: '600',
    color: '#111827',
  },
  dropdownClose: {
    fontSize: scale(24),
    color: '#838383',
    lineHeight: scale(24),
  },
  dropdownScroll: {
    paddingVertical: verticalScale(8),
  },
  dropdownTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: scale(12),
    paddingBottom: verticalScale(8),
    gap: scale(8),
  },
  dropdownTagItem: {
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(8),
    borderRadius: scale(16),
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#F5F5F5',
  },
  dropdownTagItemActive: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FF4D4D',
  },
  dropdownTagText: {
    fontSize: scale(14),
    color: '#111827',
  },
  dropdownTagTextActive: {
    color: '#FF4D4D',
    fontWeight: '600',
  },
});

// 创建菜单样式
const createMenuStyles = StyleSheet.create({
  mask: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: scale(27),
    borderTopRightRadius: scale(27),
    paddingHorizontal: scale(24),
    paddingTop: verticalScale(20),
    paddingBottom: verticalScale(34),
  },
  title: { fontSize: scale(18), fontWeight: '600', color: '#111827', textAlign: 'center', marginBottom: verticalScale(20) },
  option: {
    height: verticalScale(52),
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  optionText: { fontSize: scale(16), color: '#111827' },
  cancel: { height: verticalScale(52), justifyContent: 'center', marginTop: verticalScale(8) },
  cancelText: { fontSize: scale(16), color: '#6B7280', textAlign: 'center' },
});

