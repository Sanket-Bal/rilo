import React, { useRef, useEffect, useState } from 'react';  //OwnerBookingRequestModal
import {
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../lib/supabase';

const { width, height } = Dimensions.get('window');

type BookingRequest = {
  id: string;
  booking_id: string;
  renter_name: string;
  bike_name: string;
  bike_type: string;
  duration: number;
  price_per_hour: number;
  deposit: number;
  platform_fee: number;
  estimated_fare: number;
  total_payable: number;
  renter_email: string;
  payment_method: string;
  requested_at: string;
  expires_at: string;
};

export default function OwnerBookingRequestModal({
  bookingRequest,
  onApprove,
  onReject,
  onDismiss,
}: {
  bookingRequest: BookingRequest | null;
  onApprove: (requestId: string) => void;
  onReject: (requestId: string, reason?: string) => void;
  onDismiss: () => void;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  useEffect(() => {
    if (bookingRequest) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 2,
          speed: 12,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          bounciness: 3,
          speed: 10,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 50,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => onDismiss());
    }
  }, [bookingRequest]);

  const handleApprove = async () => {
    if (!bookingRequest) return;
    setApproving(true);

    try {
      const { error } = await supabase
        .from('booking_requests')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
        })
        .eq('id', bookingRequest.id);

      if (error) {
        Alert.alert('Error', 'Failed to approve booking. Please try again.');
        setApproving(false);
        return;
      }

      setApproving(false);
      onApprove(bookingRequest.id);

      Alert.alert(
        'Booking Approved ✓',
        `You approved a booking from ${bookingRequest.renter_name} for ${bookingRequest.bike_name}.`,
        [{ text: 'OK' }]
      );
    } catch (err) {
      console.log('Error approving booking:', err);
      Alert.alert('Error', 'Something went wrong. Please try again.');
      setApproving(false);
    }
  };

  const handleReject = () => {
    Alert.alert(
      'Reject Booking',
      'Are you sure you want to reject this booking?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            if (!bookingRequest) return;
            setRejecting(true);

            try {
              const { error } = await supabase
                .from('booking_requests')
                .update({
                  status: 'rejected',
                  rejected_at: new Date().toISOString(),
                  rejection_reason: 'Owner declined',
                })
                .eq('id', bookingRequest.id);

              if (error) {
                Alert.alert('Error', 'Failed to reject booking. Please try again.');
                setRejecting(false);
                return;
              }

              setRejecting(false);
              onReject(bookingRequest.id);

              Alert.alert(
                'Booking Rejected',
                'The renter will be notified and refunded.',
                [{ text: 'OK' }]
              );
            } catch (err) {
              console.log('Error rejecting booking:', err);
              Alert.alert('Error', 'Something went wrong. Please try again.');
              setRejecting(false);
            }
          },
        },
      ]
    );
  };

  if (!bookingRequest) return null;

  const expiresAt = new Date(bookingRequest.expires_at);
  const now = new Date();
  const minutesRemaining = Math.floor((expiresAt.getTime() - now.getTime()) / 60000);

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          opacity: fadeAnim,
          pointerEvents: bookingRequest ? 'auto' : 'none',
        },
      ]}
    >
      <TouchableOpacity
        style={styles.backgroundOverlay}
        activeOpacity={0}
        onPress={onDismiss}
      />

      <Animated.View
        style={[
          styles.modalCard,
          {
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim },
            ],
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIconBox}>
            <Text style={styles.headerIcon}>🔔</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>New Booking Request!</Text>
            <Text style={styles.headerSubtitle}>
              {minutesRemaining > 0
                ? `Respond within ${minutesRemaining}m`
                : 'Request expiring soon'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onDismiss}
            activeOpacity={0.7}
          >
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Renter Info */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Renter</Text>
          <View style={styles.renterCard}>
            <View style={styles.renterInitial}>
              <Text style={styles.renterInitialText}>
                {bookingRequest.renter_name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.renterInfo}>
              <Text style={styles.renterName}>{bookingRequest.renter_name}</Text>
              <Text style={styles.renterEmail}>{bookingRequest.renter_email}</Text>
            </View>
          </View>
        </View>

        {/* Bike Info */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Bike Details</Text>
          <View style={styles.bikeInfoRow}>
            <View style={styles.bikeInfoBox}>
              <Text style={styles.bikeInfoLabel}>Bike</Text>
              <Text style={styles.bikeInfoValue}>{bookingRequest.bike_name}</Text>
              <Text style={styles.bikeInfoType}>{bookingRequest.bike_type}</Text>
            </View>
            <View style={styles.bikeInfoBox}>
              <Text style={styles.bikeInfoLabel}>Duration</Text>
              <Text style={styles.bikeInfoValue}>{bookingRequest.duration}h</Text>
              <Text style={styles.bikeInfoType}>₹{bookingRequest.price_per_hour}/hr</Text>
            </View>
            <View style={styles.bikeInfoBox}>
              <Text style={styles.bikeInfoLabel}>Deposit</Text>
              <Text style={styles.bikeInfoValue}>₹{bookingRequest.deposit}</Text>
              <Text style={styles.bikeInfoType}>Collected</Text>
            </View>
          </View>
        </View>

        {/* Fare Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Payment Summary</Text>
          <View style={styles.fareBox}>
            <View style={styles.fareRow}>
              <View>
                <Text style={styles.fareLabel}>{`Ride Fare (${bookingRequest.duration}h)`}</Text>
                <Text style={styles.fareNote}></Text>
              </View>
              <Text style={styles.fareValue}>₹{bookingRequest.estimated_fare}</Text>
            </View>
            <View style={styles.fareRow}>
              <View>
                <Text style={styles.fareLabel}>Platform Fee (10%)</Text>
              </View>
              <Text style={styles.fareValue}>₹{bookingRequest.platform_fee}</Text>
            </View>
            <View style={styles.fareRow}>
              <View>
                <Text style={styles.fareLabel}>Security Deposit</Text>
                <Text style={styles.fareNote}>Already Collected</Text>
              </View>
              <Text style={styles.fareValue}>₹{bookingRequest.deposit}</Text>
            </View>
            <View style={styles.fareDivider} />
            <View style={styles.fareTotalRow}>
              <Text style={styles.fareTotalLabel}>Total to Collect</Text>
              <Text style={styles.fareTotalValue}>₹{bookingRequest.total_payable}</Text>
            </View>
          </View>
        </View>

        {/* Booking ID */}
        <View style={styles.bookingIdBox}>
          <Text style={styles.bookingIdLabel}>Booking ID: {bookingRequest.booking_id}</Text>
          <Text style={styles.bookingIdNote}>Share this ID with the renter for identification</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.rejectBtn]}
            onPress={handleReject}
            disabled={rejecting}
            activeOpacity={0.85}
          >
            {rejecting ? (
              <ActivityIndicator color="#E8241A" />
            ) : (
              <Text style={styles.rejectBtnText}>Reject</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.approveBtn]}
            onPress={handleApprove}
            disabled={approving}
            activeOpacity={0.85}
          >
            {approving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.approveBtnText}>Approve & Confirm</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footerInfo}>
          <Text style={styles.footerIcon}>ℹ️</Text>
          <Text style={styles.footerText}>
            After approval, the renter will be notified to meet you at the scheduled location.
          </Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2000,
    elevation: 2000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '88%',
    maxWidth: 380,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE8E8',
  },
  headerIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#E8241A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIcon: {
    fontSize: 20,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#999999',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 18,
    color: '#1A1A1A',
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    gap: 10,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#999999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  renterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  renterInitial: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8241A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  renterInitialText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  renterInfo: {
    flex: 1,
    gap: 2,
  },
  renterName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  renterEmail: {
    fontSize: 12,
    color: '#999999',
  },
  bikeInfoRow: {
    flexDirection: 'row',
    gap: 10,
  },
  bikeInfoBox: {
    flex: 1,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  bikeInfoLabel: {
    fontSize: 11,
    color: '#999999',
    fontWeight: '500',
  },
  bikeInfoValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  bikeInfoType: {
    fontSize: 11,
    color: '#E8241A',
  },
  fareBox: {
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  fareLabel: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '500',
  },
  fareNote: {
    fontSize: 10,
    color: '#999999',
    marginTop: 2,
  },
  fareValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  fareDivider: {
    height: 1,
    backgroundColor: '#FFE8E8',
    marginVertical: 4,
  },
  fareTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fareTotalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  fareTotalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E8241A',
  },
  bookingIdBox: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F8F8F8',
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#E8241A',
    gap: 4,
  },
  bookingIdLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  bookingIdNote: {
    fontSize: 11,
    color: '#999999',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  rejectBtn: {
    backgroundColor: '#FFF5F5',
    borderWidth: 1.5,
    borderColor: '#E8241A',
  },
  rejectBtnText: {
    color: '#E8241A',
    fontSize: 14,
    fontWeight: '700',
  },
  approveBtn: {
    backgroundColor: '#E8241A',
  },
  approveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 8,
  },
  footerIcon: {
    fontSize: 14,
  },
  footerText: {
    flex: 1,
    fontSize: 11,
    color: '#999999',
    lineHeight: 16,
  },
});