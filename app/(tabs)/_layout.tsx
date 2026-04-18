import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Tabs } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import { moderateScale, verticalScale } from '@/src/utils/uiScale';

function TabsTopSpacer() {
  return <View style={styles.topSpacer} />;
}

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
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

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tabItem}>
            <Text style={[styles.tabLabel, { color: isFocused ? '#000000' : '#838383' }]}>{label}</Text>
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
      {/* 先按设计稿同步底部文案和基础样式，路由结构暂不调整。 */}
      <Tabs.Screen
        name="home/index"
        options={{
          title: '首页',
        }}
      />
      <Tabs.Screen
        name="projects/index"
        options={{
          title: '企划',
        }}
      />
      <Tabs.Screen
        name="market/index"
        options={{
          title: '市场',
        }}
      />
      <Tabs.Screen
        name="messages/index"
        options={{
          title: '消息',
        }}
      />
      <Tabs.Screen
        name="me/index"
        options={{
          title: '个人',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  scene: {
    backgroundColor: '#FFFFFF',
  },
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
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabLabel: {
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    fontSize: moderateScale(20),
    lineHeight: moderateScale(20),
    letterSpacing: 0,
  },
});
