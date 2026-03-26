import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FontFamily, FontSize } from "../../constants/typography";
import { Input } from "../../components/common/Input";
import { Button } from "../../components/common/Button";
import { useAuthStore } from "../../store/useAuthStore";
import { validateEmail, validatePassword } from "../../utils/validation";
import type { RootStackParamList } from "../../types/navigation";
import { useTheme } from "../../store/useThemeStore";
import { LinearGradient } from "expo-linear-gradient";
import { BorderRadius } from "../../constants/theme";

const REMEMBER_EMAIL_KEY = '@tabungin_remember_email';

export function LoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { login, authError, clearError } = useAuthStore();
  const { colors, gradients } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    loadRememberedEmail();
  }, []);

  const loadRememberedEmail = async () => {
    try {
      const remembered = await AsyncStorage.getItem(REMEMBER_EMAIL_KEY);
      if (remembered) {
        setEmail(remembered);
        setRememberMe(true);
      }
    } catch (error) {
      console.error('Failed to load remembered email:', error);
    }
  };

  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    const emailErr = validateEmail(email);
    const passErr = validatePassword(password);
    if (emailErr) newErrors.email = emailErr;
    if (passErr) newErrors.password = passErr;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsLoading(true);
    try {
      const ok = await login(email.trim(), password);
      if (ok && rememberMe) {
        await AsyncStorage.setItem(REMEMBER_EMAIL_KEY, email.trim());
      } else if (!rememberMe) {
        await AsyncStorage.removeItem(REMEMBER_EMAIL_KEY);
      }
      if (!ok) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.bgAuraTop} pointerEvents="none" />
      <View style={styles.bgAuraBottom} pointerEvents="none" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps='handled'
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoSection} accessibilityRole='header'>
            <LinearGradient colors={gradients.hero as unknown as [string, string, ...string[]]} style={styles.logoCircle}>
              <MaterialCommunityIcons name='piggy-bank' size={48} color={colors.textInverse} />
            </LinearGradient>
            <Text style={styles.appName} allowFontScaling={true}>
              Tabungin
            </Text>
            <Text style={styles.tagline} allowFontScaling={true}>
              Catat, Kelola, Wujudkan
            </Text>
          </View>

          <View style={styles.formSection}>
            <View style={styles.heroCard}>
              <Text style={styles.heading} allowFontScaling={true} accessibilityRole='header'>
                Selamat Datang Kembali!
              </Text>
              <Text style={styles.subHeading} allowFontScaling={true}>
                Masuk ke akun Tabunginmu dan lanjutkan ritme keuangan hari ini.
              </Text>
            </View>

            <View style={styles.fields}>
              <Input
                label='Email'
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                keyboardType='email-address'
                autoCapitalize='none'
                autoComplete='email'
                leftIcon='email'
                error={errors.email}
                placeholder='nama@email.com'
                required
              />
              <Input
                label='Password'
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  setErrors((prev) => ({ ...prev, password: undefined }));
                }}
                secureTextEntry
                autoComplete='password'
                leftIcon='lock'
                error={errors.password}
                placeholder='Minimal 8 karakter'
                required
              />
            </View>

            <View style={styles.optionsRow}>
              <TouchableOpacity 
                style={styles.rememberMeContainer}
                onPress={() => setRememberMe(!rememberMe)}
                accessible={true}
                accessibilityRole='checkbox'
                accessibilityState={{ checked: rememberMe }}
                accessibilityLabel='Ingat email saya'
              >
                <MaterialCommunityIcons 
                  name={rememberMe ? 'checkbox-marked' : 'checkbox-blank-outline'} 
                  size={20} 
                  color={rememberMe ? colors.primary : colors.textSecondary} 
                />
                <Text style={[styles.rememberMeText, rememberMe && styles.rememberMeTextActive]}>
                  Ingat saya
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navigation.navigate('ForgotPassword')}
                accessible={true}
                accessibilityRole='link'
                accessibilityLabel='Lupa password'
                hitSlop={{ top: 10, bottom: 10 }}
              >
                <Text style={styles.forgotPasswordText}>Lupa password?</Text>
              </TouchableOpacity>
            </View>

            {authError && (
              <View style={styles.errorBanner} accessible={true} accessibilityRole='alert'>
                <Text style={styles.errorBannerText} allowFontScaling={true}>
                  {authError}
                </Text>
              </View>
            )}

            <Button
              label='Masuk'
              onPress={handleLogin}
              variant='primary'
              size='lg'
              loading={isLoading}
              fullWidth
              accessibilityHint='Ketuk dua kali untuk masuk ke aplikasi'
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText} allowFontScaling={true}>
              Belum punya akun?{" "}
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("Register")}
              accessible={true}
              accessibilityRole='link'
              accessibilityLabel='Daftar akun baru'
              hitSlop={{ top: 10, bottom: 10 }}
            >
              <Text style={styles.footerLink} allowFontScaling={true}>
                Daftar sekarang
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1 },
    container: { flexGrow: 1, padding: 24 },
    bgAuraTop: {
      position: "absolute",
      top: -100,
      right: -40,
      width: 240,
      height: 240,
      borderRadius: 9999,
      backgroundColor: colors.primaryLight,
      opacity: 0.7,
    },
    bgAuraBottom: {
      position: "absolute",
      left: -70,
      bottom: 80,
      width: 180,
      height: 180,
      borderRadius: 9999,
      backgroundColor: colors.infoBg,
      opacity: 0.38,
    },
    logoSection: { alignItems: "center", paddingTop: 20, paddingBottom: 28, gap: 8 },
    logoCircle: {
      width: 88,
      height: 88,
      borderRadius: 30,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.1,
      shadowRadius: 18,
      elevation: 4,
    },
    appName: { fontFamily: FontFamily.heading, fontSize: 28, color: colors.textPrimary },
    tagline: { fontFamily: FontFamily.body, fontSize: FontSize.body, color: colors.textSecondary },
    formSection: { gap: 16 },
    heroCard: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: BorderRadius["4xl"],
      padding: 18,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 6,
      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 3,
    },
    heading: { fontFamily: FontFamily.heading, fontSize: FontSize.h2, color: colors.textPrimary },
    subHeading: {
      fontFamily: FontFamily.body,
      fontSize: FontSize.body,
      color: colors.textSecondary,
      lineHeight: 22,
    },
    fields: { gap: 14 },
    optionsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 4,
    },
    rememberMeContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 4,
    },
    rememberMeText: {
      fontFamily: FontFamily.body,
      fontSize: FontSize.caption,
      color: colors.textSecondary,
    },
    rememberMeTextActive: {
      color: colors.primary,
    },
    forgotPasswordText: {
      fontFamily: FontFamily.bodyMedium,
      fontSize: FontSize.caption,
      color: colors.primary,
    },
    errorBanner: {
      backgroundColor: colors.dangerBg,
      borderRadius: 14,
      borderLeftWidth: 3,
      borderLeftColor: colors.danger,
      padding: 12,
      borderWidth: 1,
      borderColor: `${colors.danger}20`,
    },
    errorBannerText: {
      fontFamily: FontFamily.body,
      fontSize: FontSize.caption,
      color: colors.danger,
    },
    footer: { flexDirection: "row", justifyContent: "center", marginTop: 24, paddingBottom: 20 },
    footerText: { fontFamily: FontFamily.body, fontSize: FontSize.body, color: colors.textSecondary },
    footerLink: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.body, color: colors.primary },
  });
