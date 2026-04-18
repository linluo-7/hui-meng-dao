import React, { useMemo, useState } from 'react';
import { Dimensions, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { toast } from '@/src/components/toast';
import { scale, verticalScale } from '@/src/utils/uiScale';

type MarketTab = '约稿' | '周边';

type WaterfallItem = {
  id: string;
  h: number;
};

// 约稿页设计稿：轮播 left=9、width=384，因此页面左右 padding 采用 9
const PAGE_SIDE_PADDING = 9;
const CONTENT_WIDTH = 384;
const TOP_BAR_HEIGHT = 40;
const TOP_BAR_TOP = 79; // 设计稿：大字 tab 行 top
const TOP_SPACER_HEIGHT = 61; // Tabs header grey spacer
const TOP_BAR_MARGIN_TOP = TOP_BAR_TOP - TOP_SPACER_HEIGHT; // 18

const GRID_GUTTER = 6;
const GRID_V_GAP = 6;
const FUNNEL_ICON_SIZE = 18;
const TAG_ARROW_SIZE = 20;

// 约稿页广告轮播（设计稿）
const MARKET_AD_TOP = 136; // from screen top
const MARKET_AD_HEIGHT = 90;
const MARKET_AD_RADIUS = 6;
// 轮播 top=136（整屏坐标），扣掉 Tabs header 灰条 61 => 内容区 y=75
// 让 topBar 高度=75，使轮播紧贴 topBar 下方即可自然落位
const TOP_BAR_CONTAINER_HEIGHT = MARKET_AD_TOP - TOP_SPACER_HEIGHT; // 75

// 分隔线（设计稿）：两个 tab 都在 top=268px
const MARKET_DIVIDER_TOP = 268; // from screen top
const MARKET_DIVIDER_Y = MARKET_DIVIDER_TOP - TOP_SPACER_HEIGHT; // 207（内容区）

// tag 栏（设计稿）：在分隔线上方
const MARKET_TAG_TOP = 240; // from screen top
const MARKET_TAG_LEFT = 11;
const MARKET_TAG_WIDTH = 380;
const MARKET_TAG_HEIGHT = 24;
const MARKET_TAG_Y = MARKET_TAG_TOP - TOP_SPACER_HEIGHT; // 179（内容区）

// topBar(75) + section(90) = 165
const MARKET_SECTION_BOTTOM_Y = TOP_BAR_CONTAINER_HEIGHT + MARKET_AD_HEIGHT; // 165
const MARKET_TAG_MARGIN_TOP = MARKET_TAG_Y - MARKET_SECTION_BOTTOM_Y; // 14
// dividerY=207；tagBottom=179+24=203 => divider 距离 tag 底部 4
const MARKET_DIVIDER_MARGIN_TOP = MARKET_DIVIDER_Y - (MARKET_TAG_Y + MARKET_TAG_HEIGHT); // 4

function WaterfallCard({ width, height }: { width: number; height: number }) {
  return <View style={[styles.wfCard, { width, height: verticalScale(height) }]} />;
}

export default function MarketPage() {
  const [tab, setTab] = useState<MarketTab>('约稿');
  const [adIndex, setAdIndex] = useState(0);
  const screenW = Dimensions.get('window').width;

  const cardWidth = useMemo(() => {
    const w = Math.max(0, screenW - scale(PAGE_SIDE_PADDING) * 2 - scale(GRID_GUTTER));
    return w / 2;
  }, [screenW]);

  const items = useMemo<WaterfallItem[]>(
    () => [
      { id: 'm1', h: 90 },
      { id: 'm2', h: 60 },
      { id: 'm3', h: 78 },
      { id: 'm4', h: 70 },
      { id: 'm5', h: 120 },
      { id: 'm6', h: 80 },
      { id: 'm7', h: 130 },
      { id: 'm8', h: 70 },
    ],
    []
  );

  const columns = useMemo(() => {
    const left: WaterfallItem[] = [];
    const right: WaterfallItem[] = [];
    items.forEach((it, idx) => (idx % 2 === 0 ? left : right).push(it));
    return { left, right };
  }, [items]);

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <View style={styles.topTabs}>
            <Pressable onPress={() => setTab('约稿')} style={styles.topTabBtn}>
              <Text style={[styles.topTabText, tab === '约稿' ? styles.topTabActive : styles.topTabInactive]}>约稿</Text>
            </Pressable>
            <Pressable onPress={() => setTab('周边')} style={styles.topTabBtn}>
              <Text style={[styles.topTabText, tab === '周边' ? styles.topTabActive : styles.topTabInactive]}>周边</Text>
            </Pressable>
          </View>

          <Pressable onPress={() => toast('搜索（待接入）')} style={styles.topSearchBtn}>
            <Image source={require('../../../assets/images/home-search.png')} style={styles.topSearchImage} />
          </Pressable>
          <Pressable onPress={() => toast('创建（待接入）')} style={styles.topCreateBtn} hitSlop={10}>
            <Image source={require('../../../assets/images/home-dot.png')} style={styles.topCreateDot} />
            <Image source={require('../../../assets/images/home-dot-plus.png')} style={styles.topCreatePlus} />
          </Pressable>
        </View>

        {tab === '约稿' ? (
          <View style={styles.adWrap}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const next = Math.round(e.nativeEvent.contentOffset.x / Math.max(scale(CONTENT_WIDTH), 1));
                setAdIndex(next);
              }}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={styles.adSlide}>
                  <Text style={styles.adTitle}>广告</Text>
                </View>
              ))}
            </ScrollView>
            <View style={styles.adDots}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={[styles.adDot, i === adIndex ? styles.adDotActive : styles.adDotInactive]} />
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.quickRow}>
            <Pressable onPress={() => toast('周边定制（待接入）')} style={styles.quickBtn}>
              <Text style={styles.quickText}>周边定制</Text>
            </Pressable>
            <Pressable onPress={() => toast('拼团（待接入）')} style={styles.quickBtn}>
              <Text style={styles.quickText}>拼团</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.tagRow}>
          <Text style={styles.tagTitle}>推荐</Text>
          <View style={styles.tagList}>
            <Text style={styles.tagText}>#tag</Text>
            <Text style={styles.tagText}>#tag</Text>
            <Text style={styles.tagText}>#tag</Text>
            <Text style={styles.tagText}>#tag</Text>
            <Text style={styles.tagText}>#tag</Text>
          </View>
          <View style={styles.tagRightIcons}>
            <Image source={require('../../../assets/images/market-funnel.png')} style={styles.funnelIcon} />
            <Image source={require('../../../assets/images/home-tag-arrow.png')} style={styles.tagArrow} />
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.gridWrap}>
          <View style={styles.gridRow}>
            <View style={styles.gridCol}>
              {columns.left.map((it) => (
                <WaterfallCard key={it.id} width={cardWidth} height={it.h} />
              ))}
            </View>
            <View style={styles.gridCol}>
              {columns.right.map((it) => (
                <WaterfallCard key={it.id} width={cardWidth} height={it.h} />
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  content: {
    paddingHorizontal: scale(PAGE_SIDE_PADDING),
    paddingTop: 0, // 顶部灰条由 Tabs header 占位
    paddingBottom: verticalScale(24),
  },

  topBar: {
    height: verticalScale(TOP_BAR_CONTAINER_HEIGHT),
    marginHorizontal: -scale(PAGE_SIDE_PADDING),
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  topTabs: {
    position: 'absolute',
    left: scale(12),
    top: verticalScale(TOP_BAR_MARGIN_TOP),
    flexDirection: 'row',
    gap: scale(18),
    height: verticalScale(TOP_BAR_HEIGHT),
    alignItems: 'center',
  },
  topTabBtn: { paddingRight: scale(2) },
  topTabText: { fontFamily: 'yyb', fontWeight: '400', fontSize: scale(32), lineHeight: scale(32) },
  topTabActive: { color: '#000000' },
  topTabInactive: { color: '#838383' },
  topSearchBtn: {
    position: 'absolute',
    width: scale(39),
    height: verticalScale(39),
    left: scale(305),
    top: verticalScale(21),
    alignItems: 'center',
    justifyContent: 'center',
  },
  topSearchImage: { width: '100%', height: '100%', resizeMode: 'contain' },
  topCreateBtn: {
    position: 'absolute',
    width: scale(33),
    height: verticalScale(33),
    left: scale(357),
    top: verticalScale(25),
    alignItems: 'center',
    justifyContent: 'center',
  },
  topCreateDot: { position: 'absolute', width: scale(33), height: verticalScale(33), resizeMode: 'contain' },
  topCreatePlus: { position: 'absolute', width: scale(15), height: verticalScale(15), resizeMode: 'contain' },

  adWrap: {
    marginTop: 0,
    width: scale(CONTENT_WIDTH),
    height: verticalScale(MARKET_AD_HEIGHT),
    borderRadius: scale(MARKET_AD_RADIUS),
    overflow: 'hidden',
    backgroundColor: '#D9D9D9',
    alignSelf: 'flex-start',
  },
  adSlide: {
    width: scale(CONTENT_WIDTH),
    height: verticalScale(MARKET_AD_HEIGHT),
    backgroundColor: '#D9D9D9',
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

  quickRow: { flexDirection: 'row', gap: scale(12), marginTop: 0 },
  quickBtn: {
    flex: 1,
    height: verticalScale(MARKET_AD_HEIGHT),
    borderRadius: scale(MARKET_AD_RADIUS),
    backgroundColor: '#D9D9D9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickText: { fontSize: scale(18), fontWeight: '700', color: '#111827' },

  divider: {
    marginTop: verticalScale(Math.max(0, MARKET_DIVIDER_MARGIN_TOP)),
    width: scale(CONTENT_WIDTH),
    borderTopWidth: 1,
    borderTopColor: '#DEDEDE',
    alignSelf: 'flex-start',
  },

  tagRow: {
    marginTop: verticalScale(Math.max(0, MARKET_TAG_MARGIN_TOP)),
    marginLeft: scale(MARKET_TAG_LEFT - PAGE_SIDE_PADDING),
    width: scale(MARKET_TAG_WIDTH),
    height: verticalScale(MARKET_TAG_HEIGHT),
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagTitle: { fontSize: scale(16), fontWeight: '700', color: '#000000', marginRight: scale(12) },
  tagList: { flex: 1, flexDirection: 'row', gap: scale(10), alignItems: 'center' },
  tagText: { fontSize: scale(14), color: '#838383', paddingBottom: verticalScale(1) },
  tagRightIcons: { flexDirection: 'row', alignItems: 'center', gap: scale(10) },
  funnelIcon: { width: scale(FUNNEL_ICON_SIZE), height: scale(FUNNEL_ICON_SIZE), resizeMode: 'contain' },
  tagArrow: { width: scale(TAG_ARROW_SIZE), height: scale(TAG_ARROW_SIZE), resizeMode: 'contain' },

  gridWrap: {
    // 分割线下方内容区：卡片上下左右间隔均为 6px（设计稿）
    marginTop: verticalScale(GRID_V_GAP),
    marginHorizontal: -scale(PAGE_SIDE_PADDING),
    paddingHorizontal: scale(PAGE_SIDE_PADDING),
  },
  gridRow: { flexDirection: 'row', gap: scale(GRID_GUTTER) },
  gridCol: { flex: 1, gap: verticalScale(GRID_V_GAP) },
  wfCard: {
    backgroundColor: '#D9D9D9',
    borderRadius: scale(9),
  },
});
