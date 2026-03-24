import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { FontFamily, FontSize, Typography } from '../../constants/typography';
import { useTheme } from '../../store/useThemeStore';
import { useNotificationStore } from '../../store/useNotificationStore';
import { EmptyState } from '../../components/common/EmptyState';
import type { Notification as NotificationType } from '../../types/notification';

interface NotificationItemProps {
  notification: NotificationType;
  onPress: () => void;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
  styles: any;
}

function NotificationItem({ notification, onPress, onRead, onDelete, styles }: NotificationItemProps) {
  const { colors } = useTheme();
  const getNotificationIcon = (type: string): { name: string; color: string; bgColor: string } => {
    switch (type) {
      case 'goal_reminder':
        return { name: 'bell-ring', color: colors.warning, bgColor: colors.warningBg };
      case 'goal_completed':
        return { name: 'party-popper', color: colors.success, bgColor: colors.successBg };
      case 'budget_warning':
        return { name: 'alert-circle', color: colors.danger, bgColor: colors.dangerBg };
      case 'wallet_invite':
        return { name: 'account-group', color: colors.primary, bgColor: colors.primaryLight };
      default:
        return { name: 'bell', color: colors.primary, bgColor: colors.primaryLight };
    }
  };

  const icon = getNotificationIcon(notification.type);
  const timeAgo = getTimeAgo(notification.created_at);

  return (
    <Animated.View entering={FadeInDown} style={[styles.notificationItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <TouchableOpacity
        style={styles.notificationContent}
        onPress={() => {
          if (!notification.is_read) {
            onRead(notification.id);
          }
          onPress();
        }}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: icon.bgColor }]}>
          <MaterialCommunityIcons name={icon.name as any} size={24} color={icon.color} />
        </View>

        <View style={styles.notificationText}>
          <View style={styles.notificationHeader}>
            <Text style={[styles.notificationTitle, { color: colors.textPrimary }]} numberOfLines={1}>
              {notification.title}
            </Text>
            {!notification.is_read && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
          </View>
          <Text style={[styles.body, { color: colors.textSecondary }]} numberOfLines={2}>
            {notification.body}
          </Text>
          <Text style={[styles.time, { color: colors.textTertiary }]}>{timeAgo}</Text>
        </View>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => onDelete(notification.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons name="close" size={20} color={colors.textTertiary} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

function getTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'Baru saja';
  if (minutes < 60) return `${minutes} menit yang lalu`;
  if (hours < 24) return `${hours} jam yang lalu`;
  if (days < 7) return `${days} hari yang lalu`;
  return new Date(timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function NotificationScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const insets = useSafeAreaInsets();
  const { colors, mode } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);

  const {
    notifications,
    unreadCount,
    isLoading,
    loadNotifications,
    readNotification,
    readAllNotifications,
    removeNotification,
  } = useNotificationStore();

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleRefresh = useCallback(async () => {
    await loadNotifications();
  }, [loadNotifications]);

  const handleNotificationPress = useCallback((notification: NotificationType) => {
    // Navigate based on notification type and data
    if (notification.data?.goalId) {
      navigation.navigate('Savings', {
        screen: 'SavingDetail',
        params: { goalId: notification.data.goalId },
      });
    } else if (notification.data?.walletId) {
      navigation.navigate('Wallet', {
        screen: 'WalletList',
      });
    }
  }, [navigation]);

  const renderNotification = useCallback(({ item }: { item: NotificationType }) => (
    <NotificationItem
      notification={item}
      onPress={() => handleNotificationPress(item)}
      onRead={readNotification}
      onDelete={removeNotification}
      styles={styles}
    />
  ), [handleNotificationPress, readNotification, removeNotification]);

  return (
    <View
      style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}
    >
      <StatusBar
        barStyle={mode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor='transparent'
        translucent
      />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>Notifikasi</Text>
          {unreadCount > 0 && (
            <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.unreadBadgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </View>

        {unreadCount > 0 && (
          <TouchableOpacity
            style={styles.markAllReadButton}
            onPress={readAllNotifications}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={[styles.markAllReadText, { color: colors.primary }]}>Tandai Semua</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <EmptyState
            icon="bell-off"
            title="Tidak ada notifikasi"
            message="Semua notifikasi akan muncul di sini"
          />
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    gap: 8,
  },
  screenTitle: {
    ...Typography.h2,
    color: colors.textPrimary,
  },
  unreadBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  markAllReadButton: {
    paddingHorizontal: 8,
  },
  markAllReadText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.body,
    color: colors.primary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  listContent: {
    paddingVertical: 16,
  },
  notificationItem: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationText: {
    flex: 1,
    marginRight: 8,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  notificationTitle: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.body,
    color: colors.textPrimary,
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  body: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.caption,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 4,
  },
  time: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.caption,
    color: colors.textTertiary,
  },
  deleteButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
