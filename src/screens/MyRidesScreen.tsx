import React, { useRef, useEffect, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../lib/supabase';

const { width } = Dimensions.get('window');

type Booking = {
  id: string;
  bike_name: string;
  bike_type: string;
  owner_name: string;
  duration: number;
  price_per_hour: number;
  deposit: number;
  platform_fee: number;
  total_paid: number;
  booking_id: string;
  status: string;
  created_at: string;
};

export default function MyRidesScreen({ onBack }: { onBack: () => void }) {
  const slideAnim = useRef(new Animated.Value(width)).current;
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 0,
      speed: 14,
    }).start();

    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (data) setBookings(data);
    } catch (err) {
      console.log('Error fetching bookings:', err);
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderBooking = ({ item }: { item: Booking }) => (
    <View style={styles.card}>
      {/* Top row */}
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <Text style={styles.bikeName}>{item.bike_name}</Text>
          <Text style={styles.bikeType}>{item.bike_type} · {item.owner_name}</Text>
        </View>
        <View style={[
          styles.statusBadge,
          item.status === 'completed' ? styles.statusCompleted : styles.statusActive,
        ]}>
          <Text style={[
            styles.statusText,
            item.status === 'completed' ? styles.statusTextCompleted : styles.statusTextActive,
          ]}>
            {item.status === 'completed' ? 'Completed' : 'Active'}
          </Text>
        </View>
      </View>

      {/* Details row */}
      <View style={styles.detailsRow}>
        {[
          { label: 'Duration', value: `${item.duration}hr` },
          { label: 'Rate', value: `₹${item.price_per_hour}/hr` },
          { label: 'Total Paid', value: `₹${item.total_paid}` },
        ].map((detail, index) => (
          <View key={index} style={styles.detailBox}>
            <Text style={styles.detailLabel}>{detail.label}</Text>
            <Text style={styles.detailValue}>{detail.value}</Text>
          </View>
        ))}
      </View>

      {/* Bottom row */}
      <View style={styles.cardBottom}>
        <Text style={styles.bookingId}>ID: {item.booking_id}</Text>
        <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
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
        <Text style={styles.headerTitle}>My Rides</Text>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator color="#E8241A" size="large" />
        </View>
      ) : bookings.length === 0 ? (
        // Empty state
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>🛵</Text>
          <Text style={styles.emptyTitle}>No rides yet</Text>
          <Text style={styles.emptySubtitle}>
            Your ride history will appear here after your first booking.
          </Text>
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={item => item.id}
          renderItem={renderBooking}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
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

  // Header
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

  // List
  list: {
    padding: 16,
    gap: 12,
  },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    gap: 12,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardLeft: {
    flex: 1,
    gap: 4,
  },
  bikeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  bikeType: {
    fontSize: 13,
    color: '#999999',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusCompleted: {
    backgroundColor: '#E8F5E9',
  },
  statusActive: {
    backgroundColor: '#FFF3E0',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextCompleted: {
    color: '#2E7D32',
  },
  statusTextActive: {
    color: '#E65100',
  },

  // Details row
  detailsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  detailBox: {
    flex: 1,
    backgroundColor: '#F8F8F8',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    gap: 4,
  },
  detailLabel: {
    fontSize: 11,
    color: '#999999',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A1A',
  },

  // Card bottom
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
    paddingTop: 10,
  },
  bookingId: {
    fontSize: 11,
    color: '#AAAAAA',
    letterSpacing: 0.5,
  },
  dateText: {
    fontSize: 11,
    color: '#AAAAAA',
  },

  // Center container
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    lineHeight: 22,
  },
});