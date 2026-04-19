import { Stack } from 'expo-router';

export default function AlbumDetailLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: '企划详情' }} />
      <Stack.Screen name="edit" options={{ title: '编辑企划', presentation: 'modal' }} />
    </Stack>
  );
}
