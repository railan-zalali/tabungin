// Pemilih dompet untuk target tabungan (chips + insight).
// Diekstrak dari AddSavingGoalScreen.
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FontFamily, FontSize } from '../../constants/typography';
import { useTheme } from '../../store/useThemeStore';
import type { Wallet } from '../../database/walletQueries';

interface WalletSelectorProps {
    wallets: Wallet[];
    activeProfileId: string | null;
    selectedWalletId: string;
    onSelect: (walletId: string) => void;
    errorMessage?: string;
    /** Kalimat konteks bila dompet termasuk shared. Default: konteks target tabungan. */
    sharedHint?: string;
    /** Kalimat konteks bila dompet personal. Default: konteks target tabungan. */
    personalHint?: string;
}

const DEFAULT_SHARED_HINT =
    'Karena target ini ditempatkan di dompet bersama, konteks dan progresnya akan terlihat sebagai goal bersama.';
const DEFAULT_PERSONAL_HINT =
    'Target ini akan tetap berada di ruang personal aktif, tetapi tetap terkait ke dompet yang kamu pilih.';

export function WalletSelector({
    wallets,
    activeProfileId,
    selectedWalletId,
    onSelect,
    errorMessage,
    sharedHint,
    personalHint,
}: WalletSelectorProps) {
    const { colors } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);

    const selectedWallet = wallets.find((wallet) => wallet.id === selectedWalletId);
    const isSharedWallet = Boolean(
        selectedWallet?.profile_id && selectedWallet.profile_id !== activeProfileId,
    );

    return (
        <>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.row}
            >
                {wallets.map((wallet) => {
                    const active = selectedWalletId === wallet.id;
                    const shared = Boolean(wallet.profile_id && wallet.profile_id !== activeProfileId);
                    return (
                        <TouchableOpacity
                            key={wallet.id}
                            style={[
                                styles.chip,
                                active && { borderColor: wallet.color, backgroundColor: `${wallet.color}16` },
                            ]}
                            onPress={() => onSelect(wallet.id)}
                            accessibilityRole="button"
                            accessibilityState={{ selected: active }}
                            accessibilityLabel={`Pilih dompet ${wallet.name}`}
                        >
                            <View
                                style={[
                                    styles.iconWrap,
                                    { backgroundColor: active ? wallet.color : `${colors.surface}D4` },
                                ]}
                            >
                                <MaterialCommunityIcons
                                    name={shared ? 'account-group-outline' : 'wallet-outline'}
                                    size={16}
                                    color={active ? colors.textInverse : wallet.color}
                                />
                            </View>
                            <View style={styles.chipTextWrap}>
                                <Text
                                    style={[styles.chipTitle, active && { color: colors.textPrimary }]}
                                    numberOfLines={1}
                                >
                                    {wallet.name}
                                </Text>
                                <Text style={styles.chipMeta} numberOfLines={1}>
                                    {shared ? 'Shared wallet' : 'Personal wallet'}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {selectedWallet ? (
                <View style={styles.insightCard}>
                    <MaterialCommunityIcons
                        name={isSharedWallet ? 'account-group-outline' : 'shield-check-outline'}
                        size={18}
                        color={isSharedWallet ? colors.info : colors.primary}
                    />
                    <Text style={styles.insightText}>
                        {isSharedWallet
                            ? (sharedHint ?? DEFAULT_SHARED_HINT)
                            : (personalHint ?? DEFAULT_PERSONAL_HINT)}
                    </Text>
                </View>
            ) : null}

            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        </>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
    StyleSheet.create({
        row: {
            flexDirection: 'row',
            gap: 10,
        },
        chip: {
            width: 180,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            padding: 12,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surfaceElevated,
        },
        iconWrap: {
            width: 38,
            height: 38,
            borderRadius: 14,
            alignItems: 'center',
            justifyContent: 'center',
        },
        chipTextWrap: { flex: 1 },
        chipTitle: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
        },
        chipMeta: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.label,
            color: colors.textSecondary,
            marginTop: 2,
        },
        insightCard: {
            flexDirection: 'row',
            gap: 10,
            padding: 14,
            borderRadius: 18,
            backgroundColor: colors.surfaceAlt,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'flex-start',
        },
        insightText: {
            flex: 1,
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            lineHeight: 20,
            color: colors.textSecondary,
        },
        errorText: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: colors.danger,
        },
    });
