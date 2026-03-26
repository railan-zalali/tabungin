import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { FontFamily, FontSize, Typography } from '../../constants/typography';
import { useTheme } from '../../store/useThemeStore';
import { useNotificationStore } from '../../store/useNotificationStore';
import { EmptyState } from '../../components/common/EmptyState';
import { Button } from '../../components/common/Button';
import { BorderRadius, Shadow } from '../../constants/theme';
import type { Notification as NotificationType } from '../../types/notification';

interface NotificationItemProps {
  notification: NotificationType;
  onPress: () => void;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
  colors: any;
  styles: any;
}

function NotificationItem({ notification, onPress, onRead, onDelete, colors, styles }: NotificationItemProps) {
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
    <Animated.View entering={FadeInDown.springify()} style={[styles.notificationItem, Shadow.sm]}>
      <TouchableOpacity
        style={styles.notificationContent}
        onPress={() => {
          if (!notification.is_read) {
            onRead(notification.id);
          }
          onPress();
        }}
        activeOpacity={0.8}
      >
        <View style={[styles.iconContainer, { backgroundColor: icon.bgColor }]}>
          <MaterialCommunityIcons name={icon.name as any} size={22} color={icon.color} />
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
  }, [loadNotifications]);

  const handleRefresh = useCallback(async () => {
    await loadNotifications();
  }, [loadNotifications]);

  const handleNotificationPress = useCallback((notification: NotificationType) => {
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
      colors={colors}
      styles={styles}
    />
  ), [colors, handleNotificationPress, readNotification, removeNotification, styles]);

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={mode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />
      <View style={styles.bgAuraTop} pointerEvents="none" />
      <View style={styles.bgAuraBottom} pointerEvents="none" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>Notifikasi</Text>
          <Text style={[styles.screenSubtitle, { color: colors.textSecondary }]}>
            Semua pembaruan penting dari budget, dompet, dan target.
          </Text>
        </View>

        {unreadCount > 0 ? (
          <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.unreadBadgeText}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        ) : (
          <View style={styles.spacer} />
        )}
      </View>

      <View style={styles.heroWrap}>
        <Animated.View entering={FadeInDown.delay(50).springify()}>
          <View style={[styles.heroCard, Shadow.md]}>
            <View style={styles.heroTopRow}>
              <View style={[styles.heroIcon, { backgroundColor: colors.primaryBg }]}>
                <MaterialCommunityIcons name="bell-badge-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.heroCopy}>
                <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>Pusat Notifikasi</Text>
                <Text style={[styles.heroDescription, { color: colors.textSecondary }]}>
                  Tetap singkat, cepat dibaca, dan langsung ke tindakan yang relevan.
                </Text>
              </View>
            </View>

            <View style={styles.heroStats}>
              <View style={[styles.heroStat, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
                <Text style={[styles.heroStatValue, { color: colors.textPrimary }]}>{notifications.length}</Text>
                <Text style={[styles.heroStatLabel, { color: colors.textSecondary }]}>Total</Text>
              </View>
              <View style={[styles.heroStat, { backgroundColor: colors.primaryBg, borderColor: `${colors.primary}22` }]}>
                <Text style={[styles.heroStatValue, { color: colors.primary }]}>{unreadCount}</Text>
                <Text style={[styles.heroStatLabel, { color: colors.textSecondary }]}>Belum dibaca</Text>
              </View>
            </View>
          </View>
        </Animated.View>
      </View>

      <View style={styles.actionRow}>
        {unreadCount > 0 && (
          <Button
            label="Tandai Semua"
            onPress={readAllNotifications}
            variant="secondary"
            fullWidth
          />
        )}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <EmptyState
            icon="bell-off"
            title="Tidak ada notifikasi"
            description="Semua notifikasi akan muncul di sini ketika ada pembaruan penting."
            actionLabel="Muat Ulang"
            onAction={handleRefresh}
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
  bgAuraTop: {
    position: 'absolute',
    top: -120,
    right: -40,
    width: 240,
    height: 240,
    borderRadius: BorderRadius.full,
    backgroundColor: colors.primaryLight,
    opacity: 0.45,
  },
  bgAuraBottom: {
    position: 'absolute',
    bottom: -140,
    left: -60,
    width: 280,
    height: 280,
    borderRadius: BorderRadius.full,
    backgroundColor: colors.successBg,
    opacity: 0.35,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  headerContent: {
    flex: 1,
  },
  screenTitle: {
    ...Typography.h2,
    color: colors.textPrimary,
  },
  screenSubtitle: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.caption,
    marginTop: 2,
  },
  unreadBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    minWidth: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: 12,
        color: colors.textInverse,
  },
  spacer: {
    width: 26,
    height: 26,
  },
  heroWrap: {
    paddingHorizontal: 16,
    paddingTop: 4,
    marginBottom: 12,
  },
  heroCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: {
    flex: 1,
  },
  heroTitle: {
    fontFamily: FontFamily.headingMedium,
    fontSize: FontSize.h4,
  },
  heroDescription: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.caption,
    marginTop: 4,
    lineHeight: 18,
  },
  heroStats: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  heroStat: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  heroStatValue: {
    fontFamily: FontFamily.heading,
    fontSize: FontSize.h3,
  },
  heroStatLabel: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.caption,
    marginTop: 2,
  },
  actionRow: {
    paddingHorizontal: 16,
    marginBottom: 8,
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
    paddingVertical: 12,
    paddingBottom: 28,
  },
  notificationItem: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: colors.surfaceElevated,
    overflow: 'hidden',
    borderColor: colors.border,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
  },
  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: 16,
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
    lineHeight: 20,
    marginBottom: 4,
  },
  time: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.caption,
  },
  deleteButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
