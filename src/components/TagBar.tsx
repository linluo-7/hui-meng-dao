import React, { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { scale, verticalScale } from '@/src/utils/uiScale';

export interface TagBarProps {
  title?: string;
  tags?: string[];
  selectedTags?: string[];
  onTagPress?: (tag: string) => void;
}

export function TagBar({ title = '推荐', tags = [], selectedTags = [], onTagPress }: TagBarProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleTagPress = (tag: string) => {
    onTagPress?.(tag);
  };

  return (
    <>
      <View style={styles.bar}>
        <Text style={styles.title}>{title}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagScroll} contentContainerStyle={styles.tagContent}>
          {tags.map((tag) => {
            const isSelected = selectedTags.includes(tag);
            return (
              <Pressable key={tag} style={[styles.tagChip, isSelected && styles.tagChipSelected]} onPress={() => handleTagPress(tag)}>
                <Text style={[styles.tagText, isSelected && styles.tagTextSelected]}>{tag}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <Pressable style={styles.arrowWrap} onPress={() => setIsDropdownOpen(true)}>
          <Image source={require('../../assets/images/home-tag-arrow.png')} style={styles.arrow} />
        </Pressable>
      </View>

      <Modal visible={isDropdownOpen} transparent animationType="slide" onRequestClose={() => setIsDropdownOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setIsDropdownOpen(false)}>
          <Pressable style={styles.dropdownPanel} onPress={() => {}}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownTitle}>选择标签</Text>
              <Pressable onPress={() => setIsDropdownOpen(false)}>
                <Text style={styles.dropdownDone}>完成</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.dropdownList}>
              {tags.map((tag) => (
                <Pressable key={tag} style={styles.dropdownItem} onPress={() => { handleTagPress(tag); setIsDropdownOpen(false); }}>
                  <Text style={styles.dropdownText}>{tag}</Text>
                  {selectedTags.includes(tag) && <Text style={styles.dropdownCheck}>✓</Text>}
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(4),
  },
  title: {
    fontSize: scale(16),
    fontWeight: '700',
    color: '#000000',
    marginRight: scale(12),
  },
  tagScroll: {
    flex: 1,
    height: verticalScale(24),
  },
  tagContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: scale(30),
  },
  tagChip: {
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    borderRadius: scale(9),
    backgroundColor: '#D9D9D9',
    marginRight: scale(8),
  },
  tagChipSelected: {
    backgroundColor: '#FF4D4D',
  },
  tagText: {
    fontSize: scale(14),
    fontWeight: '400',
    color: '#000000',
  },
  tagTextSelected: {
    color: '#FFFFFF',
  },
  arrowWrap: {
    position: 'absolute',
    right: 0,
    width: scale(20),
    height: scale(20),
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrow: {
    width: scale(16),
    height: scale(16),
    resizeMode: 'contain',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  dropdownPanel: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: scale(16),
    borderTopRightRadius: scale(16),
    maxHeight: '60%',
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: scale(16),
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  dropdownTitle: {
    fontSize: scale(16),
    fontWeight: '600',
  },
  dropdownDone: {
    fontSize: scale(14),
    color: '#FF4D4D',
  },
  dropdownList: {
    padding: scale(16),
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  dropdownText: {
    fontSize: scale(14),
    color: '#000000',
  },
  dropdownCheck: {
    color: '#FF4D4D',
    fontSize: scale(16),
    fontWeight: '600',
  },
});