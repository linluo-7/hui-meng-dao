import { Stack } from 'expo-router';

export default function AlbumsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: '企划' }} />
      <Stack.Screen name="create" options={{ title: '创建企划', presentation: 'modal' }} />
      <Stack.Screen name="[albumId]" options={{ title: '企划详情' }} />
    </Stack>
  );
}
