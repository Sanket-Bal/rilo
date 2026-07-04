import React, { useRef, useEffect, useState } from 'react';
import {
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { supabase } from '../lib/supabase';
import DocumentUploadScreen from './DocumentUploadScreen';

const { width } = Dimensions.get('window');

type DocumentRecord = {
  licence_front: string;
  licence_back: string;
  aadhar_front: string;
  aadhar_back: string;
  is_verified: boolean;
};

export default function MyDocumentsScreen({ onBack }: { onBack: () => void }) {
  const slideAnim = useRef(new Animated.Value(width)).current;
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<DocumentRecord | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [docUrls, setDocUrls] = useState<{
    licenceFront: string | null;
    licenceBack: string | null;
    aadharFront: string | null;
    aadharBack: string | null;
  }>({
    licenceFront: null,
    licenceBack: null,
    aadharFront: null,
    aadharBack: null,
  });

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 0,
      speed: 14,
    }).start();

    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data && !error) {
        setDocuments(data);

        // Get public URLs for all documents
        // Get signed URLs for private bucket
        const getSignedUrl = async (path: string): Promise<string | null> => {
          const { data: urlData, error } = await supabase.storage
            .from('documents')
            .createSignedUrl(path, 3600); // valid for 1 hour
          if (error) return null;
          return urlData.signedUrl;
        };

        const [licenceFront, licenceBack, aadharFront, aadharBack] = 
          await Promise.all([
            getSignedUrl(data.licence_front),
            getSignedUrl(data.licence_back),
            getSignedUrl(data.aadhar_front),
            getSignedUrl(data.aadhar_back),
          ]);

        setDocUrls({
          licenceFront,
          licenceBack,
          aadharFront,
          aadharBack,
        });
      }
    } catch (err) {
      console.log('Error fetching documents:', err);
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

  const renderDocumentCard = (
    title: string,
    icon: string,
    frontUrl: string | null,
    backUrl: string | null,
  ) => (
    <View style={styles.docCard}>
      <View style={styles.docCardHeader}>
        <View style={styles.docIconBox}>
          <Text style={styles.docIcon}>{icon}</Text>
        </View>
        <View style={styles.docTitleBox}>
          <Text style={styles.docTitle}>{title}</Text>
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedText}>● Uploaded</Text>
          </View>
        </View>
      </View>

      <View style={styles.docImagesRow}>
        <View style={styles.docImageWrapper}>
          <Text style={styles.docImageLabel}>Front Side</Text>
          {frontUrl ? (
            <Image
              source={{ uri: frontUrl }}
              style={styles.docImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.docImagePlaceholder}>
              <Text style={styles.docImagePlaceholderText}>Loading...</Text>
            </View>
          )}
        </View>
        <View style={styles.docImageWrapper}>
          <Text style={styles.docImageLabel}>Back Side</Text>
          {backUrl ? (
            <Image
              source={{ uri: backUrl }}
              style={styles.docImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.docImagePlaceholder}>
              <Text style={styles.docImagePlaceholderText}>Loading...</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );

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
        <Text style={styles.headerTitle}>My Documents</Text>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator color="#E8241A" size="large" />
        </View>
      ) : documents ? (
        // Documents exist — show them
        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {/* Security note */}
          <View style={styles.securityNote}>
            <Text style={styles.securityIcon}>🔒</Text>
            <Text style={styles.securityText}>
              Your documents are encrypted and stored securely.
              RILO never shares your data with third parties.
            </Text>
          </View>

          {renderDocumentCard(
            'Driving Licence',
            '🪪',
            docUrls.licenceFront,
            docUrls.licenceBack,
          )}

          {renderDocumentCard(
            'Aadhar Card',
            '📋',
            docUrls.aadharFront,
            docUrls.aadharBack,
          )}

          {/* Update documents button */}
          <TouchableOpacity
            style={styles.updateBtn}
            onPress={() => Alert.alert(
              'Update Documents',
              'Do you want to re-upload your documents?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Yes', onPress: () => setShowUpload(true) },
              ]
            )}
            activeOpacity={0.8}
          >
            <Text style={styles.updateBtnText}>Update Documents</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </Animated.ScrollView>
      ) : (
        // No documents — show empty state with upload option
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>📄</Text>
          <Text style={styles.emptyTitle}>No documents yet</Text>
          <Text style={styles.emptySubtitle}>
            Upload your driving licence and Aadhar card to start booking rides.
          </Text>
          <TouchableOpacity
            style={styles.uploadBtn}
            onPress={() => setShowUpload(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.uploadBtnText}>Upload Documents</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Document upload screen */}
      {showUpload && (
        <DocumentUploadScreen
          onBack={() => setShowUpload(false)}
          onComplete={() => {
            setShowUpload(false);
            setLoading(true);
            fetchDocuments();
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

  // Security note
  securityNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  securityIcon: {
    fontSize: 18,
  },
  securityText: {
    flex: 1,
    fontSize: 12,
    color: '#555555',
    lineHeight: 18,
  },

  // Document card
  docCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1.5,
    borderColor: '#E8241A',
    gap: 14,
  },
  docCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  docIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFF5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docIcon: {
    fontSize: 22,
  },
  docTitleBox: {
    flex: 1,
    gap: 4,
  },
  docTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  verifiedBadge: {
    alignSelf: 'flex-start',
  },
  verifiedText: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '600',
  },

  // Document images
  docImagesRow: {
    flexDirection: 'row',
    gap: 12,
  },
  docImageWrapper: {
    flex: 1,
    gap: 6,
  },
  docImageLabel: {
    fontSize: 11,
    color: '#999999',
    fontWeight: '500',
  },
  docImage: {
    width: '100%',
    height: 100,
    borderRadius: 10,
    backgroundColor: '#F0F0F0',
  },
  docImagePlaceholder: {
    width: '100%',
    height: 100,
    borderRadius: 10,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docImagePlaceholderText: {
    fontSize: 12,
    color: '#AAAAAA',
  },

  // Update button
  updateBtn: {
    borderWidth: 1.5,
    borderColor: '#E8241A',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  updateBtnText: {
    color: '#E8241A',
    fontSize: 15,
    fontWeight: '600',
  },

  // Center container
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  uploadBtn: {
    backgroundColor: '#E8241A',
    borderRadius: 14,
    paddingHorizontal: 32,
    paddingVertical: 14,
    alignItems: 'center',
  },
  uploadBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});