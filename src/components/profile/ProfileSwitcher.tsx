import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    TextInput,
    ScrollView,
    Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontFamily, FontSize, Typography } from '../../constants/typography';
import { BorderRadius } from '../../constants/theme';
import { useProfileStore } from '../../store/useProfileStore';
import { useWalletStore } from '../../store/useWalletStore';
import { useTransactionStore } from '../../store/useTransactionStore';
import { useSavingStore } from '../../store/useSavingStore';
import { useTheme } from '../../store/useThemeStore';

const PROFILE_COLORS = ['#16A34A', '#2563EB', '#F59E0B', '#DC2626', '#9333EA', '#0891B2'];
const PROFILE_ICONS = ['account', 'briefcase', 'home', 'school', 'gamepad-variant', 'cart'];

export function ProfileSwitcher() {
    const insets = useSafeAreaInsets();
    const { profiles, activeProfileId, setActiveProfile, addProfile, isLoading } = useProfileStore();
    const { loadWallets } = useWalletStore();
    const { loadTransactions, loadRecent, refreshSummary } = useTransactionStore();
    const { loadGoals } = useSavingStore();
    const { colors } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);

    const [visible, setVisible] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    
    // New Profile Form State
    const [newName, setNewName] = useState('');
    const [newColor, setNewColor] = useState(PROFILE_COLORS[0]);
    const [newIcon, setNewIcon] = useState(PROFILE_ICONS[0]);

    const activeProfile = profiles.find(p => p.id === activeProfileId) || profiles[0];

    const handleSwitch = async (id: string) => {
        if (id === activeProfileId) {
            setVisible(false);
            return;
        }

        setActiveProfile(id);
        
        // Reload all data for the new profile
        // Note: The stores should pick up the new ID from useProfileStore.getState()
        await Promise.all([
            loadWallets(),
            loadTransactions(),
            loadRecent(),
            refreshSummary(),
            loadGoals(),
        ]);

        setVisible(false);
    };

    const handleAddProfile = async () => {
        if (!newName.trim()) {
            Alert.alert('Error', 'Nama profil tidak boleh kosong');
            return;
        }

        try {
            await addProfile(newName, newIcon, newColor);
            
            // Reload all data (new profile will be empty)
            await Promise.all([
                loadWallets(),
                loadTransactions(),
                loadRecent(),
                refreshSummary(),
                loadGoals(),
            ]);

            setIsAdding(false);
            setNewName('');
            setVisible(false);
        } catch (e) {
            Alert.alert('Error', 'Gagal membuat profil');
        }
    };

    if (!activeProfile) return null;

    return (
        <>
            <TouchableOpacity 
                style={[styles.triggerBtn, { borderColor: activeProfile.color || colors.primary }]}
                onPress={() => setVisible(true)}
                activeOpacity={0.8}
            >
                <View style={[styles.avatar, { backgroundColor: activeProfile.color || colors.primary }]}>
                <MaterialCommunityIcons 
                        name={activeProfile.icon as any || 'account'} 
                        size={20} 
                        color={colors.textInverse}
                    />
                </View>
                <Text style={styles.triggerText} numberOfLines={1}>
                    {activeProfile.name}
                </Text>
                <MaterialCommunityIcons name="chevron-down" size={16} color={colors.textSecondary} />
            </TouchableOpacity>

            <Modal
                visible={visible}
                transparent
                animationType="fade"
                onRequestClose={() => setVisible(false)}
            >
                <TouchableOpacity 
                    style={styles.modalOverlay} 
                    activeOpacity={1} 
                    onPress={() => setVisible(false)}
                >
                    <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                        {!isAdding ? (
                            // List Profiles
                            <>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>Pilih Profil</Text>
                                    <TouchableOpacity onPress={() => setVisible(false)}>
                                        <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} />
                                    </TouchableOpacity>
                                </View>
                                
                                <ScrollView style={{ maxHeight: 300 }}>
                                    {profiles.map(p => (
                                        <TouchableOpacity
                                            key={p.id}
                                            style={[
                                                styles.profileItem,
                                                activeProfileId === p.id && styles.profileItemActive
                                            ]}
                                            onPress={() => handleSwitch(p.id)}
                                        >
                                            <View style={[styles.avatar, { backgroundColor: p.color || colors.primary }]}>
                                                <MaterialCommunityIcons name={p.icon as any || 'account'} size={20} color={colors.textInverse} />
                                            </View>
                                            <Text style={[
                                                styles.profileName,
                                                activeProfileId === p.id && styles.profileNameActive
                                            ]}>
                                                {p.name}
                                            </Text>
                                            {activeProfileId === p.id && (
                                                        <MaterialCommunityIcons name="check" size={20} color={colors.primary} />
                                            )}
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>

                                <TouchableOpacity 
                                    style={styles.addBtn}
                                    onPress={() => setIsAdding(true)}
                                >
                                    <MaterialCommunityIcons name="plus" size={20} color={colors.primary} />
                                    <Text style={styles.addBtnText}>Tambah Profil Baru</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            // Add Profile Form
                            <>
                                <View style={styles.modalHeader}>
                                    <TouchableOpacity onPress={() => setIsAdding(false)}>
                                        <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textPrimary} />
                                    </TouchableOpacity>
                                    <Text style={styles.modalTitle}>Profil Baru</Text>
                                    <View style={{ width: 24 }} />
                                </View>

                                <View style={styles.formContainer}>
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Nama Profil</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={newName}
                                            onChangeText={setNewName}
                                            placeholder="Contoh: Bisnis, Liburan"
                                            placeholderTextColor={colors.textDisabled}
                                            autoFocus
                                        />
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Ikon</Text>
                                        <View style={styles.iconRow}>
                                            {PROFILE_ICONS.map(icon => (
                                                <TouchableOpacity
                                                    key={icon}
                                                    style={[
                                                        styles.iconOption,
                                                        newIcon === icon && { backgroundColor: colors.primaryLight, borderColor: colors.primary }
                                                    ]}
                                                    onPress={() => setNewIcon(icon)}
                                                >
                                                    <MaterialCommunityIcons 
                                                        name={icon as any} 
                                                        size={24} 
                                                        color={newIcon === icon ? colors.primary : colors.textSecondary} 
                                                    />
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Warna</Text>
                                        <View style={styles.colorRow}>
                                            {PROFILE_COLORS.map(color => (
                                                <TouchableOpacity
                                                    key={color}
                                                    style={[styles.colorOption, { backgroundColor: color }]}
                                                    onPress={() => setNewColor(color)}
                                                >
                                                    {newColor === color && (
                                                        <MaterialCommunityIcons name="check" size={16} color={colors.textInverse} />
                                                    )}
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>

                                    <TouchableOpacity 
                                        style={styles.saveBtn}
                                        onPress={handleAddProfile}
                                        disabled={isLoading}
                                    >
                                        <Text style={styles.saveBtnText}>
                                            {isLoading ? 'Menyimpan...' : 'Simpan Profil'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </View>
                </TouchableOpacity>
            </Modal>
        </>
    );
}

const getStyles = (colors: any) => StyleSheet.create({
    triggerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceElevated,
        padding: 4,
        paddingRight: 8,
        borderRadius: 100,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 8,
        maxWidth: 160,
    },
    triggerText: {
        fontFamily: FontFamily.bodyBold,
        fontSize: FontSize.caption,
        color: colors.textPrimary,
        flex: 1,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },

    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: colors.surfaceElevated,
        borderRadius: 24,
        padding: 20,
        maxHeight: '80%',
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: colors.shadowColor,
        shadowOpacity: 0.1,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
        elevation: 3,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    modalTitle: {
        ...Typography.h3,
        color: colors.textPrimary,
    },

    profileItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        gap: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: colors.border,
    },
    profileItemActive: {
        backgroundColor: colors.primaryBg,
        borderColor: colors.primary,
    },
    profileName: {
        fontFamily: FontFamily.bodyMedium,
        fontSize: FontSize.body,
        color: colors.textPrimary,
        flex: 1,
    },
    profileNameActive: {
        fontFamily: FontFamily.bodyBold,
        color: colors.primary,
    },

    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        gap: 8,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        marginTop: 8,
    },
    addBtnText: {
        fontFamily: FontFamily.bodyBold,
        color: colors.primary,
    },

    formContainer: { gap: 20 },
    inputGroup: { gap: 8 },
    label: {
        fontFamily: FontFamily.bodyBold,
        fontSize: FontSize.caption,
        color: colors.textSecondary,
    },
    input: {
        backgroundColor: colors.surfaceElevated,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        padding: 12,
        fontFamily: FontFamily.body,
        fontSize: FontSize.body,
        color: colors.textPrimary,
    },
    iconRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
    iconOption: {
        width: 44,
        height: 44,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surfaceElevated,
    },
    colorRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
    colorOption: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveBtn: {
        backgroundColor: colors.primary,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8,
    },
    saveBtnText: {
        fontFamily: FontFamily.bodyBold,
        color: colors.textInverse,
    },
});
