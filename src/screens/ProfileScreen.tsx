import React, { useRef, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import MyDocumentsScreen from './MyDocumentsScreen';
import EditProfileScreen from './EditProfileScreen';
import MyRidesScreen from './MyRidesScreen';
import HelpSupportScreen from './HelpSupportScreen';
import AboutScreen from './AboutScreen';
import NotificationsScreen from './NotificationsScreen';

import {
  ActivityIndicator,
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

const ALL_MENU_ITEMS = [
  { id: '1', icon: '🛵', label: 'My Rides', sublabel: 'View your ride history' },
  { id: '2', icon: '📄', label: 'My Documents', sublabel: 'Manage your KYC documents' },
  { id: '3', icon: '➕', label: 'List Your Bike / Scooter', sublabel: 'Earn by renting your vehicle', highlight: true, ownerOnly: false },
  { id: '4', icon: '🔔', label: 'Notifications', sublabel: 'Manage your alerts' },
  { id: '5', icon: '🤝', label: 'Help & Support', sublabel: 'We are here to help' },
  { id: '6', icon: 'ℹ️', label: 'About RILO', sublabel: 'Version 1.0.0' },
];

export default function ProfileScreen({ onBack }: { onBack: () => void }) {
  const slideAnim = useRef(new Animated.Value(width)).current;
  const [showDocs, setShowDocs] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userInitial, setUserInitial] = useState('R');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showMyRides, setShowMyRides] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isAlreadyOwner, setIsAlreadyOwner] = useState(false);
  
  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserEmail(user.email || '');
      setUserInitial((user.email || 'R')[0].toUpperCase());

      const { data } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single();

      if (data?.full_name) {
        setUserEmail(data.full_name);
        setUserInitial(data.full_name[0].toUpperCase());
      }

      if (data?.avatar_url) {
        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(data.avatar_url);
        setAvatarUrl(urlData.publicUrl);
      }

      // Check if user is already an owner
      const { data: bikeData } = await supabase
        .from('bikes')
        .select('id')
        .eq('owner_id', user.id)
        .limit(1);

      setIsAlreadyOwner(bikeData !== null && bikeData.length > 0);
    }

    setProfileLoaded(true);
  };

  useEffect(() => {
    fetchProfile();
  }, []);

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
      style={[
        styles.container,
        { transform: [{ translateX: slideAnim }] },
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
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* ── USER CARD ── */}
        <View style={styles.userCard}>
          {!profileLoaded ? (
            <ActivityIndicator
              color="#E8241A"
              size="large"
              style={{ marginVertical: 30 }}
            />
          ) : (
            <>
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={styles.avatarCircle}
                />
              ) : (
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>{userInitial}</Text>
                </View>
              )}
              <Text style={styles.userName}>{userEmail || 'RILO User'}</Text>
              <Text style={styles.userContact}>Tap Edit to update profile</Text>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => setShowEditProfile(true)}
              >
                <Text style={styles.editBtnText}>Edit Profile</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* ── MENU ── */}
        <View style={styles.menuSection}>
          {ALL_MENU_ITEMS
            .filter(item => !(item.id === '3' && isAlreadyOwner))
            .map((item, index, arr) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.menuItem,
                item.highlight && styles.menuItemHighlight,
                index === arr.length - 1 && styles.menuItemLast,
              ]}
              activeOpacity={0.7}
              onPress={() => {
                if (item.id === '1') setShowMyRides(true);
                if (item.id === '2') setShowDocs(true);
                if (item.id === '4') setShowNotifications(true);
                if (item.id === '5') setShowHelp(true);
                if (item.id === '6') setShowAbout(true);
              }}
            >
              {/* Icon */}
              <View style={[
                styles.menuIconBox,
                item.highlight && styles.menuIconBoxHighlight,
              ]}>
                <Text style={styles.menuIcon}>{item.icon}</Text>
              </View>

              {/* Text */}
              <View style={styles.menuText}>
                <Text style={[
                  styles.menuLabel,
                  item.highlight && styles.menuLabelHighlight,
                ]}>
                  {item.label}
                </Text>
                <Text style={styles.menuSublabel}>{item.sublabel}</Text>
              </View>

              {/* Arrow */}
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── LOGOUT ── */}
        <TouchableOpacity 
          style={styles.logoutBtn} 
          activeOpacity={0.85}
          onPress={async () => {
            await supabase.auth.signOut();
          }}
        >
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>RILO v1.0.0 · Made with ❤️ in India</Text>

      </ScrollView>

      {showDocs && (
        <MyDocumentsScreen
          onBack={() => setShowDocs(false)}
        />
      )}

      {showEditProfile && (
        <EditProfileScreen
          onBack={() => setShowEditProfile(false)}
          onSaved={() => {
            setShowEditProfile(false);
            fetchProfile();
          }}
        />
      )}

      {showMyRides && (
        <MyRidesScreen onBack={() => setShowMyRides(false)} />
      )}

      {showHelp && (
        <HelpSupportScreen onBack={() => setShowHelp(false)} />
      )}

      {showAbout && (
        <AboutScreen onBack={() => setShowAbout(false)} />
      )}

      {showNotifications && (
        <NotificationsScreen onBack={() => setShowNotifications(false)} />
      )}

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
    paddingBottom: 40,
  },

  // User Card
  userCard: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8241A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#E8241A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  userContact: {
    fontSize: 14,
    color: '#999999',
    marginBottom: 16,
  },
  editBtn: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E8241A',
  },
  editBtnText: {
    color: '#E8241A',
    fontSize: 13,
    fontWeight: '600',
  },

  // Menu
  menuSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    gap: 14,
  },
  menuItemHighlight: {
    backgroundColor: '#FFF5F5',
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIconBoxHighlight: {
    backgroundColor: '#FFE8E8',
  },
  menuIcon: {
    fontSize: 18,
  },
  menuText: {
    flex: 1,
    gap: 2,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  menuLabelHighlight: {
    color: '#E8241A',
  },
  menuSublabel: {
    fontSize: 12,
    color: '#AAAAAA',
  },
  menuArrow: {
    fontSize: 20,
    color: '#CCCCCC',
    fontWeight: '300',
  },

  // Logout
  logoutBtn: {
    marginHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E8241A',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  logoutText: {
    color: '#E8241A',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Version
  versionText: {
    textAlign: 'center',
    color: '#CCCCCC',
    fontSize: 12,
  },
});