import React, { useEffect, useRef, useState } from 'react'; //confirmation screen
import { supabase } from '../lib/supabase';
import {
  Alert,
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

const { width, height } = Dimensions.get('window');

type BikeType = {
  id: string;
  name: string;
  price: number;
  distance: string;
  gps: boolean;
  type: string;
  image: any;
  owner: string;
  rating: number;
  year: string;
  condition: string;
  fuel: string;
  deposit: number;
  owner_id?: string;
};

export default function ConfirmationScreen({
  bike,
  duration,
  userLocation,
  onGoHome,
  bookingRequestId,
}: {
  bike: BikeType;
  duration: number;
  userLocation: { latitude: number; longitude: number };
  onGoHome: (rideData: any) => void;  // Accept any format for now
  bookingRequestId: string;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;
  const checkOpacity = useRef(new Animated.Value(0)).current;
  const contentFade = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pendingPulse = useRef(new Animated.Value(0.6)).current;

  // 'pending' | 'approved' | 'rejected' | 'cancelled'
  const [requestStatus, setRequestStatus] = useState<'pending' | 'approved' | 'rejected' | 'cancelled'>('pending');
  const [bookingId, setBookingId] = useState('');
  const [minutesLeft, setMinutesLeft] = useState(5);
  const [cancelling, setCancelling] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const approvedAnimationDone = useRef(false);
  const [countdownSeconds, setCountdownSeconds] = useState(3);
  const statusRef = useRef<string>('pending');

  const bikeLocation = {
    latitude: userLocation.latitude + 0.003,
    longitude: userLocation.longitude + 0.004,
  };

  // ── PENDING PULSE ANIMATION ──
  const startPendingPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pendingPulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pendingPulse, {
          toValue: 0.6,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  // ── APPROVED ANIMATION ──
  const playApprovedAnimation = () => {
    if (approvedAnimationDone.current) return;
    approvedAnimationDone.current = true;

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );

    Animated.sequence([
      Animated.parallel([
        Animated.spring(checkScale, { toValue: 1, useNativeDriver: true, bounciness: 8, speed: 8 }),
        Animated.timing(checkOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
      Animated.timing(contentFade, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start(() => pulse.start());
  };

  // ── POLL DB FOR APPROVAL STATUS ──
  const checkApprovalStatus = async () => {
    // Don't poll if we already have a final status
    if (statusRef.current !== 'pending') return;

    try {
      const { data } = await supabase
        .from('booking_requests')
        .select('status, booking_id, expires_at')
        .eq('id', bookingRequestId)
        .single();

      if (!data) return;

      if (data.booking_id) {
        setBookingId(data.booking_id);
      }

      const status = data.status;

      if (status === 'approved') {
  statusRef.current = 'approved';
  setRequestStatus('approved');
  if (pollingRef.current) clearInterval(pollingRef.current);
  if (timerRef.current) clearInterval(timerRef.current);
  playApprovedAnimation();
  
  // Start countdown timer
  let secondsLeft = 3;
  setCountdownSeconds(3);
  
  const countdownInterval = setInterval(() => {
    secondsLeft -= 1;
    setCountdownSeconds(secondsLeft);
    
    if (secondsLeft <= 0) {
      clearInterval(countdownInterval);
      handleStartRide();
    }
  }, 1000);
} else if (status === 'rejected') {
        statusRef.current = 'rejected';
        setRequestStatus('rejected');
        if (pollingRef.current) clearInterval(pollingRef.current);
        if (timerRef.current) clearInterval(timerRef.current);
      } else if (status === 'cancelled') {
        statusRef.current = 'cancelled';
        setRequestStatus('cancelled');
        if (pollingRef.current) clearInterval(pollingRef.current);
        if (timerRef.current) clearInterval(timerRef.current);
      } else if (status === 'expired') {
        // Only treat as expired if DB explicitly says 'expired'
        statusRef.current = 'rejected';
        setRequestStatus('rejected');
        if (pollingRef.current) clearInterval(pollingRef.current);
        if (timerRef.current) clearInterval(timerRef.current);
      }
      // If status === 'pending', do nothing — keep waiting
    } catch (err) {
      console.log('Error checking approval:', err);
    }
  };

  // ── CANCEL REQUEST ──
  const handleCancel = () => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking request? Any deposit paid will be refunded within 24 hours.',
      [
        { text: 'No, Keep Waiting', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              const { error } = await supabase
                .from('booking_requests')
                .update({
                  status: 'cancelled',
                  rejection_reason: 'Cancelled by renter',
                })
                .eq('id', bookingRequestId);

              if (error) {
                Alert.alert('Error', 'Could not cancel booking. Please try again.');
                setCancelling(false);
                return;
              }

              statusRef.current = 'cancelled';
              setRequestStatus('cancelled');
              if (pollingRef.current) clearInterval(pollingRef.current);
              if (timerRef.current) clearInterval(timerRef.current);
              setCancelling(false);
            } catch (err) {
              Alert.alert('Error', 'Something went wrong. Please try again.');
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    startPendingPulse();

    // Small delay before first check to allow DB write to complete
    const initialCheck = setTimeout(() => {
      checkApprovalStatus();
    }, 1500);

    // Poll every 3 seconds as backup
    pollingRef.current = setInterval(checkApprovalStatus, 3000);

    // Countdown timer (minutes display only)
    timerRef.current = setInterval(() => {
      setMinutesLeft(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 60000);

    return () => {
      clearTimeout(initialCheck);
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleStartRide = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    onGoHome({
      id: bookingRequestId,                    // ← Booking request ID
      bikeId: bike.id,                         // ← Bike ID
      bikeName: bike.name,                     // ← Bike name (same)
      bikeImage: bike.image,                   // ← Bike image
      renterName: user?.email?.split('@')[0] || 'Renter',  // ← Extract name from email
      renterAvatar: null,                      // ← TODO: fetch from profile later
      renterRating: 4.5,                       // ← Default rating
      ownerName: bike.owner,                   // ← Owner name (renamed from 'owner')
      ownerAvatar: null,                       // ← TODO: fetch from profile later
      ownerRating: bike.rating,                // ← Owner rating
      pricePerHour: bike.price,                // ← Renamed from 'price'
      durationHours: duration,                 // ← Renamed from 'duration'
      userLocation,                            // ← Renter's location (same)
      ownerLocation: bikeLocation,             // ← Renamed from 'bikeLocation'
      isRenter: true,                          // ← Flag: this is renter view
    });
  } catch (err) {
    console.log('[ConfirmationScreen] Error in handleStartRide:', err);
    // Fallback - still go home even if fetch fails
    onGoHome({
      id: bookingRequestId,
      bikeId: bike.id,
      bikeName: bike.name,
      bikeImage: bike.image,
      renterName: 'Renter',
      renterAvatar: null,
      renterRating: 4.5,
      ownerName: bike.owner,
      ownerAvatar: null,
      ownerRating: bike.rating,
      pricePerHour: bike.price,
      durationHours: duration,
      userLocation,
      ownerLocation: bikeLocation,
      isRenter: true,
    });
  }
};

  const goHomeNoRide = () => {
    onGoHome({
      bikeName: bike.name,
      owner: bike.owner,
      bikeLocation,
      bookingId,
      bookingRequestId,
      deposit: bike.deposit,
      price: bike.price,
      duration,
      ownerId: bike.owner_id || '',
    });
  };

  // ── CANCELLED STATE ──
  if (requestStatus === 'cancelled') {
    return (
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <View style={styles.topSection}>
          <View style={styles.rejectedCircle}>
            <Text style={styles.rejectedIcon}>✕</Text>
          </View>
          <Text style={styles.confirmedTitle}>Booking Cancelled</Text>
          <Text style={styles.confirmedSubtitle}>
            Your booking request has been cancelled. Your deposit will be refunded within 24 hours.
          </Text>
        </View>
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.homeBtn} onPress={goHomeNoRide} activeOpacity={0.85}>
            <Text style={styles.homeBtnText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  }

  // ── REJECTED / EXPIRED STATE ──
  if (requestStatus === 'rejected') {
    return (
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <View style={styles.topSection}>
          <View style={styles.rejectedCircle}>
            <Text style={styles.rejectedIcon}>✕</Text>
          </View>
          <Text style={styles.confirmedTitle}>Request Declined</Text>
          <Text style={styles.confirmedSubtitle}>
            {bike.owner} couldn't accept your request right now. Your deposit will be refunded within 24 hours.
          </Text>
        </View>
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.homeBtn} onPress={goHomeNoRide} activeOpacity={0.85}>
            <Text style={styles.homeBtnText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  }

  // ── PENDING STATE ──
  if (requestStatus === 'pending') {
    return (
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <View style={styles.topSection}>
          <Animated.View style={[styles.pendingCircleOuter, { opacity: pendingPulse }]}>
            <View style={styles.pendingCircleInner}>
              <ActivityIndicator color="#FFFFFF" size="large" />
            </View>
          </Animated.View>

          <Text style={styles.confirmedTitle}>Request Sent! 🔔</Text>
          <Text style={styles.confirmedSubtitle}>
            Waiting for {bike.owner} to approve your request...
          </Text>

          <View style={styles.bookingIdBox}>
            <Text style={styles.bookingIdLabel}>Booking ID</Text>
            <Text style={styles.bookingIdValue}>{bookingId || '...'}</Text>
          </View>

          <View style={styles.timerBox}>
            <Text style={styles.timerIcon}>⏱️</Text>
            <Text style={styles.timerText}>
              {minutesLeft > 0
                ? `Request expires in ~${minutesLeft} min`
                : 'Request expiring soon...'}
            </Text>
          </View>
        </View>

        <View style={styles.detailsSection}>
          <View style={styles.stepsCard}>
            <Text style={styles.stepsTitle}>What happens next</Text>
            {[
              { icon: '🔔', text: `${bike.owner} is being notified`, done: true },
              { icon: '✅', text: 'Owner approves your request', done: false },
              { icon: '📍', text: 'Meetup location is confirmed', done: false },
              { icon: '🛵', text: 'Your ride begins!', done: false },
            ].map((step, i) => (
              <View key={i} style={[styles.stepRow, step.done && styles.stepRowDone]}>
                <Text style={styles.stepIcon}>{step.icon}</Text>
                <Text style={[styles.stepText, step.done && styles.stepTextDone]}>
                  {step.text}
                </Text>
                {step.done && <Text style={styles.stepCheck}>✓</Text>}
              </View>
            ))}
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoCardIcon}>ℹ️</Text>
            <Text style={styles.infoCardText}>
              Keep this screen open. You'll see a confirmation here the moment {bike.owner} approves.
            </Text>
          </View>
        </View>

        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={handleCancel}
            activeOpacity={0.85}
            disabled={cancelling}
          >
            {cancelling ? (
              <ActivityIndicator color="#E8241A" size="small" />
            ) : (
              <Text style={styles.cancelBtnText}>Cancel Request</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.homeBtnOutline}
            onPress={goHomeNoRide}
            activeOpacity={0.85}
          >
            <Text style={styles.homeBtnOutlineText}>Go to Home (stay in background)</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  }

  // ── APPROVED STATE ──
  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.topSection}>
        <Animated.View
          style={[
            styles.checkWrapper,
            { opacity: checkOpacity, transform: [{ scale: checkScale }] },
          ]}
        >
          <Animated.View style={[styles.checkPulse, { transform: [{ scale: pulseAnim }] }]} />
          <View style={styles.checkCircle}>
            <Text style={styles.checkIcon}>✓</Text>
          </View>
        </Animated.View>

        <Animated.View style={{ opacity: contentFade, alignItems: 'center' }}>
  <Text style={styles.confirmedTitle}>Booking Approved! 🎉</Text>
  <Text style={styles.confirmedSubtitle}>
    {bike.owner} accepted your request. Head to the meetup point!
  </Text>
  <View style={styles.bookingIdBox}>
    <Text style={styles.bookingIdLabel}>Booking ID</Text>
    <Text style={styles.bookingIdValue}>{bookingId}</Text>
  </View>
  
  {/* Countdown Timer */}
  <View style={styles.countdownBox}>
    <Text style={styles.countdownLabel}>Redirecting in</Text>
    <Text style={styles.countdownValue}>{countdownSeconds}</Text>
  </View>
</Animated.View>
      </View>

      <Animated.View style={[styles.detailsSection, { opacity: contentFade }]}>
        <View style={styles.infoRow}>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Vehicle</Text>
            <Text style={styles.infoValue}>{bike.name}</Text>
            <Text style={styles.infoSub}>{bike.type}</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Owner</Text>
            <Text style={styles.infoValue}>{bike.owner}</Text>
            <Text style={styles.infoSub}>★ {bike.rating}</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Duration</Text>
            <Text style={styles.infoValue}>{duration}hr</Text>
            <Text style={styles.infoSub}>₹{bike.price}/hr</Text>
          </View>
        </View>

        <View style={styles.instructionBox}>
          <Text style={styles.instructionIcon}>📍</Text>
          <Text style={styles.instructionText}>
            Meet {bike.owner} at the pinned location. Show your Booking ID and documents before taking the vehicle.
          </Text>
        </View>

        <View style={styles.miniMapWrapper}>
          <MapView
            style={styles.miniMap}
            provider={PROVIDER_GOOGLE}
            initialRegion={{
              latitude: bikeLocation.latitude,
              longitude: bikeLocation.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            scrollEnabled={false}
            zoomEnabled={false}
          >
            <Marker coordinate={userLocation}>
              <View style={styles.userMarker} />
            </Marker>
            <Marker coordinate={bikeLocation}>
              <View style={styles.markerContainer}>
                <View style={styles.marker}>
                  <View style={styles.markerInner} />
                </View>
                <View style={styles.markerTail} />
              </View>
            </Marker>
          </MapView>
          <View style={styles.mapOverlay}>
            <Text style={styles.mapOverlayText}>📍 {bike.distance} to meetup point</Text>
          </View>
        </View>
      </Animated.View>

      <Animated.View style={[styles.bottomBar, { opacity: contentFade }]}>
        <TouchableOpacity
          style={styles.homeBtn}
          onPress={handleStartRide}
          activeOpacity={0.85}
        >
          <Text style={styles.homeBtnText}>Start Ride & Track on Map</Text>
          <Text style={styles.homeBtnSub}>View route to meetup point</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0A0A0A',
    zIndex: 1100,
    elevation: 1100,
  },
  topSection: {
    alignItems: 'center',
    paddingTop: height * 0.07,
    paddingBottom: 20,
    paddingHorizontal: 24,
  },
  pendingCircleOuter: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(232,36,26,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  pendingCircleInner: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#E8241A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectedCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#333333',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  rejectedIcon: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '700',
  },
  checkWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  checkPulse: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(232, 36, 26, 0.15)',
  },
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8241A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E8241A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  checkIcon: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '700',
  },
  confirmedTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  confirmedSubtitle: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  bookingIdBox: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    marginBottom: 12,
  },
  bookingIdLabel: {
    fontSize: 11,
    color: '#666666',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  bookingIdValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#E8241A',
    letterSpacing: 2,
  },
  timerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  timerIcon: {
    fontSize: 16,
  },
  timerText: {
    fontSize: 13,
    color: '#AAAAAA',
    fontWeight: '500',
  },
  detailsSection: {
    flex: 1,
    paddingHorizontal: 16,
    gap: 12,
  },
  stepsCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  stepsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#666666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    opacity: 0.5,
  },
  stepRowDone: {
    opacity: 1,
  },
  stepIcon: {
    fontSize: 18,
    width: 28,
    textAlign: 'center',
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    color: '#AAAAAA',
    fontWeight: '500',
  },
  stepTextDone: {
    color: '#FFFFFF',
  },
  stepCheck: {
    color: '#E8241A',
    fontWeight: '700',
    fontSize: 14,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  infoCardIcon: {
    fontSize: 16,
  },
  infoCardText: {
    flex: 1,
    fontSize: 12,
    color: '#777777',
    lineHeight: 18,
  },
  infoRow: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  infoBox: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  infoDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#2A2A2A',
  },
  infoLabel: {
    fontSize: 11,
    color: '#666666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  infoSub: {
    fontSize: 11,
    color: '#E8241A',
  },
  instructionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#E8241A',
  },
  instructionIcon: {
    fontSize: 16,
  },
  instructionText: {
    flex: 1,
    fontSize: 13,
    color: '#888888',
    lineHeight: 20,
  },
  miniMapWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    height: 150,
  },
  miniMap: {
    flex: 1,
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 10,
    alignItems: 'center',
  },
  mapOverlayText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  userMarker: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#1A73E8',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  markerContainer: {
    alignItems: 'center',
  },
  marker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E8241A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  markerInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  markerTail: {
    width: 8,
    height: 8,
    backgroundColor: '#E8241A',
    transform: [{ rotate: '45deg' }],
    marginTop: -5,
  },
  bottomBar: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: '#111111',
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
    gap: 10,
  },
  homeBtn: {
    backgroundColor: '#E8241A',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  homeBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  homeBtnSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 3,
  },
  homeBtnOutline: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#333333',
  },
  homeBtnOutlineText: {
    color: '#888888',
    fontSize: 15,
    fontWeight: '600',
  },
  cancelBtn: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E8241A',
    minHeight: 48,
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: '#E8241A',
    fontSize: 15,
    fontWeight: '700',
  },
  countdownBox: {
  marginTop: 20,
  backgroundColor: '#1A1A1A',
  borderRadius: 12,
  paddingHorizontal: 24,
  paddingVertical: 16,
  alignItems: 'center',
  borderWidth: 1,
  borderColor: '#E8241A',
},
countdownLabel: {
  fontSize: 12,
  color: '#666666',
  letterSpacing: 0.5,
  textTransform: 'uppercase',
  marginBottom: 8,
},
countdownValue: {
  fontSize: 40,
  fontWeight: '700',
  color: '#E8241A',
  lineHeight: 44,
},
});
