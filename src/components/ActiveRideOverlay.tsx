import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import MapView, { Marker, Polyline, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import Slider from '@react-native-community/slider';

const { width, height } = Dimensions.get('window');

type RideType = {
  id: string;
  bikeId: string;
  bikeName: string;
  bikeImage: any;
  renterName: string;
  renterAvatar: string | null;  // ✅ Can be null
  renterRating: number;
  ownerName: string;
  ownerAvatar: string | null;  // ✅ Can be null
  ownerRating: number;
  pricePerHour: number;
  durationHours: number;
  userLocation: { latitude: number; longitude: number };
  ownerLocation: { latitude: number; longitude: number };
  isRenter: boolean;
};

type RidePhase = 'pre-handover' | 'handover' | 'post-handover';

export default function ActiveRideOverlay({
  ride,
  onEndRide,
  onHandoverComplete,
}: {
  ride: RideType;
  onEndRide: () => void;
  onHandoverComplete: (radius: number, geofenceEnabled: boolean) => void;
}) {
  const slideAnim = useRef(new Animated.Value(height)).current;
  const [phase, setPhase] = useState<RidePhase>('pre-handover');
  const [geofenceEnabled, setGeofenceEnabled] = useState(true);
  const [roamingRadius, setRoamingRadius] = useState(5);
  const [timeRemaining, setTimeRemaining] = useState(ride.durationHours * 60); // in minutes
  const [tipsAmount, setTipsAmount] = useState(0);
  const [totalEarned, setTotalEarned] = useState(ride.pricePerHour * ride.durationHours);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [battery, setBattery] = useState(85); // for e-bikes
  const [distance, setDistance] = useState(0);

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
    const interval = setInterval(() => {
      const dist = calculateDistance(
        ride.userLocation.latitude,
        ride.userLocation.longitude,
        ride.ownerLocation.latitude,
        ride.ownerLocation.longitude
      );
      setDistance(dist);

      // Check if renter arrived at owner (< 100m)
      if (dist < 0.1 && phase === 'pre-handover') {
        setPhase('handover');
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [phase]);

  // Countdown timer for post-handover
  useEffect(() => {
    if (phase === 'post-handover' && timeRemaining > 0) {
      const interval = setInterval(() => {
        setTimeRemaining(prev => prev - 1);
      }, 60000); // Decrement every minute
      return () => clearInterval(interval);
    }
  }, [phase, timeRemaining]);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 0,
      speed: 14,
    }).start();
  }, []);

  const handleBack = () => {
    Animated.timing(slideAnim, {
      toValue: height,
      duration: 300,
      useNativeDriver: true,
    }).start(() => onEndRide());
  };

  const handleEndRide = () => {
    Alert.alert(
      'End Ride?',
      'Are you sure you want to end the ride?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Ride',
          style: 'destructive',
          onPress: handleBack,
        },
      ]
    );
  };

  const handleHandoverBike = () => {
    onHandoverComplete(roamingRadius, geofenceEnabled);
    setPhase('post-handover');
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PHASE 1: PRE-HANDOVER
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const renderPreHandover = () => (
    <Animated.View style={[styles.overlay, { transform: [{ translateY: slideAnim }] }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {ride.isRenter ? 'Going to Owner' : 'Renter Coming'}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={{
            latitude: (ride.userLocation.latitude + ride.ownerLocation.latitude) / 2,
            longitude: (ride.userLocation.longitude + ride.ownerLocation.longitude) / 2,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          scrollEnabled={false}
          zoomEnabled={false}
        >
          {/* Route Polyline */}
          <Polyline
            coordinates={[ride.userLocation, ride.ownerLocation]}
            strokeColor="#E8241A"
            strokeWidth={3}
          />

          {/* User Marker */}
          <Marker coordinate={ride.userLocation}>
            <View style={styles.userMarker} />
          </Marker>

          {/* Owner Marker */}
          <Marker coordinate={ride.ownerLocation}>
            <View style={styles.ownerMarker} />
          </Marker>
        </MapView>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {/* Distance Card */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View>
              <Text style={styles.cardLabel}>Distance to {ride.isRenter ? 'Owner' : 'Renter'}</Text>
              <Text style={styles.distanceValue}>{distance.toFixed(2)} km</Text>
            </View>
            <Text style={styles.distanceIcon}>📍</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.cardRow}>
            <View>
              <Text style={styles.cardLabel}>Time Remaining</Text>
              <Text style={styles.timeValue}>{ride.durationHours}h</Text>
            </View>
            <Text style={styles.timeIcon}>⏱️</Text>
          </View>
        </View>

        {/* Profile Card */}
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {ride.isRenter ? ride.ownerName.charAt(0) : ride.renterName.charAt(0)}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>
                {ride.isRenter ? ride.ownerName : ride.renterName}
              </Text>
              <View style={styles.ratingRow}>
                <Text style={styles.ratingStar}>★</Text>
                <Text style={styles.ratingValue}>
                  {ride.isRenter ? ride.ownerRating : ride.renterRating}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.contactBtn}>
              <Text style={styles.contactBtnText}>📞</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bike Info */}
        <View style={styles.card}>
          <View style={styles.bikeRow}>
            <Image source={ride.bikeImage} style={styles.bikeImage} />
            <View style={{ flex: 1 }}>
              <Text style={styles.bikeName}>{ride.bikeName}</Text>
              <Text style={styles.bikePrice}>₹{ride.pricePerHour}/hr</Text>
            </View>
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.instructionBox}>
          <Text style={styles.instructionTitle}>📍 Getting to {ride.isRenter ? 'Owner' : 'Renter'}</Text>
          <Text style={styles.instructionText}>
            {ride.isRenter
              ? `Navigate towards owner location. Countdown will appear when you're within 100m.`
              : `Renter is ${distance.toFixed(2)} km away and heading towards you.`}
          </Text>
        </View>

        {/* Cancel Ride Button */}
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={handleEndRide}
          activeOpacity={0.8}
        >
          <Text style={styles.cancelBtnText}>Cancel Ride</Text>
        </TouchableOpacity>
      </ScrollView>
    </Animated.View>
  );

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PHASE 2: HANDOVER MODAL
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const renderHandover = () => (
    <Animated.View style={[styles.overlay, { transform: [{ translateY: slideAnim }] }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ width: 36 }} />
        <Text style={styles.headerTitle}>Hand Over Bike</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Map with current location */}
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={{
            latitude: ride.ownerLocation.latitude,
            longitude: ride.ownerLocation.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          scrollEnabled={false}
          zoomEnabled={false}
        >
          <Marker coordinate={ride.ownerLocation}>
            <View style={styles.handoverMarker} />
          </Marker>
        </MapView>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {/* Title */}
        <View style={styles.card}>
          <Text style={styles.handoverTitle}>🤝 Ready to Hand Over?</Text>
          <Text style={styles.handoverSubtitle}>
            {ride.isRenter
              ? `You've reached ${ride.ownerName}. Hand over the bike to start your ride.`
              : `${ride.renterName} has arrived. Confirm bike handover.`}
          </Text>
        </View>

        {/* Renter/Owner Info */}
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {ride.isRenter ? ride.ownerName.charAt(0) : ride.renterName.charAt(0)}
              </Text>
            </View>
            <View>
              <Text style={styles.profileName}>
                {ride.isRenter ? ride.ownerName : ride.renterName}
              </Text>
              <Text style={styles.profileSubtext}>
                {ride.isRenter ? 'Bike Owner' : 'Renter'}
              </Text>
            </View>
          </View>
        </View>

        {/* Geofence Toggle (Only show to owner) */}
        {!ride.isRenter && (
          <View style={styles.card}>
            <View style={styles.geofenceToggleRow}>
              <View>
                <Text style={styles.geofenceLabel}>🛡️ Enable Roaming Radius</Text>
                <Text style={styles.geofenceSubtext}>
                  Notify if renter leaves the area
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.toggle,
                  geofenceEnabled && styles.toggleOn,
                ]}
                onPress={() => setGeofenceEnabled(!geofenceEnabled)}
              >
                <View
                  style={[
                    styles.toggleCircle,
                    geofenceEnabled && styles.toggleCircleOn,
                  ]}
                />
              </TouchableOpacity>
            </View>

            {geofenceEnabled && (
              <View style={styles.radiusContainer}>
                <Text style={styles.radiusLabel}>Roaming Radius</Text>
                <Text style={styles.radiusValue}>{roamingRadius.toFixed(1)} km</Text>
                <Slider
                  style={styles.radiusSlider}
                  minimumValue={1}
                  maximumValue={10}
                  step={0.5}
                  value={roamingRadius}
                  onValueChange={setRoamingRadius}
                  minimumTrackTintColor="#E8241A"
                  maximumTrackTintColor="#E0E0E0"
                  thumbTintColor="#E8241A"
                />
                <View style={styles.radiusLabels}>
                  <Text style={styles.radiusLabel}>1 km</Text>
                  <Text style={styles.radiusLabel}>10 km</Text>
                </View>
                <View style={styles.radiusInfo}>
                  <Text style={styles.radiusInfoText}>
                    ℹ️ Renter can roam within {roamingRadius.toFixed(1)} km from handover location
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Ride Summary */}
        <View style={styles.card}>
          <Text style={styles.summaryTitle}>Ride Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Duration</Text>
            <Text style={styles.summaryValue}>{ride.durationHours}h</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Rate</Text>
            <Text style={styles.summaryValue}>₹{ride.pricePerHour}/hr</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Amount</Text>
            <Text style={styles.summaryValueBold}>
              ₹{(ride.pricePerHour * ride.durationHours).toFixed(0)}
            </Text>
          </View>
        </View>

        {/* Hand Over Button */}
        <TouchableOpacity
          style={styles.handoverBtn}
          onPress={handleHandoverBike}
          activeOpacity={0.8}
        >
          <Text style={styles.handoverBtnText}>
            {ride.isRenter ? '✓ Received Bike' : '✓ Hand Over Bike'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </Animated.View>
  );

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PHASE 3: POST-HANDOVER
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const renderPostHandover = () => (
    <Animated.View style={[styles.overlay, { transform: [{ translateY: slideAnim }] }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🏍️ Enjoy Your Ride!</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Map with Geofence Circle */}
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={{
            latitude: ride.ownerLocation.latitude,
            longitude: ride.ownerLocation.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          scrollEnabled={false}
          zoomEnabled={false}
        >
          {/* Geofence Circle (if enabled) */}
          {geofenceEnabled && (
            <Circle
              center={ride.ownerLocation}
              radius={roamingRadius * 1000} // Convert to meters
              strokeColor="#E8241A"
              strokeWidth={2}
              fillColor="rgba(232, 36, 26, 0.1)"
            />
          )}

          {/* Renter Location */}
          <Marker coordinate={ride.userLocation}>
            <View style={styles.userMarker} />
          </Marker>
        </MapView>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {/* Time & Duration Card */}
        <View style={styles.card}>
          <View style={styles.statRow}>
            <View>
              <Text style={styles.statLabel}>⏱️ Time Remaining</Text>
              <Text style={styles.statValue}>
                {Math.floor(timeRemaining / 60)}h {timeRemaining % 60}m
              </Text>
            </View>
            <View style={styles.divider} />
            <View>
              <Text style={styles.statLabel}>💰 Total Amount</Text>
              <Text style={styles.statValue}>
                ₹{(ride.pricePerHour * ride.durationHours + tipsAmount).toFixed(0)}
              </Text>
            </View>
          </View>
        </View>

        {/* Roaming Info */}
        {geofenceEnabled && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>🛡️ Safe Zone</Text>
            <View style={styles.zoneInfoRow}>
              <Text style={styles.zoneInfoLabel}>Roaming Radius:</Text>
              <Text style={styles.zoneInfoValue}>{roamingRadius.toFixed(1)} km</Text>
            </View>
            <View style={styles.zoneStatus}>
              <Text style={styles.zoneStatusText}>✅ You're within safe zone</Text>
            </View>
          </View>
        )}

        {/* Bike Status */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>🏍️ Bike Status</Text>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Battery</Text>
            <View style={styles.batteryBar}>
              <View style={[styles.batteryFill, { width: `${battery}%` }]} />
            </View>
            <Text style={styles.statusValue}>{battery}%</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Speed</Text>
            <Text style={styles.statusValue}>{currentSpeed} km/h</Text>
          </View>
        </View>

        {/* Tips */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>💝 Add Tip</Text>
          <View style={styles.tipsRow}>
            {[50, 100, 200].map(amount => (
              <TouchableOpacity
                key={amount}
                style={[
                  styles.tipBtn,
                  tipsAmount === amount && styles.tipBtnActive,
                ]}
                onPress={() => setTipsAmount(amount)}
              >
                <Text
                  style={[
                    styles.tipBtnText,
                    tipsAmount === amount && styles.tipBtnTextActive,
                  ]}
                >
                  ₹{amount}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.tipsInfo}>
            {tipsAmount > 0 ? `You added ₹${tipsAmount} tip` : 'Tip is optional'}
          </Text>
        </View>

        {/* Ride Details */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>📋 Ride Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Bike</Text>
            <Text style={styles.detailValue}>{ride.bikeName}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Rate</Text>
            <Text style={styles.detailValue}>₹{ride.pricePerHour}/hr</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Duration</Text>
            <Text style={styles.detailValue}>{ride.durationHours}h</Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabelBold}>Total</Text>
            <Text style={styles.detailValueBold}>
              ₹{(ride.pricePerHour * ride.durationHours + tipsAmount).toFixed(0)}
            </Text>
          </View>
        </View>

        {/* Emergency Contact */}
        <View style={styles.emergencyRow}>
          <TouchableOpacity style={styles.emergencyBtn}>
            <Text style={styles.emergencyIcon}>📞</Text>
            <Text style={styles.emergencyText}>Contact {ride.isRenter ? 'Owner' : 'Renter'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.emergencyBtnSOS}>
            <Text style={styles.emergencyIcon}>🆘</Text>
            <Text style={styles.emergencyText}>Emergency</Text>
          </TouchableOpacity>
        </View>

        {/* End Ride Button */}
        <TouchableOpacity
          style={styles.endRideBtn}
          onPress={handleEndRide}
          activeOpacity={0.8}
        >
          <Text style={styles.endRideBtnText}>End Ride</Text>
        </TouchableOpacity>
      </ScrollView>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      {phase === 'pre-handover' && renderPreHandover()}
      {phase === 'handover' && renderHandover()}
      {phase === 'post-handover' && renderPostHandover()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F5F5F5',
    zIndex: 998,
    elevation: 998,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 52,
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  backBtn: {
    fontSize: 20,
    color: '#1A1A1A',
    fontWeight: '600',
  },
  mapContainer: {
    height: height * 0.25,
    backgroundColor: '#E0E0E0',
  },
  map: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
    padding: 16,
  },

  // Common Styles
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: 12,
    color: '#999999',
    marginBottom: 4,
  },
  distanceValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#E8241A',
  },
  distanceIcon: {
    fontSize: 32,
  },
  timeValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  timeIcon: {
    fontSize: 28,
  },
  divider: {
    height: 1,
    backgroundColor: '#EEEEEE',
    marginVertical: 12,
  },

  // Profile
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E8241A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  profileSubtext: {
    fontSize: 12,
    color: '#999999',
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  ratingStar: {
    color: '#FFA000',
    fontSize: 12,
  },
  ratingValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  contactBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactBtnText: {
    fontSize: 18,
  },

  // Bike Info
  bikeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bikeImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: '#F0F0F0',
  },
  bikeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  bikePrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E8241A',
    marginTop: 4,
  },

  // Instructions
  instructionBox: {
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#E8241A',
    marginBottom: 12,
  },
  instructionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 6,
  },
  instructionText: {
    fontSize: 12,
    color: '#666666',
    lineHeight: 18,
  },

  // Handover
  handoverTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  handoverSubtitle: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 20,
  },
  handoverMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E8241A',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Geofence Toggle
  geofenceToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  geofenceLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  geofenceSubtext: {
    fontSize: 12,
    color: '#999999',
    marginTop: 2,
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EEEEEE',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleOn: {
    backgroundColor: '#E8241A',
    alignItems: 'flex-end',
  },
  toggleCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  toggleCircleOn: {
    backgroundColor: '#FFFFFF',
  },

  // Radius
  radiusContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
  },
  radiusLabel: {
    fontSize: 12,
    color: '#999999',
    fontWeight: '600',
  },
  radiusValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#E8241A',
    marginTop: 4,
    marginBottom: 12,
  },
  radiusSlider: {
    width: '100%',
    height: 40,
  },
  radiusLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -8,
  },
  radiusInfo: {
    backgroundColor: '#F0F7FF',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
  },
  radiusInfoText: {
    fontSize: 11,
    color: '#666666',
  },

  // Summary
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#999999',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  summaryValueBold: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E8241A',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#EEEEEE',
    marginVertical: 8,
  },

  // Buttons
  cancelBtn: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EEEEEE',
    marginBottom: 60,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E8241A',
  },
  handoverBtn: {
    backgroundColor: '#E8241A',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 60,
  },
  handoverBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Post Handover
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 10,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statLabel: {
    fontSize: 12,
    color: '#999999',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#E8241A',
  },

  // Zone Status
  zoneInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  zoneInfoLabel: {
    fontSize: 13,
    color: '#999999',
  },
  zoneInfoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  zoneStatus: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  zoneStatusText: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '600',
  },

  // Bike Status
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  statusLabel: {
    fontSize: 13,
    color: '#999999',
    flex: 1,
  },
  statusValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
    minWidth: 50,
    textAlign: 'right',
  },
  batteryBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#EEEEEE',
    borderRadius: 3,
    marginHorizontal: 10,
    overflow: 'hidden',
  },
  batteryFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },

  // Tips
  tipsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  tipBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#EEEEEE',
    backgroundColor: '#FFFFFF',
  },
  tipBtnActive: {
    backgroundColor: '#E8241A',
    borderColor: '#E8241A',
  },
  tipBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  tipBtnTextActive: {
    color: '#FFFFFF',
  },
  tipsInfo: {
    fontSize: 11,
    color: '#999999',
    textAlign: 'center',
  },

  // Details
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 13,
    color: '#999999',
  },
  detailLabelBold: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  detailValueBold: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E8241A',
  },
  detailDivider: {
    height: 1,
    backgroundColor: '#EEEEEE',
    marginVertical: 8,
  },

  // Emergency
  emergencyRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  emergencyBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  emergencyBtnSOS: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#FFE8E8',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#FFD0D0',
  },
  emergencyIcon: {
    fontSize: 18,
  },
  emergencyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1,
  },

  // End Ride
  endRideBtn: {
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 60,
  },
  endRideBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // User Marker
  userMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#1A73E8',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },

  // Owner Marker
  ownerMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E8241A',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});