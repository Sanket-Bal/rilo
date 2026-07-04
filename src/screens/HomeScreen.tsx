import React, { useEffect, useRef, useState } from 'react';
import ProfileScreen from './ProfileScreen';
import BikeDetailScreen from './BikeDetailScreen';
import DocumentUploadScreen from './DocumentUploadScreen';
import BookingScreen from './BookingScreen';
import { supabase } from '../lib/supabase';
import OwnerBookingRequestModal from '../components/OwnerBookingRequestModal';
import { useOwnerBookingRequests } from '../hooks/useOwnerBookingRequests';
import OwnerWelcomeScreen from './owner/OwnerWelcomeScreen';
import BikeListingScreen from './owner/BikeListingScreen';
import OwnerHomeScreen from './owner/OwnerHomeScreen';
import ActiveRideOverlay from '../components/ActiveRideOverlay';
import UserActiveRideOverlay from '../components/UserActiveRideOverlay';
import ConfirmationScreen from './ConfirmationScreen';

import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  PanResponder,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';

const { height } = Dimensions.get('window');

const BOTTOM_SHEET_MIN = height * 0.35;
const BOTTOM_SHEET_MAX = height * 0.75;

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
  // Real DB fields
  brand?: string;
  model?: string;
  fuel_type?: string;
  fuel_policy?: string;
  owner_id?: string;
  latitude?: number;
  longitude?: number;
};


type MarkerBike = BikeType & {
  latitude: number;
  longitude: number;
};

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

const CITY_SUGGESTIONS = [
  { city: 'Delhi', latitude: 28.6139, longitude: 77.2090 },
  { city: 'Bangalore', latitude: 12.9716, longitude: 77.5946 },
  { city: 'Mumbai', latitude: 19.0760, longitude: 72.8855 },
  { city: 'Pune', latitude: 18.5204, longitude: 73.8567 },
  { city: 'Hyderabad', latitude: 17.3850, longitude: 78.4867 },
  { city: 'Kolkata', latitude: 22.5726, longitude: 88.3639 },
  { city: 'Chennai', latitude: 13.0827, longitude: 80.2707 },
  { city: 'Jaipur', latitude: 26.9124, longitude: 75.7873 },
  { city: 'Lucknow', latitude: 26.8467, longitude: 80.9462 },
  { city: 'Indore', latitude: 22.7196, longitude: 75.8577 },
];

export default function HomeScreen({
  activeRide,
  onRideStart,
  onRideEnd,
}: {
  activeRide: ActiveRide;
  onRideStart: (ride: NonNullable<ActiveRide>) => void;
  onRideEnd: () => void;
}) {
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);
  const [rideElapsedSeconds, setRideElapsedSeconds] = useState(0);
  const rideTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bottomSheetY = useRef(new Animated.Value(BOTTOM_SHEET_MIN)).current;
  const bottomSheetHeight = useRef(BOTTOM_SHEET_MIN);
  const mapRef = useRef<MapView>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [userInitial, setUserInitial] = useState('U');
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null);
  const [showOwnerWelcome, setShowOwnerWelcome] = useState(false);
  const [selectedBike, setSelectedBike] = useState<BikeType | null>(null);
  const [showDocs, setShowDocs] = useState(false);
  const [docsAlreadyUploaded, setDocsAlreadyUploaded] = useState(false);
  const [locationReady, setLocationReady] = useState(false);
  const [showBikeListing, setShowBikeListing] = useState(false);
  const [showOwnerHome, setShowOwnerHome] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
