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
  Alert,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../lib/supabase';

const { width } = Dimensions.get('window');

const OWNER_ISSUE_TYPES = [
  { id: 'damage', label: '🔧 Vehicle Damage', desc: 'Renter damaged the vehicle' },
  { id: 'late', label: '⏰ Late Return', desc: 'Renter returned vehicle late' },
  { id: 'fuel', label: '⛽ Fuel Issue', desc: 'Renter did not fill fuel as agreed' },
  { id: 'rude', label: '😡 Rude Behavior', desc: 'Renter was rude or disrespectful' },
  { id: 'noshow', label: '🚫 No Show', desc: 'Renter booked but did not show up' },
  { id: 'other', label: '📝 Other Issue', desc: 'Something else happened' },
];

const RENTER_ISSUE_TYPES = [
  { id: 'condition', label: '🛵 Poor Condition', desc: 'Vehicle was not as described' },
  { id: 'noshow', label: '🚫 Owner No Show', desc: 'Owner did not show up at meetup' },
  { id: 'rude', label: '😡 Rude Behavior', desc: 'Owner was rude or disrespectful' },
  { id: 'fraud', label: '⚠️ Fraud', desc: 'Suspicious or fraudulent activity' },
  { id: 'safety', label: '🦺 Safety Issue', desc: 'Vehicle had safety problems' },
  { id: 'other', label: '📝 Other Issue', desc: 'Something else happened' },
];

export default function ReportScreen({
  onBack,
  reporterType = 'renter',
  bookingId,
  reportedUserName,
  reportedUserId,
}: {
  onBack: () => void;
  reporterType?: 'owner' | 'renter';
  bookingId?: string;
  reportedUserName?: string;
  reportedUserId?: string;
}) {
  const slideAnim = useRef(new Animated.Value(width)).current;
  const [selectedIssue, setSelectedIssue] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const issueTypes = reporterType === 'owner' ? OWNER_ISSUE_TYPES : RENTER_ISSUE_TYPES;

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

  const handleSubmit = async () => {
    if (!selectedIssue) {
      Alert.alert('Required', 'Please select an issue type');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Required', 'Please describe the issue');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('complaints').insert({
        reporter_id: user.id,
        reported_id: reportedUserId || null,
        reporter_type: reporterType,
        booking_id: bookingId || null,
        issue_type: selectedIssue,
        description: description.trim(),
        status: 'pending',
      });

      if (error) {
        Alert.alert('Error', 'Failed to submit report. Please try again.');
        setSaving(false);
        return;
      }

      setSaving(false);
      Alert.alert(
        'Report Submitted ✓',
        'Thank you for reporting. Our team will review this within 24 hours and take appropriate action.',
        [{ text: 'OK', onPress: onBack }]
      );
    } catch (err) {
      console.log('Error submitting report:', err);
      Alert.alert('Error', 'Something went wrong. Please try again.');
      setSaving(false);
    }
  };

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
        <Text style={styles.headerTitle}>Report an Issue</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Info banner */}
        <View style={styles.infoBanner}>
          <Text style={styles.infoBannerIcon}>🛡️</Text>
          <View style={styles.infoBannerText}>
            <Text style={styles.infoBannerTitle}>Your safety matters</Text>
            <Text style={styles.infoBannerSubtitle}>
              All reports are reviewed by our team within 24 hours.
              {reportedUserName ? ` Reporting: ${reportedUserName}` : ''}
            </Text>
          </View>
        </View>

        {/* Issue type selection */}
        <Text style={styles.sectionTitle}>What happened?</Text>
        <View style={styles.issueList}>
          {issueTypes.map(issue => (
            <TouchableOpacity
              key={issue.id}
              style={[
                styles.issueOption,
                selectedIssue === issue.id && styles.issueOptionActive,
              ]}
              onPress={() => setSelectedIssue(issue.id)}
              activeOpacity={0.7}
            >
              <View style={styles.issueOptionLeft}>
                <Text style={styles.issueIcon}>{issue.label.split(' ')[0]}</Text>
                <View>
                  <Text style={[
                    styles.issueLabel,
                    selectedIssue === issue.id && styles.issueLabelActive,
                  ]}>
                    {issue.label.split(' ').slice(1).join(' ')}
                  </Text>
                  <Text style={styles.issueDesc}>{issue.desc}</Text>
                </View>
              </View>
              <View style={[
                styles.radioOuter,
                selectedIssue === issue.id && styles.radioOuterActive,
              ]}>
                {selectedIssue === issue.id && <View style={styles.radioInner} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Description */}
        <Text style={styles.sectionTitle}>Describe what happened</Text>
        <TextInput
          style={styles.descInput}
          value={description}
          onChangeText={setDescription}
          placeholder="Please provide details about the incident. The more detail you provide, the faster we can resolve it."
          placeholderTextColor="#AAAAAA"
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          maxLength={500}
        />
        <Text style={styles.charCount}>{description.length}/500</Text>

        {/* Note */}
        <View style={styles.noteBox}>
          <Text style={styles.noteText}>
            📌 False reports may result in account suspension. Please only report genuine issues.
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── SUBMIT BUTTON ── */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[
            styles.submitBtn,
            selectedIssue && description.trim() && styles.submitBtnActive,
          ]}
          onPress={handleSubmit}
          activeOpacity={0.85}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitBtnText}>Submit Report</Text>
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
    gap: 14,
  },
  infoBanner: {
    backgroundColor: '#FFF5F5',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#E8241A',
  },
  infoBannerIcon: {
    fontSize: 24,
  },
  infoBannerText: {
    flex: 1,
    gap: 4,
  },
  infoBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  infoBannerSubtitle: {
    fontSize: 12,
    color: '#777777',
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  issueList: {
    gap: 10,
  },
  issueOption: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: '#EEEEEE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  issueOptionActive: {
    borderColor: '#E8241A',
    backgroundColor: '#FFF5F5',
  },
  issueOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  issueIcon: {
    fontSize: 22,
  },
  issueLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  issueLabelActive: {
    color: '#E8241A',
  },
  issueDesc: {
    fontSize: 12,
    color: '#999999',
    marginTop: 2,
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
  descInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    fontSize: 14,
    color: '#1A1A1A',
    height: 120,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  charCount: {
    fontSize: 11,
    color: '#AAAAAA',
    textAlign: 'right',
    marginTop: -8,
  },
  noteBox: {
    backgroundColor: '#FFFDE7',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#FFA000',
  },
  noteText: {
    fontSize: 12,
    color: '#666666',
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
    letterSpacing: 0.3,
  },
});