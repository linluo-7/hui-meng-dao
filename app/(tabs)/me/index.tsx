import React, { useEffect, useMemo, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { WaterfallCard, type WaterfallCardData } from '@/src/components/WaterfallCard';
import { toast } from '@/src/components/toast';
import { useMeStore } from '@/src/stores/meStore';
import { scale, verticalScale } from '@/src/utils/uiScale';

type MainTab = '我的发布' | '收藏' | '赞过' | '草稿';
type SubTab = '帖子' | '人设卡' | '企划' | '合辑';
type MainTabItem = { key: MainTab; left: number; width: number };

const PAGE_SIDE = 10;
const GRID_GAP = 6;
const TOP_SPACER = 61;
const TOP_RECT_H = 109;
const AVATAR_SIZE = 84;
const AVATAR_TOP = 143;
const AVATAR_LEFT = 10;
const AVATAR_TOP_IN_CONTENT = AVATAR_TOP - TOP_SPACER;
const NAME_LEFT = 133;
const NAME_TOP = 180;
const NAME_W = 114;
const NAME_H = 18;
const IP_LEFT = 314;
const IP_TOP = 185;
const IP_W = 81;
const IP_H = 12;
const ACCOUNT_LEFT = 133;
const ACCOUNT_TOP = 204;
const ACCOUNT_W = 177;
const ACCOUNT_H = 18;
const STATS_LEFT = 133;
const STATS_TOP = 226;
const DIVIDER_TOP = 469;
const DIVIDER_Y = DIVIDER_TOP - TOP_SPACER;
const DIVIDER_LEFT = 11;
const DIVIDER_W = 380;
const ACTION_BTN_W = 120;
const ACTION_BTN_H = 34;
const ACTION_BTN_RADIUS = 7;
const ACTION_ROW_LEFT = 10;
const ACTION_ROW_TOP = 389;
const ACTION_ROW_TOP_IN_CONTENT = ACTION_ROW_TOP - TOP_SPACER;
const ACTION_GAP = 11;
const ACTION_TEXT_W = 74;
const ACTION_TEXT_H = 18;
const ACTION_TEXT_OFFSET_X = 28;
const ACTION_TEXT_OFFSET_Y = 8;
const BIO_W = 351;
const BIO_H = 80;
const BIO_LEFT = 10;
const BIO_TOP = 250;
const BIO_TOP_IN_CONTENT = BIO_TOP - TOP_SPACER;
const EDIT_BTN_W = 90;
const EDIT_BTN_H = 24;
const EDIT_BTN_LEFT = 275;
const EDIT_BTN_TOP = 345;
const EDIT_BTN_TOP_IN_CONTENT = EDIT_BTN_TOP - TOP_SPACER;
const EDIT_BTN_RADIUS = 17;
const MAIN_TAB_TOP = 443;
const MAIN_TAB_TOP_IN_CONTENT = MAIN_TAB_TOP - TOP_SPACER;
const MAIN_TAB_ITEMS: MainTabItem[] = [
  { key: '我的发布', left: 10, width: 64 },
  { key: '收藏', left: 100, width: 33 },
  { key: '赞过', left: 159, width: 33 },
  { key: '草稿', left: 211, width: 64 },
];
const MAIN_TO_SUB_TABS: Record<MainTab, SubTab[]> = {
  我的发布: ['帖子', '人设卡', '企划', '合辑'],
  收藏: ['帖子', '人设卡', '企划', '合辑'],
  赞过: ['帖子', '人设卡', '企划', '合辑'],
  草稿: ['帖子', '人设卡', '企划'],
};

export default function MePage() {
  const router = useRouter();
  const {
    profile,
    loading,
    saving,
    error,
    loadProfile,
    updateProfile,
    uploadAvatar,
    posts,
    favorites,
    liked,
    drafts,
    contentLoading,
    loadPosts,
    loadFavorites,
    loadLiked,
    loadDrafts,
    likePost,
  } = useMeStore();
  const [editorVisible, setEditorVisible] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');
  const [bioInput, setBioInput] = useState('');
  const [mainTab, setMainTab] = useState<MainTab>('我的发布');
  const [subTab, setSubTab] = useState<SubTab>('帖子');
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const currentSubTabs = MAIN_TO_SUB_TABS[mainTab];

  // 上传头像
  const handleUploadAvatar = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      toast('需要相册权限才能选择图片');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]) {
      setAvatarLoading(true);
      try {
        const formData = new FormData();
        const file = {
          uri: result.assets[0].uri,
          type: 'image/jpeg',
          name: 'avatar.jpg',
        } as any;
        formData.append('avatar', file);
        await uploadAvatar(formData);
        toast('头像已更新');
      } catch {
        toast('上传失败');
      } finally {
        setAvatarLoading(false);
      }
    }
  };

  // 根据 mainTab 和 subTab 加载对应内容
  useEffect(() => {
    if (mainTab === '我的发布') {
      const type = subTab === '人设卡' ? 'role' : subTab === '企划' ? 'project' : 'post';
      void loadPosts(type);
    } else if (mainTab === '收藏') {
      const targetType = subTab === '人设卡' ? 'role' : subTab === '企划' ? 'project' : 'post';
      void loadFavorites(targetType);
    } else if (mainTab === '赞过') {
      void loadLiked();
    } else if (mainTab === '草稿') {
      const type = subTab === '人设卡' ? 'role' : undefined;
      void loadDrafts(type);
    }
  }, [mainTab, subTab, loadPosts, loadFavorites, loadLiked, loadDrafts]);

  // 转换 API 数据为瀑布流卡片数据
  const contentCards = useMemo<WaterfallCardData[]>(() => {
    let items: any[] = [];

    if (mainTab === '我的发布') {
      items = posts;
    } else if (mainTab === '收藏') {
      items = favorites;
    } else if (mainTab === '赞过') {
      items = liked;
    } else if (mainTab === '草稿') {
      items = drafts;
    }

    if (items.length === 0) {
      return [];
    }

    return items.map((item: any) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      likeCount: String(item.likesCount ?? 0),
      coverAspectRatio: item.coverAspectRatio ?? 1,
      maxCoverHeight: item.maxCoverHeight ?? 120,
      coverImageUrl: item.coverImageUrl ?? null,
      isLiked: item.isLiked ?? false,
      authorAvatarUrl: item.authorAvatarUrl ?? null,
      onPress: (id: string, type: string) => {
        if (type === '人设卡') {
          router.push(`/roles/${id}`);
        } else {
          router.push(`/posts/${id}`);
        }
      },
      onLike: async (id: string, currentlyLiked: boolean) => {
        try {
          await likePost(id);
          await loadPosts(subTab === '人设卡' ? 'role' : subTab === '企划' ? 'project' : 'post');
          await loadProfile();
        } catch {
          toast('操作失败');
        }
      },
    }));
  }, [mainTab, posts, favorites, liked, drafts, router, likePost, loadPosts, loadProfile, subTab]);

  const publishedPostColumns = useMemo(() => {
    const left: WaterfallCardData[] = [];
    const right: WaterfallCardData[] = [];
    contentCards.forEach((c, i) => (i % 2 === 0 ? left : right).push(c));
    return { left, right };
  }, [contentCards]);

  useEffect(() => {
    if (!currentSubTabs.includes(subTab)) {
      setSubTab(currentSubTabs[0]);
    }
  }, [currentSubTabs, subTab]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.pageStage}>
          <View style={styles.stage}>
            <View style={styles.topRect} />
            <Pressable onPress={() => toast('切换为画师视角（待接入）')} style={styles.switchBtn}>
              <Text style={styles.switchText}>切换为画师视角 ⟳</Text>
            </Pressable>
            <View style={styles.heroActions}>
              <Text style={styles.heroAction}>▢</Text>
              <Text style={styles.heroAction}>↗</Text>
            </View>

            {profile?.avatarUrl ? (
              <Pressable onPress={() => setShowAvatarMenu(true)}>
                <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
              </Pressable>
            ) : (
              <Pressable onPress={() => setShowAvatarMenu(true)}>
                <View style={styles.avatar} />
              </Pressable>
            )}
            <Text style={styles.name}>{profile?.nickname ?? '加载中'}</Text>
            <Text style={styles.ip}>IP属地：{profile?.ipLocation ?? '未知'}</Text>
            <Text style={styles.account}>账号：{profile?.id ?? '-'}</Text>
            <View style={styles.stats}>
              <Pressable onPress={() => profile?.id && router.push(`/user/${profile.id}/followers` as any)}>
                <Text style={styles.statText}>
                  <Text style={styles.statNum}>{profile?.followersCount ?? 0}</Text> 粉丝
                </Text>
              </Pressable>
              <Pressable onPress={() => profile?.id && router.push(`/user/${profile.id}/following` as any)}>
                <Text style={styles.statText}>
                  <Text style={styles.statNum}>{profile?.followingCount ?? 0}</Text> 关注
                </Text>
              </Pressable>
              <Text style={styles.statText}>
                <Text style={styles.statNum}>{profile?.likesAndFavoritesCount ?? 0}</Text> 收藏和获赞
              </Text>
            </View>
          </View>

          <View style={styles.bioBlock}>
            <Text style={styles.bioTitle}>简介：</Text>
            <Text style={styles.bioLine}>{profile?.bio ?? '暂无简介'}</Text>
          </View>

          <View style={styles.tagsRow}>
            <View style={styles.tags}>
              {profile?.titles?.map((tag, index) => (
                <Text key={index} style={styles.tag}>{tag}</Text>
              ))}
            </View>
          </View>

          <View style={styles.editArea}>
            <Pressable
              style={styles.editBtn}
              onPress={() => {
                setNicknameInput(profile?.nickname ?? '');
                setBioInput(profile?.bio ?? '');
                setEditorVisible(true);
              }}>
              <Text style={styles.editText}>编辑资料</Text>
            </Pressable>
            <Pressable onPress={() => router.push('/settings' as any)}>
              <Text style={styles.settingIcon}>⚙</Text>
            </Pressable>
          </View>

          <View style={styles.actionRow}>
            <Pressable style={styles.actionBtn}>
              <Text style={styles.actionText}>我的订单</Text>
            </Pressable>
            <Pressable style={styles.actionBtn}>
              <Text style={styles.actionText}>浏览记录</Text>
            </Pressable>
            <Pressable style={styles.actionBtn}>
              <Text style={styles.actionText}>购物车</Text>
            </Pressable>
          </View>

          <View style={styles.divider} />
        </View>

        <View style={styles.mainTabs}>
          {MAIN_TAB_ITEMS.map((item) => (
            <Pressable key={item.key} onPress={() => setMainTab(item.key)} style={[styles.mainTabBtn, { left: scale(item.left), width: scale(item.width) }]}>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
                style={[styles.mainTabText, mainTab === item.key ? styles.mainTabActive : styles.mainTabInactive]}>
                {item.key}
              </Text>
            </Pressable>
          ))}
          <Image source={require('../../../assets/images/home-search.png')} style={styles.searchIcon} />
        </View>

        <View style={styles.subTabs}>
          {currentSubTabs.map((t) => (
            <Pressable key={t} onPress={() => setSubTab(t)}>
              <Text style={[styles.subTabText, subTab === t ? styles.subTabActive : styles.subTabInactive]}>{t}</Text>
            </Pressable>
          ))}
          <Image source={require('../../../assets/images/home-tag-arrow.png')} style={styles.downArrow} />
        </View>
        <View style={styles.subUnderline} />

        <View style={styles.wfRow}>
          <View style={styles.wfCol}>
            {publishedPostColumns.left.map((card) => (
              <WaterfallCard key={card.id} card={card} width={scale(188)} />
            ))}
          </View>
          <View style={styles.wfCol}>
            {publishedPostColumns.right.map((card) => (
              <WaterfallCard key={card.id} card={card} width={scale(188)} />
            ))}
          </View>
        </View>
        {loading ? <Text style={styles.statusText}>资料加载中...</Text> : null}
        {error ? <Text style={styles.errorText}>资料加载失败：{error}</Text> : null}
      </ScrollView>

      <Modal visible={editorVisible} transparent animationType="fade" onRequestClose={() => setEditorVisible(false)}>
        <Pressable style={styles.modalMask} onPress={() => setEditorVisible(false)}>
          <Pressable style={styles.modalCard} onPress={() => undefined}>
            <Text style={styles.modalTitle}>编辑资料</Text>
            <TextInput value={nicknameInput} onChangeText={setNicknameInput} placeholder="昵称" style={styles.modalInput} />
            <TextInput
              value={bioInput}
              onChangeText={setBioInput}
              placeholder="简介"
              style={[styles.modalInput, styles.modalInputBio]}
              multiline
            />
            <Pressable
              style={styles.modalSave}
              onPress={async () => {
                await updateProfile({ nickname: nicknameInput, bio: bioInput });
                setEditorVisible(false);
                toast(saving ? '保存中...' : '资料已更新');
              }}>
              <Text style={styles.modalSaveText}>保存</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 头像菜单 */}
      <Modal visible={showAvatarMenu} transparent animationType="fade" onRequestClose={() => setShowAvatarMenu(false)}>
        <Pressable style={styles.avatarMenuMask} onPress={() => setShowAvatarMenu(false)}>
          <Pressable style={styles.avatarMenuSheet} onPress={() => undefined}>
            <Text style={styles.avatarMenuTitle}>修改头像</Text>
            <Pressable
              style={styles.avatarMenuOption}
              onPress={() => { setShowAvatarMenu(false); handleUploadAvatar(); }}
              disabled={avatarLoading}>
              <Text style={styles.avatarMenuOptionText}>{avatarLoading ? '上传中...' : '从相册选择'}</Text>
            </Pressable>
            <Pressable style={styles.avatarMenuOption} onPress={() => { setShowAvatarMenu(false); toast('拍照（待接入）'); }}>
              <Text style={styles.avatarMenuOptionText}>拍照</Text>
            </Pressable>
            <Pressable style={styles.avatarMenuCancel} onPress={() => setShowAvatarMenu(false)}>
              <Text style={styles.avatarMenuCancelText}>取消</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { paddingBottom: verticalScale(16) },
  pageStage: {
    position: 'relative',
    minHeight: verticalScale(DIVIDER_Y + 1),
  },
  stage: {
    width: scale(402),
    height: verticalScale(300),
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  topRect: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: scale(402),
    height: verticalScale(TOP_RECT_H),
    backgroundColor: '#838383',
  },
  avatar: {
    position: 'absolute',
    left: scale(AVATAR_LEFT),
    top: verticalScale(AVATAR_TOP_IN_CONTENT),
    width: scale(AVATAR_SIZE),
    height: scale(AVATAR_SIZE),
    borderRadius: 99,
    backgroundColor: '#4C4C4C',
    zIndex: 2,
  },
  switchBtn: {
    position: 'absolute',
    left: scale(10),
    top: verticalScale(12),
    height: verticalScale(28),
    borderRadius: 999,
    backgroundColor: '#E8E8E8',
    justifyContent: 'center',
    paddingHorizontal: scale(10),
  },
  switchText: { fontSize: scale(13), color: '#333' },
  heroActions: { position: 'absolute', right: scale(12), top: verticalScale(14), flexDirection: 'row', gap: scale(14) },
  heroAction: { fontSize: scale(18), color: '#111', fontWeight: '700' },
  name: {
    position: 'absolute',
    left: scale(NAME_LEFT),
    top: verticalScale(NAME_TOP - TOP_SPACER),
    width: scale(NAME_W),
    height: verticalScale(NAME_H),
    fontSize: scale(17),
    lineHeight: verticalScale(NAME_H),
    fontWeight: '700',
    color: '#111',
  },
  ip: {
    position: 'absolute',
    left: scale(IP_LEFT),
    top: verticalScale(IP_TOP - TOP_SPACER),
    width: scale(IP_W),
    height: verticalScale(IP_H),
    fontSize: scale(12),
    lineHeight: verticalScale(IP_H),
    color: '#838383',
  },
  account: {
    position: 'absolute',
    left: scale(ACCOUNT_LEFT),
    top: verticalScale(ACCOUNT_TOP - TOP_SPACER),
    width: scale(ACCOUNT_W),
    height: verticalScale(ACCOUNT_H),
    fontSize: scale(14),
    lineHeight: verticalScale(ACCOUNT_H),
    color: '#666',
  },
  stats: {
    position: 'absolute',
    left: scale(STATS_LEFT),
    top: verticalScale(STATS_TOP - TOP_SPACER),
    flexDirection: 'row',
    gap: scale(16),
  },
  statText: { fontSize: scale(15), color: '#111' },
  statNum: { fontSize: scale(20), fontWeight: '800' },
  divider: {
    position: 'absolute',
    left: scale(DIVIDER_LEFT),
    top: verticalScale(DIVIDER_Y),
    width: scale(DIVIDER_W),
    borderTopWidth: 1,
    borderTopColor: '#DEDEDE',
  },
  bioBlock: {
    position: 'absolute',
    left: scale(BIO_LEFT),
    top: verticalScale(BIO_TOP_IN_CONTENT),
    width: scale(BIO_W),
    height: verticalScale(BIO_H),
  },
  bioTitle: { fontSize: scale(16), fontWeight: '600', color: '#111' },
  bioLine: { marginTop: verticalScale(2), fontSize: scale(14), color: '#111' },
  tagsRow: {
    position: 'absolute',
    left: scale(PAGE_SIDE),
    top: verticalScale(EDIT_BTN_TOP_IN_CONTENT),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tags: { flexDirection: 'row', gap: scale(8) },
  tag: {
    height: verticalScale(26),
    borderRadius: 999,
    backgroundColor: '#D0D0D0',
    paddingHorizontal: scale(8),
    textAlignVertical: 'center',
    includeFontPadding: false,
    lineHeight: verticalScale(26),
    color: '#444',
    fontSize: scale(13),
  },
  editArea: {
    position: 'absolute',
    left: scale(EDIT_BTN_LEFT),
    top: verticalScale(EDIT_BTN_TOP_IN_CONTENT),
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
  },
  editBtn: {
    width: scale(EDIT_BTN_W),
    height: verticalScale(EDIT_BTN_H),
    borderRadius: scale(EDIT_BTN_RADIUS),
    backgroundColor: '#FF0000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editText: { color: '#000', fontSize: scale(15), fontWeight: '700' },
  settingIcon: { fontSize: scale(26), color: '#111' },
  actionBtn: {
    width: scale(ACTION_BTN_W),
    height: '100%',
    borderRadius: scale(ACTION_BTN_RADIUS),
    backgroundColor: '#D9D9D9',
    alignItems: 'flex-start',
    paddingLeft: scale(ACTION_TEXT_OFFSET_X),
    paddingTop: verticalScale(ACTION_TEXT_OFFSET_Y),
  },
  actionText: {
    width: scale(ACTION_TEXT_W),
    height: verticalScale(ACTION_TEXT_H),
    lineHeight: verticalScale(ACTION_TEXT_H),
    textAlign: 'center',
    fontSize: scale(16),
    color: '#222',
  },
  actionRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: verticalScale(ACTION_ROW_TOP_IN_CONTENT),
    flexDirection: 'row',
    gap: scale(ACTION_GAP),
    paddingHorizontal: scale(ACTION_ROW_LEFT),
    height: verticalScale(ACTION_BTN_H),
  },
  mainTabs: {
    position: 'relative',
    marginTop: verticalScale(MAIN_TAB_TOP_IN_CONTENT - DIVIDER_Y),
    height: verticalScale(18),
  },
  mainTabBtn: {
    position: 'absolute',
    top: 0,
    height: verticalScale(18),
    justifyContent: 'center',
  },
  mainTabText: {
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    fontSize: scale(16),
    lineHeight: verticalScale(16),
    letterSpacing: 0,
    includeFontPadding: false,
  },
  mainTabActive: { color: '#111', fontWeight: '400' },
  mainTabInactive: { color: '#838383' },
  searchIcon: {
    position: 'absolute',
    right: scale(10),
    top: verticalScale(-2),
    width: scale(22),
    height: scale(22),
    resizeMode: 'contain',
  },
  subTabs: { marginTop: verticalScale(8), paddingHorizontal: scale(PAGE_SIDE), flexDirection: 'row', alignItems: 'center', gap: scale(22) },
  subTabText: { fontSize: scale(16) },
  subTabActive: { color: '#111', fontWeight: '700' },
  subTabInactive: { color: '#333' },
  downArrow: { marginLeft: 'auto', width: scale(18), height: scale(18), resizeMode: 'contain' },
  subUnderline: { marginLeft: scale(PAGE_SIDE), width: scale(30), borderTopWidth: 2, borderTopColor: '#111' },
  wfRow: {
    marginTop: verticalScale(6),
    paddingHorizontal: scale(PAGE_SIDE),
    flexDirection: 'row',
    gap: scale(GRID_GAP),
  },
  wfCol: {
    flex: 1,
    gap: verticalScale(GRID_GAP),
  },
  statusText: { marginTop: verticalScale(12), textAlign: 'center', color: '#666' },
  errorText: { marginTop: verticalScale(6), textAlign: 'center', color: '#B91C1C' },
  modalMask: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: scale(20) },
  modalCard: { borderRadius: scale(14), backgroundColor: '#FFFFFF', padding: scale(14), gap: verticalScale(8) },
  modalTitle: { fontSize: scale(16), fontWeight: '700', color: '#111' },
  modalInput: { borderWidth: 1, borderColor: '#DEDEDE', borderRadius: scale(10), paddingHorizontal: scale(10), paddingVertical: verticalScale(8), color: '#111' },
  modalInputBio: { minHeight: verticalScale(88), textAlignVertical: 'top' },
  modalSave: { marginTop: verticalScale(8), height: verticalScale(40), borderRadius: scale(10), backgroundColor: '#FF0000', alignItems: 'center', justifyContent: 'center' },
  modalSaveText: { color: '#000', fontWeight: '700' },
  avatarMenuMask: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  avatarMenuSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: scale(27),
    borderTopRightRadius: scale(27),
    paddingHorizontal: scale(24),
    paddingTop: verticalScale(20),
    paddingBottom: verticalScale(34),
  },
  avatarMenuTitle: { fontSize: scale(18), fontWeight: '600', color: '#111827', textAlign: 'center', marginBottom: verticalScale(20) },
  avatarMenuOption: {
    height: verticalScale(52),
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  avatarMenuOptionText: { fontSize: scale(16), color: '#111827' },
  avatarMenuCancel: { height: verticalScale(52), justifyContent: 'center', marginTop: verticalScale(8) },
  avatarMenuCancelText: { fontSize: scale(16), color: '#6B7280', textAlign: 'center' },
});
