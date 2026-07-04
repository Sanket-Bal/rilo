import React, { useRef, useEffect, useState } from 'react';
import ReportScreen from '../ReportScreen';
import OwnerProfileScreen from './OwnerProfileScreen';
import {
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');

type Bike = {
  id: string;
  brand: string;
  model: string;
  year: string;
  type: string;
  condition: string;
  price_per_hour: number;
  status: string;
  fuel_type: string;
  fuel_policy: string;
  city_only: boolean;
  pillion_allowed: boolean;
  helmet_provided: boolean;
  images: string[];
};

export default function OwnerHomeScreen({
  onBack,
  onListNewBike,
}: {
  onBack: () => void;
  onListNewBike: () => void;
}) {
  const slideAnim = useRef(new Animated.Value(width)).current;
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [loading, setLoading] = useState(true);
  const [earnings, setEarnings] = useState(0);
  const [totalRides, setTotalRides] = useState(0);
  const [showReport, setShowReport] = useState(false);
  const [reportRenterId, setReportRenterId] = useState('');
  const [reportRenterName, setReportRenterName] = useState('');
  const [reportBookingId, setReportBookingId] = useState('');
  const [showOwnerProfile, setShowOwnerProfile] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [ownerInitial, setOwnerInitial] = useState('O');

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 0,
      speed: 14,
    }).start();

    fetchOwnerData();
  }, []);

  const fetchOwnerData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

  // Fetch avatar
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single();

      if (profile?.full_name) {
        setOwnerInitial(profile.full_name[0].toUpperCase());
      } else {
        setOwnerInitial((user.email || 'O')[0].toUpperCase());
      }

      if (profile?.avatar_url) {
        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(profile.avatar_url);
        setAvatarUrl(urlData.publicUrl);
      }

      // Fetch bikes
      const { data: bikesData } = await supabase
        .from('bikes')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (bikesData) {
        // Fetch images for each bike
        const bikesWithImages = await Promise.all(
          bikesData.map(async (bike) => {
            const { data: images } = await supabase
              .from('bike_images')
              .select('image_path')
              .eq('bike_id', bike.id);
            return {
              ...bike,
              images: images?.map(img => img.image_path) || [],
            };
          })
        );
        setBikes(bikesWithImages);
      }

      // Fetch earnings from bookings
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('total_paid')
        .eq('owner_id', user.id);

      if (bookingsData) {
        const total = bookingsData.reduce((sum, b) => sum + (b.total_paid || 0), 0);
        setEarnings(total);
        setTotalRides(bookingsData.length);
      }

    } catch (err) {
      console.log('Error fetching owner data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    Animated.timing(slideAnim, {
      toValue: width,
      duration: 300,
      useNativeDriver: true,
    }).start(() => onBack());
  };

  const unlistBike = async (bike: Bike) => {
    // Step 1 — Confirm with owner
    Alert.alert(
      'Unlist Bike',
      `Are you sure you want to permanently remove your ${bike.brand} ${bike.model} from RILO? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Unlist',
          style: 'destructive',
          onPress: () => confirmUnlist(bike),
        },
      ]
    );
  };

  const confirmUnlist = async (bike: Bike) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Step 2 — Check for active bookings
      const { data: activeBookings } = await supabase
        .from('bookings')
        .select('id')
        .eq('bike_id', bike.id)
        .eq('booking_status', 'active');

      if (activeBookings && activeBookings.length > 0) {
        Alert.alert(
          'Cannot Unlist',
          'This bike has an active booking right now. Please wait for the ride to end before unlisting.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Step 3 — Check for upcoming bookings
      const { data: upcomingBookings } = await supabase
        .from('bookings')
        .select('id')
        .eq('bike_id', bike.id)
        .eq('booking_status', 'upcoming');

      if (upcomingBookings && upcomingBookings.length > 0) {
        Alert.alert(
          'Upcoming Bookings Exist',
          'This bike has upcoming bookings. Unlisting will cancel them. Renters will be refunded. Do you still want to proceed?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Unlist Anyway',
              style: 'destructive',
              onPress: () => deleteEverything(bike, user.id),
            },
          ]
        );
        return;
      }

      // Step 4 — No active bookings, proceed
      await deleteEverything(bike, user.id);

    } catch (err) {
      console.log('Error unlisting bike:', err);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  const deleteEverything = async (bike: Bike, userId: string) => {
    try {
      // Show loading
      setLoading(true);

      // Step 1 — Delete images from Supabase Storage
      if (bike.images && bike.images.length > 0) {
        const filePaths = bike.images.map(url => {
          // Extract file path from URL
          const parts = url.split('/bike-images/');
          return parts.length > 1 ? parts[1] : null;
        }).filter(Boolean) as string[];

        if (filePaths.length > 0) {
          await supabase.storage
            .from('bike-images')
            .remove(filePaths);
        }
      }

      // Step 2 — Delete bike_images records
      await supabase
        .from('bike_images')
        .delete()
        .eq('bike_id', bike.id);

      // Step 3 — Delete bike_documents records
      await supabase
        .from('bike_documents')
        .delete()
        .eq('bike_id', bike.id);

      // Step 4 — Delete bike record
      const { error } = await supabase
        .from('bikes')
        .delete()
        .eq('id', bike.id)
        .eq('owner_id', userId);

      if (error) {
        Alert.alert('Error', 'Failed to unlist bike. Please try again.');
        setLoading(false);
        return;
      }

      // Step 5 — Refresh list
      await fetchOwnerData();

      Alert.alert(
        'Bike Unlisted ✓',
        `Your ${bike.brand} ${bike.model} has been successfully removed from RILO.`,
        [{ text: 'OK' }]
      );

    } catch (err) {
      console.log('Error deleting bike:', err);
      Alert.alert('Error', 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const toggleBikeStatus = async (bikeId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'available' ? 'paused' : 'available';
    await supabase
      .from('bikes')
      .update({ status: newStatus })
      .eq('id', bikeId);
    fetchOwnerData();
  };

  const renderBikeCard = ({ item }: { item: Bike }) => (
    <View style={styles.bikeCard}>
      {/* Bike image */}
      <View style={styles.bikeImageWrapper}>
        {item.images.length > 0 ? (
          <Image
            source={{ uri: item.images[0] }}
            style={styles.bikeImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.bikeImagePlaceholder}>
            <Text style={styles.bikeImagePlaceholderText}>🛵</Text>
          </View>
        )}
        <View style={[
          styles.statusBadge,
          item.status === 'available' ? styles.statusAvailable : styles.statusPaused,
        ]}>
          <Text style={styles.statusBadgeText}>
            {item.status === 'available' ? '● Available' : '● Paused'}
          </Text>
        </View>
      </View>

      {/* Bike info */}
      <View style={styles.bikeInfo}>
        <View style={styles.bikeNameRow}>
          <Text style={styles.bikeName}>{item.brand} {item.model}</Text>
          <Text style={styles.bikePrice}>₹{item.price_per_hour}/hr</Text>
        </View>
        <Text style={styles.bikeDetails}>
          {item.type} · {item.year} · {item.condition}
        </Text>
        <View style={styles.bikeTags}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>
              {item.fuel_type === 'Electric' ? '⚡ Electric' : '⛽ ' + (item.fuel_policy === 'included' ? 'Fuel included' : 'Renter fills')}
            </Text>
          </View>
          <View style={styles.tag}>
            <Text style={styles.tagText}>
              {item.city_only ? '🏙️ City only' : '🗺️ Intercity'}
            </Text>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.bikeActions}>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              item.status === 'available' ? styles.actionBtnPause : styles.actionBtnActivate,
            ]}
            onPress={() => toggleBikeStatus(item.id, item.status)}
          >
            <Text style={styles.actionBtnText}>
              {item.status === 'available' ? 'Pause' : 'Activate'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnUnlist]}
            onPress={() => unlistBike(item)}
          >
            <Text style={styles.actionBtnUnlistText}>Unlist</Text>
          </TouchableOpacity>
        </View>

        {/* Report button */}
          <TouchableOpacity
            style={styles.reportBtn}
            onPress={() => {
              setReportBookingId(item.id);
              setShowReport(true);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.reportBtnText}>🚨 Report a Renter</Text>
          </TouchableOpacity>

      </View>
    </View>
  );

  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateX: slideAnim }] }]}
    >
      {/* ── HEADER ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Owner Dashboard</Text>
        <TouchableOpacity
          style={styles.profileCircleBtn}
          onPress={() => setShowOwnerProfile(true)}
          activeOpacity={0.8}
        >
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={styles.profileCircleImage}
            />
          ) : (
            <Text style={styles.profileCircleText}>{ownerInitial}</Text>
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator color="#E8241A" size="large" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {/* ── EARNINGS SUMMARY ── */}
          <View style={styles.earningsCard}>
            <Text style={styles.earningsTitle}>Your Earnings Overview</Text>
            <View style={styles.earningsRow}>
              {[
                { label: 'Total Earned', value: `₹${earnings}` },
                { label: 'Total Rides', value: `${totalRides}` },
                { label: 'Bikes Listed', value: `${bikes.length}` },
              ].map((item, index) => (
                <View key={index} style={styles.earningsBox}>
                  <Text style={styles.earningsValue}>{item.value}</Text>
                  <Text style={styles.earningsLabel}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* ── BIKES ── */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Listed Bikes</Text>
            <Text style={styles.sectionCount}>{bikes.length} bikes</Text>
          </View>

          {bikes.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🛵</Text>
              <Text style={styles.emptyTitle}>No bikes listed yet</Text>
              <Text style={styles.emptySubtitle}>
                List your first bike and start earning today!
              </Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={onListNewBike}
                activeOpacity={0.85}
              >
                <Text style={styles.emptyBtnText}>List Your Bike</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={bikes}
              keyExtractor={item => item.id}
              renderItem={renderBikeCard}
              scrollEnabled={false}
              contentContainerStyle={styles.bikesList}
            />
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ── FLOATING ADD BUTTON ── */}
      <TouchableOpacity
        style={styles.floatingAddBtn}
        onPress={onListNewBike}
        activeOpacity={0.85}
      >
        <Text style={styles.floatingAddBtnText}>+ List New Bike</Text>
      </TouchableOpacity>

      {showReport && (
        <ReportScreen
          onBack={() => setShowReport(false)}
          reporterType="owner"
          bookingId={reportBookingId}
        />
      )}



      {showOwnerProfile && (
        <OwnerProfileScreen
          onBack={() => setShowOwnerProfile(false)}
        />
      )}



    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F5F5F5',
    zIndex: 1000,
    elevation: 1000,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 52,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 20,
    color: '#1A1A1A',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: 0.3,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    padding: 16,
    gap: 16,
  },

  // Earnings
  earningsCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    padding: 20,
    gap: 16,
  },
  earningsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  earningsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  earningsBox: {
    flex: 1,
    backgroundColor: '#252525',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  earningsValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#E8241A',
  },
  earningsLabel: {
    fontSize: 11,
    color: '#888888',
    textAlign: 'center',
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  sectionCount: {
    fontSize: 13,
    color: '#999999',
  },

  // Bike card
  bikesList: {
    gap: 14,
  },
  bikeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  bikeImageWrapper: {
    position: 'relative',
  },
  bikeImage: {
    width: '100%',
    height: 180,
  },
  bikeImagePlaceholder: {
    width: '100%',
    height: 180,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bikeImagePlaceholderText: {
    fontSize: 48,
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusAvailable: {
    backgroundColor: 'rgba(46, 125, 50, 0.9)',
  },
  statusPaused: {
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  bikeInfo: {
    padding: 16,
    gap: 8,
  },
  bikeNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bikeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  bikePrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E8241A',
  },
  bikeDetails: {
    fontSize: 13,
    color: '#999999',
  },
  bikeTags: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  tagText: {
    fontSize: 12,
    color: '#555555',
  },
  bikeActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionBtnPause: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  actionBtnActivate: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#2E7D32',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  actionBtnUnlist: {
    backgroundColor: '#FFF0F0',
    borderWidth: 1,
    borderColor: '#E8241A',
  },
  actionBtnUnlistText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E8241A',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    padding: 40,
    gap: 12,
  },
  emptyIcon: {
    fontSize: 56,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyBtn: {
    backgroundColor: '#E8241A',
    borderRadius: 14,
    paddingHorizontal: 32,
    paddingVertical: 14,
    marginTop: 8,
  },
  emptyBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  reportBtn: {
    marginTop: 4,
    paddingVertical: 8,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },
  reportBtnText: {
    fontSize: 13,
    color: '#E8241A',
    fontWeight: '600',
  },
  // Profile circle in header
  profileCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E8241A',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#E8241A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  profileCircleImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  profileCircleText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // Floating add button
  floatingAddBtn: {
    position: 'absolute',
    bottom: 32,
    alignSelf: 'center',
    left: 60,
    right: 60,
    backgroundColor: '#E8241A',
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#E8241A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
  },
  floatingAddBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});