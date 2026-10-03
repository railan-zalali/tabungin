// Bagian "Akses & Aktivitas Shared" pada detail target.
// Diekstrak dari SavingDetailScreen.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { BorderRadius } from '../../constants/theme';
import { FontFamily, FontSize } from '../../constants/typography';
import { useTheme } from '../../store/useThemeStore';
import { SectionHeader } from '../common/SectionHeader';
import { formatDateShort } from '../../utils/date';
import {
    getSharingActivityDescription,
    getSharingActivityLabel,
} from '../../utils/goalSharing';
import type { GoalSharingActivity, GoalSharingMember, GoalPermissionLevel } from '../../types/saving';

function formatPermissionLabel(permissionLevel: GoalPermissionLevel | string) {
    switch (permissionLevel) {
        case 'admin':
            return 'Admin';
        case 'read_only':
            return 'Read only';
        case 'read_write':
        default:
            return 'Bisa edit';
    }
}

interface SharingAccessSectionProps {
    members: GoalSharingMember[];
    activity: GoalSharingActivity[];
    animationDelay?: number;
}

export function SharingAccessSection({ members, activity, animationDelay = 240 }: SharingAccessSectionProps) {
    const { colors } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);

    return (
        <Animated.View entering={FadeInUp.delay(animationDelay).springify()} style={styles.section}>
            <SectionHeader
                title="Akses & Aktivitas Shared"
                subtitle="Lihat siapa yang punya akses dan perubahan penting yang tercatat."
            />
            <View style={styles.card}>
                {members.length > 0 ? (
                    <View style={styles.memberList}>
                        {members.map((member) => (
                            <View key={member.user_email} style={styles.memberItem}>
                                <View style={styles.memberIcon}>
                                    <MaterialCommunityIcons name="account-outline" size={18} color={colors.info} />
                                </View>
                                <View style={styles.memberCopy}>
                                    <Text style={styles.memberTitle}>{member.user_email}</Text>
                                    <Text style={styles.memberMeta}>
                                        {formatPermissionLabel(member.permission_level)} • dibagikan{' '}
                                        {formatDateShort(member.shared_at)}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>
                ) : (
                    <View style={styles.inlineInfo}>
                        <MaterialCommunityIcons name="account-off-outline" size={18} color={colors.textSecondary} />
                        <Text style={styles.inlineInfoText}>
                            Belum ada anggota tambahan dengan akses langsung ke target ini.
                        </Text>
                    </View>
                )}

                <View style={styles.activityBlock}>
                    <Text style={styles.activityTitleLabel}>Timeline Aktivitas</Text>
                    {activity.length > 0 ? (
                        <View style={styles.activityList}>
                            {activity.map((item, index) => (
                                <View key={item.id}>
                                    <View style={styles.activityItem}>
                                        <View style={styles.activityDot} />
                                        <View style={styles.activityCopy}>
                                            <Text style={styles.activityItemTitle}>
                                                {getSharingActivityLabel(item)}
                                            </Text>
                                            <Text style={styles.activityItemDescription}>
                                                {getSharingActivityDescription(item)}
                                            </Text>
                                            <Text style={styles.activityItemDate}>
                                                {formatDateShort(item.timestamp)}
                                            </Text>
                                        </View>
                                    </View>
                                    {index < activity.length - 1 && <View style={styles.activityDivider} />}
                                </View>
                            ))}
                        </View>
                    ) : (
                        <View style={styles.inlineInfo}>
                            <MaterialCommunityIcons name="timeline-outline" size={18} color={colors.textSecondary} />
                            <Text style={styles.inlineInfoText}>
                                Belum ada log aktivitas sharing yang perlu ditampilkan.
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        </Animated.View>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
    StyleSheet.create({
        section: { gap: 12 },
        card: {
            backgroundColor: colors.surfaceElevated,
            borderRadius: 24,
            padding: 18,
            gap: 16,
            borderWidth: 1,
            borderColor: colors.border,
            shadowColor: colors.shadowColor,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.08,
            shadowRadius: 16,
            elevation: 3,
        },
        memberList: {
            gap: 10,
        },
        memberItem: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            padding: 14,
            borderRadius: BorderRadius['2xl'],
            backgroundColor: colors.surfaceCard,
            borderWidth: 1,
            borderColor: colors.border,
        },
        memberIcon: {
            width: 38,
            height: 38,
            borderRadius: BorderRadius.lg,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.infoBg,
        },
        memberCopy: { flex: 1 },
        memberTitle: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.body,
            color: colors.textPrimary,
        },
        memberMeta: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
            marginTop: 2,
        },
        activityBlock: {
            gap: 12,
        },
        activityTitleLabel: {
            fontFamily: FontFamily.headingMedium,
            fontSize: FontSize.body,
            color: colors.textPrimary,
        },
        inlineInfo: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            padding: 14,
            borderRadius: BorderRadius['2xl'],
            backgroundColor: colors.surfaceCard,
            borderWidth: 1,
            borderColor: colors.border,
        },
        inlineInfoText: {
            flex: 1,
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
            lineHeight: 20,
        },
        activityList: { gap: 0 },
        activityItem: {
            flexDirection: 'row',
            gap: 12,
            paddingVertical: 10,
        },
        activityDot: {
            width: 12,
            height: 12,
            borderRadius: BorderRadius.full,
            marginTop: 6,
            backgroundColor: colors.primary,
        },
        activityCopy: { flex: 1 },
        activityItemTitle: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.body,
            color: colors.textPrimary,
        },
        activityItemDescription: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
            marginTop: 2,
            lineHeight: 20,
        },
        activityItemDate: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: colors.textTertiary,
            marginTop: 4,
        },
        activityDivider: {
            height: 1,
            backgroundColor: colors.divider,
            marginLeft: 18,
        },
    });
