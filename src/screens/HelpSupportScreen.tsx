import React, { useRef, useEffect, useState } from 'react';
import {
  Animated,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Linking } from 'react-native';

const { width } = Dimensions.get('window');

type FAQ = {
  id: string;
  q: string;
  a: string;
};

export default function HelpSupportScreen({
  onBack,
}: {
  onBack: () => void;
}) {
  const slideAnim = useRef(new Animated.Value(width)).current;
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  const faqs: FAQ[] = [
    {
      id: '1',
      q: 'How do I list my bike on RILO?',
      a: 'Go to Home > Profile > List Bike. Follow the 5-step wizard to upload bike details, photos, and documents. Your bike will be live within 24 hours after verification.',
    },
    {
      id: '2',
      q: 'How do I approve or reject a booking request?',
      a: 'When a renter books your bike, you\'ll see a notification. Open the modal and tap Approve or Reject. You have 5 minutes to decide before it expires.',
    },
    {
      id: '3',
      q: 'What happens if a renter cancels?',
      a: 'If a renter cancels before approval, the request is automatically cancelled. You\'ll see the cancellation alert. No payment is processed.',
    },
    {
      id: '4',
      q: 'How do I get paid?',
      a: 'After a ride is completed and rated, earnings go to your RILO wallet. Withdraw via UPI or bank transfer in the Earnings section.',
    },
    {
      id: '5',
      q: 'What documents do I need to list a bike?',
      a: 'You need: RC front & back, and Insurance document. Upload them during bike listing. Renters need Driving License & Aadhaar for KYC.',
    },
    {
      id: '6',
      q: 'Can I pause my bike listing?',
      a: 'Yes! Go to Owner Home, tap your bike card, and toggle Pause. Your bike won\'t appear in searches but you can reactivate anytime.',
    },
    {
      id: '7',
      q: 'What is the security deposit?',
      a: 'A security deposit (₹500–₹2000) is held during the ride. After completion, it\'s refunded minus any damage charges.',
    },
    {
      id: '8',
      q: 'How is the rental price calculated?',
      a: 'Rental price = (hourly rate × hours rented) + 10% platform fee. Displayed to renters before booking.',
    },
  ];

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
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.contactCard}>
          <Text style={styles.contactTitle}>Quick Contact</Text>
          <Text style={styles.contactEmail}>📧 support@rilo.app</Text>
          <Text style={styles.contactPhone}>📱 1800-RILO-HELP</Text>
          <TouchableOpacity style={styles.contactBtn}>
            <Text style={styles.contactBtnText}>Message Us →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.faqSection}>
          <Text style={styles.faqTitle}>Frequently Asked Questions</Text>
          {faqs.map((faq) => (
            <TouchableOpacity
              key={faq.id}
              style={styles.faqItem}
              onPress={() =>
                setExpandedId(expandedId === faq.id ? null : faq.id)
              }
              activeOpacity={0.7}
            >
              <View style={styles.faqHeader}>
                <Text style={styles.faqQuestion}>{faq.q}</Text>
                <Text style={styles.faqToggle}>
                  {expandedId === faq.id ? '▲' : '▼'}
                </Text>
              </View>
              {expandedId === faq.id && (
                <Text style={styles.faqAnswer}>{faq.a}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.resourcesCard}>
          <Text style={styles.resourcesTitle}>📚 Resources</Text>
          <View style={styles.resourcesList}>
            <TouchableOpacity style={styles.resourceItem}>
              <Text style={styles.resourceIcon}>📖</Text>
              <View>
                <Text style={styles.resourceLabel}>Community Guidelines</Text>
                <Text style={styles.resourceDesc}>User conduct & safety rules</Text>
              </View>
              <Text style={styles.resourceArrow}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.resourceItem}>
              <Text style={styles.resourceIcon}>🔒</Text>
              <View>
                <Text style={styles.resourceLabel}>Privacy Policy</Text>
                <Text style={styles.resourceDesc}>How we protect your data</Text>
              </View>
              <Text style={styles.resourceArrow}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.resourceItem}>
              <Text style={styles.resourceIcon}>⚖️</Text>
              <View>
                <Text style={styles.resourceLabel}>Terms & Conditions</Text>
                <Text style={styles.resourceDesc}>Legal agreements</Text>
              </View>
              <Text style={styles.resourceArrow}>›</Text>
            </TouchableOpacity>
          </View>
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
  contactCard: {
    backgroundColor: '#FFF5F5',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FFE0DC',
    gap: 10,
  },
  contactTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  contactEmail: {
    fontSize: 13,
    color: '#555555',
  },
  contactPhone: {
    fontSize: 13,
    color: '#555555',
  },
  contactBtn: {
    backgroundColor: '#E8241A',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  contactBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  faqSection: {
    gap: 10,
  },
  faqTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    paddingHorizontal: 4,
  },
  faqItem: {
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
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  faqQuestion: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1,
    lineHeight: 18,
  },
  faqToggle: {
    fontSize: 10,
    color: '#E8241A',
  },
  faqAnswer: {
    fontSize: 12,
    color: '#666666',
    lineHeight: 20,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },
  resourcesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  resourcesTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  resourcesList: {
    gap: 0,
  },
  resourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    gap: 12,
  },
  resourceIcon: {
    fontSize: 18,
  },
  resourceLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  resourceDesc: {
    fontSize: 11,
    color: '#AAAAAA',
    marginTop: 2,
  },
  resourceArrow: {
    fontSize: 18,
    color: '#CCCCCC',
    marginLeft: 'auto',
  },
});