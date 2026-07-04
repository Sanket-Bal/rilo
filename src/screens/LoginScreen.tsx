import React, { useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function LoginScreen({ 
  onContinue,
  onOtpSent,
}: { 
  onContinue: () => void;
  onOtpSent: (email: string) => void;
}) {
  const [input, setInput] = useState('');
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const borderAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = () => {
    setFocused(true);
    Animated.timing(borderAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: false,
    }).start();
  };

  const handleBlur = () => {
    setFocused(false);
    Animated.timing(borderAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  };

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#2A2A2A', '#E8241A'],
  });

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#0A0A0A', '#0A0A0A', '#3D0000', '#6B0000']}
        locations={[0, 0.4, 0.75, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── LOGO SECTION ── */}
        <View style={styles.logoSection}>
          <Image
            source={require('../../assets/RILO_logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.appName}>RILO</Text>
          <Text style={styles.tagline}>The Airbnb for Bikes & Scooters</Text>
        </View>

        {/* ── FORM SECTION ── */}
        <View style={styles.formSection}>
          <Text style={styles.formLabel}>Login / Sign Up</Text>
          <Animated.View style={[styles.inputWrapper, { borderColor }]}>
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor="#555555"
              value={input}
              onChangeText={setInput}
              onFocus={handleFocus}
              onBlur={handleBlur}
              keyboardType="email-address"
              autoCapitalize="none"
              selectionColor="#E8241A"
            />
          </Animated.View>

          {error.length > 0 && (
            <Text style={styles.errorText}>{error}</Text>
          )}

          <TouchableOpacity
            style={[styles.continueBtn, input.length > 0 && styles.continueBtnActive]}
            activeOpacity={0.85}
            onPress={async () => {
              if (input.length === 0) return;
              if (!input.includes('@')) {
                setError('Please enter a valid email address');
                return;
              }
              setLoading(true);
              setError('');

              const { error } = await supabase.auth.signInWithOtp({
                email: input.trim(),
                options: {
                  shouldCreateUser: true,
                  emailRedirectTo: undefined,
                },
              });

              if (error) {
                setError(error.message);
                setLoading(false);
              } else {
                setLoading(false);
                onOtpSent(input.trim());
              }
            }}
          >
            <Text style={styles.continueBtnText}>
              {loading ? 'Please wait...' : 'Continue'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── DIVIDER ── */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>How it works</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* ── GUIDANCE SECTION ── */}
        <View style={styles.guidanceSection}>
          <Text style={styles.guidanceHeading}>Ready to Ride?</Text>

          {[
            'Browse nearby bikes & scooters on the map',
            'Book safely with KYC and security deposit',
            'Meet the owner, ride, and return hassle-free',
            'Auto settlement — you pay only for the ride',
          ].map((item, index) => (
            <View key={index} style={styles.bulletRow}>
              <View style={styles.bullet} />
              <Text style={styles.bulletText}>{item}</Text>
            </View>
          ))}

          <View style={styles.ownerBox}>
            <Text style={styles.ownerText}>
              Own a bike?{' '}
              <Text style={styles.ownerHighlight}>List it on RILO</Text>
              {' '}and start earning passively.
            </Text>
          </View>

          <Text style={styles.footerNote}>
            New users begin in Renter mode. Switch to Owner mode after listing your vehicle.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: height * 0.08,
    paddingBottom: 40,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 90,
    height: 90,
    borderRadius: 20,
  },
  appName: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 8,
    marginTop: 12,
  },
  tagline: {
    color: '#888888',
    fontSize: 13,
    marginTop: 6,
    letterSpacing: 0.4,
  },
  formSection: {
    marginBottom: 36,
  },
  inputWrapper: {
    borderWidth: 1.5,
    borderRadius: 12,
    backgroundColor: '#161616',
    marginBottom: 14,
    paddingHorizontal: 16,
    height: 54,
    justifyContent: 'center',
  },
  input: {
    color: '#FFFFFF',
    fontSize: 15,
    letterSpacing: 0.3,
  },
  continueBtn: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueBtnActive: {
    backgroundColor: '#E8241A',
  },
  continueBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#222222',
  },
  dividerText: {
    color: '#444444',
    fontSize: 11,
    marginHorizontal: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  guidanceSection: {
    paddingBottom: 10,
  },
  guidanceHeading: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E8241A',
    marginTop: 7,
    marginRight: 10,
  },
  bulletText: {
    color: '#AAAAAA',
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
  },
  ownerBox: {
    marginTop: 20,
    padding: 14,
    backgroundColor: '#161616',
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#E8241A',
  },
  ownerText: {
    color: '#777777',
    fontSize: 13,
    lineHeight: 20,
  },
  ownerHighlight: {
    color: '#E8241A',
    fontWeight: '600',
  },
  footerNote: {
    color: '#666666',
    fontSize: 11,
    marginTop: 16,
    lineHeight: 18,
    textAlign: 'center',
  },
  formLabel: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  errorText: {
    color: '#E8241A',
    fontSize: 13,
    marginBottom: 10,
    textAlign: 'center',
  },
});