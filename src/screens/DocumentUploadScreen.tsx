import React, { useRef, useEffect, useState } from 'react';
import BookingScreen from './BookingScreen';
import {
  Animated,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';

const { width, height } = Dimensions.get('window');

type DocumentState = {
  front: string | null;
  back: string | null;
};

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
};

export default function DocumentUploadScreen({
  onBack,
  onComplete,
  bike,
  userLocation,
}: {
  onBack: () => void;
  onComplete: () => void;
  bike?: BikeType;
  userLocation?: { latitude: number; longitude: number };
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  const [showBooking, setShowBooking] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [licence, setLicence] = useState<DocumentState>({
    front: null,
    back: null,
  });
  const [aadhar, setAadhar] = useState<DocumentState>({
    front: null,
    back: null,
  });

  const licenceComplete = licence.front !== null && licence.back !== null;
  const aadharComplete = aadhar.front !== null && aadhar.back !== null;
  const allComplete = licenceComplete && aadharComplete;

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
        toValue: 40,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => onBack());
  };

  const pickImage = async (
    docType: 'licence' | 'aadhar',
    side: 'front' | 'back'
  ) => {
    Alert.alert(
      'Upload Document',
      'Choose how to upload your document',
      [
        {
          text: 'Take Photo',
          onPress: async () => {
            const permission = await ImagePicker.requestCameraPermissionsAsync();
            if (!permission.granted) {
              Alert.alert('Permission needed', 'Camera permission is required');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              quality: 0.8,
            });
            if (!result.canceled) {
              updateDoc(docType, side, result.assets[0].uri);
            }
          },
        },
        {
          text: 'Choose from Gallery',
          onPress: async () => {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
              Alert.alert('Permission needed', 'Gallery permission is required');
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              allowsEditing: true,
              quality: 0.8,
            });
            if (!result.canceled) {
              updateDoc(docType, side, result.assets[0].uri);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const updateDoc = (
    docType: 'licence' | 'aadhar',
    side: 'front' | 'back',
    uri: string
  ) => {
    if (docType === 'licence') {
      setLicence(prev => ({ ...prev, [side]: uri }));
    } else {
      setAadhar(prev => ({ ...prev, [side]: uri }));
    }
  };

  // Upload a single image to Supabase Storage
  const uploadImage = async (
    uri: string,
    userId: string,
    fileName: string
  ): Promise<string | null> => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();

      const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
      });

      const filePath = `${userId}/${fileName}.jpg`;

      const { error } = await supabase.storage
        .from('documents')
        .upload(filePath, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (error) {
        console.log('Upload error:', error.message);
        return null;
      }

      return filePath;
    } catch (err) {
      console.log('Error uploading image:', err);
      return null;
    }
  };

  const handleContinue = async () => {
    if (!allComplete) return;

    setUploading(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'Please log in again');
        setUploading(false);
        return;
      }

      // Upload all 4 images
      const [licenceFrontPath, licenceBackPath, aadharFrontPath, aadharBackPath] =
        await Promise.all([
          uploadImage(licence.front!, user.id, 'licence_front'),
          uploadImage(licence.back!, user.id, 'licence_back'),
          uploadImage(aadhar.front!, user.id, 'aadhar_front'),
          uploadImage(aadhar.back!, user.id, 'aadhar_back'),
        ]);

      if (!licenceFrontPath || !licenceBackPath || !aadharFrontPath || !aadharBackPath) {
        Alert.alert('Upload failed', 'Please try again');
        setUploading(false);
        return;
      }

      // Save document record to database
      const { error: dbError } = await supabase
  .from('documents')
  .upsert({
    user_id: user.id,
    licence_front: licenceFrontPath,
    licence_back: licenceBackPath,
    aadhar_front: aadharFrontPath,
    aadhar_back: aadharBackPath,
    is_verified: false,
  }, { onConflict: 'user_id' });

      if (dbError) {
        Alert.alert('Error', 'Failed to save documents. Please try again.');
        setUploading(false);
        return;
      }

      setUploading(false);

      // Proceed to booking or complete
      if (bike && bike.id) {
        setShowBooking(true);
      } else {
        onComplete();
      }

    } catch (err) {
      console.log('Error:', err);
      Alert.alert('Error', 'Something went wrong. Please try again.');
      setUploading(false);
    }
  };

  const renderUploadCard = (
    title: string,
    icon: string,
    docType: 'licence' | 'aadhar',
    doc: DocumentState,
    isComplete: boolean
  ) => (
    <View style={[styles.card, isComplete && styles.cardComplete]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIconBox}>
          <Text style={styles.cardIcon}>{icon}</Text>
        </View>
        <View style={styles.cardTitleBox}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardSubtitle}>
            {isComplete ? '✓ Uploaded successfully' : 'Both sides required'}
          </Text>
        </View>
        {isComplete && (
          <View style={styles.checkBadge}>
            <Text style={styles.checkText}>✓</Text>
          </View>
        )}
      </View>

      <View style={styles.uploadRow}>
        <TouchableOpacity
          style={styles.uploadBtn}
          onPress={() => pickImage(docType, 'front')}
          activeOpacity={0.8}
        >
          {doc.front ? (
            <Image source={{ uri: doc.front }} style={styles.uploadedImage} />
          ) : (
            <View style={styles.uploadPlaceholder}>
              <Text style={styles.uploadPlaceholderIcon}>📷</Text>
              <Text style={styles.uploadPlaceholderText}>Front Side</Text>
            </View>
          )}
          {doc.front && (
            <View style={styles.uploadedBadge}>
              <Text style={styles.uploadedBadgeText}>✓</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.uploadBtn}
          onPress={() => pickImage(docType, 'back')}
          activeOpacity={0.8}
        >
          {doc.back ? (
            <Image source={{ uri: doc.back }} style={styles.uploadedImage} />
          ) : (
            <View style={styles.uploadPlaceholder}>
              <Text style={styles.uploadPlaceholderIcon}>📷</Text>
              <Text style={styles.uploadPlaceholderText}>Back Side</Text>
            </View>
          )}
          {doc.back && (
            <View style={styles.uploadedBadge}>
              <Text style={styles.uploadedBadgeText}>✓</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

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
        <Text style={styles.headerTitle}>Verify Identity</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <Text style={styles.subtitle}>
          Upload your documents to start booking rides on RILO.
          This is a one-time process.
        </Text>

        <View style={styles.progressRow}>
          <View style={[styles.progressDot, licenceComplete && styles.progressDotDone]} />
          <View style={[styles.progressLine, licenceComplete && styles.progressLineDone]} />
          <View style={[styles.progressDot, aadharComplete && styles.progressDotDone]} />
          <View style={[styles.progressLine, allComplete && styles.progressLineDone]} />
          <View style={[styles.progressDot, allComplete && styles.progressDotDone]} />
        </View>
        <View style={styles.progressLabels}>
          <Text style={styles.progressLabel}>Licence</Text>
          <Text style={styles.progressLabel}>Aadhar</Text>
          <Text style={styles.progressLabel}>Done</Text>
        </View>

        {renderUploadCard('Driving Licence', '🪪', 'licence', licence, licenceComplete)}
        {renderUploadCard('Aadhar Card', '📋', 'aadhar', aadhar, aadharComplete)}

        <View style={styles.securityNote}>
          <Text style={styles.securityIcon}>🔒</Text>
          <Text style={styles.securityText}>
            Your documents are encrypted and stored securely.
            RILO never shares your data with third parties.
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── CONTINUE BUTTON ── */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.continueBtn, allComplete && !uploading && styles.continueBtnActive]}
          activeOpacity={allComplete ? 0.85 : 1}
          onPress={handleContinue}
          disabled={uploading}
        >
          {uploading ? (
            <View style={styles.uploadingRow}>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={styles.continueBtnText}>Uploading documents...</Text>
            </View>
          ) : (
            <Text style={styles.continueBtnText}>
              {allComplete ? 'Continue to Booking' : 'Upload Both Documents'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {showBooking && bike && (
        <BookingScreen
          bike={bike}
          userLocation={userLocation || { latitude: 0, longitude: 0 }}
          onBack={() => setShowBooking(false)}
          onConfirm={(rideData) => {
            setShowBooking(false);
            onComplete();
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
    zIndex: 999,
    elevation: 999,
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
    padding: 20,
  },
  subtitle: {
    fontSize: 14,
    color: '#777777',
    lineHeight: 22,
    marginBottom: 24,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  progressDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#E0E0E0',
    borderWidth: 2,
    borderColor: '#CCCCCC',
  },
  progressDotDone: {
    backgroundColor: '#E8241A',
    borderColor: '#E8241A',
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E0E0E0',
  },
  progressLineDone: {
    backgroundColor: '#E8241A',
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginBottom: 24,
  },
  progressLabel: {
    fontSize: 11,
    color: '#999999',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  cardComplete: {
    borderColor: '#E8241A',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  cardIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFF5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIcon: {
    fontSize: 22,
  },
  cardTitleBox: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#999999',
    marginTop: 2,
  },
  checkBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E8241A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  uploadRow: {
    flexDirection: 'row',
    gap: 12,
  },
  uploadBtn: {
    flex: 1,
    height: 110,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F8F8F8',
    borderWidth: 1.5,
    borderColor: '#EEEEEE',
    borderStyle: 'dashed',
  },
  uploadPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  uploadPlaceholderIcon: {
    fontSize: 28,
  },
  uploadPlaceholderText: {
    fontSize: 12,
    color: '#AAAAAA',
    fontWeight: '500',
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  uploadedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E8241A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadedBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginTop: 4,
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
    backgroundColor: '#CCCCCC',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  continueBtnActive: {
    backgroundColor: '#E8241A',
  },
  continueBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  uploadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});