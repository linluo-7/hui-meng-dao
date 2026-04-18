import React, { useRef, useState } from 'react';
import { Dimensions, FlatList, Image, StyleSheet, View, Text, Pressable } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ImageCarouselProps {
  images: string[];
  height?: number;
}

export function ImageCarousel({ images, height = 250 }: ImageCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  if (!images || images.length === 0) {
    return (
      <View style={[styles.container, { height }]}>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>暂无图片</Text>
        </View>
      </View>
    );
  }

  const onScroll = (event: any) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveIndex(index);
  };

  const goToIndex = (index: number) => {
    flatListRef.current?.scrollToIndex({ index, animated: true });
    setActiveIndex(index);
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={images}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyExtractor={(item, index) => `image-${index}`}
        renderItem={({ item }) => (
          <Image source={{ uri: item }} style={[styles.image, { width: SCREEN_WIDTH, height }]} />
        )}
      />
      {/* 指示器 */}
      {images.length > 1 && (
        <View style={styles.indicatorContainer}>
          {images.map((_, index) => (
            <Pressable key={index} onPress={() => goToIndex(index)}>
              <View
                style={[
                  styles.indicator,
                  index === activeIndex && styles.indicatorActive,
                ]}
              />
            </Pressable>
          ))}
        </View>
      )}
      {/* 页码 */}
      {images.length > 1 && (
        <View style={styles.pageNumber}>
          <Text style={styles.pageText}>{activeIndex + 1}/{images.length}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: '#F3F4F6',
  },
  image: {
    resizeMode: 'cover',
  },
  placeholder: {
    width: SCREEN_WIDTH,
    height: 250,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E5E7EB',
  },
  placeholderText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  indicatorContainer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  indicatorActive: {
    backgroundColor: '#fff',
    width: 18,
  },
  pageNumber: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  pageText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});