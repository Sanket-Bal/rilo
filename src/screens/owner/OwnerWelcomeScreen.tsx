import React, { useRef, useEffect } from 'react';
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

const { width, height } = Dimensions.get('window');

const BENEFITS = [
  {
    id: '1',
    icon: '💰',
    title: 'Earn Passively',
    description: 'Your idle bike earns money while you sleep. Set your price and availability.',
  },
  {
    id: '2',
    icon: '🛡️',
    title: 'Fully Protected',
    description: 'Every renter is KYC verified. Security deposit protects your vehicle at all times.',
  },
  {
    id: '3',
    icon: '📍',
    title: 'You Stay in Control',
    description: 'Accept or reject bookings. Chat with renters before handing over the keys.',
  },
  {
    id: '4',
    icon: '📊',
    title: 'Track Everything',
    description: 'Monitor your earnings, active rentals and renter history all in one place.',
  },
  {
    id: '5',
    icon: '🔒',
    title: 'GPS Security',
    description: 'Tag a GPS tracker to your bike and get lower platform fees plus real time tracking.',
  },
];

export default function OwnerWelcomeScreen({
  onGetStarted,
  onBack,
}: {
  onGetStarted: () => void;
  onBack: () => void;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

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
        bounciness: 2,
        speed: 12,
      }),
    ]).start();
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
        <TouchableOpacity
          style={styles.backBtn}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Owner Mode</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* ── HERO SECTION ── */}
        <View style={styles.heroSection}>
          <Image
            source={require('../../../assets/RILO_logo.png')}
            style={styles.heroLogo}
            resizeMode="contain"
          />
          <Text style={styles.heroTitle}>
            Turn Your Idle Bike{'\n'}Into Income
          </Text>
          <Text style={styles.heroSubtitle}>
            Join thousands of bike owners across India who are earning
            passively with RILO. Your bike works even when you don't.
          </Text>

          {/* Stats row */}
          <View style={styles.statsRow}>
            {[
              { value: '₹8,000+', label: 'Avg monthly earnings' },
              { value: '2 min', label: 'To list your bike' },
              { value: '100%', label: 'Secure & verified' },
            ].map((stat, index) => (
              <View key={index} style={styles.statBox}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── HOW IT WORKS ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How it works</Text>
          <View style={styles.stepsRow}>
            {[
              { step: '1', text: 'List your bike with photos and price' },
              { step: '2', text: 'Renter books and pays deposit' },
              { step: '3', text: 'Hand over keys after verification' },
              { step: '4', text: 'Get paid every week to your UPI' },
            ].map((item, index) => (
              <View key={index} style={styles.stepRow}>
                <View style={styles.stepCircle}>
                  <Text style={styles.stepNumber}>{item.step}</Text>
                </View>
                {index < 3 && <View style={styles.stepLine} />}
                <Text style={styles.stepText}>{item.text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── BENEFITS ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Why list on RILO?</Text>
          {BENEFITS.map(benefit => (
            <View key={benefit.id} style={styles.benefitCard}>
              <Text style={styles.benefitIcon}>{benefit.icon}</Text>
              <View style={styles.benefitText}>
                <Text style={styles.benefitTitle}>{benefit.title}</Text>
                <Text style={styles.benefitDescription}>
                  {benefit.description}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── REQUIREMENTS ── */}
        <View style={styles.requirementsBox}>
          <Text style={styles.requirementsTitle}>
            📋 What you'll need to get started
          </Text>
          {[
            'Valid Driving Licence',
            'Aadhaar Card',
            'Vehicle RC (Registration Certificate)',
            'Vehicle Insurance document',
            'At least 3 clear photos of your bike',
            'Complete profile with photo',
          ].map((req, index) => (
            <View key={index} style={styles.requirementRow}>
              <Text style={styles.requirementDot}>✓</Text>
              <Text style={styles.requirementText}>{req}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── GET STARTED BUTTON ── */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.getStartedBtn}
          onPress={onGetStarted}
          activeOpacity={0.85}
        >
          <Text style={styles.getStartedBtnText}>
            Get Started as Owner
          </Text>
          <Text style={styles.getStartedBtnSub}>
            Free to list · Earn from day one
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F5F5F5',
    zIndex: 999,
    elevation: 999,
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

  // Hero
  heroSection: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  heroLogo: {
    width: 60,
    height: 60,
    borderRadius: 14,
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 34,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    width: '100%',
  },
  statBox: {
    flex: 1,
    backgroundColor: '#252525',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E8241A',
  },
  statLabel: {
    fontSize: 10,
    color: '#888888',
    textAlign: 'center',
  },

  // Section
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },

  // Steps
  stepsRow: {
    gap: 16,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E8241A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  stepLine: {
    display: 'none',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: '#444444',
    lineHeight: 20,
  },

  // Benefits
  benefitCard: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 14,
  },
  benefitIcon: {
    fontSize: 24,
  },
  benefitText: {
    flex: 1,
    gap: 4,
  },
  benefitTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  benefitDescription: {
    fontSize: 13,
    color: '#777777',
    lineHeight: 20,
  },

  // Requirements
  requirementsBox: {
    backgroundColor: '#FFF5F5',
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#E8241A',
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  requirementDot: {
    fontSize: 14,
    color: '#E8241A',
    fontWeight: '700',
  },
  requirementText: {
    fontSize: 13,
    color: '#555555',
    flex: 1,
    lineHeight: 20,
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
  getStartedBtn: {
    backgroundColor: '#E8241A',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  getStartedBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  getStartedBtnSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 3,
  },
});