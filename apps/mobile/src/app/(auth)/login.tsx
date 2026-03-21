import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

const REDIRECT_URL = 'appalix://auth/callback';

type Step = 'email' | 'otp';

export default function LoginScreen() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'azure' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSendOtp() {
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setError(null);
    setLoading(true);

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false },
    });

    setLoading(false);
    if (otpError) {
      setError(otpError.message);
    } else {
      setStep('otp');
    }
  }

  async function handleVerifyOtp() {
    if (!otp.trim() || otp.length < 6) {
      setError('Please enter the 6-digit code.');
      return;
    }
    setError(null);
    setLoading(true);

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: otp.trim(),
      type: 'email',
    });

    setLoading(false);
    if (verifyError) {
      setError(verifyError.message);
    }
    // AuthProvider handles redirect on session change
  }

  async function handleOAuth(provider: 'google' | 'azure') {
    setOauthLoading(provider);
    setError(null);

    const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: REDIRECT_URL, skipBrowserRedirect: true },
    });

    if (oauthError || !data.url) {
      setError(oauthError?.message ?? 'OAuth failed.');
      setOauthLoading(null);
      return;
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, REDIRECT_URL);

    if (result.type === 'success' && result.url) {
      const url = new URL(result.url);
      const access_token = url.searchParams.get('access_token') ??
        url.hash.split('access_token=')[1]?.split('&')[0];
      const refresh_token = url.searchParams.get('refresh_token') ??
        url.hash.split('refresh_token=')[1]?.split('&')[0];
      if (access_token && refresh_token) {
        await supabase.auth.setSession({ access_token, refresh_token });
      }
    }

    setOauthLoading(null);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View style={styles.header}>
            <Image
              source={require('../../../assets/logo2.png')}
              style={styles.logoIcon}
              resizeMode="contain"
            />
            <Text style={styles.tagline}>Your CRM & support hub</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sign in</Text>

            {step === 'email' ? (
              <>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="you@company.com"
                  placeholderTextColor="#9ca3af"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="emailAddress"
                />

                {error && <Text style={styles.errorText}>{error}</Text>}

                <TouchableOpacity
                  style={[styles.primaryButton, loading && styles.buttonDisabled]}
                  onPress={handleSendOtp}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Send code</Text>
                  )}
                </TouchableOpacity>

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or continue with</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity
                  style={[styles.oauthButton, oauthLoading === 'google' && styles.buttonDisabled]}
                  onPress={() => handleOAuth('google')}
                  disabled={oauthLoading !== null}
                  activeOpacity={0.85}
                >
                  {oauthLoading === 'google' ? (
                    <ActivityIndicator color="#374151" />
                  ) : (
                    <>
                      <Text style={styles.oauthIcon}>G</Text>
                      <Text style={styles.oauthButtonText}>Continue with Google</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.oauthButton, oauthLoading === 'azure' && styles.buttonDisabled]}
                  onPress={() => handleOAuth('azure')}
                  disabled={oauthLoading !== null}
                  activeOpacity={0.85}
                >
                  {oauthLoading === 'azure' ? (
                    <ActivityIndicator color="#374151" />
                  ) : (
                    <>
                      <Text style={[styles.oauthIcon, { color: '#0078d4' }]}>⊞</Text>
                      <Text style={styles.oauthButtonText}>Continue with Outlook</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.otpHint}>
                  We sent a 6-digit code to {email}
                </Text>

                <Text style={styles.label}>Code</Text>
                <TextInput
                  style={[styles.input, styles.otpInput]}
                  placeholder="000000"
                  placeholderTextColor="#9ca3af"
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                  maxLength={6}
                  textContentType="oneTimeCode"
                  autoFocus
                />

                {error && <Text style={styles.errorText}>{error}</Text>}

                <TouchableOpacity
                  style={[styles.primaryButton, loading && styles.buttonDisabled]}
                  onPress={handleVerifyOtp}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Verify code</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => { setStep('email'); setOtp(''); setError(null); }}
                >
                  <Text style={styles.backButtonText}>← Use a different email</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f4f1' },
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: { alignItems: 'center', marginBottom: 32 },
  logoIcon: { width: 80, height: 80, marginBottom: 12 },
  tagline: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: { fontSize: 20, fontWeight: '600', color: '#111827', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 6 },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#f9fafb',
    marginBottom: 16,
  },
  otpInput: {
    fontSize: 24,
    letterSpacing: 8,
    textAlign: 'center',
  },
  otpHint: { fontSize: 14, color: '#6b7280', marginBottom: 20, lineHeight: 20 },
  errorText: { fontSize: 13, color: '#ef4444', marginBottom: 12 },
  primaryButton: {
    height: 50,
    backgroundColor: '#15A4AE',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  dividerText: { fontSize: 13, color: '#9ca3af', marginHorizontal: 12 },
  oauthButton: {
    height: 50,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginBottom: 12,
    gap: 10,
  },
  oauthIcon: { fontSize: 18, fontWeight: '700', color: '#ea4335' },
  oauthButtonText: { fontSize: 15, fontWeight: '500', color: '#374151' },
  backButton: { marginTop: 16, alignItems: 'center' },
  backButtonText: { fontSize: 14, color: '#15A4AE', fontWeight: '500' },
});