const [bookingRequestIdForConfirmation, setBookingRequestIdForConfirmation] = useState<string>('');
const [selectedBikeForConfirmation, setSelectedBikeForConfirmation] = useState<BikeType | null>(null);
const [durationForConfirmation, setDurationForConfirmation] = useState(1);
const [userLocationForConfirmation, setUserLocationForConfirmation] = useState({ latitude: 0, longitude: 0 });

  // Owner booking request system
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
  const [isOwner, setIsOwner] = useState(false);

  // Hook call - AFTER state is declared
  const {
    currentRequest,
    approveRequest,
    rejectRequest,
    dismissRequest,
  } = useOwnerBookingRequests(isOwner ? currentUserId : undefined);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [searchRadius, setSearchRadius] = useState(2); // km
  const [selectedSearchLocation, setSelectedSearchLocation] = useState<{
    latitude: number;
    longitude: number;
    city: string;
  } | null>(null);

  const [location, setLocation] = useState({
    latitude: 0,
    longitude: 0,
    city: 'Locating...',
    region: '',
  });

  const [markerBikes, setMarkerBikes] = useState<MarkerBike[]>([]);
  const [bikes, setBikes] = useState<BikeType[]>([]);
  const [bikesLoading, setBikesLoading] = useState(false);
  

  const calculateDistance = (
    lat1: number, lng1: number,
    lat2: number, lng2: number
  ): string => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    return d < 1
      ? `${Math.round(d * 1000)}m`
      : `${d.toFixed(1)} km`;
  };

  const searchSuggestions = CITY_SUGGESTIONS.filter(city =>
    city.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSearchSelect = async (city: string, lat: number, lng: number) => {
    console.log(`[HomeScreen] Search selected: ${city} (${lat}, ${lng})`);
    
    setSearchQuery(city);
    setShowSearchSuggestions(false);
    setSelectedSearchLocation({ city, latitude: lat, longitude: lng });

    // Animate map to location
    mapRef.current?.animateToRegion({
      latitude: lat,
      longitude: lng,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    }, 800);

    // Refetch bikes for this location
    await refetchBikesForLocation(lat, lng);
  };

  const refetchBikesForLocation = async (lat: number, lng: number) => {
    console.log(`[HomeScreen] Fetching bikes within ${searchRadius}km of (${lat}, ${lng})`);
    setBikesLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data: bikesData, error } = await supabase
        .from('bikes')
        .select('*')
        .eq('status', 'available')
        .neq('owner_id', user?.id);

      if (error || !bikesData) {
        setBikesLoading(false);
        return;
      }

      // Filter bikes within radius
      const filteredBikes = bikesData.filter(bike => {
        if (!bike.latitude || !bike.longitude) return false;
        const distance = calculateDistance(
          lat, lng,
          bike.latitude, bike.longitude
        );
        // Parse distance string (e.g., "5.2 km" or "500m")
        const distanceNum = distance.includes('km')
          ? parseFloat(distance) 
          : parseFloat(distance) / 1000;
        return distanceNum <= searchRadius;
      });

      console.log(`[HomeScreen] Found ${filteredBikes.length} bikes within ${searchRadius}km`);

      // Enrich with images and owner names
      const bikesWithImages = await Promise.all(
        filteredBikes.map(async (bike) => {
          const { data: images } = await supabase
            .from('bike_images')
            .select('image_path')
            .eq('bike_id', bike.id)
            .limit(1);

          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', bike.owner_id)
            .single();

          const distance = calculateDistance(
            lat, lng,
            bike.latitude, bike.longitude
          );

          return {
            id: bike.id,
            name: `${bike.brand} ${bike.model}`,
            price: bike.price_per_hour,
            distance,
            gps: false,
            type: bike.type,
            image: images && images.length > 0
              ? { uri: images[0].image_path }
              : require('../../assets/activa.png'),
            owner: profile?.full_name || 'RILO Owner',
            rating: 4.5,
            year: bike.year,
            condition: bike.condition,
            fuel: bike.fuel_type,
            deposit: bike.price_per_hour * 10,
            brand: bike.brand,
            model: bike.model,
            fuel_type: bike.fuel_type,
            fuel_policy: bike.fuel_policy,
            owner_id: bike.owner_id,
            latitude: bike.latitude,
            longitude: bike.longitude,
          } as BikeType;
        })
      );

      setBikes(bikesWithImages);

      // Set markers
      const markersWithLocations = bikesWithImages
        .filter(bike => bike.latitude && bike.longitude)
        .map(bike => ({
          ...bike,
          latitude: bike.latitude!,
          longitude: bike.longitude!,
        }));

      setMarkerBikes(markersWithLocations);
    } catch (err) {
      console.log('Error refetching bikes for location:', err);
    } finally {
      setBikesLoading(false);
    }
  };

  const fetchBikes = async (lat: number, lng: number) => {
    setBikesLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data: bikesData, error } = await supabase
        .from('bikes')
        .select('*')
        .eq('status', 'available')
        .neq('owner_id', user?.id);  

      if (error || !bikesData) {
        setBikesLoading(false);
        return;
      }

      const bikesWithImages = await Promise.all(
        bikesData.map(async (bike) => {
          // Get first image
          const { data: images } = await supabase
            .from('bike_images')
            .select('image_path')
            .eq('bike_id', bike.id)
            .limit(1);

          // Get owner name
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', bike.owner_id)
            .single();

          // Calculate distance (simple approximation)
          const distance = bike.latitude && bike.longitude
            ? calculateDistance(lat, lng, bike.latitude, bike.longitude)
            : '? km';

          return {
            id: bike.id,
            name: `${bike.brand} ${bike.model}`,
            price: bike.price_per_hour,
            distance,
            gps: false,
            type: bike.type,
            image: images && images.length > 0
              ? { uri: images[0].image_path }
              : require('../../assets/activa.png'),
            owner: profile?.full_name || 'RILO Owner',
            rating: 4.5,
            year: bike.year,
            condition: bike.condition,
            fuel: bike.fuel_type,
            deposit: bike.price_per_hour * 10,
            brand: bike.brand,
            model: bike.model,
            fuel_type: bike.fuel_type,
            fuel_policy: bike.fuel_policy,
            owner_id: bike.owner_id,
            latitude: bike.latitude,
            longitude: bike.longitude,
          } as BikeType;
        })
      );

      setBikes(bikesWithImages);
      
      // Set markers with actual bike locations
      const markersWithLocations = bikesWithImages
        .filter(bike => bike.latitude && bike.longitude)
        .map(bike => ({
          ...bike,
          latitude: bike.latitude!,
          longitude: bike.longitude!,
        }));
      
      console.log(`[HomeScreen] Setting ${markersWithLocations.length} bike markers on map`);
      setMarkerBikes(markersWithLocations);
    } catch (err) {
      console.log('Error fetching bikes:', err);
    } finally {
      setBikesLoading(false);
    }
  };

  const fetchUserAvatar = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserInitial((user.email || 'U')[0].toUpperCase());

      const { data } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single();

      if (data?.full_name) {
        setUserInitial(data.full_name[0].toUpperCase());
      }

      if (data?.avatar_url) {
        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(data.avatar_url);
        setUserAvatarUrl(urlData.publicUrl);
      }
    } catch (err) {
      console.log('Error fetching avatar:', err);
    }
  };

  const checkDocuments = async (bike: BikeType) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Use limit(1) instead of .single() so it never throws on multiple rows
      const { data, error } = await supabase
        .from('documents')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (data && data.length > 0 && !error) {
        // Documents exist — go straight to booking
        setDocsAlreadyUploaded(true);
        setSelectedBike(bike);
        setShowDocs(true);
      } else {
        // No documents — show upload screen
        setDocsAlreadyUploaded(false);
        setSelectedBike(bike);
        setShowDocs(true);
      }
    } catch (err) {
      setDocsAlreadyUploaded(false);
      setSelectedBike(bike);
      setShowDocs(true);
    }
  };

  useEffect(() => {
    fetchUserAvatar();

    // Check if current user is an owner (has bikes listed)
    const checkIfOwner = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      const { count } = await supabase
        .from('bikes')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', user.id);

      setIsOwner((count || 0) > 0);
    };

    checkIfOwner();
  }, []);

  // Start/stop ride timer when activeRide changes
  useEffect(() => {
    if (activeRide) {
      setRideElapsedSeconds(0);
      rideTimerRef.current = setInterval(() => {
        setRideElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (rideTimerRef.current) clearInterval(rideTimerRef.current);
      setRideElapsedSeconds(0);
    }
    return () => {
      if (rideTimerRef.current) clearInterval(rideTimerRef.current);
    };
  }, [activeRide]);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocation(prev => ({ ...prev, city: 'Location denied', region: '' }));
        setLocationReady(true);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = loc.coords;

      const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (geocode.length > 0) {
        const place = geocode[0];
        setLocation({
          latitude,
          longitude,
          city: place.city || place.subregion || 'Your Location',
          region: place.region || '',
        });
      }

      // Set current location as default search location
      if (geocode.length > 0) {
        const place = geocode[0];
        const cityName = place.city || place.subregion || 'Your Location';
        setSelectedSearchLocation({
          city: cityName,
          latitude,
          longitude,
        });
      }

      // Don't generate fake markers - fetchBikes will set real ones
      setLocationReady(true);
      fetchBikes(latitude, longitude);
    })();
  }, []);

  // Show modal when new booking request arrives
  useEffect(() => {
    if (isOwner && currentRequest) {
      console.log('[HomeScreen] New booking request detected:', currentRequest);
    }
  }, [currentRequest, isOwner]);

  const toggleBottomSheet = () => {
    const toValue = bottomSheetOpen ? BOTTOM_SHEET_MIN : BOTTOM_SHEET_MAX;
    Animated.spring(bottomSheetY, {
      toValue,
      useNativeDriver: false,
      bounciness: 4,
    }).start();
    setBottomSheetOpen(!bottomSheetOpen);
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        const newHeight = bottomSheetHeight.current - gestureState.dy;
        if (newHeight >= BOTTOM_SHEET_MIN && newHeight <= BOTTOM_SHEET_MAX) {
          bottomSheetY.setValue(newHeight);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const currentHeight = bottomSheetHeight.current;
        const midPoint = (BOTTOM_SHEET_MIN + BOTTOM_SHEET_MAX) / 2;

        if (gestureState.vy < -0.5 || currentHeight > midPoint) {
          // Swipe up or past midpoint — open fully
          Animated.spring(bottomSheetY, {
            toValue: BOTTOM_SHEET_MAX,
            useNativeDriver: false,
            bounciness: 4,
          }).start();
          setBottomSheetOpen(true);
        } else {
          // Swipe down or below midpoint — close
          Animated.spring(bottomSheetY, {
            toValue: BOTTOM_SHEET_MIN,
            useNativeDriver: false,
            bounciness: 4,
          }).start();
          setBottomSheetOpen(false);
        }
      },
    })
  ).current;

  useEffect(() => {
    const listenerId = bottomSheetY.addListener(({ value }) => {
      bottomSheetHeight.current = value;
    });
    return () => {
      bottomSheetY.removeListener(listenerId);
    };
  }, []);

  // Show loading screen while getting location
  if (!locationReady) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>📍 Getting your location...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* ── MAP ── */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: location.latitude || 18.5204,
          longitude: location.longitude || 73.8567,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
        showsUserLocation
        showsMyLocationButton={false}
      >

        {/* ── ACTIVE RIDE ROUTE ── */}
        

        {markerBikes.map((bike: MarkerBike) => (
          <Marker
            key={bike.id}
            coordinate={{
              latitude: bike.latitude,
              longitude: bike.longitude,
            }}
            onPress={() => {
              console.log(`[HomeScreen] Tapped marker for bike: ${bike.name}`);
              setSelectedBike(bike);
            }}
          >
            <TouchableOpacity 
              style={styles.markerContainer}
              onPress={() => {
                console.log(`[HomeScreen] Tapped marker for bike: ${bike.name}`);
                setSelectedBike(bike);
              }}
            >
              <View style={styles.marker}>
                <View style={styles.markerInner} />
              </View>
              <View style={styles.markerTail} />
            </TouchableOpacity>
          </Marker>
        ))}
      </MapView>

      {/* ── TOP BAR ── */}
      <View style={styles.topBar}>
        <View style={styles.locationRow}>
          <Text style={styles.locationIcon}>📍</Text>
          <View>
            <Text style={styles.locationLabel}>Searching near</Text>
            <Text style={styles.locationName}>
              {selectedSearchLocation?.city || location.city}{location.region ? `, ${location.region}` : ''}
            </Text>
          </View>
        </View>
        <TouchableOpacity 
          style={styles.profileCircle}
          onPress={() => setShowProfile(true)}
        >
          {userAvatarUrl ? (
            <Image
              source={{ uri: userAvatarUrl }}
              style={styles.profileCircleImage}
            />
          ) : (
            <Text style={styles.profileInitial}>{userInitial}</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* ── SEARCH BAR ── */}
      <View style={styles.searchBarWrapper}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              setShowSearchSuggestions(text.length > 0);
            }}
            placeholder="Search area or city..."
            placeholderTextColor="#AAAAAA"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                setShowSearchSuggestions(false);
                setSelectedSearchLocation(null);
              }}
            >
              <Text style={styles.searchClear}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Search suggestions dropdown */}
        {showSearchSuggestions && searchSuggestions.length > 0 && (
          <View style={styles.searchSuggestions}>
            {searchSuggestions.map((suggestion, index) => (
              <TouchableOpacity
                key={suggestion.city}
                style={[
                  styles.suggestionItem,
                  index === searchSuggestions.length - 1 && styles.suggestionItemLast,
                ]}
                onPress={() =>
                  handleSearchSelect(suggestion.city, suggestion.latitude, suggestion.longitude)
                }
              >
                <Text style={styles.suggestionIcon}>📍</Text>
                <Text style={styles.suggestionText}>{suggestion.city}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* ── LOCATE ME BUTTON ── */}
      <TouchableOpacity
        style={styles.locateBtn}
        onPress={() => {
          mapRef.current?.animateToRegion({
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          }, 800);
        }}
      >
        <Text style={styles.locateBtnText}>◎</Text>
      </TouchableOpacity>

      
      {/* ── SWITCH MODE BUTTON ── */}
      <TouchableOpacity 
        style={styles.switchModeBtn}
        onPress={async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;
          const { data } = await supabase
            .from('bikes')
            .select('id')
            .eq('owner_id', user.id)
            .limit(1);
          if (data && data.length > 0) {
            setShowOwnerHome(true);
          } else {
            setShowOwnerWelcome(true);
          }
        }}
      >
        <Text style={styles.switchModeBtnText}>Owner Mode</Text>
      </TouchableOpacity>

      {/* ── BOTTOM SHEET ── */}
      <Animated.View
        style={[styles.bottomSheet, { height: bottomSheetY }]}
        {...panResponder.panHandlers}
      >
        {activeRide && activeRide.isRenter ? (
  // ── RENTER ACTIVE RIDE (Bottom Sheet Overlay) ──
  <UserActiveRideOverlay
    ride={activeRide}
    onEndRide={onRideEnd}
    onHandoverComplete={async (radius, geofenceEnabled) => {
      try {
        await supabase
          .from('bookings')
          .update({
            handover_status: 'handed_over',
            roaming_enabled: geofenceEnabled,
            roaming_radius_km: radius,
            handover_location_lat: location.latitude,
            handover_location_lng: location.longitude,
          })
          .eq('id', activeRide.id);

        console.log('[HomeScreen] Handover complete - geofence:', geofenceEnabled, 'radius:', radius);
      } catch (err) {
        console.log('[HomeScreen] Error updating handover details:', err);
      }
    }}
  />
) : activeRide && !activeRide.isRenter ? (
  // ── OWNER ACTIVE RIDE (Old bottom sheet for now) ──
  <View style={styles.activeRideSheet}>
    <View style={styles.handleWrapper}>
      <View style={styles.handle} />
    </View>

    {/* Status bar */}
    <View style={styles.activeRideStatus}>
      <View style={styles.activeRideDot} />
      <Text style={styles.activeRideStatusText}>Renter Coming — Get ready!</Text>
    </View>

    {/* Live timer */}
    <View style={styles.activeRideTimerRow}>
      <View style={styles.activeRideTimerBox}>
        <Text style={styles.activeRideTimerLabel}>Time Elapsed</Text>
        <Text style={styles.activeRideTimerValue}>
          {String(Math.floor(rideElapsedSeconds / 3600)).padStart(2, '0')}:
          {String(Math.floor((rideElapsedSeconds % 3600) / 60)).padStart(2, '0')}:
          {String(rideElapsedSeconds % 60).padStart(2, '0')}
        </Text>
      </View>
      <View style={styles.activeRideTimerBox}>
        <Text style={styles.activeRideTimerLabel}>Current Fare</Text>
        <Text style={styles.activeRideTimerValue}>
          ₹{Math.round(activeRide.pricePerHour * (rideElapsedSeconds / 3600))}
        </Text>
      </View>
    </View>

    {/* Bike info */}
    <View style={styles.activeRideCard}>
      <View style={styles.activeRideInfo}>
        <Text style={styles.activeRideName}>{activeRide.bikeName}</Text>
        <Text style={styles.activeRideOwner}>Renter: {activeRide.renterName}</Text>
        <Text style={styles.activeRideId}>ID: {activeRide.id}</Text>
      </View>
      <View style={styles.activeRidePriceBox}>
        <Text style={styles.activeRidePriceLabel}>Deposit Paid</Text>
        <Text style={styles.activeRidePriceValue}>₹{Math.round(activeRide.pricePerHour * 10)}</Text>
      </View>
    </View>

    {/* Ride details row */}
    <View style={styles.activeRideDetailsRow}>
      {[
        { label: 'Booked For', value: `${activeRide.durationHours}h` },
        { label: 'Rate', value: `₹${activeRide.pricePerHour}/hr` },
        { label: 'Deposit', value: `₹${Math.round(activeRide.pricePerHour * 10)}` },
      ].map((item, index) => (
        <View key={index} style={styles.activeRideDetailBox}>
          <Text style={styles.activeRideDetailLabel}>{item.label}</Text>
          <Text style={styles.activeRideDetailValue}>{item.value}</Text>
        </View>
      ))}
    </View>

    {/* End Ride button */}
    <TouchableOpacity
      style={styles.endRideBtn}
      onPress={onRideEnd}
      activeOpacity={0.85}
    >
      <Text style={styles.endRideBtnText}>End Ride</Text>
    </TouchableOpacity>
  </View>
) : (
  // ── NORMAL MODE (Bike List) ──
  <>
    <TouchableOpacity
      style={styles.handleWrapper}
      onPress={toggleBottomSheet}
      activeOpacity={0.7}
    >
      <View style={styles.handle} />
      <Text style={styles.bottomSheetTitle}>
        {bikesLoading
          ? 'Finding bikes nearby...'
          : `${bikes.length} bikes nearby`}
      </Text>
    </TouchableOpacity>

    {bikesLoading ? (
      <View style={styles.bikesLoadingContainer}>
        <ActivityIndicator color="#E8241A" size="small" />
        <Text style={styles.bikesLoadingText}>
          Searching for bikes near you...
        </Text>
      </View>
    ) : bikes.length === 0 ? (
      <View style={styles.noBikesContainer}>
        <Text style={styles.noBikesIcon}>🛵</Text>
        <Text style={styles.noBikesTitle}>No bikes nearby</Text>
        <Text style={styles.noBikesSubtitle}>
          Be the first to list a bike in your area!
        </Text>
      </View>
    ) : (
    <FlatList
      data={bikes}
      keyExtractor={item => item.id}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.cardList}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.85}
          onPress={() => setSelectedBike(item)}
        >
          <Image
            source={item.image}
            style={styles.cardImage}
            resizeMode="cover"
          />
          <View style={styles.cardInfo}>
            <View style={styles.cardTopRow}>
              <Text style={styles.cardName}>{item.name}</Text>
              {item.gps && (
                <View style={styles.gpsBadge}>
                  <Text style={styles.gpsBadgeText}>GPS</Text>
                </View>
              )}
            </View>
            <Text style={styles.cardType}>{item.type} · {item.distance}</Text>
            <Text style={styles.cardPrice}>
              ₹{item.price}
              <Text style={styles.cardPriceUnit}>/hr</Text>
            </Text>
          </View>
          <TouchableOpacity
            style={styles.bookBtn}
            onPress={() => checkDocuments(item)}
          >
            <Text style={styles.bookBtnText}>Book</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      )}
    />
  )}
  </>
)}
      </Animated.View>
      {selectedBike && (
        <BikeDetailScreen
          bike={selectedBike}
          onBack={() => setSelectedBike(null)}
          userLocation={{
            latitude: location.latitude,
            longitude: location.longitude,
          }}
          onRideStart={() => {
            // BikeDetailScreen just checks docs, doesn't start ride yet
            checkDocuments(selectedBike);
          }}
        />
      )}

      {showDocs && selectedBike && !docsAlreadyUploaded && (
        <DocumentUploadScreen
          bike={selectedBike}
          userLocation={{
            latitude: location.latitude,
            longitude: location.longitude,
          }}
          onBack={() => setShowDocs(false)}
          onComplete={() => {
            setDocsAlreadyUploaded(true);
          }}
        />
      )}

      {showDocs && selectedBike && docsAlreadyUploaded && (
  <BookingScreen
    bike={selectedBike}
    userLocation={{
      latitude: location.latitude,
      longitude: location.longitude,
    }}
    onBack={() => {
      setShowDocs(false);
      setSelectedBike(null);
    }}
    onConfirm={async (bookingData) => {
      console.log('[HomeScreen] BookingScreen completed, showing ConfirmationScreen');
      setSelectedBikeForConfirmation(selectedBike);
      setBookingRequestIdForConfirmation(bookingData.bookingRequestId);
      setDurationForConfirmation(bookingData.duration);
      setUserLocationForConfirmation({
        latitude: location.latitude,
        longitude: location.longitude,
      });
      setShowConfirmation(true);
    }}
  />
)}

  {showConfirmation && selectedBikeForConfirmation && (
  <ConfirmationScreen
    bike={selectedBikeForConfirmation}
    duration={durationForConfirmation}
    userLocation={userLocationForConfirmation}
    bookingRequestId={bookingRequestIdForConfirmation}
    onGoHome={(rideData) => {
      console.log('[HomeScreen] ConfirmationScreen completed, starting ride');
      setShowConfirmation(false);
      setShowDocs(false);
      setSelectedBike(null);
      setSelectedBikeForConfirmation(null);
      
      onRideStart({
        id: rideData.bookingRequestId,
        bikeId: selectedBikeForConfirmation.id,
        bikeName: rideData.bikeName,
        bikeImage: selectedBikeForConfirmation.image,
        renterName: 'Renter',
        renterAvatar: null,
        renterRating: 4.5,
        ownerName: rideData.owner,
        ownerAvatar: null,
        ownerRating: selectedBikeForConfirmation.rating || 4.5,
        pricePerHour: rideData.price,
        durationHours: rideData.duration,
        userLocation: {
          latitude: location.latitude,
          longitude: location.longitude,
        },
        ownerLocation: rideData.bikeLocation,
        isRenter: true,
      });
    }}
  />
)}

      {showOwnerWelcome && (
        <OwnerWelcomeScreen
          onBack={() => setShowOwnerWelcome(false)}
          onGetStarted={() => {
            setShowOwnerWelcome(false);
            setShowBikeListing(true);
          }}
        />
      )}

      {showBikeListing && (
        <BikeListingScreen
          onBack={() => setShowBikeListing(false)}
          onListed={() => {
            setShowBikeListing(false);
            setShowOwnerHome(true);
          }}
        />
      )}

      {showProfile && (
        <ProfileScreen onBack={() => setShowProfile(false)} />
      )}

      {showOwnerHome && (
        <OwnerHomeScreen
          onBack={() => setShowOwnerHome(false)}
          onListNewBike={() => {
            setShowOwnerHome(false);
            setShowBikeListing(true);
          }}
        />
      )}

      {/* ── OWNER BOOKING REQUEST MODAL ── */}
      {isOwner && currentRequest && (
  <OwnerBookingRequestModal
    bookingRequest={currentRequest}
    onApprove={async (requestId) => {
      // Approve the request
      await approveRequest(requestId);

      // Fetch booking and bike details to build ride object
      try {
        const { data: booking } = await supabase
          .from('booking_requests')
          .select(`
            *,
            bookings(*)
          `)
          .eq('id', requestId)
          .single();

        if (booking) {
          const { data: bike } = await supabase
            .from('bikes')
            .select('*')
            .eq('id', booking.bike_id)
            .single();

          const { data: renterProfile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', booking.renter_id)
            .single();

          const { data: ownerProfile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', booking.owner_id)
            .single();

          const { data: bikeImages } = await supabase
            .from('bike_images')
            .select('image_path')
            .eq('bike_id', bike.id)
            .limit(1);

          // Build ride object for ActiveRideOverlay
          const rideData = {
            id: booking.id,
            bikeId: bike.id,
            bikeName: `${bike.brand} ${bike.model}`,
            bikeImage: bikeImages?.[0]?.image_path 
              ? { uri: bikeImages[0].image_path }
              : require('../../assets/activa.png'),
            renterName: renterProfile?.full_name || 'Renter',
            renterAvatar: renterProfile?.avatar_url || null,
            renterRating: 4.8,
            ownerName: ownerProfile?.full_name || 'Owner',
            ownerAvatar: ownerProfile?.avatar_url || null,
            ownerRating: 4.8,
            pricePerHour: bike.price_per_hour,
            durationHours: booking.duration_hours || 3,
            userLocation: { latitude: location.latitude, longitude: location.longitude },
            ownerLocation: { 
              latitude: bike.latitude || location.latitude,
              longitude: bike.longitude || location.longitude,
            },
            isRenter: false, // Owner view
          };

          // Trigger ActiveRideOverlay via prop callback
          onRideStart(rideData);
        }
      } catch (err) {
        console.log('[HomeScreen] Error building ride object:', err);
      }
    }}
    onReject={(requestId) => {
      rejectRequest(requestId);
    }}
    onDismiss={() => dismissRequest()}
  />
)}
      
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  markerContainer: {
    alignItems: 'center',
  },
  marker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8241A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  markerInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  markerTail: {
    width: 10,
    height: 10,
    backgroundColor: '#E8241A',
    transform: [{ rotate: '45deg' }],
    marginTop: -6,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#FFFFFF',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 48,
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationIcon: {
    fontSize: 18,
  },
  locationLabel: {
    color: '#999999',
    fontSize: 11,
  },
  locationName: {
    color: '#1A1A1A',
    fontSize: 15,
    fontWeight: '600',
  },
  profileCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  profileInitial: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  searchBarWrapper: {
    position: 'absolute',
    top: 120,
    left: 16,
    right: 16,
    zIndex: 50,
  },
  searchBar: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    gap: 10,
  },
  searchIcon: {
    fontSize: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1A1A1A',
    paddingHorizontal: 0,
  },
  searchClear: {
    fontSize: 16,
    color: '#CCCCCC',
    marginLeft: 8,
  },
  searchSuggestions: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 100,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    gap: 12,
  },
  suggestionItemLast: {
    borderBottomWidth: 0,
  },
  suggestionIcon: {
    fontSize: 16,
  },
  suggestionText: {
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  locateBtn: {
    position: 'absolute',
    right: 16,
    bottom: BOTTOM_SHEET_MIN + 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  locateBtnText: {
    fontSize: 20,
    color: '#E8241A',
  },
  switchModeBtn: {
    position: 'absolute',
    left: 16,
    bottom: BOTTOM_SHEET_MIN + 16,
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  switchModeBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 12,
  },
  handleWrapper: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E0E0E0',
    marginBottom: 8,
  },
  bottomSheetTitle: {
    color: '#1A1A1A',
    fontSize: 15,
    fontWeight: '600',
  },
  cardList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 12,
  },
  card: {
    backgroundColor: '#F8F8F8',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#EFEFEF',
    overflow: 'hidden',
  },
  cardImageIcon: {
    fontSize: 28,
  },
  cardInfo: {
    flex: 1,
    gap: 3,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardName: {
    color: '#1A1A1A',
    fontSize: 15,
    fontWeight: '600',
  },
  gpsBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  gpsBadgeText: {
    color: '#2E7D32',
    fontSize: 10,
    fontWeight: '700',
  },
  cardType: {
    color: '#999999',
    fontSize: 12,
  },
  cardPrice: {
    color: '#E8241A',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  cardPriceUnit: {
    color: '#AAAAAA',
    fontSize: 12,
    fontWeight: '400',
  },
  bookBtn: {
    backgroundColor: '#E8241A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  bookBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },

  // Active ride sheet
  activeRideSheet: {
    flex: 1,
    padding: 16,
  },
  activeRideStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  activeRideDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E8241A',
  },
  activeRideStatusText: {
    fontSize: 13,
    color: '#E8241A',
    fontWeight: '600',
  },
  activeRideCard: {
    flexDirection: 'row',
    backgroundColor: '#F8F8F8',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    alignItems: 'center',
    gap: 12,
  },
  activeRideInfo: {
    flex: 1,
    gap: 4,
  },
  activeRideName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  activeRideOwner: {
    fontSize: 13,
    color: '#666666',
  },
  activeRideId: {
    fontSize: 11,
    color: '#AAAAAA',
    letterSpacing: 0.5,
  },
  activeRidePriceBox: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  activeRidePriceLabel: {
    fontSize: 10,
    color: '#999999',
    marginBottom: 2,
  },
  activeRidePriceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E8241A',
  },
  activeRideDetailsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  activeRideDetailBox: {
    flex: 1,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  activeRideDetailLabel: {
    fontSize: 11,
    color: '#999999',
  },
  activeRideDetailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  endRideBtn: {
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  endRideBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  profileCircleImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },

  bikesLoadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 20,
  },
  bikesLoadingText: {
    fontSize: 14,
    color: '#999999',
  },
  noBikesContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    gap: 8,
  },
  noBikesIcon: {
    fontSize: 48,
  },
  noBikesTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  noBikesSubtitle: {
    fontSize: 13,
    color: '#999999',
    textAlign: 'center',
    lineHeight: 20,
  },
  activeRideTimerRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  activeRideTimerBox: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  activeRideTimerLabel: {
    fontSize: 11,
    color: '#666666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  activeRideTimerValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#E8241A',
    fontVariant: ['tabular-nums'],
  },
});
