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

export default function TransitionScreen({ onFinish }: { onFinish: () => void }) {
  // Animation values
  const fadeOthers = useRef(new Animated.Value(1)).current;
  const logoY = useRef(new Animated.Value(0)).current;
  const darkBgOpacity = useRef(new Animated.Value(1)).current;
  const lightBgOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(1)).current;
  const logoOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      // Step 1: Brief loading pause
      Animated.delay(600),

      // Step 2: Fade out everything except logo
      Animated.timing(fadeOthers, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),

      // Step 3: Logo moves to center + grows + background shifts
      Animated.parallel([
        Animated.timing(logoY, {
          toValue: height * 0.35,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 2.5,
          duration: 600,
          useNativeDriver: true,
        }),
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

      // Step 4: Brief pause at center
      Animated.delay(400),

      // Step 5: Logo fades out
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
  }, []);

  return (
    <View style={styles.container}>

      {/* Dark background — fades out */}
      <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: darkBgOpacity }]}>
        <LinearGradient
          colors={['#0A0A0A', '#0A0A0A', '#3D0000', '#6B0000']}
          locations={[0, 0.4, 0.75, 1]}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>

      {/* Light background — fades in */}
      <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: lightBgOpacity }]}>
        <LinearGradient
          colors={['#FFFFFF', '#F0F0F0', '#E8E8E8']}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>

      {/* Logo — moves to center */}
      <Animated.View
        style={[
          styles.logoWrapper,
          {
            opacity: logoOpacity,
            transform: [
              { translateY: logoY },
              { scale: logoScale },
            ],
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  logoWrapper: {
    position: 'absolute',
    top: height * 0.08,
    alignSelf: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 90,
    height: 90,
    borderRadius: 20,
  },
});