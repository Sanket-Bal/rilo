import React, { useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width, height } = Dimensions.get('window');

export default function FareSettlementScreen({
  bikeName,
  owner,
  deposit,
  pricePerHour,
  duration,
  bookingId,
  bookingRequestId,
  onContinueToRating,
}: {
  bikeName: string;
  owner: string;
  deposit: number;
  pricePerHour: number;
  duration: number;
  bookingId: string;
  bookingRequestId: string;
  onContinueToRating: () => void;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const rideFare = pricePerHour * duration;
  const platformFee = Math.round(rideFare * 0.1);
  const totalDeducted = rideFare + platformFee;
  const refundAmount = Math.max(0, deposit - totalDeducted);
  const extraCharge = Math.max(0, totalDeducted - deposit);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 3,
        speed: 12,
      }),
    ]).start();

    // Mark ride as completed in DB
    const markCompleted = async () => {
      try {
        await supabase
          .from('booking_requests')
          .update({
            status: 'completed',
            ride_ended_at: new Date().toISOString(),
          })
          .eq('id', bookingRequestId);
      } catch (err) {
        console.log('Error marking ride complete:', err);
      }
    };
    markCompleted();
  }, []);

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      {/* ── HEADER ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ride Complete! 🎉</Text>
        <Text style={styles.headerSubtitle}>
          Here's your fare summary
        </Text>
      </View>

      {/* ── RIDE INFO ── */}
      <View style={styles.rideInfoCard}>
        <View style={styles.rideInfoRow}>
          <Text style={styles.rideInfoLabel}>Vehicle</Text>
          <Text style={styles.rideInfoValue}>{bikeName}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.rideInfoRow}>
          <Text style={styles.rideInfoLabel}>Owner</Text>
          <Text style={styles.rideInfoValue}>{owner}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.rideInfoRow}>
          <Text style={styles.rideInfoLabel}>Duration</Text>
          <Text style={styles.rideInfoValue}>{duration} hr</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.rideInfoRow}>
          <Text style={styles.rideInfoLabel}>Booking ID</Text>
          <Text style={styles.rideInfoValue}>{bookingId}</Text>
        </View>
      </View>

      {/* ── FARE BREAKDOWN ── */}
      <View style={styles.fareCard}>
        <Text style={styles.fareTitle}>Fare Breakdown</Text>

        {[
          { label: `Ride fare (${duration}hr × ₹${pricePerHour})`, value: `₹${rideFare}`, color: '#1A1A1A' },
          { label: 'Platform fee (10%)', value: `₹${platformFee}`, color: '#1A1A1A' },
          { label: 'Security deposit paid', value: `-₹${deposit}`, color: '#E8241A' },
        ].map((item, index) => (
          <View key={index} style={styles.fareRow}>
            <Text style={styles.fareLabel}>{item.label}</Text>
            <Text style={[styles.fareValue, { color: item.color }]}>
              {item.value}
            </Text>
          </View>
        ))}

        <View style={styles.fareDivider} />

        {refundAmount > 0 ? (
          <View style={styles.refundBox}>
            <Text style={styles.refundLabel}>Refund to your account</Text>
            <Text style={styles.refundValue}>₹{refundAmount}</Text>
          </View>
        ) : extraCharge > 0 ? (
          <View style={styles.extraBox}>
            <Text style={styles.extraLabel}>Extra charge</Text>
            <Text style={styles.extraValue}>₹{extraCharge}</Text>
          </View>
        ) : (
          <View style={styles.refundBox}>
            <Text style={styles.refundLabel}>No refund / No extra charge</Text>
            <Text style={styles.refundValue}>₹0</Text>
          </View>
        )}

        {refundAmount > 0 && (
          <Text style={styles.refundNote}>
            ₹{refundAmount} will be credited to your original payment method within 24-48 hours.
          </Text>
        )}
      </View>

      {/* ── BUTTON ── */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.continueBtn}
          onPress={onContinueToRating}
          activeOpacity={0.85}
        >
          <Text style={styles.continueBtnText}>Rate Your Ride →</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F5F5F5',
    zIndex: 1100,
    elevation: 1100,
  },
  header: {
    backgroundColor: '#1A1A1A',
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#888888',
  },
  rideInfoCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  rideInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  rideInfoLabel: {
    fontSize: 13,
    color: '#999999',
  },
  rideInfoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  divider: {
    height: 1,
    backgroundColor: '#F5F5F5',
  },
  fareCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  fareTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fareLabel: {
    fontSize: 13,
    color: '#666666',
    flex: 1,
  },
  fareValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  fareDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 4,
  },
  refundBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
    padding: 12,
  },
  refundLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
  },
  refundValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2E7D32',
  },
  extraBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF0F0',
    borderRadius: 10,
    padding: 12,
  },
  extraLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E8241A',
  },
  extraValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#E8241A',
  },
  refundNote: {
    fontSize: 12,
    color: '#888888',
    lineHeight: 18,
  },
  bottomBar: {
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
  continueBtn: {
    backgroundColor: '#E8241A',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  continueBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});