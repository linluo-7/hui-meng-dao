import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useSessionStore } from '@/src/stores/sessionStore';

export default function SplashPage() {
  const router = useRouter();
  const { hydrated, onboardingSeen, token, sessionExpired, hydrate } = useSessionStore();
  const [progress, setProgress] = useState(0.12);
  const barAnim = useRef(new Animated.Value(0)).current;
  const startAtRef = useRef<number>(Date.now());

  const nextRoute = useMemo(() => {
    if (!onboardingSeen) return '/onboarding';
    if (!token || sessionExpired) return '/auth';
    return '/(tabs)/home';
  }, [onboardingSeen, token, sessionExpired]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const MIN_MS = 1600;
      await hydrate();
      if (!alive) return;
      setProgress(0.68);
      Animated.timing(barAnim, { toValue: 1, duration: 1100, useNativeDriver: false }).start();

      // nextRoute may be stale because hydrate() updates the store asynchronously.
      // Read the latest values after hydration to decide the correct redirect target.
      const { onboardingSeen: seen, token: latestToken, sessionExpired: expired } = useSessionStore.getState();
      const route = !seen ? '/onboarding' : (!latestToken || expired) ? '/auth' : '/(tabs)/home';

      const elapsed = Date.now() - startAtRef.current;
      const waitMore = Math.max(0, MIN_MS - elapsed);
      setTimeout(() => {
        if (!alive) return;
        setProgress(1);
        router.replace(route as any);
      }, 500 + waitMore);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const widthInterpolate = barAnim.interpolate({ inputRange: [0, 1], outputRange: ['15%', '92%'] });

  return (
    <View style={styles.container}>
      <View style={styles.brand}>
        <Image source={require('../assets/images/icon.png')} style={styles.logo} />
        <Text style={styles.title}>绘梦岛</Text>
        <Text style={styles.slogan}>DreamIsle · 让想象落地</Text>
      </View>

      <View style={styles.progressWrap}>
        <View style={styles.progressBg}>
          <Animated.View style={[styles.progressBar, { width: widthInterpolate }]} />
        </View>
        <Text style={styles.progressText}>{hydrated ? `加载中 ${Math.round(progress * 100)}%` : '初始化中…'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1220', justifyContent: 'space-between', padding: 24 },
  brand: { alignItems: 'center', marginTop: 110 },
  logo: { width: 92, height: 92, borderRadius: 18 },
  title: { marginTop: 16, color: '#fff', fontSize: 30, fontWeight: '900' },
  slogan: { marginTop: 8, color: '#C7D2FE', fontSize: 13 },
  progressWrap: { marginBottom: 46 },
  progressBg: { height: 10, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  progressBar: { height: '100%', borderRadius: 999, backgroundColor: '#60A5FA' },
  progressText: { marginTop: 10, color: '#9CA3AF', fontSize: 12 },
});

