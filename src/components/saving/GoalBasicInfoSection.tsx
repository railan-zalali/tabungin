// Bagian "Identitas Target" pada form target tabungan.
// Diekstrak dari AddSavingGoalScreen supaya layar tidak lagi menangani
// input nama + pemilih ikon sendiri ( roadmap §4.1 P2-02).
import React from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FontFamily, FontSize } from '../../constants/typography';
import { useTheme } from '../../store/useThemeStore';

const EMOJIS = ['💻', '🌴', '🎮', '🏠', '🚗', '📱', '✈️', '👜', '🎓', '💍', '🎯', '⭐'];

interface GoalBasicInfoSectionProps {
    name: string;
    onNameChange: (value: string) => void;
    emoji: string;
    onEmojiChange: (value: string) => void;
    /** Warna target sebagai aksen pilihan ikon terpilih. */
    accentColor: string;
    nameError?: string;
}

export function GoalBasicInfoSection({
    name,
    onNameChange,
    emoji,
    onEmojiChange,
    accentColor,
    nameError,
}: GoalBasicInfoSectionProps) {
    const { colors } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);

    return (
        <View style={[styles.card, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Identitas Target</Text>

            <Text style={styles.fieldLabel}>Nama Target</Text>
            <View style={[styles.textInputWrap, nameError ? styles.inputError : null]}>
                <MaterialCommunityIcons name="tag-outline" size={18} color={colors.textSecondary} />
                <TextInput
                    style={[styles.textInput, { color: colors.textPrimary }]}
                    value={name}
                    onChangeText={onNameChange}
                    placeholder="cth: MacBook Air M3"
                    placeholderTextColor={colors.textSecondary}
                    accessibilityLabel="Nama target"
                />
            </View>
            {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}

            <Text style={styles.fieldLabel}>Pilih Ikon</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.emojiRow}>
                {EMOJIS.map((item) => {
                    const selected = emoji === item;
                    return (
                        <TouchableOpacity
                            key={item}
                            style={[
                                styles.emojiBtn,
                                selected && { borderColor: accentColor, backgroundColor: `${accentColor}18` },
                            ]}
                            onPress={() => onEmojiChange(item)}
                            accessibilityRole="button"
                            accessibilityState={{ selected }}
                            accessibilityLabel={`Pilih ikon ${item}`}
                        >
                            <Text style={styles.emojiText}>{item}</Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
    StyleSheet.create({
        card: {
            borderWidth: 1,
            borderRadius: 24,
            padding: 18,
            gap: 12,
            shadowColor: colors.shadowColor,
            shadowOpacity: 0.06,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 8 },
            elevation: 1,
        },
        title: {
            fontFamily: FontFamily.headingMedium,
            fontSize: FontSize.body,
        },
        fieldLabel: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: 0.4,
        },
        textInputWrap: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: colors.surfaceElevated,
            borderRadius: 16,
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderWidth: 1,
            borderColor: colors.border,
            minHeight: 54,
        },
        inputError: { borderColor: colors.danger },
        textInput: {
            flex: 1,
            fontFamily: FontFamily.body,
            fontSize: FontSize.body,
            padding: 0,
            height: 40,
        },
        errorText: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: colors.danger,
        },
        emojiRow: {
            flexDirection: 'row',
            gap: 12,
            paddingVertical: 2,
        },
        emojiBtn: {
            width: 48,
            height: 48,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surfaceElevated,
            alignItems: 'center',
            justifyContent: 'center',
        },
        emojiText: { fontSize: 26 },
    });
