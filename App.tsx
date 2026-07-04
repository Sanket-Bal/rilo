import React, { useState, useEffect, useRef } from 'react';
import { Animated, View, StyleSheet } from 'react-native';
import SplashScreen from './src/screens/SplashScreen';
import LoginScreen from './src/screens/LoginScreen';
import OTPScreen from './src/screens/OTPScreen';
import TransitionScreen from './src/screens/TransitionScreen';
import HomeScreen from './src/screens/HomeScreen';
import { supabase } from './src/lib/supabase';
import FareSettlementScreen from './src/screens/FareSettlementScreen';
import RatingScreen from './src/screens/RatingScreen';

type Screen = 'login' | 'transition' | 'home';

type ActiveRide = {
  id: string;
  bikeId: string;
  bikeName: string;
  bikeImage: any;
  renterName: string;
  renterAvatar: string | null;
  renterRating: number;
  ownerName: string;
  ownerAvatar: string | null;
  ownerRating: number;
  pricePerHour: number;
  durationHours: number;
  userLocation: { latitude: number; longitude: number };
  ownerLocation: { latitude: number; longitude: number };
  isRenter: boolean;
} | null;

export default function App() {
  const [splashVisible, setSplashVisible] = useState(true);
  const [screen, setScreen] = useState<Screen>('login');
  const [activeRide, setActiveRide] = useState<ActiveRide>(null);
  const [showFareSettlement, setShowFareSettlement] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [completedRide, setCompletedRide] = useState<ActiveRide>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [isReturningUser, setIsReturningUser] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [showOtp, setShowOtp] = useState(false);

  // Home screen fade in for returning users
  const homeFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // Returning user — go to home but with special transition
        setIsReturningUser(true);
        setScreen('home');
      }
      setSessionChecked(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session && !isReturningUser) {
          setScreen('home');
        } else if (!session) {
          setScreen('login');
          setIsReturningUser(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleSplashFinish = () => {
    setSplashVisible(false);
    if (isReturningUser) {
      // Fade in home screen after splash completes
      Animated.timing(homeFadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  };

  

  if (!sessionChecked) return null;

  return (
    <View style={styles.container}>

      {/* Home screen — always rendered for returning users, fades in */}
      {screen === 'home' && (
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            { opacity: isReturningUser ? homeFadeAnim : 1 },
          ]}
        >
          <HomeScreen
            activeRide={activeRide}
            onRideStart={(ride) => setActiveRide(ride)}
            onRideEnd={() => {
              setCompletedRide(activeRide);
              setActiveRide(null);
              setShowFareSettlement(true);
            }}
          />
        </Animated.View>
      )}

      {showFareSettlement && completedRide && (
  <FareSettlementScreen
    bikeName={completedRide.bikeName}
    owner={completedRide.ownerName}
    deposit={Math.round(completedRide.pricePerHour * 10)}
    pricePerHour={completedRide.pricePerHour}
    duration={completedRide.durationHours}
    bookingId={completedRide.id}
    bookingRequestId={completedRide.id}
    onContinueToRating={() => {
      setShowFareSettlement(false);
      setShowRating(true);
    }}
  />
)}

      {showRating && completedRide && (
  <RatingScreen
    bikeName={completedRide.bikeName}
    owner={completedRide.ownerName}
    ownerId={completedRide.bikeId}
    bikeId={completedRide.bikeId}
    bookingId={completedRide.id}
    onDone={() => {
      setShowRating(false);
      setCompletedRide(null);
    }}
  />
)}

      {/* New user flow */}
      {screen === 'login' && (
        <LoginScreen
          onContinue={() => setScreen('transition')}
          onOtpSent={(email) => {
            setOtpEmail(email);
            setShowOtp(true);
          }}
        />
      )}
      {showOtp && (
        <OTPScreen
          email={otpEmail}
          onVerified={() => {
            setShowOtp(false);
            setScreen('transition');
          }}
          onBack={() => setShowOtp(false)}
        />
      )}
      {screen === 'transition' && (
        <TransitionScreen onFinish={() => setScreen('home')} />
      )}

      {/* Splash — always on top until dismissed */}
      {splashVisible && (
        <SplashScreen
          onFinish={handleSplashFinish}
          isReturningUser={isReturningUser}
        />
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});