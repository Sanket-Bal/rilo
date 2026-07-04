import React, { useRef, useEffect, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Slider from '@react-native-community/slider';
import { supabase } from '../../lib/supabase';

const { width, height } = Dimensions.get('window');
type DocState = {
  uri: string | null;
  uploading: boolean;
};

const BIKE_TYPES = ['Scooter', 'Motorcycle', 'Electric Scooter', 'Electric Bike'];
const FUEL_TYPES = ['Petrol', 'Electric'];
const FUEL_POLICIES = [
  { id: 'included', label: 'Petrol Included', desc: 'Price covers fuel cost' },
  { id: 'renter', label: 'Renter Fills Fuel', desc: 'Renter handles petrol' },
  { id: 'electric', label: 'Electric', desc: 'No fuel cost' },
];
const CONDITIONS = ['Excellent', 'Good', 'Fair'];
const BRANDS = ['Honda', 'TVS', 'Bajaj', 'Royal Enfield', 'Hero', 'Suzuki', 'Yamaha', 'Ather', 'Ola Electric', 'Other'];

const RECOMMENDED_PRICES: Record<string, number> = {
  'Scooter': 30,
  'Motorcycle': 45,
  'Electric Scooter': 35,
  'Electric Bike': 50,
};

export default function BikeListingScreen({
  onBack,
  onListed,
}: {
  onBack: () => void;
  onListed: () => void;
}) {
  const slideAnim = useRef(new Animated.Value(width)).current;
  const [step, setStep] = useState(1);
  const totalSteps = 5;

  // Step 1 — Bike details
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [bikeType, setBikeType] = useState('');
  const [condition, setCondition] = useState('');
  const [fuelType, setFuelType] = useState('');
  const [fuelPolicy, setFuelPolicy] = useState('');

  // Step 2 — Photos
  const [photos, setPhotos] = useState<string[]>([]);

  // Step 3 — Conditions & Description
  const [cityOnly, setCityOnly] = useState(true);
  const [pillionAllowed, setPillionAllowed] = useState(true);
  const [helmetProvided, setHelmetProvided] = useState(false);
  const [description, setDescription] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Step 4 — Pricing
  const [pricePerHour, setPricePerHour] = useState(30);
  const [recommendedPrice, setRecommendedPrice] = useState(30);

  const [saving, setSaving] = useState(false);
  // Step 5 — Bike Documents
  const [rcFront, setRcFront] = useState<DocState>({ uri: null, uploading: false });
  const [rcBack, setRcBack] = useState<DocState>({ uri: null, uploading: false });
  const [insurance, setInsurance] = useState<DocState>({ uri: null, uploading: false });

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 0,
      speed: 14,
    }).start();
  }, []);

  useEffect(() => {
    if (bikeType) {
      const rec = RECOMMENDED_PRICES[bikeType] || 30;
      setRecommendedPrice(rec);
      setPricePerHour(rec);
    }
  }, [bikeType]);

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      return;
    }
    Animated.timing(slideAnim, {
      toValue: width,
      duration: 300,
      useNativeDriver: true,
    }).start(() => onBack());
  };

  const pickPhoto = async () => {
    if (photos.length >= 6) {
      Alert.alert('Maximum photos', 'You can upload up to 6 photos');
      return;
    }
    Alert.alert(
      'Add Photo',
      'Choose how to add a photo',
      [
        {
          text: 'Take Photo',
          onPress: async () => {
            const permission = await ImagePicker.requestCameraPermissionsAsync();
            if (!permission.granted) return;
            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              quality: 0.8,
            });
            if (!result.canceled) {
              setPhotos(prev => [...prev, result.assets[0].uri]);
            }
          },
        },
        {
          text: 'Choose from Gallery',
          onPress: async () => {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) return;
            const result = await ImagePicker.launchImageLibraryAsync({
              allowsEditing: true,
              quality: 0.8,
            });
            if (!result.canceled) {
              setPhotos(prev => [...prev, result.assets[0].uri]);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const pickDoc = async (
    setter: React.Dispatch<React.SetStateAction<DocState>>,
    label: string
  ) => {
    Alert.alert(
      `Upload ${label}`,
      'Choose how to upload',
      [
        {
          text: 'Take Photo',
          onPress: async () => {
            const permission = await ImagePicker.requestCameraPermissionsAsync();
            if (!permission.granted) return;
            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              quality: 0.8,
            });
            if (!result.canceled) {
              setter({ uri: result.assets[0].uri, uploading: false });
            }
          },
        },
        {
          text: 'Choose from Gallery',
          onPress: async () => {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) return;
            const result = await ImagePicker.launchImageLibraryAsync({
              allowsEditing: true,
              quality: 0.8,
            });
            if (!result.canceled) {
              setter({ uri: result.assets[0].uri, uploading: false });
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const validateStep = () => {
    if (step === 1) {
      if (!brand || !model || !year || !bikeType || !condition || !fuelType || !fuelPolicy) {
        Alert.alert('Required', 'Please fill all fields');
        return false;
      }
    }
    if (step === 2) {
      if (photos.length < 3) {
        Alert.alert('Required', 'Please upload at least 3 photos');
        return false;
      }
    }
    if (step === 3) {
      if (!description.trim()) {
        Alert.alert('Required', 'Please add a description');
        return false;
      }
    }
    if (step === 5) {
      if (!rcFront.uri || !rcBack.uri || !insurance.uri) {
        Alert.alert('Required', 'Please upload RC (front & back) and Insurance document');
        return false;
      }
    }
    return true;
  };

  const uploadPhoto = async (uri: string, userId: string, fileName: string) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
      });
      const filePath = `${userId}/${fileName}`;
      const { error } = await supabase.storage
        .from('bike-images')
        .upload(filePath, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });
      if (error) return null;
      const { data } = supabase.storage
        .from('bike-images')
        .getPublicUrl(filePath);
      return data.publicUrl;
    } catch {
      return null;
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user location
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      // Insert bike
      // Get current location
      let bikeLat = null;
      let bikeLng = null;
      let bikeCity = null;
      let bikeRegion = null;

      try {
        const Location = await import('expo-location');
        
        // Request permission first
        const { status } = await Location.requestForegroundPermissionsAsync();
        console.log('[BikeListingScreen] Location permission status:', status);
        
        if (status !== 'granted') {
          console.log('[BikeListingScreen] ⚠️ Location permission NOT granted');
          Alert.alert('Location Required', 'Please enable location to save bike location');
        } else {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          bikeLat = loc.coords.latitude;
          bikeLng = loc.coords.longitude;

          console.log('[BikeListingScreen] 📍 Captured location:', {
            latitude: bikeLat,
            longitude: bikeLng,
            accuracy: loc.coords.accuracy,
          });

          const geocode = await Location.reverseGeocodeAsync({
            latitude: bikeLat,
            longitude: bikeLng,
          });
          
          if (geocode.length > 0) {
            bikeCity = geocode[0].city || geocode[0].subregion;
            bikeRegion = geocode[0].region;
            console.log('[BikeListingScreen] 🏙️ Geocoded city:', bikeCity, 'region:', bikeRegion);
          }
        }
      } catch (err) {
        console.log('[BikeListingScreen] ❌ Error capturing location:', err);
      }
      const { data: bike, error: bikeError } = await supabase
        .from('bikes')
        .insert({
          owner_id: user.id,
          brand,
          model,
          year,
          type: bikeType,
          condition,
          fuel_type: fuelType,
          fuel_policy: fuelPolicy,
          price_per_hour: pricePerHour,
          recommended_price: recommendedPrice,
          description,
          special_instructions: specialInstructions,
          city_only: cityOnly,
          pillion_allowed: pillionAllowed,
          helmet_provided: helmetProvided,
          status: 'available',
          latitude: bikeLat,
          longitude: bikeLng,
          city: bikeCity,
          region: bikeRegion,
        })
        .select()
        .single();

      if (!bikeError && bike) {
        console.log('[BikeListingScreen] ✅ Bike created with location:', {
          bike_id: bike.id,
          latitude: bike.latitude,
          longitude: bike.longitude,
          city: bike.city,
          region: bike.region,
        });
      }

      if (bikeError || !bike) {
        Alert.alert('Error', bikeError?.message || 'Failed to list bike');
        setSaving(false);
        return;
      }

      // Upload photos
      const uploadedUrls = await Promise.all(
        photos.map((uri, index) =>
          uploadPhoto(uri, user.id, `${bike.id}_${index}.jpg`)
        )
      );

      // Save image records
      const imageRecords = uploadedUrls
        .filter(url => url !== null)
        .map(url => ({
          bike_id: bike.id,
          image_path: url!,
        }));

      // Upload bike documents
      const uploadBikeDoc = async (uri: string, fileName: string) => {
        try {
          const response = await fetch(uri);
          const blob = await response.blob();
          const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as ArrayBuffer);
            reader.onerror = reject;
            reader.readAsArrayBuffer(blob);
          });
          const filePath = `${user.id}/${bike.id}_${fileName}.jpg`;
          const { error } = await supabase.storage
            .from('bike-documents')
            .upload(filePath, arrayBuffer, {
              contentType: 'image/jpeg',
              upsert: true,
            });
          if (error) return null;
          return filePath;
        } catch {
          return null;
        }
      };

      const [rcFrontPath, rcBackPath, insurancePath] = await Promise.all([
        uploadBikeDoc(rcFront.uri!, 'rc_front'),
        uploadBikeDoc(rcBack.uri!, 'rc_back'),
        uploadBikeDoc(insurance.uri!, 'insurance'),
      ]);

      if (rcFrontPath && rcBackPath && insurancePath) {
        await supabase.from('bike_documents').insert({
          bike_id: bike.id,
          owner_id: user.id,
          rc_front: rcFrontPath,
          rc_back: rcBackPath,
          insurance: insurancePath,
        });
      }


      if (imageRecords.length > 0) {
        await supabase.from('bike_images').insert(imageRecords);
      }

      setSaving(false);
      Alert.alert(
        'Bike Listed! 🎉',
        'Your bike is now live on RILO. Renters nearby can find and book it.',
        [{ text: 'Go to Owner Dashboard', onPress: onListed }]
      );
    } catch (err) {
      console.log('Error listing bike:', err);
      Alert.alert('Error', 'Something went wrong. Please try again.');
      setSaving(false);
    }
  };

  const renderStep1 = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.stepScroll}>
      <Text style={styles.stepHeading}>Tell us about your bike</Text>

      {/* Brand */}
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Brand</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {BRANDS.map(b => (
            <TouchableOpacity
              key={b}
              style={[styles.chip, brand === b && styles.chipActive]}
              onPress={() => setBrand(b)}
            >
              <Text style={[styles.chipText, brand === b && styles.chipTextActive]}>{b}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Model */}
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Model Name</Text>
        <TextInput
          style={styles.input}
          value={model}
          onChangeText={setModel}
          placeholder="e.g. Activa 6G, Pulsar 150"
          placeholderTextColor="#AAAAAA"
        />
      </View>

      {/* Year */}
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Year of Manufacture</Text>
        <TextInput
          style={styles.input}
          value={year}
          onChangeText={setYear}
          placeholder="e.g. 2022"
          placeholderTextColor="#AAAAAA"
          keyboardType="number-pad"
          maxLength={4}
        />
      </View>

      {/* Bike Type */}
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Bike Type</Text>
        <View style={styles.optionsGrid}>
          {BIKE_TYPES.map(type => (
            <TouchableOpacity
              key={type}
              style={[styles.optionBtn, bikeType === type && styles.optionBtnActive]}
              onPress={() => setBikeType(type)}
            >
              <Text style={[styles.optionBtnText, bikeType === type && styles.optionBtnTextActive]}>
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Condition */}
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Condition</Text>
        <View style={styles.optionsRow}>
          {CONDITIONS.map(c => (
            <TouchableOpacity
              key={c}
              style={[styles.optionBtn, condition === c && styles.optionBtnActive]}
              onPress={() => setCondition(c)}
            >
              <Text style={[styles.optionBtnText, condition === c && styles.optionBtnTextActive]}>
                {c}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Fuel Type */}
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Fuel Type</Text>
        <View style={styles.optionsRow}>
          {FUEL_TYPES.map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.optionBtn, fuelType === f && styles.optionBtnActive]}
              onPress={() => {
                setFuelType(f);
                if (f === 'Electric') setFuelPolicy('electric');
              }}
            >
              <Text style={[styles.optionBtnText, fuelType === f && styles.optionBtnTextActive]}>
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Fuel Policy */}
      {fuelType === 'Petrol' && (
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Fuel Policy</Text>
          {FUEL_POLICIES.filter(fp => fp.id !== 'electric').map(fp => (
            <TouchableOpacity
              key={fp.id}
              style={[styles.policyOption, fuelPolicy === fp.id && styles.policyOptionActive]}
              onPress={() => setFuelPolicy(fp.id)}
            >
              <View style={[styles.radioOuter, fuelPolicy === fp.id && styles.radioOuterActive]}>
                {fuelPolicy === fp.id && <View style={styles.radioInner} />}
              </View>
              <View>
                <Text style={styles.policyLabel}>{fp.label}</Text>
                <Text style={styles.policyDesc}>{fp.desc}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );

  const renderStep2 = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.stepScroll}>
      <Text style={styles.stepHeading}>Add photos of your bike</Text>
      <Text style={styles.stepSubheading}>
        Add at least 3 clear photos. Include front, side and back views.
      </Text>

      <View style={styles.photosGrid}>
        {photos.map((uri, index) => (
          <View key={index} style={styles.photoWrapper}>
            <Image source={{ uri }} style={styles.photoThumb} resizeMode="cover" />
            <TouchableOpacity
              style={styles.removePhotoBtn}
              onPress={() => removePhoto(index)}
            >
              <Text style={styles.removePhotoText}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}
        {photos.length < 6 && (
          <TouchableOpacity style={styles.addPhotoBtn} onPress={pickPhoto}>
            <Text style={styles.addPhotoIcon}>📷</Text>
            <Text style={styles.addPhotoText}>Add Photo</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.photoHint}>
        {photos.length}/6 photos · Minimum 3 required
      </Text>

      <View style={styles.photoTipsBox}>
        <Text style={styles.photoTipsTitle}>📸 Photo Tips</Text>
        {[
          'Take photos in good natural light',
          'Show the odometer reading clearly',
          'Include any scratches or damage honestly',
          'Clean the bike before photographing',
        ].map((tip, index) => (
          <Text key={index} style={styles.photoTip}>• {tip}</Text>
        ))}
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );

  const renderStep3 = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.stepScroll}>
      <Text style={styles.stepHeading}>Set your conditions</Text>

      {/* MCQ Conditions */}
      <View style={styles.conditionCard}>
        <Text style={styles.conditionQuestion}>Where can renters ride?</Text>
        <View style={styles.optionsRow}>
          {[
            { label: 'City Only', value: true },
            { label: 'Intercity Allowed', value: false },
          ].map(option => (
            <TouchableOpacity
              key={option.label}
              style={[styles.optionBtn, cityOnly === option.value && styles.optionBtnActive]}
              onPress={() => setCityOnly(option.value)}
            >
              <Text style={[styles.optionBtnText, cityOnly === option.value && styles.optionBtnTextActive]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.conditionCard}>
        <Text style={styles.conditionQuestion}>Is pillion riding allowed?</Text>
        <View style={styles.optionsRow}>
          {[
            { label: 'Yes', value: true },
            { label: 'No', value: false },
          ].map(option => (
            <TouchableOpacity
              key={option.label}
              style={[styles.optionBtn, pillionAllowed === option.value && styles.optionBtnActive]}
              onPress={() => setPillionAllowed(option.value)}
            >
              <Text style={[styles.optionBtnText, pillionAllowed === option.value && styles.optionBtnTextActive]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.conditionCard}>
        <Text style={styles.conditionQuestion}>Do you provide a helmet?</Text>
        <View style={styles.optionsRow}>
          {[
            { label: 'Yes', value: true },
            { label: 'No', value: false },
          ].map(option => (
            <TouchableOpacity
              key={option.label}
              style={[styles.optionBtn, helmetProvided === option.value && styles.optionBtnActive]}
              onPress={() => setHelmetProvided(option.value)}
            >
              <Text style={[styles.optionBtnText, helmetProvided === option.value && styles.optionBtnTextActive]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Description */}
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Bike Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe your bike — its condition, any special features, maintenance history..."
          placeholderTextColor="#AAAAAA"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      {/* Special Instructions */}
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Special Instructions (Optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={specialInstructions}
          onChangeText={setSpecialInstructions}
          placeholder="Any special rules or instructions for renters..."
          placeholderTextColor="#AAAAAA"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );

  const renderDocUploadBox = (
    label: string,
    icon: string,
    state: DocState,
    setter: React.Dispatch<React.SetStateAction<DocState>>
  ) => (
    <View style={styles.docUploadCard}>
      <View style={styles.docUploadHeader}>
        <Text style={styles.docUploadIcon}>{icon}</Text>
        <View style={styles.docUploadTitleBox}>
          <Text style={styles.docUploadTitle}>{label}</Text>
          <Text style={styles.docUploadSubtitle}>
            {state.uri ? '✓ Uploaded' : 'Required'}
          </Text>
        </View>
        {state.uri && (
          <View style={styles.docUploadCheck}>
            <Text style={styles.docUploadCheckText}>✓</Text>
          </View>
        )}
      </View>
      <TouchableOpacity
        style={[
          styles.docUploadBtn,
          state.uri && styles.docUploadBtnDone,
        ]}
        onPress={() => pickDoc(setter, label)}
        activeOpacity={0.8}
      >
        {state.uri ? (
          <Image
            source={{ uri: state.uri }}
            style={styles.docUploadPreview}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.docUploadPlaceholder}>
            <Text style={styles.docUploadPlaceholderIcon}>📷</Text>
            <Text style={styles.docUploadPlaceholderText}>Tap to upload</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderStep5 = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.stepScroll}>
      <Text style={styles.stepHeading}>Upload Bike Documents</Text>
      <Text style={styles.stepSubheading}>
        These documents verify your bike's ownership and validity. Required to list on RILO.
      </Text>

      <View style={styles.docWarningBox}>
        <Text style={styles.docWarningIcon}>🔒</Text>
        <Text style={styles.docWarningText}>
          Your documents are encrypted and stored securely. Only used for verification purposes.
        </Text>
      </View>

      {renderDocUploadBox('RC Front Side', '📄', rcFront, setRcFront)}
      {renderDocUploadBox('RC Back Side', '📄', rcBack, setRcBack)}
      {renderDocUploadBox('Insurance Document', '🛡️', insurance, setInsurance)}

      <View style={styles.docNoteBox}>
        <Text style={styles.docNoteTitle}>📋 What to upload:</Text>
        {[
          'RC (Registration Certificate) — front and back clearly visible',
          'Valid insurance document — should not be expired',
          'Make sure all text is clearly readable',
        ].map((note, index) => (
          <Text key={index} style={styles.docNoteText}>• {note}</Text>
        ))}
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );

  const renderStep4 = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.stepScroll}>
      <Text style={styles.stepHeading}>Set your price</Text>
      <Text style={styles.stepSubheading}>
        We recommend ₹{recommendedPrice}/hr for your {bikeType}. You can adjust as you like.
      </Text>

      {/* Price display */}
      <View style={styles.priceDisplay}>
        <Text style={styles.priceValue}>₹{pricePerHour}</Text>
        <Text style={styles.priceUnit}>per hour</Text>
      </View>

      {/* Slider */}
      <Slider
        style={styles.slider}
        minimumValue={10}
        maximumValue={200}
        step={5}
        value={pricePerHour}
        onValueChange={setPricePerHour}
        minimumTrackTintColor="#E8241A"
        maximumTrackTintColor="#E0E0E0"
        thumbTintColor="#E8241A"
      />
      <View style={styles.sliderLabels}>
        <Text style={styles.sliderLabel}>₹10/hr</Text>
        <Text style={styles.sliderLabel}>₹200/hr</Text>
      </View>

      {/* Recommended badge */}
      <TouchableOpacity
        style={styles.recommendedBtn}
        onPress={() => setPricePerHour(recommendedPrice)}
      >
        <Text style={styles.recommendedBtnText}>
          Use Recommended Price — ₹{recommendedPrice}/hr
        </Text>
      </TouchableOpacity>

      {/* Earnings estimate */}
      <View style={styles.earningsCard}>
        <Text style={styles.earningsTitle}>Estimated Monthly Earnings</Text>
        <View style={styles.earningsRow}>
          {[
            { label: '10 hrs/month', value: `₹${pricePerHour * 10}` },
            { label: '20 hrs/month', value: `₹${pricePerHour * 20}` },
            { label: '40 hrs/month', value: `₹${pricePerHour * 40}` },
          ].map((item, index) => (
            <View key={index} style={styles.earningsBox}>
              <Text style={styles.earningsValue}>{item.value}</Text>
              <Text style={styles.earningsLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.earningsNote}>
          * After RILO platform fee deduction
        </Text>
      </View>

      {/* Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Listing Summary</Text>
        {[
          { label: 'Bike', value: `${brand} ${model} (${year})` },
          { label: 'Type', value: bikeType },
          { label: 'Condition', value: condition },
          { label: 'Fuel', value: `${fuelType} — ${fuelPolicy === 'included' ? 'Included' : fuelPolicy === 'renter' ? 'Renter fills' : 'Electric'}` },
          { label: 'Price', value: `₹${pricePerHour}/hr` },
          { label: 'Riding', value: cityOnly ? 'City only' : 'Intercity allowed' },
          { label: 'Pillion', value: pillionAllowed ? 'Allowed' : 'Not allowed' },
          { label: 'Helmet', value: helmetProvided ? 'Provided' : 'Not provided' },
        ].map((item, index) => (
          <View key={index} style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{item.label}</Text>
            <Text style={styles.summaryValue}>{item.value}</Text>
          </View>
        ))}
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );

  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateX: slideAnim }] }]}
    >
      {/* ── HEADER ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>List Your Bike</Text>
          <Text style={styles.headerStep}>Step {step} of {totalSteps}</Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${(step / totalSteps) * 100}%` }]} />
      </View>

      {/* Step content */}
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
      {step === 4 && renderStep4()}
      {step === 5 && renderStep5()}

      {/* Bottom button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.nextBtn}
          onPress={() => {
            if (!validateStep()) return;
            if (step < totalSteps) {
              setStep(step + 1);
            } else {
              handleSubmit();
            }
          }}
          activeOpacity={0.85}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.nextBtnText}>
              {step < totalSteps ? 'Continue →' : 'List My Bike 🚀'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 52,
    paddingHorizontal: 20,
    paddingBottom: 12,
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
  headerCenter: {
    alignItems: 'center',
    gap: 2,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  headerStep: {
    fontSize: 12,
    color: '#999999',
  },
  progressBar: {
    height: 3,
    backgroundColor: '#F0F0F0',
  },
  progressFill: {
    height: 3,
    backgroundColor: '#E8241A',
  },
  stepScroll: {
    padding: 20,
    gap: 16,
  },
  stepHeading: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  stepSubheading: {
    fontSize: 14,
    color: '#777777',
    lineHeight: 22,
    marginTop: -8,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555555',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  textArea: {
    height: 100,
    paddingTop: 14,
  },
  chipsRow: {
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#EEEEEE',
  },
  chipActive: {
    backgroundColor: '#E8241A',
    borderColor: '#E8241A',
  },
  chipText: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  optionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#EEEEEE',
  },
  optionBtnActive: {
    backgroundColor: '#E8241A',
    borderColor: '#E8241A',
  },
  optionBtnText: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '500',
  },
  optionBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  policyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#EEEEEE',
  },
  policyOptionActive: {
    borderColor: '#E8241A',
    backgroundColor: '#FFF5F5',
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
  policyLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  policyDesc: {
    fontSize: 12,
    color: '#999999',
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoWrapper: {
    position: 'relative',
  },
  photoThumb: {
    width: (width - 60) / 3,
    height: (width - 60) / 3,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E8241A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePhotoText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  addPhotoBtn: {
    width: (width - 60) / 3,
    height: (width - 60) / 3,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#EEEEEE',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addPhotoIcon: {
    fontSize: 24,
  },
  addPhotoText: {
    fontSize: 11,
    color: '#AAAAAA',
  },
  photoHint: {
    fontSize: 12,
    color: '#AAAAAA',
    textAlign: 'center',
  },
  photoTipsBox: {
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  photoTipsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  photoTip: {
    fontSize: 12,
    color: '#555555',
    lineHeight: 20,
  },
  conditionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  conditionQuestion: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  priceDisplay: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 16,
  },
  priceValue: {
    fontSize: 56,
    fontWeight: '700',
    color: '#E8241A',
  },
  priceUnit: {
    fontSize: 16,
    color: '#999999',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -8,
  },
  sliderLabel: {
    fontSize: 11,
    color: '#AAAAAA',
  },
  recommendedBtn: {
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8241A',
  },
  recommendedBtnText: {
    color: '#E8241A',
    fontSize: 13,
    fontWeight: '600',
  },
  earningsCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  earningsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  earningsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  earningsBox: {
    flex: 1,
    backgroundColor: '#252525',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    gap: 4,
  },
  earningsValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E8241A',
  },
  earningsLabel: {
    fontSize: 10,
    color: '#888888',
    textAlign: 'center',
  },
  earningsNote: {
    fontSize: 11,
    color: '#666666',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#999999',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1,
    textAlign: 'right',
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
  nextBtn: {
    backgroundColor: '#E8241A',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  docUploadCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  docUploadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  docUploadIcon: {
    fontSize: 24,
  },
  docUploadTitleBox: {
    flex: 1,
  },
  docUploadTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  docUploadSubtitle: {
    fontSize: 12,
    color: '#999999',
    marginTop: 2,
  },
  docUploadCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E8241A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docUploadCheckText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  docUploadBtn: {
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F8F8F8',
    borderWidth: 1.5,
    borderColor: '#EEEEEE',
    borderStyle: 'dashed',
  },
  docUploadBtnDone: {
    borderStyle: 'solid',
    borderColor: '#E8241A',
  },
  docUploadPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  docUploadPlaceholderIcon: {
    fontSize: 32,
  },
  docUploadPlaceholderText: {
    fontSize: 13,
    color: '#AAAAAA',
  },
  docUploadPreview: {
    width: '100%',
    height: '100%',
  },
  docWarningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  docWarningIcon: {
    fontSize: 18,
  },
  docWarningText: {
    flex: 1,
    fontSize: 12,
    color: '#555555',
    lineHeight: 18,
  },
  docNoteBox: {
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    padding: 14,
    gap: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#E8241A',
  },
  docNoteTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  docNoteText: {
    fontSize: 12,
    color: '#666666',
    lineHeight: 20,
  },
});