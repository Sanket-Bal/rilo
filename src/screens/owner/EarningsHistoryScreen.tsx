import React, { useRef, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  FlatList,
} from 'react-native';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');

type EarningRecord = {
  id: string;
  booking_id: string;
  bike_name: string;
  renter_name: string;
  total_paid: number;
  duration: number;
  approved_at: string;
};

export default function EarningsHistoryScreen({
  onBack,
}: {
  onBack: () => void;
}) {
  const slideAnim = useRef(new Animated.Value(width)).current;
  const [loading, setLoading] = useState(true);
  const [earnings, setEarnings] = useState<EarningRecord[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [thisMonth, setThisMonth] = useState(0);
  const [currentUserId, setCurrentUserId] = useState('');

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 0,
      speed: 14,
    }).start();
    fetchEarningsHistory();
  }, []);

  const fetchEarningsHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setCurrentUserId(user.id);

      // Fetch all completed bookings
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id, booking_id, bike_id, renter_id, total_paid, duration, approved_at, created_at')
        .eq('owner_id', user.id)
        .order('approved_at', { ascending: false });

      if (bookings && bookings.length > 0) {
        // Enrich with bike and renter names
        const enriched = await Promise.all(
          bookings.map(async (booking) => {
            const { data: bike } = await supabase
              .from('bikes')
              .select('brand, model')
              .eq('id', booking.bike_id)
              .single();

            const { data: renter } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', booking.renter_id)
              .single();

            return {
              id: booking.id,
              booking_id: booking.booking_id,
              bike_name: bike ? `${bike.brand} ${bike.model}` : 'Unknown Bike',
              renter_name: renter?.full_name || 'Unknown Renter',
              total_paid: booking.total_paid || 0,
              duration: booking.duration || 0,
              approved_at: booking.approved_at || '',
            };
          })
        );

        setEarnings(enriched);

        // Calculate totals
        const total = enriched.reduce((sum, e) => sum + e.total_paid, 0);
        setTotalEarnings(total);

        // This month earnings
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const thisMonthTotal = enriched
          .filter(e => new Date(e.approved_at) >= monthStart)
          .reduce((sum, e) => sum + e.total_paid, 0);
        setThisMonth(thisMonthTotal);
      }
    } catch (err) {
      console.log('Error fetching earnings:', err);
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

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <Animated.View
        style={[styles.container, { transform: [{ translateX: slideAnim }] }]}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Earnings History</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator color="#E8241A" size="large" />
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateX: slideAnim }] }]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Earnings History</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* ── SUMMARY CARDS ── */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Earned</Text>
            <Text style={styles.summaryValue}>₹{totalEarnings.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>This Month</Text>
            <Text style={styles.summaryValue}>₹{thisMonth.toFixed(2)}</Text>
          </View>
        </View>

        {/* ── EARNINGS LIST ── */}
        {earnings.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyText}>No earnings yet</Text>
            <Text style={styles.emptySubtext}>Start listing bikes to earn money</Text>
          </View>
        ) : (
          <View style={styles.listSection}>
            <Text style={styles.sectionTitle}>All Rides ({earnings.length})</Text>
            {earnings.map((earning) => (
              <View key={earning.id} style={styles.earningCard}>
                <View style={styles.earningHeader}>
                  <View>
                    <Text style={styles.earningBikeLabel}>{earning.bike_name}</Text>
                    <Text style={styles.earningRenterLabel}>
                      Rented by {earning.renter_name}
                    </Text>
                  </View>
                  <Text style={styles.earningAmount}>+₹{earning.total_paid.toFixed(2)}</Text>
                </View>
                <View style={styles.earningFooter}>
                  <Text style={styles.earningMeta}>
                    {earning.duration}h ride • {earning.booking_id}
                  </Text>
                  <Text style={styles.earningDate}>{formatDate(earning.approved_at)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F5F5F5',
    zIndex: 1002,
    elevation: 1002,
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
    paddingBottom: 40,
  },
  summaryCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#333333',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#888888',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#E8241A',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  emptySubtext: {
    fontSize: 13,
    color: '#AAAAAA',
  },
  listSection: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    paddingHorizontal: 4,
  },
  earningCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  earningHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  earningBikeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  earningRenterLabel: {
    fontSize: 12,
    color: '#888888',
    marginTop: 2,
  },
  earningAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2E7D32',
  },
  earningFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  earningMeta: {
    fontSize: 11,
    color: '#AAAAAA',
  },
  earningDate: {
    fontSize: 11,
    color: '#CCCCCC',
  },
});