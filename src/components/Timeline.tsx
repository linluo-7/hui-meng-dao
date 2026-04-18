import React from 'react';
import { StyleSheet, View, Text, Image, ScrollView, Pressable } from 'react-native';

interface TimelineItem {
  id: string;
  title: string;
  content: string;
  imageUrls: string[];
  createdAt: string;
}

interface TimelineProps {
  items: TimelineItem[];
  onEdit?: (item: TimelineItem) => void;
  onDelete?: (itemId: string) => void;
  onAdd?: () => void;
  editable?: boolean;
}

export function Timeline({ items, onEdit, onDelete, onAdd, editable = false }: TimelineProps) {
  if (!items || items.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>暂无时间轴</Text>
        <Text style={styles.emptyHint}>在编辑页面添加时间点</Text>
      </View>
    );
  }

  // 按时间正序排列（从上到下）
  const sortedItems = [...items].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  return (
    <View style={styles.container}>
      {sortedItems.map((item, index) => (
        <View key={item.id} style={styles.item}>
          {/* 时间点标记 */}
          <View style={styles.markerContainer}>
            <View style={styles.marker} />
            {index < sortedItems.length - 1 && <View style={styles.line} />}
          </View>

          {/* 时间点内容 */}
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.title}>{item.title || '未命名时间点'}</Text>
              {editable && (
                <View style={styles.actions}>
                  <Pressable onPress={() => onEdit?.(item)} style={styles.actionBtn}>
                    <Text style={styles.actionText}>编辑</Text>
                  </Pressable>
                  <Pressable onPress={() => onDelete?.(item.id)} style={[styles.actionBtn, styles.deleteBtn]}>
                    <Text style={styles.deleteText}>删除</Text>
                  </Pressable>
                </View>
              )}
            </View>

            {item.content ? (
              <Text style={styles.contentText}>{item.content}</Text>
            ) : null}

            {/* 图片网格 */}
            {item.imageUrls && item.imageUrls.length > 0 && (
              <View style={styles.imageGrid}>
                {item.imageUrls.slice(0, 9).map((url, imgIndex) => (
                  <View key={imgIndex} style={styles.imageWrapper}>
                    <Image source={{ uri: url }} style={styles.image} />
                  </View>
                ))}
              </View>
            )}

            <Text style={styles.date}>
              {new Date(item.createdAt).toLocaleDateString('zh-CN')}
            </Text>
          </View>
        </View>
      ))}

      {/* 新增按钮 */}
      {editable && (
        <Pressable onPress={onAdd} style={styles.addBtn}>
          <Text style={styles.addText}>+ 添加时间点</Text>
        </Pressable>
      )}
    </View>
  );
}

// 只读版本（用于展示）
export function TimelineView({ items }: { items: TimelineItem[] }) {
  return <Timeline items={items} />;
}

// 可编辑版本
export function TimelineEditor(props: Omit<TimelineProps, 'editable'>) {
  return <Timeline {...props} editable />;
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  empty: {
    minHeight: 200,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 24,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyHint: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 8,
  },
  item: {
    flexDirection: 'row',
  },
  markerContainer: {
    width: 20,
    alignItems: 'center',
  },
  marker: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#111827',
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: '#E5E7EB',
    marginTop: 4,
  },
  content: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginLeft: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '900',
    color: '#111827',
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  actionText: {
    fontSize: 12,
    color: '#1D4ED8',
    fontWeight: '600',
  },
  deleteBtn: {},
  deleteText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
  },
  contentText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 8,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  imageWrapper: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  date: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'right',
  },
  addBtn: {
    marginLeft: 28,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    borderStyle: 'dashed',
  },
  addText: {
    color: '#1D4ED8',
    fontSize: 13,
    fontWeight: '600',
  },
});