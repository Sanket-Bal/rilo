import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import Slider from '@react-native-community/slider';

const { width, height } = Dimensions.get('window');

const BOTTOM_SHEET_MIN = height * 0.35;
const BOTTOM_SHEET_MAX = height * 0.75;

type RideData = {
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
};

type RidePhase = 'en-route' | 'arrived' | 'riding';

export default function UserActiveRideOverlay({
  ride,
  onEndRide,
  onHandoverComplete,
}: {
  ride: RideData;
  onEndRide: () => void;
  onHandoverComplete: (radius: number, geofenceEnabled: boolean) => void;
}) {
  const slideAnim = useRef(new Animated.Value(BOTTOM_SHEET_MIN)).current;
  const [phase, setPhase] = useState<RidePhase>('en-route');
  const [distance, setDistance] = useState(0);
  const [rideElapsedSeconds, setRideElapsedSeconds] = useState(0);
  const [geofenceEnabled, setGeofenceEnabled] = useState(true);
  const [roamingRadius, setRoamingRadius] = useState(5);
  const rideTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const distanceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Calculate distance between two points
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Update distance every 2 seconds
  useEffect(() => {
    distanceTimerRef.current = setInterval(() => {
      const dist = calculateDistance(
        ride.userLocation.latitude,
        ride.userLocation.longitude,
        ride.ownerLocation.latitude,
        ride.ownerLocation.longitude
      );
      setDistance(dist);

      // Auto-transition: en-route → arrived when < 100m
      if (dist < 0.1 && phase === 'en-route') {
        console.log('[UserActiveRideOverlay] Arrived at owner location');
        setPhase('arrived');
      }
    }, 2000);

    return () => {
      if (distanceTimerRef.current) clearInterval(distanceTimerRef.current);
    };
  }, [phase, ride.userLocation, ride.ownerLocation]);

  // Start ride timer when in 'riding' phase
  useEffect(() => {
    if (phase === 'riding') {
      rideTimerRef.current = setInterval(() => {
        setRideElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (rideTimerRef.current) clearInterval(rideTimerRef.current);
    }

    return () => {
      if (rideTimerRef.current) clearInterval(rideTimerRef.current);
    };
  }, [phase]);

  // Handle handover confirmation
  const handleConfirmHandover = () => {
    setPhase('riding');
    onHandoverComplete(roamingRadius, geofenceEnabled);
    console.log('[UserActiveRideOverlay] Handover confirmed - riding started');
  };

  // Handle end ride
  const handleEndRide = () => {
    Alert.alert(
      'End Ride?',
      `Are you sure you want to end the ride? You'll be taken to fare settlement.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Ride',
          style: 'destructive',
          onPress: () => {
            console.log('[UserActiveRideOverlay] Ride ended');
            onEndRide();
          },
        },
      ]
    );
  };

  // Format elapsed time
  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PHASE 1: EN-ROUTE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const renderEnRoute = () => (
    <Animated.View style={[styles.bottomSheet, { bottom: slideAnim }]}>
      {/* Handle Bar */}
      <View style={styles.handleBar} />

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Going to Owner 🛵</Text>
          <Text style={styles.headerSubtitle}>Follow the route on the map</Text>
        </View>

        {/* Distance Card */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View>
              <Text style={styles.cardLabel}>Distance to Owner</Text>
              <Text style={styles.distanceValue}>{distance.toFixed(2)} km</Text>
            </View>
            <Text style={styles.cardIcon}>📍</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.cardRow}>
            <View>
              <Text style={styles.cardLabel}>Time Remaining</Text>
              <Text style={styles.timeValue}>{ride.durationHours}h</Text>
            </View>
            <Text style={styles.cardIcon}>⏱️</Text>
          </View>
        </View>

        {/* Owner Profile Card */}
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{ride.ownerName.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>{ride.ownerName}</Text>
              <View style={styles.ratingRow}>
                <Text style={styles.ratingStar}>★</Text>
                <Text style={styles.ratingValue}>{ride.ownerRating.toFixed(1)}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.contactBtn}>
              <Text style={styles.contactBtnText}>📞</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bike Info Card */}
        <View style={styles.card}>
          <View style={styles.bikeRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.bikeName}>{ride.bikeName}</Text>
              <Text style={styles.bikePrice}>₹{ride.pricePerHour}/hr</Text>
            </View>
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.instructionBox}>
          <Text style={styles.instructionTitle}>📍 Navigation</Text>
          <Text style={styles.instructionText}>
            Navigate towards the owner's location marked on the map. You'll see a confirmation when you arrive.
          </Text>
        </View>

        {/* Cancel Ride Button */}
        <TouchableOpacity style={styles.cancelBtn} onPress={handleEndRide} activeOpacity={0.8}>
          <Text style={styles.cancelBtnText}>Cancel Ride</Text>
        </TouchableOpacity>
      </ScrollView>
    </Animated.View>
  );

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PHASE 2: ARRIVED (Handover with geofence settings)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const renderArrived = () => (
    <Animated.View style={[styles.bottomSheet, { bottom: slideAnim }]}>
      {/* Handle Bar */}
      <View style={styles.handleBar} />

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>You've Arrived! 🎉</Text>
          <Text style={styles.headerSubtitle}>Set geofence preferences for this ride</Text>
        </View>

        {/* Geofence Settings Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🔒 Geofence Settings</Text>

          {/* Geofence Toggle */}
          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Enable Geofence</Text>
              <Text style={styles.settingDescription}>Prevent bike from going outside allowed area</Text>
            </View>
            <TouchableOpacity
              style={[styles.toggleBtn, geofenceEnabled && styles.toggleBtnActive]}
              onPress={() => setGeofenceEnabled(!geofenceEnabled)}
            >
              <Text style={styles.toggleBtnText}>{geofenceEnabled ? 'ON' : 'OFF'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {/* Roaming Radius Slider */}
          {geofenceEnabled && (
            <View style={styles.radiusSection}>
              <View style={styles.radiusHeader}>
                <Text style={styles.radiusLabel}>Roaming Radius</Text>
                <Text style={styles.radiusValue}>{roamingRadius} km</Text>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={1}
                maximumValue={20}
                step={1}
                value={roamingRadius}
                onValueChange={(val) => setRoamingRadius(val)}
                minimumTrackTintColor="#E8241A"
                maximumTrackTintColor="#EEEEEE"
                thumbTintColor="#E8241A"
              />
              <View style={styles.radiusLabels}>
                <Text style={styles.radiusLabel}>1 km</Text>
                <Text style={styles.radiusLabel}>20 km</Text>
              </View>
              <View style={styles.radiusInfo}>
                <Text style={styles.radiusInfoText}>
                  The bike can roam within {roamingRadius} km of the meetup point.
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Owner Info Card */}
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{ride.ownerName.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>{ride.ownerName}</Text>
              <View style={styles.ratingRow}>
                <Text style={styles.ratingStar}>★</Text>
                <Text style={styles.ratingValue}>{ride.ownerRating.toFixed(1)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoCardIcon}>ℹ️</Text>
          <Text style={styles.infoCardText}>
            Discuss geofence and roaming settings with {ride.ownerName}. Once confirmed, tap the button below.
          </Text>
        </View>

        {/* Confirm Handover Button */}
        <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmHandover} activeOpacity={0.8}>
          <Text style={styles.confirmBtnText}>Confirm Handover & Start Ride</Text>
        </TouchableOpacity>
      </ScrollView>
    </Animated.View>
  );

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PHASE 3: RIDING
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const renderRiding = () => (
    <Animated.View style={[styles.bottomSheet, { bottom: slideAnim }]}>
      {/* Handle Bar */}
      <View style={styles.handleBar} />

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Ride Active 🛵</Text>
          <Text style={styles.headerSubtitle}>Enjoy your ride!</Text>
        </View>

        {/* Timer & Fare Card */}
        <View style={styles.card}>
          <View style={styles.timerRow}>
            <View style={styles.timerBox}>
              <Text style={styles.timerLabel}>Time Elapsed</Text>
              <Text style={styles.timerValue}>{formatTime(rideElapsedSeconds)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.timerBox}>
              <Text style={styles.timerLabel}>Current Fare</Text>
              <Text style={styles.timerValue}>₹{Math.round(ride.pricePerHour * (rideElapsedSeconds / 3600))}</Text>
            </View>
          </View>
        </View>

        {/* Bike Info Card */}
        <View style={styles.card}>
          <View style={styles.bikeRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.bikeName}>{ride.bikeName}</Text>
              <Text style={styles.bikePrice}>₹{ride.pricePerHour}/hr</Text>
            </View>
          </View>
        </View>

        {/* Geofence Status */}
        <View style={styles.card}>
          <View style={styles.statusRow}>
            <View>
              <Text style={styles.statusLabel}>Geofence Status</Text>
              <Text style={styles.statusValue}>{geofenceEnabled ? 'Enabled' : 'Disabled'}</Text>
            </View>
            <Text style={styles.statusIcon}>{geofenceEnabled ? '🔒' : '🔓'}</Text>
          </View>
          {geofenceEnabled && (
            <>
              <View style={styles.divider} />
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Roaming Radius</Text>
                <Text style={styles.statusValue}>{roamingRadius} km</Text>
              </View>
            </>
          )}
        </View>

        {/* End Ride Button */}
        <TouchableOpacity style={styles.endRideBtn} onPress={handleEndRide} activeOpacity={0.8}>
          <Text style={styles.endRideBtnText}>End Ride</Text>
        </TouchableOpacity>
      </ScrollView>
    </Animated.View>
  );

  return (
    <>
      {phase === 'en-route' && renderEnRoute()}
      {phase === 'arrived' && renderArrived()}
      {phase === 'riding' && renderRiding()}
    </>
  );
}

const styles = StyleSheet.create({
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: BOTTOM_SHEET_MAX,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1000,
  },
  handleBar: {
    width: 48,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#DDDDDD',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#777777',
  },
  card: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: 12,
    color: '#777777',
    marginBottom: 4,
  },
  cardIcon: {
    fontSize: 18,
  },
  distanceValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#E8241A',
  },
  timeValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  divider: {
    height: 1,
    backgroundColor: '#EEEEEE',
    marginVertical: 12,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8241A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  profileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingStar: {
    fontSize: 12,
    color: '#E8241A',
  },
  ratingValue: {
    fontSize: 12,
    color: '#777777',
    fontWeight: '500',
  },
  contactBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8241A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactBtnText: {
    fontSize: 18,
  },
  bikeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bikeName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  bikePrice: {
    fontSize: 12,
    color: '#E8241A',
    fontWeight: '700',
  },
  instructionBox: {
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#E8241A',
  },
  instructionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 6,
  },
  instructionText: {
    fontSize: 12,
    color: '#555555',
    lineHeight: 18,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    padding: 12,
    gap: 10,
    marginBottom: 12,
  },
  infoCardIcon: {
    fontSize: 16,
  },
  infoCardText: {
    flex: 1,
    fontSize: 12,
    color: '#555555',
    lineHeight: 18,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  settingLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 11,
    color: '#777777',
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#EEEEEE',
    borderWidth: 1,
    borderColor: '#DDDDDD',
  },
  toggleBtnActive: {
    backgroundColor: '#E8241A',
    borderColor: '#E8241A',
  },
  toggleBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  radiusSection: {
    marginTop: 12,
  },
  radiusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  radiusLabel: {
    fontSize: 12,
    color: '#777777',
    fontWeight: '500',
  },
  radiusValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E8241A',
  },
  slider: {
    width: '100%',
    height: 40,
    marginBottom: 8,
  },
  radiusLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  radiusInfo: {
    backgroundColor: '#F0F7FF',
    borderRadius: 8,
    padding: 10,
  },
  radiusInfoText: {
    fontSize: 11,
    color: '#555555',
  },
  cancelBtn: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EEEEEE',
    marginBottom: 20,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E8241A',
  },
  confirmBtn: {
    backgroundColor: '#E8241A',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerBox: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  timerLabel: {
    fontSize: 11,
    color: '#777777',
  },
  timerValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 12,
    color: '#777777',
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  statusIcon: {
    fontSize: 18,
  },
  endRideBtn: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  endRideBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
