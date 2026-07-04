import React, { useRef, useEffect, useState } from 'react';
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
  Alert,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import EarningsHistoryScreen from './EarningsHistoryScreen';
import NotificationsScreen from '../NotificationsScreen';
import HelpSupportScreen from '../HelpSupportScreen';
import AboutScreen from '../AboutScreen';

const { width } = Dimensions.get('window');

type MenuScreen = 'earnings' | 'notifications' | 'help' | 'about' | null;

type BikeDoc = {
  id: string;
  bike_id: string;
  rc_front: string;
  rc_back: string;
  insurance: string;
  bikeName: string;
};

export default function OwnerProfileScreen({
  onBack,
}: {
  onBack: () => void;
}) {
  const slideAnim = useRef(new Animated.Value(width)).current;
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userInitial, setUserInitial] = useState('O');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [totalRides, setTotalRides] = useState(0);
  const [totalBikes, setTotalBikes] = useState(0);
  const [bikeDocs, setBikeDocs] = useState<BikeDoc[]>([]);
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<MenuScreen>(null);
  const [docUrls, setDocUrls] = useState<Record<string, {
    rcFront: string | null;
    rcBack: string | null;
    insurance: string | null;
  }>>({});

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 0,
      speed: 14,
    }).start();
    fetchOwnerProfile();
  }, []);

  const fetchOwnerProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserEmail(user.email || '');

      // Fetch profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single();

      if (profile?.full_name) {
        setUserName(profile.full_name);
        setUserInitial(profile.full_name[0].toUpperCase());
      } else {
        setUserInitial((user.email || 'O')[0].toUpperCase());
      }

      if (profile?.avatar_url) {
        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(profile.avatar_url);
        setAvatarUrl(urlData.publicUrl);
      }

      // Fetch bikes
      const { data: bikes } = await supabase
        .from('bikes')
        .select('id, brand, model')
        .eq('owner_id', user.id);

      setTotalBikes(bikes?.length || 0);

      // Fetch bike documents
      if (bikes && bikes.length > 0) {
        const docsWithNames = await Promise.all(
          bikes.map(async (bike) => {
            const { data: doc } = await supabase
              .from('bike_documents')
              .select('*')
              .eq('bike_id', bike.id)
              .single();

            if (doc) {
              return {
                ...doc,
                bikeName: `${bike.brand} ${bike.model}`,
              };
            }
            return null;
          })
        );

        const validDocs = docsWithNames.filter(d => d !== null) as BikeDoc[];
        setBikeDocs(validDocs);
      }

      // Fetch earnings
      const { data: bookings } = await supabase
        .from('bookings')
        .select('total_paid')
        .eq('owner_id', user.id);

      if (bookings) {
        setTotalEarnings(bookings.reduce((sum, b) => sum + (b.total_paid || 0), 0));
        setTotalRides(bookings.length);
      }

    } catch (err) {
      console.log('Error fetching owner profile:', err);
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

  const loadDocUrls = async (doc: BikeDoc) => {
    if (docUrls[doc.id]) return;

    const getSignedUrl = async (path: string): Promise<string | null> => {
      const { data, error } = await supabase.storage
        .from('bike-documents')
        .createSignedUrl(path, 3600);
      if (error) return null;
      return data.signedUrl;
    };

    const [rcFront, rcBack, insurance] = await Promise.all([
      getSignedUrl(doc.rc_front),
      getSignedUrl(doc.rc_back),
      getSignedUrl(doc.insurance),
    ]);

    setDocUrls(prev => ({
      ...prev,
      [doc.id]: { rcFront, rcBack, insurance },
    }));
  };

  const handleExpandDoc = async (doc: BikeDoc) => {
    if (expandedDocId === doc.id) {
      setExpandedDocId(null);
      return;
    }
    setExpandedDocId(doc.id);
    await loadDocUrls(doc);
  };

  const handleLogout = async () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
          },
        },
      ]
    );
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
          <Text style={styles.headerTitle}>Owner Profile</Text>
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
      {/* ── HEADER ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Owner Profile</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* ── USER CARD ── */}
        <View style={styles.userCard}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarCircle} />
          ) : (
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{userInitial}</Text>
            </View>
          )}
          <Text style={styles.userName}>{userName || 'RILO Owner'}</Text>
          <Text style={styles.userEmail}>{userEmail}</Text>

          {/* Owner badge */}
          <View style={styles.ownerBadge}>
            <Text style={styles.ownerBadgeText}>🏍️ Verified Owner</Text>
          </View>
        </View>

        {/* ── EARNINGS STATS ── */}
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Your Performance</Text>
          <View style={styles.statsRow}>
            {[
              { label: 'Total Earned', value: `₹${totalEarnings}` },
              { label: 'Total Rides', value: `${totalRides}` },
              { label: 'Bikes Listed', value: `${totalBikes}` },
            ].map((stat, index) => (
              <View key={index} style={styles.statBox}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── BIKE DOCUMENTS ── */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>🗂️ Bike Documents</Text>
          <Text style={styles.sectionSubtitle}>
            RC and Insurance documents for your listed bikes
          </Text>

          {bikeDocs.length === 0 ? (
            <View style={styles.emptyDocs}>
              <Text style={styles.emptyDocsText}>
                No bike documents uploaded yet. Documents are uploaded during bike listing.
              </Text>
            </View>
          ) : (
            bikeDocs.map(doc => (
              <View key={doc.id} style={styles.bikeDocCard}>
                <TouchableOpacity
                  style={styles.bikeDocHeader}
                  onPress={() => handleExpandDoc(doc)}
                  activeOpacity={0.7}
                >
                  <View style={styles.bikeDocLeft}>
                    <Text style={styles.bikeDocIcon}>🛵</Text>
                    <View>
                      <Text style={styles.bikeDocName}>{doc.bikeName}</Text>
                      <Text style={styles.bikeDocSub}>RC + Insurance uploaded</Text>
                    </View>
                  </View>
                  <Text style={styles.bikeDocArrow}>
                    {expandedDocId === doc.id ? '▲' : '▼'}
                  </Text>
                </TouchableOpacity>

                {expandedDocId === doc.id && docUrls[doc.id] && (
                  <View style={styles.bikeDocImages}>
                    {[
                      { label: 'RC Front', url: docUrls[doc.id].rcFront },
                      { label: 'RC Back', url: docUrls[doc.id].rcBack },
                      { label: 'Insurance', url: docUrls[doc.id].insurance },
                    ].map((item, index) => (
                      <View key={index} style={styles.bikeDocImageWrapper}>
                        <Text style={styles.bikeDocImageLabel}>{item.label}</Text>
                        {item.url ? (
                          <Image
                            source={{ uri: item.url }}
                            style={styles.bikeDocImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.bikeDocImagePlaceholder}>
                            <ActivityIndicator color="#E8241A" size="small" />
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))
          )}
        </View>

        {/* ── MENU ITEMS ── */}
        <View style={styles.menuSection}>
          {[
            { id: '1', icon: '📊', label: 'Earnings History', sublabel: 'View detailed earnings', screen: 'earnings' as const },
            { id: '2', icon: '🔔', label: 'Notifications', sublabel: 'Manage your alerts', screen: 'notifications' as const },
            { id: '3', icon: '🤝', label: 'Help & Support', sublabel: 'We are here to help', screen: 'help' as const },
            { id: '4', icon: 'ℹ️', label: 'About RILO', sublabel: 'Version 1.0.0', screen: 'about' as const },
          ].map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.menuItem,
                index === 3 && styles.menuItemLast,
              ]}
              activeOpacity={0.7}
              onPress={() => setOpenMenu(item.screen)}
            >
              <View style={styles.menuIconBox}>
                <Text style={styles.menuIcon}>{item.icon}</Text>
              </View>
              <View style={styles.menuText}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuSublabel}>{item.sublabel}</Text>
              </View>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── LOGOUT ── */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.85}
        >
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>RILO v1.0.0 · Made with ❤️ in India</Text>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Render sub-screens */}
      {openMenu === 'earnings' && (
        <EarningsHistoryScreen onBack={() => setOpenMenu(null)} />
      )}
      {openMenu === 'notifications' && (
        <NotificationsScreen onBack={() => setOpenMenu(null)} />
      )}
      {openMenu === 'help' && (
        <HelpSupportScreen onBack={() => setOpenMenu(null)} />
      )}
      {openMenu === 'about' && (
        <AboutScreen onBack={() => setOpenMenu(null)} />
      )}
    </Animated.View>
  );
}
const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F5F5F5',
    zIndex: 1001,
    elevation: 1001,
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

  // User card
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    gap: 8,
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
    marginBottom: 6,
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
  },
  userEmail: {
    fontSize: 13,
    color: '#999999',
  },
  ownerBadge: {
    backgroundColor: '#FFF5F5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E8241A',
    marginTop: 4,
  },
  ownerBadgeText: {
    color: '#E8241A',
    fontSize: 13,
    fontWeight: '600',
  },

  // Stats
  statsCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
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
    fontSize: 18,
    fontWeight: '700',
    color: '#E8241A',
  },
  statLabel: {
    fontSize: 10,
    color: '#888888',
    textAlign: 'center',
  },

  // Section card
  sectionCard: {
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
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#999999',
    marginTop: -6,
  },

  // Empty docs
  emptyDocs: {
    padding: 16,
    alignItems: 'center',
  },
  emptyDocsText: {
    fontSize: 13,
    color: '#AAAAAA',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Bike doc card
  bikeDocCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    overflow: 'hidden',
  },
  bikeDocHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: '#F8F8F8',
  },
  bikeDocLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bikeDocIcon: {
    fontSize: 22,
  },
  bikeDocName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  bikeDocSub: {
    fontSize: 11,
    color: '#2E7D32',
    marginTop: 2,
  },
  bikeDocArrow: {
    fontSize: 10,
    color: '#E8241A',
  },
  bikeDocImages: {
    padding: 14,
    gap: 12,
    backgroundColor: '#FFFFFF',
  },
  bikeDocImageWrapper: {
    gap: 6,
  },
  bikeDocImageLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555555',
  },
  bikeDocImage: {
    width: '100%',
    height: 120,
    borderRadius: 10,
    backgroundColor: '#F0F0F0',
  },
  bikeDocImagePlaceholder: {
    width: '100%',
    height: 120,
    borderRadius: 10,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Menu
  menuSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
  menuSublabel: {
    fontSize: 12,
    color: '#AAAAAA',
  },
  menuArrow: {
    fontSize: 20,
    color: '#CCCCCC',
  },

  // Logout
  logoutBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E8241A',
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
  versionText: {
    textAlign: 'center',
    color: '#CCCCCC',
    fontSize: 12,
  },
});