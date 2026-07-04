import React, { useRef, useEffect, useState } from 'react';
import ReportScreen from './ReportScreen';
import {
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { supabase } from '../lib/supabase';

const { width } = Dimensions.get('window');

const QUICK_TAGS = [
  'Clean vehicle',
  'Punctual owner',
  'Good condition',
  'Friendly',
  'Easy handover',
  'Well maintained',
  'Smooth ride',
  'As described',
];

export default function RatingScreen({
  bikeName,
  owner,
  ownerId,
  bikeId,
  bookingId,
  onDone,
}: {
  bikeName: string;
  owner: string;
  ownerId: string;
  bikeId: string;
  bookingId: string;
  onDone: () => void;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  const [ownerRating, setOwnerRating] = useState(0);
  const [bikeRating, setBikeRating] = useState(0);
  const [review, setReview] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [showReport, setShowReport] = useState(false);

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

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    if (ownerRating === 0 || bikeRating === 0) {
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('ratings').insert({
        booking_id: bookingId,
        renter_id: user.id,
        owner_id: ownerId,
        bike_id: bikeId,
        owner_rating: ownerRating,
        bike_rating: bikeRating,
        review: review.trim() || null,
        tags: selectedTags,
      });

      setSaving(false);
      onDone();
    } catch (err) {
      console.log('Error saving rating:', err);
      setSaving(false);
      onDone();
    }
  };

  const renderStars = (
    rating: number,
    setRating: (r: number) => void,
    label: string
  ) => (
    <View style={styles.starsSection}>
      <Text style={styles.starsLabel}>{label}</Text>
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map(star => (
          <TouchableOpacity
            key={star}
            onPress={() => setRating(star)}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.star,
              star <= rating ? styles.starActive : styles.starInactive,
            ]}>
              ★
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {rating > 0 && (
        <Text style={styles.ratingLabel}>
          {rating === 1 ? 'Poor' :
           rating === 2 ? 'Fair' :
           rating === 3 ? 'Good' :
           rating === 4 ? 'Very Good' : 'Excellent!'}
        </Text>
      )}
    </View>
  );

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── HEADER ── */}
        <View style={styles.header}>
          <Text style={styles.headerEmoji}>⭐</Text>
          <Text style={styles.headerTitle}>Rate Your Ride</Text>
          <Text style={styles.headerSubtitle}>
            How was your experience with {owner} and the {bikeName}?
          </Text>
        </View>

        {/* ── OWNER RATING ── */}
        <View style={styles.ratingCard}>
          {renderStars(ownerRating, setOwnerRating, `Rate ${owner} (Owner)`)}
        </View>

        {/* ── BIKE RATING ── */}
        <View style={styles.ratingCard}>
          {renderStars(bikeRating, setBikeRating, `Rate the ${bikeName}`)}
        </View>

        {/* ── QUICK TAGS ── */}
        <View style={styles.tagsCard}>
          <Text style={styles.tagsTitle}>What stood out? (Optional)</Text>
          <View style={styles.tagsGrid}>
            {QUICK_TAGS.map(tag => (
              <TouchableOpacity
                key={tag}
                style={[
                  styles.tag,
                  selectedTags.includes(tag) && styles.tagActive,
                ]}
                onPress={() => toggleTag(tag)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.tagText,
                  selectedTags.includes(tag) && styles.tagTextActive,
                ]}>
                  {tag}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── REVIEW ── */}
        <View style={styles.reviewCard}>
          <Text style={styles.reviewTitle}>Write a review (Optional)</Text>
          <TextInput
            style={styles.reviewInput}
            value={review}
            onChangeText={setReview}
            placeholder="Share your experience to help other renters..."
            placeholderTextColor="#AAAAAA"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={300}
          />
          <Text style={styles.charCount}>{review.length}/300</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── SUBMIT BUTTON ── */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[
            styles.submitBtn,
            ownerRating > 0 && bikeRating > 0 && styles.submitBtnActive,
          ]}
          onPress={handleSubmit}
          activeOpacity={0.85}
          disabled={saving || ownerRating === 0 || bikeRating === 0}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitBtnText}>
              {ownerRating > 0 && bikeRating > 0
                ? 'Submit Rating'
                : 'Please rate both owner and bike'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.reportBtn}
          onPress={() => setShowReport(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.reportBtnText}>🚨 Report an Issue with this Ride</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipBtn}
          onPress={onDone}
          activeOpacity={0.7}
        >
          <Text style={styles.skipBtnText}>Skip for now</Text>
        </TouchableOpacity>
      </View>

      {showReport && (
        <ReportScreen
          onBack={() => setShowReport(false)}
          reporterType="renter"
          bookingId={bookingId}
          reportedUserId={ownerId}
          reportedUserName={owner}
        />
      )}

    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F5F5F5',
    zIndex: 1100,
    elevation: 1100,
  },
  scroll: {
    padding: 16,
    gap: 14,
  },

  // Header
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  headerEmoji: {
    fontSize: 48,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#777777',
    textAlign: 'center',
    lineHeight: 22,
  },

  // Rating card
  ratingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  starsSection: {
    alignItems: 'center',
    gap: 12,
  },
  starsLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  star: {
    fontSize: 40,
  },
  starActive: {
    color: '#FFA000',
  },
  starInactive: {
    color: '#E0E0E0',
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFA000',
  },

  // Tags
  tagsCard: {
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
  tagsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  tagActive: {
    backgroundColor: '#E8241A',
    borderColor: '#E8241A',
  },
  tagText: {
    fontSize: 13,
    color: '#666666',
  },
  tagTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Review
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  reviewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  reviewInput: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: '#1A1A1A',
    height: 100,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  charCount: {
    fontSize: 11,
    color: '#AAAAAA',
    textAlign: 'right',
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
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  submitBtn: {
    backgroundColor: '#CCCCCC',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitBtnActive: {
    backgroundColor: '#E8241A',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  skipBtnText: {
    fontSize: 14,
    color: '#AAAAAA',
  },
  reportBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  reportBtnText: {
    fontSize: 13,
    color: '#E8241A',
    fontWeight: '600',
  },
});