import React, { useRef, useEffect, useState } from 'react';
import {
  Animated,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';

const { width, height } = Dimensions.get('window');

export default function EditProfileScreen({
  onBack,
  onSaved,
}: {
  onBack: () => void;
  onSaved: () => void;
}) {
  const slideAnim = useRef(new Animated.Value(width)).current;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 0,
      speed: 14,
    }).start();

    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setEmail(user.email || '');

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) {
        setFullName(data.full_name || '');
        setPhone(data.phone || '');
        setDob(data.dob || '');
        if (data.avatar_url) {
          const { data: urlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(data.avatar_url);
          setPhotoUrl(urlData.publicUrl);
        }
      }
    } catch (err) {
      console.log('Error fetching profile:', err);
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

  const pickPhoto = async () => {
    Alert.alert(
      'Profile Photo',
      'Choose how to upload your photo',
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
              aspect: [1, 1],
              quality: 0.8,
            });
            if (!result.canceled) {
              setPhotoUri(result.assets[0].uri);
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
              aspect: [1, 1],
              quality: 0.8,
            });
            if (!result.canceled) {
              setPhotoUri(result.assets[0].uri);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const uploadPhoto = async (userId: string): Promise<string | null> => {
    if (!photoUri) return null;
    try {
      const response = await fetch(photoUri);
      const blob = await response.blob();
      const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
      });

      const filePath = `${userId}/avatar.jpg`;
      const { error } = await supabase.storage
        .from('avatars')
        .upload(filePath, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (error) {
        console.log('Photo upload error:', error.message);
        return null;
      }
      return filePath;
    } catch (err) {
      console.log('Error uploading photo:', err);
      return null;
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Required', 'Please enter your full name');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Required', 'Please enter your phone number');
      return;
    }
    if (!dob.trim()) {
      Alert.alert('Required', 'Please enter your date of birth');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let avatarPath = null;
      if (photoUri) {
        avatarPath = await uploadPhoto(user.id);
      }

      const profileData: any = {
        id: user.id,
        email: user.email,
        full_name: fullName.trim(),
        phone: phone.trim(),
        dob: dob.trim(),
      };

      if (avatarPath) {
        profileData.avatar_url = avatarPath;
      }

      const { error } = await supabase
        .from('profiles')
        .upsert(profileData);

      if (error) {
        Alert.alert('Error', 'Failed to save profile. Please try again.');
        setSaving(false);
        return;
      }

      setSaving(false);
      Alert.alert('Success', 'Profile saved successfully!', [
        { text: 'OK', onPress: () => onSaved() },
      ]);
    } catch (err) {
      console.log('Error saving profile:', err);
      Alert.alert('Error', 'Something went wrong. Please try again.');
      setSaving(false);
    }
  };

  const formatDob = (text: string) => {
    // Auto format as DD/MM/YYYY
    const cleaned = text.replace(/[^0-9]/g, '');
    let formatted = cleaned;
    if (cleaned.length >= 3 && cleaned.length <= 4) {
      formatted = cleaned.slice(0, 2) + '/' + cleaned.slice(2);
    } else if (cleaned.length >= 5) {
      formatted = cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4) + '/' + cleaned.slice(4, 8);
    }
    setDob(formatted);
  };

  if (loading) {
    return (
      <Animated.View
        style={[styles.container, { transform: [{ translateX: slideAnim }] }]}
      >
        <View style={styles.loadingContainer}>
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
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.7}
        >
          {saving ? (
            <ActivityIndicator color="#E8241A" size="small" />
          ) : (
            <Text style={styles.saveBtnText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── PROFILE PHOTO ── */}
        <View style={styles.photoSection}>
          <TouchableOpacity
            style={styles.photoWrapper}
            onPress={pickPhoto}
            activeOpacity={0.8}
          >
            {photoUri || photoUrl ? (
              <Image
                source={{ uri: photoUri || photoUrl || '' }}
                style={styles.photo}
              />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.photoPlaceholderText}>
                  {fullName ? fullName[0].toUpperCase() : email[0]?.toUpperCase() || 'R'}
                </Text>
              </View>
            )}
            <View style={styles.cameraBtn}>
              <Text style={styles.cameraIcon}>📷</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.photoHint}>Tap to change photo</Text>
        </View>

        {/* ── FORM FIELDS ── */}
        <View style={styles.formSection}>

          {/* Full Name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Full Name</Text>
            <TextInput
              style={styles.fieldInput}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Enter your full name"
              placeholderTextColor="#AAAAAA"
              autoCapitalize="words"
            />
          </View>

          {/* Email — read only */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Email Address</Text>
            <View style={styles.fieldInputReadOnly}>
              <Text style={styles.fieldInputReadOnlyText}>{email}</Text>
              <Text style={styles.fieldInputLockedIcon}>🔒</Text>
            </View>
            <Text style={styles.fieldHint}>Email cannot be changed</Text>
          </View>

          {/* Phone */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Phone Number</Text>
            <TextInput
              style={styles.fieldInput}
              value={phone}
              onChangeText={setPhone}
              placeholder="+91 XXXXX XXXXX"
              placeholderTextColor="#AAAAAA"
              keyboardType="phone-pad"
              maxLength={13}
            />
          </View>

          {/* Date of Birth */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Date of Birth</Text>
            <TextInput
              style={styles.fieldInput}
              value={dob}
              onChangeText={formatDob}
              placeholder="DD/MM/YYYY"
              placeholderTextColor="#AAAAAA"
              keyboardType="number-pad"
              maxLength={10}
            />
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
    zIndex: 1000,
    elevation: 1000,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFF0F0',
  },
  saveBtnText: {
    color: '#E8241A',
    fontSize: 14,
    fontWeight: '700',
  },

  // Scroll
  scroll: {
    padding: 20,
  },

  // Photo section
  photoSection: {
    alignItems: 'center',
    marginBottom: 28,
    marginTop: 8,
  },
  photoWrapper: {
    position: 'relative',
    marginBottom: 8,
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E8241A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E8241A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  photoPlaceholderText: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '700',
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  cameraIcon: {
    fontSize: 16,
  },
  photoHint: {
    fontSize: 12,
    color: '#AAAAAA',
  },

  // Form
  formSection: {
    gap: 16,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555555',
    letterSpacing: 0.3,
  },
  fieldInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1A1A1A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  fieldInputReadOnly: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  fieldInputReadOnlyText: {
    fontSize: 15,
    color: '#AAAAAA',
  },
  fieldInputLockedIcon: {
    fontSize: 14,
  },
  fieldHint: {
    fontSize: 11,
    color: '#BBBBBB',
    marginTop: 2,
  },
});