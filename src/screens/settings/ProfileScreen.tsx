// Profile Screen — edit nama pengguna
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Shadow } from '../../constants/theme';
import { useAuthStore } from '../../store/useAuthStore';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { validateName } from '../../utils/validation';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export function ProfileScreen() {
    const navigation = useNavigation();
    const { user, updateProfile } = useAuthStore();
    const [name, setName] = useState(user?.name ?? '');
    const [nameError, setNameError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const userInitial = name?.charAt(0)?.toUpperCase() ?? '?';

    const handleSave = async () => {
        const err = validateName(name);
        if (err) { setNameError(err); return; }
        setIsSaving(true);
        try {
            await updateProfile({ name: name.trim() });
            navigation.goBack();
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backBtn}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel="Kembali ke pengaturan"
                >
                    <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle} allowFontScaling={true} accessibilityRole="header">Edit Profil</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Avatar */}
                <View style={styles.avatarSection}>
                    <View style={[styles.avatar, { backgroundColor: user?.avatarColor ?? Colors.primary }]}>
                        <Text style={styles.avatarText} allowFontScaling={false}>{userInitial}</Text>
                    </View>
                    <Text style={styles.avatarHint} allowFontScaling={true}>Inisial nama ditampilkan sebagai avatar</Text>
                </View>

                <Input
                    label="Nama Lengkap"
                    value={name}
                    onChangeText={(v) => { setName(v); setNameError(null); }}
                    error={nameError}
                    leftIcon="account"
                    placeholder="Masukkan nama lengkap"
                    required
                />

                {user?.email && (
                    <Input
                        label="Email"
                        value={user.email}
                        editable={false}
                        leftIcon="email"
                        hint="Email tidak dapat diubah"
                    />
                )}

                <Button
                    label="Simpan Perubahan"
                    onPress={handleSave}
                    variant="primary"
                    size="lg"
                    loading={isSaving}
                    fullWidth
                    style={{ marginTop: 8 }}
                    accessibilityHint="Ketuk dua kali untuk menyimpan perubahan profil"
                />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: Colors.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: Colors.surface },
    backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontFamily: FontFamily.headingMedium, fontSize: FontSize.h4, color: Colors.textPrimary },
    content: { padding: 20, gap: 16 },
    avatarSection: { alignItems: 'center', gap: 10, paddingVertical: 16 },
    avatar: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', ...Shadow.md },
    avatarText: { fontFamily: FontFamily.heading, fontSize: 40, color: Colors.textInverse },
    avatarHint: { fontFamily: FontFamily.body, fontSize: FontSize.caption, color: Colors.textSecondary },
});
