import React, { useRef, useEffect, useState } from 'react';  //BookingScreen
import ConfirmationScreen from './ConfirmationScreen';
import {
  Animated,
  Alert,
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Slider from '@react-native-community/slider';
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
  owner_id?: string;
};

const generateBookingId = () => {
  return 'RILO' + Math.random().toString(36).substring(2, 8).toUpperCase();
};

export default function BookingScreen({
  bike,
  onBack,
  onConfirm,
  userLocation,
}: {
  bike: BikeType;
  onBack: () => void;
  onConfirm: (rideData?: any) => void;  // Make parameter optional
  userLocation: { latitude: number; longitude: number };
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [duration, setDuration] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card'>('upi');
  const [processing, setProcessing] = useState(false);
  const [bookingRequestId, setBookingRequestId] = useState<string | null>(null);

  const rideFare = Math.round(bike.price * duration);
  const platformFee = Math.round(rideFare * 0.1);
  const totalDeposit = bike.deposit;
  const totalPayable = totalDeposit + platformFee;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 2,
        speed: 12,
      }),
    ]).start();
  }, []);

  const handleBack = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 50,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => onBack());
  };

  const handlePayment = async () => {
    setProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'Please log in again.');
        setProcessing(false);
        return;
      }

      // If owner_id is missing, we still allow booking but owner_id will be null
      // This handles the case where you are testing as both owner and renter
      const bookingId = generateBookingId();
      const bikeLocation = {
        latitude: (userLocation.latitude || 0) + 0.003,
        longitude: (userLocation.longitude || 0) + 0.004,
      };

      console.log('Creating booking request with:', {
        bike_id: bike.id,
        owner_id: bike.owner_id,
        renter_id: user.id,
        bike_name: bike.name,
      });

      const { data: newRequest, error } = await supabase
        .from('booking_requests')
        .insert({
          bike_id: bike.id,
          owner_id: bike.owner_id || user.id, // fallback to self for testing
          renter_id: user.id,
          duration,
          price_per_hour: bike.price,
          deposit: bike.deposit,
          platform_fee: platformFee,
          estimated_fare: rideFare,
          total_payable: totalPayable,
          booking_id: bookingId,
          renter_location: userLocation,
          bike_location: bikeLocation,
          status: 'pending',
          payment_method: paymentMethod,
          renter_name: user.email?.split('@')[0] || 'User',
          renter_email: user.email || '',
          bike_name: bike.name,
          bike_type: bike.type,
        })
        .select()
        .single();

      if (error) {
        console.log('Supabase insert error:', JSON.stringify(error));
        Alert.alert('Error', `Booking failed: ${error.message}`);
        setProcessing(false);
        return;
      }

      if (!newRequest) {
        Alert.alert('Error', 'No data returned from booking request.');
        setProcessing(false);
        return;
      }

      setBookingRequestId(newRequest.id);
      setProcessing(false);
      setShowConfirmation(true);

    } catch (err) {
      console.log('Unexpected error:', err);
      Alert.alert('Error', 'Something went wrong. Please try again.');
      setProcessing(false);
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
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
        <Text style={styles.headerTitle}>Confirm Booking</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* ── BIKE SUMMARY ── */}
        <View style={styles.bikeSummaryCard}>
          <Image
            source={bike.image}
            style={styles.bikeImage}
            resizeMode="cover"
          />
          <View style={styles.bikeSummaryInfo}>
            <Text style={styles.bikeSummaryName}>{bike.name}</Text>
            <Text style={styles.bikeSummaryType}>
              {bike.type} · {bike.distance} away
            </Text>
            <View style={styles.ownerRow}>
              <View style={styles.ownerAvatar}>
                <Text style={styles.ownerAvatarText}>
                  {bike.owner.charAt(0)}
                </Text>
              </View>
              <Text style={styles.ownerName}>{bike.owner}</Text>
            </View>
          </View>
        </View>

        {/* ── DURATION SELECTOR ── */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Ride Duration</Text>
          <View style={styles.durationDisplay}>
            <Text style={styles.durationValue}>{duration}</Text>
            <Text style={styles.durationUnit}>
              {duration === 1 ? 'hour' : 'hours'}
            </Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={12}
            step={1}
            value={duration}
            onValueChange={setDuration}
            minimumTrackTintColor="#E8241A"
            maximumTrackTintColor="#E0E0E0"
            thumbTintColor="#E8241A"
          />
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabel}>1 hr</Text>
            <Text style={styles.sliderLabel}>6 hrs</Text>
            <Text style={styles.sliderLabel}>12 hrs</Text>
          </View>
          <View style={styles.fareEstimate}>
            <Text style={styles.fareEstimateLabel}>
              Estimated ride fare
            </Text>
            <Text style={styles.fareEstimateValue}>
              ₹{rideFare}
            </Text>
          </View>
          <Text style={styles.fareNote}>
            * Final fare calculated after ride ends. Extra hours charged at ₹{bike.price}/hr.
          </Text>
        </View>

        {/* ── PAYMENT METHOD ── */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <Text style={styles.sectionSubtitle}>
            Security deposit is collected now. Ride fare is deducted after the ride.
          </Text>

          <TouchableOpacity
            style={[
              styles.paymentOption,
              paymentMethod === 'upi' && styles.paymentOptionActive,
            ]}
            onPress={() => setPaymentMethod('upi')}
            activeOpacity={0.8}
          >
            <View style={styles.paymentOptionLeft}>
              <Text style={styles.paymentIcon}>📱</Text>
              <View>
                <Text style={styles.paymentLabel}>UPI</Text>
                <Text style={styles.paymentSublabel}>
                  GPay, PhonePe, Paytm
                </Text>
              </View>
            </View>
            <View style={[
              styles.radioOuter,
              paymentMethod === 'upi' && styles.radioOuterActive,
            ]}>
              {paymentMethod === 'upi' && (
                <View style={styles.radioInner} />
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.paymentOption,
              paymentMethod === 'card' && styles.paymentOptionActive,
            ]}
            onPress={() => setPaymentMethod('card')}
            activeOpacity={0.8}
          >
            <View style={styles.paymentOptionLeft}>
              <Text style={styles.paymentIcon}>💳</Text>
              <View>
                <Text style={styles.paymentLabel}>Debit / Credit Card</Text>
                <Text style={styles.paymentSublabel}>
                  Visa, Mastercard, Rupay
                </Text>
              </View>
            </View>
            <View style={[
              styles.radioOuter,
              paymentMethod === 'card' && styles.radioOuterActive,
            ]}>
              {paymentMethod === 'card' && (
                <View style={styles.radioInner} />
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* ── PRICE BREAKDOWN ── */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Price Breakdown</Text>

          {[
            { label: 'Security Deposit', value: `₹${totalDeposit}`, note: 'Refunded after ride' },
            { label: 'Platform Fee (10%)', value: `₹${platformFee}`, note: 'Non-refundable' },
            { label: `Est. Ride Fare (${duration}hr)`, value: `₹${rideFare}`, note: 'Deducted from deposit' },
          ].map((item, index) => (
            <View key={index} style={styles.priceRow}>
              <View>
                <Text style={styles.priceRowLabel}>{item.label}</Text>
                <Text style={styles.priceRowNote}>{item.note}</Text>
              </View>
              <Text style={styles.priceRowValue}>{item.value}</Text>
            </View>
          ))}

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Pay Now</Text>
            <Text style={styles.totalValue}>₹{totalPayable}</Text>
          </View>
          <Text style={styles.totalNote}>
            Deposit + Platform fee. Ride fare settled after return.
          </Text>
        </View>

        {/* ── OWNER APPROVAL NOTE ── */}
        <View style={styles.approvalNote}>
          <Text style={styles.approvalNoteIcon}>👤</Text>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.approvalNoteTitle}>Owner Confirmation Required</Text>
            <Text style={styles.approvalNoteDesc}>
              After payment, {bike.owner} will receive your request and has 5 minutes to approve it.
            </Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── PAY BUTTON ── */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[
            styles.payBtn,
            processing && styles.payBtnProcessing,
          ]}
          onPress={handlePayment}
          activeOpacity={0.85}
          disabled={processing}
        >
          {processing ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={styles.payBtnText}>Sending Request...</Text>
            </View>
          ) : (
            <>
              <Text style={styles.payBtnText}>
                Pay ₹{totalPayable} & Request Bike
              </Text>
              <Text style={styles.payBtnSub}>
                via {paymentMethod === 'upi' ? 'UPI' : 'Card'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {showConfirmation && bookingRequestId && (
        <ConfirmationScreen
          bike={bike}
          duration={duration}
          userLocation={userLocation}
          bookingRequestId={bookingRequestId}
          onGoHome={(rideData) => {
            setShowConfirmation(false);
            onConfirm(rideData);
          }}
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

  // Scroll
  scroll: {
    padding: 16,
    gap: 16,
  },

  // Bike summary
  bikeSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  bikeImage: {
    width: 110,
    height: 110,
  },
  bikeSummaryInfo: {
    flex: 1,
    padding: 14,
    justifyContent: 'center',
    gap: 4,
  },
  bikeSummaryName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  bikeSummaryType: {
    fontSize: 12,
    color: '#999999',
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  ownerAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E8241A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownerAvatarText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  ownerName: {
    fontSize: 13,
    color: '#555555',
    fontWeight: '500',
  },

  // Section card
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#999999',
    marginBottom: 14,
    lineHeight: 18,
  },

  // Duration
  durationDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 8,
    marginTop: 8,
  },
  durationValue: {
    fontSize: 48,
    fontWeight: '700',
    color: '#E8241A',
  },
  durationUnit: {
    fontSize: 18,
    color: '#999999',
    fontWeight: '500',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -8,
    marginBottom: 16,
  },
  sliderLabel: {
    fontSize: 11,
    color: '#AAAAAA',
  },
  fareEstimate: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  fareEstimateLabel: {
    fontSize: 13,
    color: '#555555',
    fontWeight: '500',
  },
  fareEstimateValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#E8241A',
  },
  fareNote: {
    fontSize: 11,
    color: '#AAAAAA',
    lineHeight: 16,
  },

  // Payment options
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#EEEEEE',
    marginBottom: 10,
  },
  paymentOptionActive: {
    borderColor: '#E8241A',
    backgroundColor: '#FFF5F5',
  },
  paymentOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paymentIcon: {
    fontSize: 24,
  },
  paymentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  paymentSublabel: {
    fontSize: 11,
    color: '#AAAAAA',
    marginTop: 2,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CCCCCC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: {
    borderColor: '#E8241A',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E8241A',
  },

  // Price breakdown
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  priceRowLabel: {
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  priceRowNote: {
    fontSize: 11,
    color: '#AAAAAA',
    marginTop: 2,
  },
  priceRowValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#E8241A',
  },
  totalNote: {
    fontSize: 11,
    color: '#AAAAAA',
    lineHeight: 16,
  },

  // Approval note
  approvalNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#1565C0',
  },
  approvalNoteIcon: {
    fontSize: 20,
  },
  approvalNoteTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1565C0',
  },
  approvalNoteDesc: {
    fontSize: 12,
    color: '#1565C0',
    lineHeight: 18,
    opacity: 0.85,
  },

  // Bottom bar
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
  payBtn: {
    backgroundColor: '#E8241A',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  payBtnProcessing: {
    backgroundColor: '#AAAAAA',
  },
  payBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  payBtnSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 3,
  },
});