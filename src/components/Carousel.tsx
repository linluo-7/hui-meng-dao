import React, { useMemo, useRef, useState } from 'react';
import { FlatList, LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, StyleSheet, Text, View } from 'react-native';

type Item = { id: string; title: string; subtitle?: string };

export function Carousel({ items, showDots = true }: { items: Item[]; showDots?: boolean }) {
  const listRef = useRef<FlatList<Item>>(null);
  const [index, setIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const pages = useMemo(() => items.slice(0, 6), [items]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const w = e.nativeEvent.layoutMeasurement.width;
    const next = Math.round(x / Math.max(1, w));
    if (next !== index) setIndex(next);
  };

  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w > 0 && w !== containerWidth) setContainerWidth(w);
  };

  return (
    <View onLayout={onLayout}>
      <FlatList
        ref={listRef}
        data={pages}
        keyExtractor={(it) => it.id}
        horizontal
        pagingEnabled
        getItemLayout={(_, i) => {
          const w = containerWidth || 1;
          return { length: w, offset: w * i, index: i };
        }}
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <View style={[styles.page, { width: containerWidth || undefined }]}>
            <View style={styles.card}>
              <Text style={styles.title}>{item.title}</Text>
              {!!item.subtitle && <Text style={styles.sub}>{item.subtitle}</Text>}
            </View>
          </View>
        )}
      />
      {showDots && (
        <View style={styles.dots}>
          {pages.map((p, i) => (
            <View key={p.id} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { paddingRight: 12 },
  card: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    minHeight: 110,
    justifyContent: 'center',
  },
  title: { color: '#fff', fontSize: 16, fontWeight: '900' },
  sub: { color: '#D1D5DB', marginTop: 6, fontSize: 13, lineHeight: 18 },
  dots: { flexDirection: 'row', justifyContent: 'center', marginTop: 10, gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 99, backgroundColor: '#D1D5DB' },
  dotActive: { backgroundColor: '#111827', width: 16 },
});

