import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

export function SearchBar({
  value,
  placeholder,
  onChangeText,
  onClear,
}: {
  value: string;
  placeholder?: string;
  onChangeText: (v: string) => void;
  onClear?: () => void;
}) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.icon}>🔎</Text>
      <TextInput
        value={value}
        placeholder={placeholder ?? '搜索'}
        onChangeText={onChangeText}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
        placeholderTextColor="#9CA3AF"
      />
      {!!value && (
        <Pressable onPress={onClear} hitSlop={10}>
          <Text style={styles.clear}>✕</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 42,
  },
  icon: { marginRight: 8, fontSize: 14 },
  input: { flex: 1, fontSize: 14, color: '#111827' },
  clear: { color: '#6B7280', fontSize: 14, paddingHorizontal: 6, paddingVertical: 6 },
});

