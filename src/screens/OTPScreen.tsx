import React, { useRef, useEffect, useState } from 'react';
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';

const { height, width } = Dimensions.get('window');

// Responsive calculations
const digitBoxSize = Math.min(width * 0.12, 48); // 12% of screen width, max 48px
const digitBoxHeight = digitBoxSize * 1.2;

export default function OTPScreen({
  email,
  onVerified,
  onBack,
}: {
  email: string;
  onVerified: () => void;
  onBack: () => void;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(30);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 2,
        speed: 12,
      }),
    ]).start();

    setTimeout(() => inputRef.current?.focus(), 400);

    const interval = setInterval(() => {
      setResendTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email',
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setLoading(false);
      onVerified();
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setResendTimer(30);
    setError('');
    await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
  };

  const digits = otp.split('').concat(Array(6 - otp.length).fill(''));

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity: fadeAnim },
      ]}
    >
      <LinearGradient
        colors={['#0A0A0A', '#0A0A0A', '#3D0000', '#6B0000']}
        locations={[0, 0.4, 0.75, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>

        <View style={styles.headerSection}>
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.subtitle}>
            We sent a 6-digit code to
          </Text>
          <Text style={styles.email}>{email}</Text>
        </View>

        <View style={styles.otpWrapper}>
          <TouchableOpacity
            style={styles.otpContainer}
            onPress={() => inputRef.current?.focus()}
            activeOpacity={1}
          >
            {digits.map((digit, index) => (
              <View
                key={index}
                style={[
                  styles.digitBox,
                  digit !== '' && styles.digitBoxFilled,
                  index === otp.length && styles.digitBoxActive,
                ]}
              >
                <Text style={styles.digitText}>{digit}</Text>
              </View>
            ))}
          </TouchableOpacity>
        </View>

        <TextInput
          ref={inputRef}
          style={styles.hiddenInput}
          value={otp}
          onChangeText={(text) => {
            if (text.length <= 6) {
              setOtp(text.replace(/[^0-9]/g, ''));
              setError('');
            }
          }}
          keyboardType="number-pad"
          maxLength={6}
        />

        {error.length > 0 && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        <TouchableOpacity
          style={[
            styles.verifyBtn,
            otp.length === 6 && styles.verifyBtnActive,
          ]}
          onPress={handleVerify}
          activeOpacity={0.85}
          disabled={loading}
        >
          <Text style={styles.verifyBtnText}>
            {loading ? 'Verifying...' : 'Verify & Continue'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.resendBtn}
          onPress={handleResend}
          disabled={resendTimer > 0}
        >
          <Text style={[
            styles.resendText,
            resendTimer === 0 && styles.resendTextActive,
          ]}>
            {resendTimer > 0
              ? `Resend code in ${resendTimer}s`
              : 'Resend code'}
          </Text>
        </TouchableOpacity>

      </KeyboardAvoidingView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    elevation: 999,
  },
  inner: {
    flex: 1,
    paddingHorizontal: Math.min(width * 0.08, 32),
    paddingTop: height * 0.08,
    alignItems: 'center',
  },
  backBtn: {
    alignSelf: 'flex-start',
    width: Math.min(width * 0.1, 40),
    height: Math.min(width * 0.1, 40),
    borderRadius: Math.min(width * 0.05, 20),
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: height * 0.03,
  },
  backArrow: {
    fontSize: Math.min(width * 0.05, 20),
    color: '#FFFFFF',
    fontWeight: '600',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: height * 0.05,
    width: '100%',
  },
  title: {
    fontSize: Math.min(width * 0.08, 28),
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: height * 0.01,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Math.min(width * 0.045, 15),
    color: '#888888',
    marginBottom: height * 0.005,
    textAlign: 'center',
  },
  email: {
    fontSize: Math.min(width * 0.045, 15),
    color: '#E8241A',
    fontWeight: '600',
    textAlign: 'center',
  },
  otpWrapper: {
    width: '100%',
    alignItems: 'center',
    marginBottom: height * 0.04,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 400,
  },
  digitBox: {
    width: digitBoxSize,
    height: digitBoxHeight,
    borderRadius: digitBoxSize * 0.25,
    backgroundColor: '#1A1A1A',
    borderWidth: 1.5,
    borderColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitBoxFilled: {
    borderColor: '#E8241A',
    backgroundColor: '#1A0000',
  },
  digitBoxActive: {
    borderColor: '#E8241A',
    borderWidth: 2,
  },
  digitText: {
    fontSize: digitBoxSize * 0.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 0,
    width: 0,
  },
  errorText: {
    color: '#E8241A',
    fontSize: Math.min(width * 0.04, 13),
    marginBottom: height * 0.02,
    textAlign: 'center',
    width: '100%',
  },
  verifyBtn: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#2A2A2A',
    borderRadius: Math.min(width * 0.04, 14),
    paddingVertical: height * 0.02,
    alignItems: 'center',
    marginBottom: height * 0.02,
  },
  verifyBtnActive: {
    backgroundColor: '#E8241A',
  },
  verifyBtnText: {
    color: '#FFFFFF',
    fontSize: Math.min(width * 0.05, 16),
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  resendBtn: {
    paddingVertical: height * 0.01,
  },
  resendText: {
    color: '#555555',
    fontSize: Math.min(width * 0.045, 14),
  },
  resendTextActive: {
    color: '#E8241A',
    fontWeight: '600',
  },
});
