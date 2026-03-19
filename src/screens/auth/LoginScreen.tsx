import React, { useState } from "react";
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
import { Colors } from "../../constants/colors";
import { FontFamily, FontSize } from "../../constants/typography";
import { Input } from "../../components/common/Input";
import { Button } from "../../components/common/Button";
import { useAuthStore } from "../../store/useAuthStore";
import { validateEmail, validatePassword } from "../../utils/validation";
import type { RootStackParamList } from "../../types/navigation";

export function LoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { login, loginWithGoogle, authError, clearError } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

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
      if (!ok) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    clearError();
    setIsGoogleLoading(true);
    try {
      const ok = await loginWithGoogle();
      if (!ok) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
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
            <View style={styles.logoCircle} accessibilityElementsHidden={true}>
              <MaterialCommunityIcons name='piggy-bank' size={48} color={Colors.textInverse} />
            </View>
            <Text style={styles.appName} allowFontScaling={true}>
              Tabungin
            </Text>
            <Text style={styles.tagline} allowFontScaling={true}>
              Catat, Kelola, Wujudkan
            </Text>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.heading} allowFontScaling={true} accessibilityRole='header'>
              Selamat Datang Kembali!
            </Text>
            <Text style={styles.subHeading} allowFontScaling={true}>
              Masuk ke akun Tabunginmu
            </Text>

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

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText} allowFontScaling={true}>
                atau
              </Text>
              <View style={styles.dividerLine} />
            </View>

            <Button
              label='Lanjutkan Dengan Google'
              onPress={handleGoogleLogin}
              variant='outline'
              size='md'
              loading={isGoogleLoading}
              icon={<MaterialCommunityIcons name='google' size={18} color={Colors.primary} />}
              fullWidth
              accessibilityHint='Ketuk dua kali untuk masuk dengan akun Google'
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  flex: { flex: 1 },
  container: { flexGrow: 1, padding: 24 },
  logoSection: { alignItems: "center", paddingTop: 20, paddingBottom: 32, gap: 8 },
  logoCircle: {
    width: 84,
    height: 84,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  appName: { fontFamily: FontFamily.heading, fontSize: 28, color: Colors.textPrimary },
  tagline: { fontFamily: FontFamily.body, fontSize: FontSize.body, color: Colors.textSecondary },
  formSection: { gap: 16 },
  heading: { fontFamily: FontFamily.heading, fontSize: FontSize.h2, color: Colors.textPrimary },
  subHeading: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.body,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  fields: { gap: 14 },
  errorBanner: {
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: Colors.danger,
    padding: 12,
  },
  errorBannerText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.caption,
    color: Colors.danger,
  },
  divider: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.caption,
    color: Colors.textSecondary,
  },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 24, paddingBottom: 20 },
  footerText: { fontFamily: FontFamily.body, fontSize: FontSize.body, color: Colors.textSecondary },
  footerLink: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.body, color: Colors.primary },
});
