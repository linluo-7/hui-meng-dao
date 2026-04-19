import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Tabs } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import { useUserProfileStore } from '@/src/stores/userProfileStore';
import { moderateScale, verticalScale } from '@/src/utils/uiScale';

function TabsTopSpacer() {
  return <View style={styles.topSpacer} />;
}

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { unreadCount, loadUnreadCount } = useUserProfileStore();

  useEffect(() => {
    void loadUnreadCount();
  }, [state.index, loadUnreadCount]);

  return (
    <View style={styles.tabBar}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label =
          typeof options.tabBarLabel === 'string'
            ? options.tabBarLabel
            : typeof options.title === 'string'
              ? options.title
              : route.name;
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        const isMessages = route.name === 'messages/index';

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tabItem}>
            {isMessages && unreadCount > 0 ? (
              <View style={styles.tabWithBadge}>
                <Text style={[styles.tabLabel, { color: isFocused ? '#000000' : '#838383' }]}>{label}</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
              </View>
            ) : (
              <Text style={[styles.tabLabel, { color: isFocused ? '#000000' : '#838383' }]}>{label}</Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        header: () => <TabsTopSpacer />,
        headerShadowVisible: false,
        sceneStyle: styles.scene,
      }}>
      <Tabs.Screen
        name="home/index"
        options={{ title: '首页' }}
      />
      <Tabs.Screen
        name="projects/index"
        options={{ title: '企划' }}
      />
      <Tabs.Screen
        name="market/index"
        options={{ title: '市场' }}
      />
      <Tabs.Screen
        name="messages/index"
        options={{ title: '消息' }}
      />
      <Tabs.Screen
        name="me/index"
        options={{ title: '个人' }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  scene: { backgroundColor: '#FFFFFF' },
  topSpacer: {
    height: verticalScale(61),
    backgroundColor: '#D9D9D9',
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: verticalScale(64),
    paddingBottom: verticalScale(30),
    backgroundColor: '#FFFFFF',
    borderTopWidth: 0,
    elevation: 0,
  },
  tabItem: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabLabel: {
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    fontSize: moderateScale(20),
    lineHeight: moderateScale(20),
    letterSpacing: 0,
  },
  tabWithBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  badge: {
    minWidth: verticalScale(16),
    height: verticalScale(16),
    borderRadius: 99,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#FFFFFF', fontSize: moderateScale(10), fontWeight: '700', lineHeight: verticalScale(16) },
});
