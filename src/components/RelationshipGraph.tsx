import React from 'react';
import { Dimensions, StyleSheet, View, Text, Image } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface RelationshipNode {
  id: string;
  name: string;
  avatarUrl?: string;
  relation?: string; // 与主角色的关系描述
  role: 'main' | 'related';
}

interface RelationshipEdge {
  source: string;
  target: string;
  label?: string;
}

interface RelationshipData {
  nodes: RelationshipNode[];
  edges: RelationshipEdge[];
}

interface RelationshipGraphProps {
  data: RelationshipData | null;
  mainRoleName: string;
  mainRoleAvatar?: string;
}

export function RelationshipGraph({ data, mainRoleName, mainRoleAvatar }: RelationshipGraphProps) {
  if (!data || !data.nodes || data.nodes.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>暂无关系网</Text>
        <Text style={styles.emptyHint}>在编辑页面添加关联角色</Text>
      </View>
    );
  }

  const mainNode = data.nodes.find(n => n.role === 'main') || { id: 'main', name: mainRoleName, role: 'main' as const };
  const relatedNodes = data.nodes.filter(n => n.role === 'related');
  const nodeCount = relatedNodes.length;

  if (nodeCount === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>暂无关联角色</Text>
        <Text style={styles.emptyHint}>在编辑页面添加关联角色</Text>
      </View>
    );
  }

  // 计算圆形布局
  const centerX = SCREEN_WIDTH / 2;
  const centerY = 180;
  const radius = Math.min(120, 90 + nodeCount * 15);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* 主角色（中心） */}
      <View style={[styles.mainNode, { left: centerX - 40, top: centerY - 40 }]}>
        {mainRoleAvatar ? (
          <Image source={{ uri: mainRoleAvatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>🎭</Text>
          </View>
        )}
        <Text style={styles.mainName} numberOfLines={1}>{mainNode.name}</Text>
      </View>

      {/* 关系角色（围绕主角色） */}
      {relatedNodes.map((node, index) => {
        const angle = (2 * Math.PI * index) / nodeCount - Math.PI / 2;
        const x = centerX + radius * Math.cos(angle) - 35;
        const y = centerY + radius * Math.sin(angle) - 45;

        return (
          <React.Fragment key={node.id}>
            {/* 连接线 */}
            <View
              style={[
                styles.edgeLine,
                {
                  left: centerX,
                  top: centerY,
                  width: radius,
                  transform: [{ rotate: `${angle + Math.PI / 2}rad` }],
                  transformOrigin: 'left center',
                },
              ]}
            />
            {/* 关系标签（在线上显示） */}
            {node.relation && (
              <View
                style={[
                  styles.edgeLabel,
                  {
                    left: centerX + (radius / 2) * Math.cos(angle) - 20,
                    top: centerY + (radius / 2) * Math.sin(angle) - 10,
                  },
                ]}
              >
                <Text style={styles.edgeLabelText}>{node.relation}</Text>
              </View>
            )}
            {/* 关系节点 */}
            <View style={[styles.relatedNode, { left: x, top: y }]}>
              {node.avatarUrl ? (
                <Image source={{ uri: node.avatarUrl }} style={styles.smallAvatar} />
              ) : (
                <View style={styles.smallAvatarPlaceholder}>
                  <Text style={{ fontSize: 20 }}>👤</Text>
                </View>
              )}
              <Text style={styles.relatedName} numberOfLines={1}>{node.name}</Text>
            </View>
          </React.Fragment>
        );
      })}
    </ScrollView>
  );
}

import { ScrollView } from 'react-native';

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    maxHeight: 400,
  },
  contentContainer: {
    minHeight: 360,
    paddingVertical: 20,
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
  mainNode: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 10,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#111827',
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#111827',
  },
  avatarText: {
    fontSize: 32,
  },
  mainName: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '900',
    color: '#111827',
    maxWidth: 80,
    textAlign: 'center',
  },
  relatedNode: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 5,
  },
  smallAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#9CA3AF',
  },
  smallAvatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#9CA3AF',
  },
  relatedName: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
    maxWidth: 70,
    textAlign: 'center',
  },
  edgeLabel: {
    position: 'absolute',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    zIndex: 8,
  },
  edgeLabelText: {
    fontSize: 10,
    color: '#1D4ED8',
    fontWeight: '600',
  },
  edgeLine: {
    position: 'absolute',
    height: 2,
    backgroundColor: '#D1D5DB',
  },
});