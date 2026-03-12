import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    Modal,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize, Typography } from '../../constants/typography';
import {
    fetchWalletMembers,
    addWalletMember,
    removeWalletMember,
    type WalletMember
} from '../../database/walletQueries';

interface WalletMemberListProps {
    walletId: string;
}

export function WalletMemberList({ walletId }: WalletMemberListProps) {
    const [members, setMembers] = useState<WalletMember[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isInviting, setIsInviting] = useState(false);
    const [email, setEmail] = useState('');
    const [inviteLoading, setInviteLoading] = useState(false);

    const loadMembers = async () => {
        setIsLoading(true);
        try {
            const data = await fetchWalletMembers(walletId);
            setMembers(data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadMembers();
    }, [walletId]);

    const handleInvite = async () => {
        if (!email.trim() || !email.includes('@')) {
            Alert.alert('Error', 'Masukkan email yang valid');
            return;
        }

        setInviteLoading(true);
        try {
            await addWalletMember(walletId, email, 'viewer'); // Default role viewer
            setEmail('');
            setIsInviting(false);
            await loadMembers();
            Alert.alert('Sukses', 'Undangan terkirim');
        } catch (e: any) {
            Alert.alert('Gagal', e.message || 'Gagal mengundang anggota');
        } finally {
            setInviteLoading(false);
        }
    };

    const handleRemove = async (id: string) => {
        Alert.alert(
            'Hapus Anggota',
            'Apakah Anda yakin ingin menghapus anggota ini?',
            [
                { text: 'Batal', style: 'cancel' },
                {
                    text: 'Hapus',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await removeWalletMember(id);
                            loadMembers();
                        } catch (e) {
                            Alert.alert('Error', 'Gagal menghapus anggota');
                        }
                    }
                }
            ]
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Anggota Tim</Text>
                <TouchableOpacity 
                    style={styles.inviteBtn}
                    onPress={() => setIsInviting(true)}
                >
                    <MaterialCommunityIcons name="plus" size={16} color={Colors.primary} />
                    <Text style={styles.inviteBtnText}>Undang</Text>
                </TouchableOpacity>
            </View>

            {isLoading ? (
                <ActivityIndicator color={Colors.primary} />
            ) : members.length === 0 ? (
                <Text style={styles.emptyText}>Belum ada anggota lain di dompet ini.</Text>
            ) : (
                <View style={styles.list}>
                    {members.map(m => (
                        <View key={m.id} style={styles.memberItem}>
                            <View style={styles.memberAvatar}>
                                <Text style={styles.avatarText}>{m.user_email[0].toUpperCase()}</Text>
                            </View>
                            <View style={styles.memberInfo}>
                                <Text style={styles.memberEmail}>{m.user_email}</Text>
                                <Text style={styles.memberRole}>
                                    {m.role} • {m.status === 'pending' ? 'Menunggu' : 'Aktif'}
                                </Text>
                            </View>
                            <TouchableOpacity 
                                onPress={() => handleRemove(m.id)}
                                style={styles.removeBtn}
                            >
                                <MaterialCommunityIcons name="trash-can-outline" size={20} color={Colors.danger} />
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            )}

            <Modal
                visible={isInviting}
                transparent
                animationType="fade"
                onRequestClose={() => setIsInviting(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Undang Anggota</Text>
                        <Text style={styles.modalSubtitle}>
                            Masukkan email pengguna yang ingin Anda undang ke dompet ini.
                        </Text>
                        
                        <TextInput
                            style={styles.input}
                            value={email}
                            onChangeText={setEmail}
                            placeholder="email@contoh.com"
                            placeholderTextColor={Colors.textDisabled}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity 
                                style={styles.cancelBtn}
                                onPress={() => setIsInviting(false)}
                            >
                                <Text style={styles.cancelBtnText}>Batal</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={styles.confirmBtn}
                                onPress={handleInvite}
                                disabled={inviteLoading}
                            >
                                {inviteLoading ? (
                                    <ActivityIndicator color="#FFF" size="small" />
                                ) : (
                                    <Text style={styles.confirmBtnText}>Kirim Undangan</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: 24,
        gap: 12,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontFamily: FontFamily.bodyBold,
        fontSize: FontSize.body,
        color: Colors.textSecondary,
    },
    inviteBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        padding: 4,
    },
    inviteBtnText: {
        fontFamily: FontFamily.bodyBold,
        fontSize: FontSize.caption,
        color: Colors.primary,
    },
    emptyText: {
        fontFamily: FontFamily.body,
        fontSize: FontSize.caption,
        color: Colors.textTertiary,
        fontStyle: 'italic',
    },
    list: {
        gap: 8,
    },
    memberItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.border,
        gap: 12,
    },
    memberAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: Colors.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontFamily: FontFamily.headingMedium,
        color: Colors.primary,
        fontSize: 14,
    },
    memberInfo: {
        flex: 1,
    },
    memberEmail: {
        fontFamily: FontFamily.bodyMedium,
        fontSize: FontSize.body,
        color: Colors.textPrimary,
    },
    memberRole: {
        fontFamily: FontFamily.body,
        fontSize: FontSize.caption,
        color: Colors.textSecondary,
        textTransform: 'capitalize',
    },
    removeBtn: {
        padding: 4,
    },

    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: Colors.surface,
        borderRadius: 20,
        padding: 24,
        gap: 16,
    },
    modalTitle: {
        fontFamily: FontFamily.heading,
        fontSize: FontSize.h3,
        color: Colors.textPrimary,
    },
    modalSubtitle: {
        fontFamily: FontFamily.body,
        fontSize: FontSize.body,
        color: Colors.textSecondary,
    },
    input: {
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
        padding: 12,
        fontFamily: FontFamily.body,
        fontSize: FontSize.body,
        color: Colors.textPrimary,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        marginTop: 8,
    },
    cancelBtn: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    cancelBtnText: {
        fontFamily: FontFamily.bodyBold,
        color: Colors.textSecondary,
    },
    confirmBtn: {
        backgroundColor: Colors.primary,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        minWidth: 100,
        alignItems: 'center',
    },
    confirmBtnText: {
        fontFamily: FontFamily.bodyBold,
        color: '#FFF',
    },
});
