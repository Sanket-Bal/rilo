import React, { useRef, useEffect, useState } from 'react';
import {
  Animated,
  Dimensions,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

type NotificationPrefs = {
  bookingRequests: boolean;
  rideReminders: boolean;
  earningsAlerts: boolean;
  reviews: boolean;
  promos: boolean;
};

export default function NotificationsScreen({
  onBack,
}: {
  onBack: () => void;
}) {
  const slideAnim = useRef(new Animated.Value(width)).current;
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    bookingRequests: true,
    rideReminders: true,
    earningsAlerts: true,
    reviews: true,
    promos: false,
  });

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 0,
      speed: 14,
    }).start();
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const saved = await AsyncStorage.getItem('notificationPrefs');
      if (saved) {
        setPrefs(JSON.parse(saved));
      }
    } catch (err) {
      console.log('Error loading notification prefs:', err);
    }
  };

  const savePreferences = async (updated: NotificationPrefs) => {
    try {
      await AsyncStorage.setItem('notificationPrefs', JSON.stringify(updated));
    } catch (err) {
      console.log('Error saving notification prefs:', err);
    }
  };

  const handleToggle = (key: keyof NotificationPrefs) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    savePreferences(updated);
  };

  const handleBack = () => {
    Animated.timing(slideAnim, {
      toValue: width,
      duration: 300,
      useNativeDriver: true,
    }).start(() => onBack());
  };

  const notificationOptions = [
    {
      key: 'bookingRequests' as const,
      icon: '📋',
      title: 'Booking Requests',
      subtitle: 'When someone requests your bike',
    },
    {
      key: 'rideReminders' as const,
      icon: '⏰',
      title: 'Ride Reminders',
      subtitle: 'Upcoming rides and appointments',
    },
    {
      key: 'earningsAlerts' as const,
      icon: '💰',
      title: 'Earnings Alerts',
      subtitle: 'Daily earnings summary',
    },
    {
      key: 'reviews' as const,
      icon: '⭐',
      title: 'Reviews & Ratings',
      subtitle: 'When you get new reviews',
    },
    {
      key: 'promos' as const,
      icon: '🎉',
      title: 'Promotions',
      subtitle: 'Special offers and discounts',
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
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            Manage when and how you receive notifications from RILO
          </Text>
        </View>

        <View style={styles.notifSection}>
          {notificationOptions.map((option, index) => (
            <View
              key={option.key}
              style={[
                styles.notifItem,
                index === notificationOptions.length - 1 && styles.notifItemLast,
              ]}
            >
              <View style={styles.notifLeft}>
                <Text style={styles.notifIcon}>{option.icon}</Text>
                <View>
                  <Text style={styles.notifTitle}>{option.title}</Text>
                  <Text style={styles.notifSubtitle}>{option.subtitle}</Text>
                </View>
              </View>
              <Switch
                value={prefs[option.key]}
                onValueChange={() => handleToggle(option.key)}
                trackColor={{ false: '#E0E0E0', true: '#FFB3B0' }}
                thumbColor={prefs[option.key] ? '#E8241A' : '#F0F0F0'}
              />
            </View>
          ))}
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quiet Hours</Text>
          <Text style={styles.sectionSubtitle}>
            (Coming soon) Customize times when you don't want to receive notifications
          </Text>
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
  infoCard: {
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FFE0DC',
  },
  infoText: {
    fontSize: 13,
    color: '#E8241A',
    lineHeight: 20,
  },
  notifSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  notifItemLast: {
    borderBottomWidth: 0,
  },
  notifLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notifIcon: {
    fontSize: 20,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  notifSubtitle: {
    fontSize: 12,
    color: '#AAAAAA',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#AAAAAA',
    lineHeight: 20,
  },
});