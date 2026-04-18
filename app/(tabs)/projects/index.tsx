import React, { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TagBar } from '@/src/components/TagBar';
import { toast } from '@/src/components/toast';
import { scale, verticalScale } from '@/src/utils/uiScale';

// 设计稿基准：402 x 874（见 `src/utils/uiScale.ts`）
const PAGE_SIDE_PADDING = 8;
const CONTENT_WIDTH = 386; // 402 - 8*2

// 顶部搜索 + 创建
const TOP_SPACER_HEIGHT = 61; // Tabs header grey spacer
const TOP_ROW_TOP = 86; // from screen top（设计稿）
const TOP_ROW_MARGIN_TOP = TOP_ROW_TOP - TOP_SPACER_HEIGHT; // 25
const TOP_SEARCH_WIDTH = 339;
const TOP_SEARCH_HEIGHT = 33;
const TOP_SEARCH_RADIUS = 7;

// 广告轮播（设计稿）
const AD_TOP = 140; // from screen top
const AD_HEIGHT = 150;
// 在当前布局里轮播紧跟在 topRow 之后，用 marginTop 让它落到 top=140（扣掉灰条）
// topInContent = 140 - 61 = 79；topRow bottom = 25 + 33 = 58；所以间距 = 21
const AD_MARGIN_TOP = (AD_TOP - TOP_SPACER_HEIGHT) - (TOP_ROW_MARGIN_TOP + TOP_SEARCH_HEIGHT); // 21

// 快捷按钮
const QUICK_GAP = 12;
const QUICK_HEIGHT = 59;
const QUICK_RADIUS = 10;

// tag 栏
const TAG_BAR_TOP = 399; // from screen top（设计稿）
const TAG_BAR_LEFT = 12;
const TAG_BAR_WIDTH = 380;
const TAG_BAR_HEIGHT = 24;
const TAG_ARROW_SIZE = 20;

// 列表卡片
const LIST_GAP = 12;
const CARD_RADIUS = 9;
const CARD_HEIGHT = 194;

// 分割线（设计稿）
const DIVIDER_TOP = 385; // from screen top
// dividerTopInContent = 385 - 61 = 324；在当前布局下 quickRow bottom = 25+33 + 21+150 + 12+59 = 300；所以间距=24
const DIVIDER_MARGIN_TOP = (DIVIDER_TOP - TOP_SPACER_HEIGHT) - (TOP_ROW_MARGIN_TOP + TOP_SEARCH_HEIGHT + AD_MARGIN_TOP + AD_HEIGHT + 12 + QUICK_HEIGHT); // 24

// tagBarTopInContent = 399 - 61 = 338；dividerTopInContent = 324 => tag 栏在分割线下方 14px
const TAG_BAR_MARGIN_TOP = (TAG_BAR_TOP - TOP_SPACER_HEIGHT) - (DIVIDER_TOP - TOP_SPACER_HEIGHT); // 14

