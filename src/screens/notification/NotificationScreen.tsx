import React, { useCallback, useEffect } from 'react';
import { RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { BorderRadius } from '../../constants/theme';
import { FontFamily, FontSize, Typography } from '../../constants/typography';
import { useNotificationStore } from '../../store/useNotificationStore';
import { useTheme } from '../../store/useThemeStore';
import type { Notification as NotificationType } from '../../types/notification';
import type { SettingsChildNavigationProp } from '../../types/navigation';
import { AppScreenHeader } from '../../components/common/AppScreenHeader';
import { ContextBadge } from '../../components/common/ContextBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { HeroSummaryCard } from '../../components/common/HeroSummaryCard';
import { ScreenShell } from '../../components/common/ScreenShell';

function getTimeAgo(timestamp: number) {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Baru saja';
    if (minutes < 60) return `${minutes} menit lalu`;
    if (hours < 24) return `${hours} jam lalu`;
    if (days < 7) return `${days} hari lalu`;
    return new Date(timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function resolveNotificationTone(type: string, colors: ReturnType<typeof useTheme>['colors']) {
    switch (type) {
        case 'goal_reminder':
            return { icon: 'bell-ring-outline', bg: colors.warningBg, fg: colors.warning };
        case 'goal_completed':
            return { icon: 'party-popper', bg: colors.successBg, fg: colors.success };
        case 'budget_warning':
            return { icon: 'alert-circle-outline', bg: colors.dangerBg, fg: colors.danger };
        case 'budget_reminder':
            return { icon: 'chart-pie', bg: colors.infoBg, fg: colors.info };
        case 'recurring_reminder':
            return { icon: 'autorenew', bg: colors.primaryBg, fg: colors.primary };
        case 'manual_reminder':
            return { icon: 'bell-cog-outline', bg: colors.warningBg, fg: colors.warning };
        case 'app_update_available':
            return { icon: 'update', bg: colors.successBg, fg: colors.success };
        case 'wallet_invite':
            return { icon: 'account-group-outline', bg: colors.primaryBg, fg: colors.primary };
        default:
            return { icon: 'bell-outline', bg: colors.primaryBg, fg: colors.primary };
    }
}

const NotificationCard = React.memo(function NotificationCard({
    item,
    onOpen,
    onRead,
    onDelete,
}: {
    item: NotificationType;
    onOpen: () => void;
    onRead: (id: string) => void;
    onDelete: (id: string) => void;
}) {
    const { colors } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);
    const palette = resolveNotificationTone(item.type, colors);

    return (
        <TouchableOpacity
            style={[styles.notificationCard, !item.is_read && styles.notificationUnread]}
            onPress={() => {
                if (!item.is_read) {
                    onRead(item.id);
                }
                onOpen();
            }}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel={`${item.title}. ${item.body}`}
            accessibilityHint="Buka detail notifikasi atau aksi terkait"
        >
            <View style={[styles.notificationIcon, { backgroundColor: palette.bg }]}>
                <MaterialCommunityIcons name={palette.icon as any} size={20} color={palette.fg} />
            </View>
            <View style={styles.notificationCopy}>
                <View style={styles.notificationHeader}>
                    <Text style={styles.notificationTitle} numberOfLines={1}>{item.title}</Text>
                    {!item.is_read ? <View style={styles.unreadDot} /> : null}
                </View>
                <Text style={styles.notificationBody} numberOfLines={2}>{item.body}</Text>
                <Text style={styles.notificationTime}>{getTimeAgo(item.created_at)}</Text>
            </View>
            <TouchableOpacity
                onPress={() => onDelete(item.id)}
                style={styles.deleteButton}
                accessibilityRole="button"
                accessibilityLabel={`Hapus notifikasi ${item.title}`}
            >
                <MaterialCommunityIcons name="close" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
        </TouchableOpacity>
    );
});

export function NotificationScreen() {
    const navigation = useNavigation<SettingsChildNavigationProp<'Notifications'>>();
    const { colors } = useTheme();
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
            navigation.navigate('Savings', { screen: 'SavingDetail', params: { goalId: notification.data.goalId } });
            return;
        }
        if (notification.data?.targetScreen === 'Budget') {
            navigation.navigate('Budget');
            return;
        }
        if (notification.data?.targetScreen === 'RecurringTransaction') {
            navigation.navigate('Transactions', { screen: 'RecurringTransaction' });
            return;
        }
        if (notification.data?.targetScreen === 'ReminderCenter') {
            navigation.navigate('ReminderCenter');
            return;
        }
        if (notification.data?.targetScreen === 'AppUpdate') {
            navigation.navigate('AppUpdate');
            return;
        }
        if (notification.data?.walletId) {
            navigation.navigate('Wallet', { screen: 'WalletList' });
        }
    }, [navigation]);

    return (
        <ScreenShell topInset={false} bottomInset surfaceVariant="alt">
            <AppScreenHeader
                title="Notifikasi"
                subtitle="Pilih yang perlu ditindak, sisanya cukup lewat sekali lihat."
                showBack
                onBackPress={() => navigation.goBack()}
                rightAction={
                    unreadCount > 0
                        ? {
                            icon: 'check-all',
                            label: 'Tandai semua',
                            onPress: readAllNotifications,
                        }
                        : undefined
                }
                variant="transparent"
            />

            <FlashList
                data={notifications}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={isLoading} onRefresh={handleRefresh} tintColor={colors.primary} />}
                ListHeaderComponent={
                    <View style={styles.headerBlock}>
                        <HeroSummaryCard
                            eyebrow="Inbox Aktivitas"
                            title="Pusat notifikasi"
                            value={`${notifications.length} item`}
                            description="Baca update penting dari target, budget, dan kolaborasi dompet tanpa kehilangan konteks."
                            icon="bell-badge-outline"
                            badges={
                                <>
                                    <ContextBadge icon="bell-ring-outline" label={`${unreadCount} belum dibaca`} inverse />
                                    <ContextBadge icon="gesture-tap-button" label="Tepat sasaran" inverse />
                                </>
                            }
                        />
                    </View>
                }
                ListEmptyComponent={
                    <EmptyState
                        icon="bell-off-outline"
                        title="Belum ada notifikasi"
                        description="Saat ada update penting dari target, budget, atau wallet bersama, semuanya akan muncul di sini."
                        actionLabel="Muat ulang"
                        onAction={handleRefresh}
                    />
                }
                renderItem={({ item }) => (
                    <NotificationCard
                        item={item}
                        onOpen={() => handleNotificationPress(item)}
                        onRead={readNotification}
                        onDelete={removeNotification}
                    />
                )}
                ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            />
        </ScreenShell>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
    StyleSheet.create({
        content: {
            paddingHorizontal: 20,
            paddingBottom: 108,
        },
        headerBlock: {
            marginBottom: 16,
        },
        notificationCard: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 12,
            backgroundColor: colors.panelSurface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: BorderRadius['4xl'],
            padding: 16,
        },
        notificationUnread: {
            borderColor: colors.focusRing,
        },
        notificationIcon: {
            width: 44,
            height: 44,
            borderRadius: BorderRadius.xl,
            alignItems: 'center',
            justifyContent: 'center',
        },
        notificationCopy: {
            flex: 1,
            gap: 4,
        },
        notificationHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
        },
        notificationTitle: {
            ...Typography.h4,
            color: colors.textPrimary,
            flex: 1,
        },
        unreadDot: {
            width: 8,
            height: 8,
            borderRadius: BorderRadius.full,
            backgroundColor: colors.primary,
        },
        notificationBody: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.body,
            lineHeight: 20,
            color: colors.textSecondary,
        },
        notificationTime: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: colors.textTertiary,
        },
        deleteButton: {
            width: 28,
            height: 28,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 2,
        },
    });
