import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { dataGateway } from '@/src/services/dataGateway';
import { toast } from '@/src/components/toast';

type DeviceItem = { id: string; deviceName: string; lastLoginAt: string; createdAt: string };

export default function LoginDevicesPage() {
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const list = await dataGateway.me.listDevices();
        setDevices(list);
      } catch (error) {
        toast(error instanceof Error ? error.message : '加载失败');
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? <Text style={styles.tip}>加载中...</Text> : null}
        {!loading && devices.length === 0 ? <Text style={styles.tip}>暂无登录设备记录</Text> : null}
        {devices.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.name}>{item.deviceName}</Text>
            <Text style={styles.meta}>最近登录：{new Date(item.lastLoginAt).toLocaleString()}</Text>
            <Text style={styles.meta}>首次记录：{new Date(item.createdAt).toLocaleString()}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F8FA' },
  content: { padding: 16, gap: 10 },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12 },
  name: { color: '#111827', fontWeight: '800', marginBottom: 6 },
  meta: { color: '#6B7280', fontSize: 12, marginTop: 2 },
  tip: { textAlign: 'center', color: '#6B7280', marginTop: 16 },
});