export default function ProjectsSquarePage() {
  const router = useRouter();

  const [carouselIndex, setCarouselIndex] = useState(0);

  type Badge = { text: string; bg: string; fg: string };
  type ProjectListItem = { id: string; badges: [Badge, Badge] };

  const items = useMemo<ProjectListItem[]>(
    () => [
      {
        id: 'p1',
        badges: [
          { text: '招募', bg: '#FF0000', fg: '#FFFFFF' },
          { text: '进行中', bg: '#FF0000', fg: '#FFFFFF' },
        ],
      },
      {
        id: 'p2',
        badges: [
          { text: '不招募', bg: '#00DDFF', fg: '#FFFFFF' },
          { text: '已结束', bg: '#00DDFF', fg: '#FFFFFF' },
        ],
      },
    ],
    []
  );

  const goCreateProject = () => router.push('/projects/create' as any);
  const goCreateRoleCard = () => router.push('/roles/create' as any);

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <View style={styles.searchBar}>
            <Image source={require('../../../assets/images/home-search.png')} style={styles.searchIconImg} />
          </View>
          <Pressable onPress={() => toast('发布（待接入）')} style={styles.plusBtn} hitSlop={10}>
            <Image source={require('../../../assets/images/home-dot.png')} style={styles.plusDot} />
            <Image source={require('../../../assets/images/home-dot-plus.png')} style={styles.plusDotPlus} />
          </Pressable>
        </View>

        <View style={styles.adWrap}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const next = Math.round(e.nativeEvent.contentOffset.x / Math.max(scale(386), 1));
              setCarouselIndex(next);
            }}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={styles.adSlide}>
                <Text style={styles.adTitle}>热门企划/广告</Text>
              </View>
            ))}
          </ScrollView>
          <View style={styles.adDots}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={[styles.adDot, i === carouselIndex ? styles.adDotActive : styles.adDotInactive]} />
            ))}
          </View>
        </View>

        <View style={styles.quickRow}>
          <Pressable onPress={goCreateProject} style={styles.quickBtn}>
            <Text style={styles.quickText}>创建企划</Text>
          </Pressable>
          <Pressable onPress={goCreateRoleCard} style={styles.quickBtn}>
            <Text style={styles.quickText}>创建人设卡</Text>
          </Pressable>
        </View>

        <View style={styles.divider} />

        <TagBar
          title="推荐"
          tags={['推荐', '官方', '共创', '轻松', '赛博', '群像', '中度', '童话', '治愈', '短篇']}
          onTagPress={(tag) => toast(`选中标签: ${tag}`)}
        />

        <View style={styles.list}>
          {items.map((it, idx) => (
            <Pressable
              key={it.id}
              onPress={() => toast(`打开企划 ${it.id}（待接入）`)}
              style={[styles.card, idx === 0 ? styles.cardDark : styles.cardLight]}>
              <View style={styles.cardBadges}>
                {it.badges.map((b) => (
                  <View key={b.text} style={[styles.badge, { backgroundColor: b.bg }]}>
                    <Text style={[styles.badgeText, { color: b.fg }]}>{b.text}</Text>
                  </View>
                ))}
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // 与首页一致：页面主体白底；顶部灰色占位由 Tabs header 的 topSpacer 提供
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  content: {
    paddingHorizontal: scale(PAGE_SIDE_PADDING),
    paddingTop: 0, // 顶部灰条由 Tabs header 占位
    paddingBottom: verticalScale(24),
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    marginTop: verticalScale(TOP_ROW_MARGIN_TOP),
  },
  searchBar: {
    width: scale(TOP_SEARCH_WIDTH),
    height: verticalScale(TOP_SEARCH_HEIGHT),
    borderRadius: scale(TOP_SEARCH_RADIUS),
    backgroundColor: '#E6E6E6',
    justifyContent: 'center',
    paddingHorizontal: scale(12),
  },
  searchIconImg: {
    width: scale(20),
    height: scale(20),
    resizeMode: 'contain',
    opacity: 0.85,
  },
  plusBtn: {
    width: verticalScale(TOP_SEARCH_HEIGHT),
    height: verticalScale(TOP_SEARCH_HEIGHT),
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  plusDot: {
    position: 'absolute',
    width: scale(33),
    height: verticalScale(33),
    resizeMode: 'contain',
  },
  plusDotPlus: {
    position: 'absolute',
    width: scale(15),
    height: verticalScale(15),
    resizeMode: 'contain',
  },

  adWrap: {
    marginTop: verticalScale(Math.max(0, AD_MARGIN_TOP)),
    width: scale(CONTENT_WIDTH),
    height: verticalScale(AD_HEIGHT),
    borderRadius: scale(9),
    overflow: 'hidden',
    backgroundColor: '#CFCFCF',
    alignSelf: 'flex-start',
  },
  adSlide: {
    width: scale(CONTENT_WIDTH),
    height: verticalScale(AD_HEIGHT),
    backgroundColor: '#CFCFCF',
    justifyContent: 'center',
    paddingHorizontal: scale(18),
  },
  adTitle: { fontSize: scale(28), fontWeight: '900', color: '#111827' },
  adDots: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: scale(8),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(6),
  },
  adDot: { width: scale(6), height: scale(6), borderRadius: 99 },
  adDotActive: { width: scale(16), backgroundColor: '#FF0000' },
  adDotInactive: { backgroundColor: '#FFFFFF' },

  quickRow: { flexDirection: 'row', gap: scale(QUICK_GAP), marginTop: verticalScale(12) },
  quickBtn: {
    flex: 1,
    height: verticalScale(QUICK_HEIGHT),
    borderRadius: scale(QUICK_RADIUS),
    backgroundColor: '#CFCFCF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickText: { fontSize: scale(16), fontWeight: '800', color: '#111827' },

  divider: {
    marginTop: verticalScale(Math.max(0, DIVIDER_MARGIN_TOP)),
    width: scale(CONTENT_WIDTH),
    borderTopWidth: 1,
    borderTopColor: '#DEDEDE',
    alignSelf: 'flex-start',
  },

  tagBar: {
    marginTop: verticalScale(Math.max(0, TAG_BAR_MARGIN_TOP)),
    marginLeft: scale(TAG_BAR_LEFT - PAGE_SIDE_PADDING),
    width: scale(TAG_BAR_WIDTH),
    height: verticalScale(TAG_BAR_HEIGHT),
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'visible',
  },
  tagBarTitle: {
    fontSize: scale(16),
    lineHeight: scale(16),
    fontWeight: '700',
    color: '#000000',
    marginRight: scale(12),
  },
  tagList: { flexDirection: 'row', alignItems: 'center', gap: scale(10), flex: 1 },
  tagText: { fontSize: scale(14), lineHeight: scale(18), fontWeight: '400', color: '#838383', paddingBottom: verticalScale(1) },
  tagArrow: { width: scale(TAG_ARROW_SIZE), height: scale(TAG_ARROW_SIZE), resizeMode: 'contain' },

  list: { marginTop: verticalScale(12), gap: verticalScale(LIST_GAP) },
  card: {
    width: scale(CONTENT_WIDTH),
    height: verticalScale(CARD_HEIGHT),
    borderRadius: scale(CARD_RADIUS),
    overflow: 'hidden',
    position: 'relative',
  },
  cardDark: { backgroundColor: '#4C4C4C' },
  cardLight: { backgroundColor: '#CFCFCF' },
  cardBadges: {
    position: 'absolute',
    right: scale(10),
    top: verticalScale(10),
    flexDirection: 'row',
    gap: scale(8),
  },
  badge: {
    height: verticalScale(18),
    paddingHorizontal: scale(10),
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: scale(12), fontWeight: '800', lineHeight: scale(12) },
});

