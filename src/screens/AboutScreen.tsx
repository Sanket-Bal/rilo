import React, { useRef, useEffect } from 'react';
import {
  Animated,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width } = Dimensions.get('window');

export default function AboutScreen({
  onBack,
}: {
  onBack: () => void;
}) {
  const slideAnim = useRef(new Animated.Value(width)).current;

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
      toValue: width,
      duration: 300,
      useNativeDriver: true,
    }).start(() => onBack());
  };

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
        <Text style={styles.headerTitle}>About RILO</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* ── LOGO & VERSION ── */}
        <View style={styles.logoSection}>
          <Text style={styles.riloLogo}>🛵</Text>
          <Text style={styles.appName}>RILO</Text>
          <Text style={styles.tagline}>The Airbnb for Bikes</Text>
          <View style={styles.versionBadge}>
            <Text style={styles.versionText}>v1.0.0</Text>
          </View>
        </View>

        {/* ── ABOUT RILO ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>About RILO</Text>
          <Text style={styles.cardContent}>
            RILO is a peer-to-peer two-wheeler rental platform designed for Tier 2 and Tier 3 cities across India. We connect bike and scooter owners with people who need temporary wheels, making transportation affordable and convenient.
          </Text>
        </View>

        {/* ── OUR MISSION ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🎯 Our Mission</Text>
          <Text style={styles.cardContent}>
            To democratize two-wheeler access by empowering owners to earn from idle vehicles while helping renters afford reliable, short-term transportation.
          </Text>
        </View>

        {/* ── WHY RILO ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Why RILO?</Text>
          <View style={styles.featureList}>
            {[
              { icon: '⚡', text: 'Fast & seamless booking' },
              { icon: '🔒', text: 'Verified owners & renters' },
              { icon: '💰', text: 'Fair pricing & instant payouts' },
              { icon: '🌍', text: 'Local fleet, local economy' },
              { icon: '📞', text: '24/7 customer support' },
              { icon: '🛡️', text: 'Built-in insurance & safety' },
            ].map((item, idx) => (
              <View key={idx} style={styles.featureItem}>
                <Text style={styles.featureIcon}>{item.icon}</Text>
                <Text style={styles.featureText}>{item.text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── TEAM ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>👥 Behind RILO</Text>
          <Text style={styles.cardContent}>
            Built by a passionate team of engineers and product designers who believe in solving real mobility problems. We're based in India and committed to the communities we serve.
          </Text>
        </View>

        {/* ── LEGAL ── */}
        <View style={styles.legalSection}>
          <TouchableOpacity style={styles.legalItem}>
            <Text style={styles.legalLabel}>Terms & Conditions</Text>
            <Text style={styles.legalArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.legalItem}>
            <Text style={styles.legalLabel}>Privacy Policy</Text>
            <Text style={styles.legalArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.legalItem}>
            <Text style={styles.legalLabel}>Community Guidelines</Text>
            <Text style={styles.legalArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ── FOOTER ── */}
        <View style={styles.footerSection}>
          <Text style={styles.footerText}>Made with ❤️ in India</Text>
          <Text style={styles.copyText}>© 2024 RILO. All rights reserved.</Text>
        </View>

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
  scroll: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  logoSection: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 20,
  },
  riloLogo: {
    fontSize: 60,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 14,
    color: '#E8241A',
    fontStyle: 'italic',
  },
  versionBadge: {
    backgroundColor: '#E8241A',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginTop: 8,
  },
  versionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  cardContent: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 20,
  },
  featureList: {
    gap: 10,
    marginTop: 4,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureIcon: {
    fontSize: 16,
  },
  featureText: {
    fontSize: 12,
    color: '#555555',
    flex: 1,
  },
  legalSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  legalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  legalLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  legalArrow: {
    fontSize: 18,
    color: '#CCCCCC',
  },
  footerSection: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  copyText: {
    fontSize: 11,
    color: '#AAAAAA',
  },
});