import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { useFonts } from 'expo-font';
import { Inter_400Regular } from '@expo-google-fonts/inter';

import { useColorScheme } from '@/components/useColorScheme';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'splash',
};

// Keep the native splash visible until our JS entry is ready.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
  });

  useEffect(() => {
    // Once JS bootstraps, hide native splash; we will show our in-app `app/splash.tsx` page.
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerBackTitle: '返回' }}>
        {/* M1 */}
        <Stack.Screen name="splash" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="auth/index" options={{ title: '登录 / 注册' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        {/* Other stack routes (skeleton; filled in later milestones) */}
        <Stack.Screen name="projects/[projectId]" options={{ title: '企划详情' }} />
        <Stack.Screen name="projects/create" options={{ title: '创建企划' }} />
        <Stack.Screen name="projects/edit/[projectId]" options={{ title: '编辑企划' }} />
        <Stack.Screen name="projects/review/[projectId]" options={{ title: '审核' }} />
        <Stack.Screen name="projects/ops/[projectId]" options={{ title: '运营后台' }} />

        <Stack.Screen name="roles/index" options={{ title: '我的角色' }} />
        <Stack.Screen name="roles/[roleId]" options={{ title: '角色详情' }} />
        <Stack.Screen name="roles/create" options={{ title: '创建角色' }} />
        <Stack.Screen name="roles/edit/[roleId]" options={{ title: '编辑角色' }} />

        <Stack.Screen name="chat/rp/[projectId]" options={{ title: '戏群' }} />
        <Stack.Screen name="chat/water/[projectId]" options={{ title: '水群' }} />
        <Stack.Screen name="dm/index" options={{ title: '私信' }} />
        <Stack.Screen name="dm/[threadId]" options={{ title: '聊天' }} />

        <Stack.Screen name="settings/index" options={{ title: '设置' }} />
        <Stack.Screen name="settings/account-security" options={{ title: '账号与安全' }} />
        <Stack.Screen name="settings/change-password" options={{ title: '密码设置' }} />
        <Stack.Screen name="settings/change-phone" options={{ title: '手机号修改' }} />
        <Stack.Screen name="settings/login-devices" options={{ title: '登录设备管理' }} />
        <Stack.Screen name="settings/deactivate-account" options={{ title: '注销账号' }} />
        <Stack.Screen name="notifications/index" options={{ title: '通知中心' }} />

        <Stack.Screen name="works/submit/[projectId]" options={{ title: '提交作品' }} />
        <Stack.Screen name="works/[workId]" options={{ title: '作品详情' }} />

        {/* 创建页面 */}
        <Stack.Screen name="posts/create" options={{ title: '发布帖子' }} />
        <Stack.Screen name="posts/[postId]" options={{ title: '帖子详情' }} />
      </Stack>
    </ThemeProvider>
  );
}
