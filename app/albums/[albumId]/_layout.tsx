import { Stack } from 'expo-router';

export default function AlbumDetailLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: '企划详情' }} />
      <Stack.Screen name="edit" options={{ title: '编辑企划', presentation: 'modal' }} />
      <Stack.Screen name="apply" options={{ title: '申请加入', presentation: 'modal' }} />
      <Stack.Screen name="announcements" options={{ title: '公告管理', presentation: 'modal' }} />
    </Stack>
  );
}
