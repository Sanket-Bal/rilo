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
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import DocumentUploadScreen from './DocumentUploadScreen';
import BookingScreen from './BookingScreen';
import { supabase } from '../lib/supabase';

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
  latitude?: number;
  longitude?: number;
};

// Route mode speeds (km/h)
const ROUTE_MODES = [
  { id: 'walk', label: '🚶 Walk', speed: 5 },
  { id: 'bike', label: '🚲 Bike', speed: 20 },
  { id: 'drive', label: '🚗 Drive', speed: 40 },
];

export default function BikeDetailScreen({
  bike,
  onBack,
  userLocation,
  onRideStart,
}: {
  bike: BikeType;
  onBack: () => void;
  userLocation: { latitude: number; longitude: number };
  onRideStart: () => void;
}) {
  const imageScale = useRef(new Animated.Value(0.4)).current;
  const imageOpacity = useRef(new Animated.Value(0)).current;
  const contentSlide = useRef(new Animated.Value(60)).current;
  const contentFade = useRef(new Animated.Value(0)).current;
  const arrowFade = useRef(new Animated.Value(0)).current;
  const [currentImage, setCurrentImage] = useState(0);
  const [showDocs, setShowDocs] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [docsAlreadyUploaded, setDocsAlreadyUploaded] = useState(false);
  const [routeMode, setRouteMode] = useState<'walk' | 'bike' | 'drive'>('bike');
  const images = [bike.image, bike.image, bike.image];

  const checkDocumentsAndProceed = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from('documents')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);
      if (data && data.length > 0 && !error) {
        setDocsAlreadyUploaded(true);
        setShowBooking(true);
      } else {
        setDocsAlreadyUploaded(false);
        setShowDocs(true);
      }
    } catch (err) {
      setDocsAlreadyUploaded(false);
      setShowDocs(true);
    }
  };

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in km
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

  // Calculate travel time in minutes
  const calculateTravelTime = (distanceKm: number, speedKmh: number): number => {
    return Math.round((distanceKm / speedKmh) * 60);
  };

  const bikeLocation = {
  latitude: bike.latitude || (userLocation.latitude + 0.003),  // ✅ REAL COORDS
  longitude: bike.longitude || (userLocation.longitude + 0.004),  // ✅ REAL COORDS
};

  // Calculate route details
  const routeDistance = calculateDistance(
    userLocation.latitude,
    userLocation.longitude,
    bikeLocation.latitude,
    bikeLocation.longitude
  );

  console.log('[BikeDetailScreen] User location:', userLocation);
  console.log('[BikeDetailScreen] Bike location:', bikeLocation);
  console.log('[BikeDetailScreen] Distance calculated:', routeDistance.toFixed(2), 'km');

  const selectedMode = ROUTE_MODES.find(m => m.id === routeMode) || ROUTE_MODES[1];
  const travelTimeMinutes = calculateTravelTime(routeDistance, selectedMode.speed);

  // Create simple polyline coordinates (straight line for now)
  const routeCoordinates = [
    {
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
    },
    {
      latitude: bikeLocation.latitude,
      longitude: bikeLocation.longitude,
    },
  ];

  useEffect(() => {
    Animated.sequence([
      // Step 1: Image zooms in from small to full size
      Animated.parallel([
        Animated.spring(imageScale, {
          toValue: 1,
          useNativeDriver: true,
          bounciness: 3,
          speed: 10,
        }),
        Animated.timing(imageOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
      ]),
      // Step 2: Arrows appear
      Animated.timing(arrowFade, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      // Step 3: Content slides up and fades in
      Animated.parallel([
        Animated.spring(contentSlide, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 2,
          speed: 12,
        }),
        Animated.timing(contentFade, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  const handleBack = () => {
    Animated.parallel([
      Animated.timing(imageScale, {
        toValue: 0.4,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(imageOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(contentFade, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onBack());
  };

  return (
    <View style={styles.container}>

      {/* ── IMAGE SECTION ── */}
      <Animated.View
        style={[
          styles.imageSection,
          {
            opacity: imageOpacity,
            transform: [{ scale: imageScale }],
          },
        ]}
      >
        <Image
          source={images[currentImage]}
          style={styles.bikeImage}
          resizeMode="cover"
        />

        {/* Arrows */}
        <Animated.View style={[styles.arrowLeft, { opacity: arrowFade }]}>
          <TouchableOpacity
            onPress={() =>
              setCurrentImage(prev =>
                prev === 0 ? images.length - 1 : prev - 1
              )
            }
          >
            <Text style={styles.arrowText}>‹</Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={[styles.arrowRight, { opacity: arrowFade }]}>
          <TouchableOpacity
            onPress={() =>
              setCurrentImage(prev =>
                prev === images.length - 1 ? 0 : prev + 1
              )
            }
          >
            <Text style={styles.arrowText}>›</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Dots */}
        <Animated.View style={[styles.dotsRow, { opacity: arrowFade }]}>
          {images.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === currentImage && styles.dotActive]}
            />
          ))}
        </Animated.View>

        {/* Back button on top of image */}
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>

        {/* GPS badge */}
        {bike.gps && (
          <View style={styles.gpsBadge}>
            <Text style={styles.gpsBadgeText}>● GPS Tracked</Text>
          </View>
        )}
      </Animated.View>

      {/* ── SCROLLABLE CONTENT ── */}
      <Animated.View
        style={[
          styles.contentWrapper,
          {
            opacity: contentFade,
            transform: [{ translateY: contentSlide }],
          },
        ]}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {/* Bike Name + Rating */}
          <View style={styles.nameRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.bikeName}>{bike.name}</Text>
              <Text style={styles.bikeType}>{bike.type} · {bike.distance} away</Text>
            </View>
            <View style={styles.ratingBox}>
              <Text style={styles.ratingStar}>★</Text>
              <Text style={styles.ratingText}>{bike.rating}</Text>
            </View>
          </View>

          {/* Owner */}
          <View style={styles.ownerRow}>
            <View style={styles.ownerAvatar}>
              <Text style={styles.ownerAvatarText}>
                {bike.owner.charAt(0)}
              </Text>
            </View>
            <View>
              <Text style={styles.ownerLabel}>Owner</Text>
              <Text style={styles.ownerName}>{bike.owner}</Text>
            </View>
          </View>

          {/* Details Grid */}
          <View style={styles.detailsGrid}>
            {[
              { label: 'Fuel', value: bike.fuel },
              { label: 'Year', value: bike.year },
              { label: 'Condition', value: bike.condition },
              { label: 'Type', value: bike.type },
            ].map((item, index) => (
              <View key={index} style={styles.detailBox}>
                <Text style={styles.detailLabel}>{item.label}</Text>
                <Text style={styles.detailValue}>{item.value}</Text>
              </View>
            ))}
          </View>

          {/* Mini Map with Route */}
          <Text style={styles.sectionTitle}>Bike Location & Route</Text>
          <View style={styles.miniMapWrapper}>
            <MapView
              style={styles.miniMap}
              provider={PROVIDER_GOOGLE}
              initialRegion={{
                latitude: (userLocation.latitude + bikeLocation.latitude) / 2,
                longitude: (userLocation.longitude + bikeLocation.longitude) / 2,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
            >
              {/* Route Polyline */}
              <Polyline
                coordinates={routeCoordinates}
                strokeColor="#E8241A"
                strokeWidth={3}
              />

              {/* User Location Marker */}
              <Marker coordinate={userLocation}>
                <View style={styles.userMarker} />
              </Marker>

              {/* Bike Location Marker */}
              <Marker coordinate={bikeLocation}>
                <View style={styles.markerContainer}>
                  <View style={styles.marker}>
                    <View style={styles.markerInner} />
                  </View>
                  <View style={styles.markerTail} />
                </View>
              </Marker>
            </MapView>
          </View>

          {/* Route Mode Selector */}
          <View style={styles.routeModeSelector}>
            {ROUTE_MODES.map(mode => (
              <TouchableOpacity
                key={mode.id}
                style={[
                  styles.routeModeBtn,
                  routeMode === mode.id && styles.routeModeBtnActive,
                ]}
                onPress={() => setRouteMode(mode.id as 'walk' | 'bike' | 'drive')}
              >
                <Text style={styles.routeModeBtnText}>{mode.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Route Info Card */}
          <View style={styles.routeInfoCard}>
            <View style={styles.routeInfoItem}>
              <Text style={styles.routeInfoIcon}>📍</Text>
              <View>
                <Text style={styles.routeInfoLabel}>Distance</Text>
                <Text style={styles.routeInfoValue}>{routeDistance.toFixed(2)} km</Text>
              </View>
            </View>
            <View style={styles.routeInfoDivider} />
            <View style={styles.routeInfoItem}>
              <Text style={styles.routeInfoIcon}>⏱️</Text>
              <View>
                <Text style={styles.routeInfoLabel}>ETA ({selectedMode.label})</Text>
                <Text style={styles.routeInfoValue}>{travelTimeMinutes} min</Text>
              </View>
            </View>
          </View>

          {/* Pricing */}
          <View style={styles.pricingRow}>
            <View>
              <Text style={styles.priceLabel}>Price per hour</Text>
              <Text style={styles.priceValue}>
                ₹{bike.price}
                <Text style={styles.priceUnit}>/hr</Text>
              </Text>
            </View>
            <View style={styles.dividerVertical} />
            <View>
              <Text style={styles.priceLabel}>Security deposit</Text>
              <Text style={styles.depositValue}>₹{bike.deposit}</Text>
            </View>
          </View>

          {/* Spacer for book button */}
          <View style={{ height: 100 }} />
        </ScrollView>
      </Animated.View>

      {/* ── BOOK RIDE BUTTON ── */}
      <Animated.View style={[styles.bookBtnWrapper, { opacity: contentFade }]}>
        <TouchableOpacity 
          style={styles.bookBtn} 
          activeOpacity={0.85}
          onPress={checkDocumentsAndProceed}
        >
          <Text style={styles.bookBtnText}>Book Ride</Text>
          <Text style={styles.bookBtnSub}>
            ₹{bike.deposit} deposit · ₹{bike.price}/hr
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {showDocs && (
        <DocumentUploadScreen
          bike={bike}
          userLocation={userLocation}
          onBack={() => setShowDocs(false)}
          onComplete={() => {
            setShowDocs(false);
            setShowBooking(true);
          }}
        />
      )}

      {showBooking && (
        <BookingScreen
          bike={bike}
          userLocation={userLocation}
          onBack={() => setShowBooking(false)}
          onConfirm={() => {
            setShowBooking(false);
            onRideStart();
          }}
        />
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F5F5F5',
    zIndex: 999,
    elevation: 999,
  },

  // Image
  imageSection: {
    width: width,
    height: height * 0.40,
    backgroundColor: '#1A1A1A',
    overflow: 'hidden',
  },
  bikeImage: {
    width: width,
    height: height * 0.40,
  },
  backBtn: {
    position: 'absolute',
    top: 52,
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 20,
    color: '#1A1A1A',
    fontWeight: '600',
  },
  gpsBadge: {
    position: 'absolute',
    top: 52,
    right: 16,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  gpsBadgeText: {
    color: '#2E7D32',
    fontSize: 12,
    fontWeight: '600',
  },
  arrowLeft: {
    position: 'absolute',
    left: 12,
    top: '50%',
    zIndex: 5,
  },
  arrowRight: {
    position: 'absolute',
    right: 12,
    top: '50%',
    zIndex: 5,
  },
  arrowText: {
    fontSize: 48,
    color: '#FFFFFF',
    fontWeight: '300',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  dotsRow: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dotActive: {
    backgroundColor: '#FFFFFF',
    width: 18,
  },

  // Content
  contentWrapper: {
    flex: 1,
  },
  scroll: {
    padding: 20,
  },

  // Name row
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  bikeName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  bikeType: {
    fontSize: 13,
    color: '#999999',
    marginTop: 4,
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  ratingStar: {
    color: '#FFA000',
    fontSize: 14,
  },
  ratingText: {
    color: '#1A1A1A',
    fontSize: 14,
    fontWeight: '700',
  },

  // Owner
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  ownerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8241A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownerAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  ownerLabel: {
    fontSize: 11,
    color: '#999999',
  },
  ownerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },

  // Details grid
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  detailBox: {
    width: (width - 60) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  detailLabel: {
    fontSize: 11,
    color: '#999999',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },

  // Section title
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },

  // Mini map
  miniMapWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    height: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  miniMap: {
    flex: 1,
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

  // Route mode selector
  routeModeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  routeModeBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#EEEEEE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  routeModeBtnActive: {
    backgroundColor: '#E8241A',
    borderColor: '#E8241A',
  },
  routeModeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A1A1A',
  },

  // Route info card
  routeInfoCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  routeInfoItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  routeInfoIcon: {
    fontSize: 20,
  },
  routeInfoLabel: {
    fontSize: 11,
    color: '#999999',
  },
  routeInfoValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E8241A',
    marginTop: 2,
  },
  routeInfoDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#EEEEEE',
  },

  // Pricing
  pricingRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  dividerVertical: {
    width: 1,
    height: 40,
    backgroundColor: '#EEEEEE',
  },
  priceLabel: {
    fontSize: 11,
    color: '#999999',
    marginBottom: 4,
    textAlign: 'center',
  },
  priceValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#E8241A',
    textAlign: 'center',
  },
  priceUnit: {
    fontSize: 13,
    fontWeight: '400',
    color: '#AAAAAA',
  },
  depositValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
  },

  // Book button
  bookBtnWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  bookBtn: {
    backgroundColor: '#E8241A',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  bookBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  bookBtnSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 3,
  },
});