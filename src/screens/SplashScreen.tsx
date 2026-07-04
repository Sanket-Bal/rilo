import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  StyleSheet,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function SplashScreen({
  onFinish,
  isReturningUser = false,
}: {
  onFinish: () => void;
  isReturningUser?: boolean;
}) {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const darkBgOpacity = useRef(new Animated.Value(1)).current;
  const lightBgOpacity = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isReturningUser) {
      // Returning user flow:
      // Phase 1: Background transitions dark → light (logo stays)
      // Phase 2: Logo fades out
      // Phase 3: Home screen fades in (handled by App.tsx)
      Animated.sequence([
        // Wait a moment on splash
        Animated.delay(2800),

        // Phase 1: Background shifts dark → light
        Animated.parallel([
          Animated.timing(darkBgOpacity, {
            toValue: 0,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(lightBgOpacity, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
        ]),

        // Brief pause on white background with logo
        Animated.delay(300),

        // Phase 2: Logo fades and scales out
        Animated.parallel([
          Animated.timing(logoOpacity, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(logoScale, {
            toValue: 0.8,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),

      ]).start(() => {
        onFinish();
      });

    } else {
      // New user flow: simple fade out then login screen
      const timer = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
        }).start(() => {
          onFinish();
        });
      }, 3500);

      return () => clearTimeout(timer);
    }
  }, []);

  if (isReturningUser) {
    return (
      <View style={styles.container}>
        {/* Dark background — fades out */}
        <Animated.View
          style={[StyleSheet.absoluteFillObject, { opacity: darkBgOpacity }]}
        >
          <LinearGradient
            colors={['#0A0A0A', '#0A0A0A', '#3D0000', '#6B0000']}
            locations={[0, 0.4, 0.75, 1]}
            style={StyleSheet.absoluteFillObject}
          />
        </Animated.View>

        {/* Light background — fades in */}
        <Animated.View
          style={[StyleSheet.absoluteFillObject, { opacity: lightBgOpacity }]}
        >
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#FFFFFF' }]} />
        </Animated.View>

        {/* Logo — stays centered, then fades out */}
        <Animated.View
          style={[
            styles.logoWrapper,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <Image
            source={require('../../assets/RILO_logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>
      </View>
    );
  }

  // New user splash — simple dark with fade
  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <LinearGradient
        colors={['#0A0A0A', '#0A0A0A', '#3D0000', '#6B0000']}
        locations={[0, 0.4, 0.75, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <Image
        source={require('../../assets/RILO_logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 220,
    height: 220,
    borderRadius: 40,
  },
});