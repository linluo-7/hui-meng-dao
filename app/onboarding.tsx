import React, { useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { useSessionStore } from '@/src/stores/sessionStore';

type Slide = { id: string; title: string; desc: string; image: any };

export default function OnboardingPage() {
  const router = useRouter();
  const { markOnboardingSeen, token } = useSessionStore();
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);
  const { width: winWidth } = useWindowDimensions();

  const slides = useMemo<Slide[]>(
    () => [
      {
        id: 's1',
        title: '把灵感放到岛上',
        desc: '记录世界观、人物与片段，随时随地继续创作。',
        image: require('../assets/images/splash-icon.png'),
      },
      {
        id: 's2',
        title: '企划共创更高效',
        desc: '招募、任务、作品、成员管理，一处看全。',
        image: require('../assets/images/splash-icon.png'),
      },
      {
        id: 's3',
        title: '戏群 / 水群双通道',
        desc: '角色扮演与日常闲聊分离，沉浸又轻松。',
        image: require('../assets/images/splash-icon.png'),
      },
      {
        id: 's4',
        title: '现在出发',
        desc: '准备好了吗？一起登陆绘梦岛。',
        image: require('../assets/images/splash-icon.png'),
      },
    ],
    []
  );

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const w = e.nativeEvent.layoutMeasurement.width;
    const next = Math.round(x / Math.max(1, w));
    if (next !== index) setIndex(next);
  };

  const onNext = () => {
    const next = Math.min(slides.length - 1, index + 1);
    listRef.current?.scrollToIndex({ index: next, animated: true });
    setIndex(next);
  };

  const onStart = async () => {
    await markOnboardingSeen();
    router.replace((token ? '/(tabs)/home' : '/auth') as any);
  };

  const isLast = index === slides.length - 1;

  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        data={slides}
        keyExtractor={(s) => s.id}
        horizontal
        pagingEnabled
        getItemLayout={(_, i) => ({ length: winWidth, offset: winWidth * i, index: i })}
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <View style={[styles.page, { width: winWidth }]}>
            <View style={styles.card}>
              <Image source={item.image} style={styles.image} resizeMode="contain" />
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.desc}>{item.desc}</Text>
            </View>
          </View>
        )}
      />

      <View style={styles.bottom}>
        <View style={styles.dots}>
          {slides.map((s, i) => (
            <View key={s.id} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>

        {!isLast ? (
          <Pressable onPress={onNext} style={({ pressed }) => [styles.btn, pressed && { opacity: 0.9 }]}>
            <Text style={styles.btnText}>下一步</Text>
          </Pressable>
        ) : (
          <Pressable onPress={onStart} style={({ pressed }) => [styles.btn, styles.btnPrimary, pressed && { opacity: 0.9 }]}>
            <Text style={[styles.btnText, { color: '#fff' }]}>立即体验</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1220' },
  page: { width: '100%', padding: 24, paddingTop: 80 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: 18,
    alignItems: 'center',
  },
  image: { width: 200, height: 200, marginTop: 10, opacity: 0.95 },
  title: { marginTop: 18, color: '#fff', fontSize: 22, fontWeight: '900' },
  desc: { marginTop: 10, color: '#C7D2FE', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  bottom: { padding: 24, paddingBottom: 36, gap: 14 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  dot: { width: 6, height: 6, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.35)' },
  dotActive: { width: 18, backgroundColor: '#60A5FA' },
  btn: {
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: { backgroundColor: '#2563EB' },
  btnText: { color: '#E5E7EB', fontWeight: '800', fontSize: 15 },
});

