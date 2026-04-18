import React, { useCallback } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { scale, verticalScale } from '@/src/utils/uiScale';

export type WaterfallCardType = '帖子' | '人设卡' | '企划';

export type WaterfallCardData = {
  id: string;
  type: WaterfallCardType;
  title: string;
  likeCount: string;
  isLiked?: boolean; // 当前用户是否已点赞
  coverImageUrl?: string | null; // 封面图
  authorAvatarUrl?: string | null; // 作者头像
  coverAspectRatio?: number; // width / height
  maxCoverHeight?: number;
  onLike?: (id: string, isLiked: boolean) => void; // 点赞回调
  onPress?: (id: string, type: string) => void; // 点击回调
};

function getBadgeStyle(type: WaterfallCardType) {
  switch (type) {
    case '帖子':
      return { bg: '#FF0000', fg: '#FFFFFF' };
    case '人设卡':
      return { bg: '#00B2FF', fg: '#FFFFFF' };
    case '企划':
      return { bg: '#F5B700', fg: '#111827' };
    default:
      return { bg: '#111827', fg: '#FFFFFF' };
  }
}

export function WaterfallCard({
  card,
  width,
}: {
  card: WaterfallCardData;
  width: number;
}) {
  const badge = getBadgeStyle(card.type);
  const ratio = card.coverAspectRatio && card.coverAspectRatio > 0 ? card.coverAspectRatio : 1;
  const rawHeight = width / ratio;

  const handlePress = useCallback(() => {
    if (card.onPress) {
      card.onPress(card.id, card.type);
    }
  }, [card.id, card.type, card.onPress]);
  const maxH = card.maxCoverHeight ? verticalScale(card.maxCoverHeight) : verticalScale(160);
  const coverHeight = Math.min(rawHeight, maxH);

  const handleLike = useCallback(() => {
    if (card.onLike) {
      card.onLike(card.id, !card.isLiked);
    }
  }, [card.id, card.isLiked, card.onLike]);

  return (
    <Pressable onPress={handlePress} style={[styles.card, { width }]}>
      {/* 封面图 */}
      <View style={[styles.cover, { height: coverHeight }]}>
        {card.coverImageUrl ? (
          <Image source={{ uri: card.coverImageUrl }} style={styles.coverImage} />
        ) : (
          <View style={styles.coverPlaceholder} />
        )}
        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.badgeText, { color: badge.fg }]}>{card.type}</Text>
        </View>
      </View>

      <View style={styles.body}>
        {/* 标题 */}
        <Text style={styles.title} numberOfLines={2}>
          {card.title}
        </Text>

        {/* 底部：作者头像 + 点赞 */}
        <View style={styles.metaRow}>
          {/* 作者头像 */}
          {card.authorAvatarUrl ? (
            <Image source={{ uri: card.authorAvatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder} />
          )}

          {/* 点赞按钮 */}
          <Pressable onPress={handleLike} style={styles.likeBtn} hitSlop={8}>
            <Image
              source={require('../../assets/images/home-heart.png')}
              style={[styles.heart, card.isLiked && styles.heartLiked]}
            />
            <Text style={[styles.likeText, card.isLiked && styles.likeTextActive]}>
              {card.likeCount}
            </Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: scale(9),
    overflow: 'hidden',
    backgroundColor: '#D9D9D9',
  },
  cover: {
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  coverPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#4C4C4C',
  },
  badge: {
    position: 'absolute',
    right: scale(8),
    top: verticalScale(8),
    paddingHorizontal: scale(8),
    height: verticalScale(18),
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: scale(12),
    fontWeight: '700',
    lineHeight: scale(12),
  },
  body: {
    backgroundColor: '#D9D9D9',
    paddingHorizontal: scale(10),
    paddingTop: verticalScale(8),
    paddingBottom: verticalScale(6),
  },
  title: {
    color: '#111827',
    fontWeight: '900',
    fontSize: scale(12),
    lineHeight: scale(16),
    paddingRight: scale(8),
    minHeight: verticalScale(32),
  },
  metaRow: {
    marginTop: verticalScale(6),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatar: {
    width: scale(20),
    height: scale(20),
    borderRadius: 99,
    backgroundColor: '#4B5563',
  },
  avatarPlaceholder: {
    width: scale(20),
    height: scale(20),
    borderRadius: 99,
    backgroundColor: '#4B5563',
  },
  likeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  heart: {
    width: scale(14),
    height: scale(14),
    resizeMode: 'contain',
    tintColor: '#111827',
  },
  heartLiked: {
    tintColor: '#FF0000',
  },
  likeText: {
    color: '#111827',
    opacity: 0.8,
    fontSize: scale(11),
    fontWeight: '700',
  },
  likeTextActive: {
    color: '#FF0000',
  },
});

