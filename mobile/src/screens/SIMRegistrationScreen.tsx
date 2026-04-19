import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Image,
} from 'react-native';
import { Camera, useCameraDevices, useFrameProcessor } from 'react-native-vision-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from '../config/api';

type Step = 'select-network' | 'select-number' | 'address' | 'fingerprint' | 'confirmation';

const NETWORKS = ['Jazz', 'Zong', 'Telenor', 'Warid'];
const MOBILE_NUMBERS: Record<string, string[]> = {
  Jazz: ['03001234567', '03011234567', '03021234567', '03031234567'],
  Zong: ['03101234567', '03111234567', '03121234567', '03131234567'],
  Telenor: ['03201234567', '03211234567', '03221234567', '03231234567'],
  Warid: ['03301234567', '03311234567', '03321234567', '03331234567'],
};

export default function SIMRegistrationScreen({ navigation }: any) {
  const [step, setStep] = useState<Step>('select-network');
  const [formData, setFormData] = useState({
    network: '',
    mobileNumber: '',
    deliveryAddress: '',
    paymentAddress: '',
    sameAddress: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [fingerprintVerified, setFingerprintVerified] = useState(false);
  const [verifyingFingerprint, setVerifyingFingerprint] = useState(false);
  const [confirmationData, setConfirmationData] = useState<{
    transactionId: string;
    fabricTxId: string | null;
    trackingNumber: string;
  } | null>(null);

  const camera = useRef<Camera>(null);
  const devices = useCameraDevices();
  const device = devices.back;

  const handleNetworkSelect = (network: string) => {
    setFormData(prev => ({ ...prev, network, mobileNumber: '' }));
    setStep('select-number');
  };

  const handleNumberSelect = (number: string) => {
    setFormData(prev => ({ ...prev, mobileNumber: number }));
    setStep('address');
  };

  const handleAddressSubmit = () => {
    if (!formData.deliveryAddress.trim()) {
      setError('Delivery address is required');
      return;
    }
    if (!formData.sameAddress && !formData.paymentAddress.trim()) {
      setError('Payment address is required');
      return;
    }
    setError('');
    setStep('fingerprint');
  };

  const captureFingerprint = useCallback(async () => {
    if (!camera.current) return;
    try {
      const photo = await camera.current.takePhoto({
        qualityPrioritization: 'quality',
        flash: 'on',
        enableAutoRedEyeReduction: false,
      });
      setCapturedPhoto(photo.path);
      setShowCamera(false);
    } catch (err) {
      Alert.alert('Error', 'Failed to capture image. Please try again.');
    }
  }, []);

  const verifyFingerprint = async () => {
    if (!capturedPhoto) {
      Alert.alert('Error', 'Please capture your fingerprint first.');
      return;
    }

    setVerifyingFingerprint(true);
    setError('');

    try {
      const token = await AsyncStorage.getItem('accessToken');
      const userData = await AsyncStorage.getItem('user');
      const user = userData ? JSON.parse(userData) : null;

      if (!user?.cnic) {
        setError('User CNIC not found. Please log in again.');
        setVerifyingFingerprint(false);
        return;
      }

      // Read image as base64
      const RNFS = require('react-native-fs');
      const base64Image = await RNFS.readFile(capturedPhoto, 'base64');

      const response = await axios.post(
        `${API_URL}/api/nadra/verify-fingerprint`,
        {
          cnic: user.cnic,
          fingerprintImage: base64Image,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.verified) {
        setFingerprintVerified(true);
        setStep('confirmation');
      } else {
        setError(response.data.message || 'Fingerprint verification failed. Please retake.');
        setCapturedPhoto(null);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Verification failed. Please try again.');
    } finally {
      setVerifyingFingerprint(false);
    }
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem('accessToken');

      // Read image as base64 if available
      let base64Image = '';
      if (capturedPhoto) {
        const RNFS = require('react-native-fs');
        base64Image = await RNFS.readFile(capturedPhoto, 'base64');
      }

      const response = await axios.post(
        `${API_URL}/api/sim/register`,
        {
          networkProvider: formData.network,
          mobileNumber: formData.mobileNumber,
          deliveryAddress: formData.deliveryAddress,
          paymentAddress: formData.sameAddress ? formData.deliveryAddress : formData.paymentAddress,
          sameAddressForPayment: formData.sameAddress,
          fingerprintImage: base64Image,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.success) {
        setConfirmationData({
          transactionId: response.data.transaction?.transactionId || '',
          trackingNumber: response.data.transaction?.trackingNumber || '',
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'SIM registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    if (step === 'select-network') navigation.goBack();
    else if (step === 'select-number') setStep('select-network');
    else if (step === 'address') setStep('select-number');
    else if (step === 'fingerprint') setStep('address');
    else setStep('fingerprint');
  };

  // ─── Success Screen ───────────────────────────────────────────────────────
  if (confirmationData) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.successCard}>
            <Text style={styles.successIcon}>✅</Text>
            <Text style={styles.successTitle}>SIM Registered!</Text>
            <Text style={styles.successSubtitle}>
              Your SIM registration request has been submitted and verified by NADRA.
            </Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Fabric TX ID:</Text>
              <Text style={styles.infoValue}>{confirmationData.fabricTxId || confirmationData.transactionId}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tracking Number:</Text>
              <Text style={styles.infoValue}>{confirmationData.trackingNumber}</Text>
            </View>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('HomeTab')}>
              <Text style={styles.primaryBtnText}>Go to Home</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ─── Camera Modal ─────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <Modal visible={showCamera} animationType="slide" onRequestClose={() => setShowCamera(false)}>
        <View style={styles.cameraContainer}>
          {device && (
            <Camera
              ref={camera}
              style={StyleSheet.absoluteFill}
              device={device}
              isActive={showCamera}
              photo={true}
            />
          )}
          {/* Fingerprint guide overlay */}
          <View style={styles.cameraOverlay}>
            <View style={styles.fingerprintGuide}>
              <Text style={styles.fingerprintGuideText}>🔍</Text>
            </View>
            <Text style={styles.cameraHint}>
              Place finger over the circle and hold steady
            </Text>
          </View>
          <View style={styles.cameraControls}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCamera(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.captureBtn} onPress={captureFingerprint}>
              <View style={styles.captureInner} />
            </TouchableOpacity>
            <View style={{ width: 80 }} />
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={goBack} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Register SIM</Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        ) : null}

        {/* ── Step: Select Network ── */}
        {step === 'select-network' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Select Network</Text>
            <Text style={styles.cardSubtitle}>Choose your preferred mobile network</Text>
            {NETWORKS.map(network => (
              <TouchableOpacity
                key={network}
                style={styles.networkBtn}
                onPress={() => handleNetworkSelect(network)}
              >
                <Text style={styles.networkBtnText}>📡 {network}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Step: Select Number ── */}
        {step === 'select-number' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Select Number</Text>
            <Text style={styles.cardSubtitle}>Network: {formData.network}</Text>
            {(MOBILE_NUMBERS[formData.network] || []).map(number => (
              <TouchableOpacity
                key={number}
                style={styles.networkBtn}
                onPress={() => handleNumberSelect(number)}
              >
                <Text style={styles.networkBtnText}>📱 {number}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Step: Address ── */}
        {step === 'address' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Delivery Address</Text>
            <Text style={styles.cardSubtitle}>
              {formData.network} · {formData.mobileNumber}
            </Text>
            <TextInput
              style={styles.textArea}
              placeholder="Enter delivery address"
              multiline
              numberOfLines={4}
              value={formData.deliveryAddress}
              onChangeText={v => setFormData(p => ({ ...p, deliveryAddress: v }))}
            />
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setFormData(p => ({ ...p, sameAddress: !p.sameAddress }))}
            >
              <Text style={styles.checkboxText}>
                {formData.sameAddress ? '☑' : '☐'} Payment address same as delivery
              </Text>
            </TouchableOpacity>
            {!formData.sameAddress && (
              <TextInput
                style={styles.textArea}
                placeholder="Enter payment address"
                multiline
                numberOfLines={4}
                value={formData.paymentAddress}
                onChangeText={v => setFormData(p => ({ ...p, paymentAddress: v }))}
              />
            )}
            <TouchableOpacity style={styles.primaryBtn} onPress={handleAddressSubmit}>
              <Text style={styles.primaryBtnText}>Continue →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Step: Fingerprint ── */}
        {step === 'fingerprint' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Biometric Verification</Text>
            <Text style={styles.cardSubtitle}>
              NADRA requires fingerprint verification before SIM issuance
            </Text>

            <View style={styles.fingerprintBox}>
              {capturedPhoto ? (
                <>
                  <Image
                    source={{ uri: `file://${capturedPhoto}` }}
                    style={styles.capturedImage}
                    resizeMode="cover"
                  />
                  {fingerprintVerified && (
                    <View style={styles.verifiedBadge}>
                      <Text style={styles.verifiedBadgeText}>✓ Verified by NADRA</Text>
                    </View>
                  )}
                </>
              ) : (
                <Text style={styles.fingerprintPlaceholder}>👆</Text>
              )}
            </View>

            <Text style={styles.fingerprintHint}>
              {capturedPhoto
                ? fingerprintVerified
                  ? 'Your identity has been confirmed by NADRA'
                  : 'Tap "Verify with NADRA" to confirm identity'
                : 'Use your phone camera to capture your fingerprint'}
            </Text>

            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.secondaryBtn, { flex: 1, marginRight: 8 }]}
                onPress={() => {
                  setCapturedPhoto(null);
                  setFingerprintVerified(false);
                  setShowCamera(true);
                }}
              >
                <Text style={styles.secondaryBtnText}>
                  {capturedPhoto ? '🔄 Retake' : '📷 Scan Fingerprint'}
                </Text>
              </TouchableOpacity>

              {capturedPhoto && !fingerprintVerified && (
                <TouchableOpacity
                  style={[styles.primaryBtn, { flex: 1, marginLeft: 8, marginTop: 0 }]}
                  onPress={verifyFingerprint}
                  disabled={verifyingFingerprint}
                >
                  {verifyingFingerprint ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Verify →</Text>
                  )}
                </TouchableOpacity>
              )}

              {fingerprintVerified && (
                <TouchableOpacity
                  style={[styles.primaryBtn, { flex: 1, marginLeft: 8, marginTop: 0 }]}
                  onPress={() => setStep('confirmation')}
                >
                  <Text style={styles.primaryBtnText}>Continue →</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* ── Step: Confirmation ── */}
        {step === 'confirmation' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Order Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Network</Text>
              <Text style={styles.summaryValue}>{formData.network}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Number</Text>
              <Text style={styles.summaryValue}>{formData.mobileNumber}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery</Text>
              <Text style={styles.summaryValue}>{formData.deliveryAddress}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>NADRA</Text>
              <Text style={[styles.summaryValue, { color: '#16a34a' }]}>✓ Verified</Text>
            </View>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleConfirm}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Confirm Registration</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backBtn: { padding: 8 },
  backBtnText: { color: '#3B2F8F', fontSize: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1a1a2e', marginLeft: 8 },
  errorBox: {
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  errorText: { color: '#dc2626', fontSize: 13 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: { fontSize: 22, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 4 },
  cardSubtitle: { fontSize: 14, color: '#666', marginBottom: 20 },
  networkBtn: {
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 16,
    marginBottom: 10,
  },
  networkBtnText: { fontSize: 16, color: '#1a1a2e', fontWeight: '600' },
  textArea: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#1a1a2e',
    textAlignVertical: 'top',
    marginBottom: 12,
    minHeight: 100,
  },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  checkboxText: { fontSize: 14, color: '#444' },
  primaryBtn: {
    backgroundColor: '#3B2F8F',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  primaryBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  secondaryBtn: {
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  secondaryBtnText: { color: '#1a1a2e', fontWeight: '600', fontSize: 14 },
  row: { flexDirection: 'row', marginTop: 12 },
  fingerprintBox: {
    height: 180,
    backgroundColor: '#f0eeff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#3B2F8F33',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  fingerprintPlaceholder: { fontSize: 64 },
  capturedImage: { width: '100%', height: '100%' },
  verifiedBadge: {
    position: 'absolute',
    bottom: 8,
    backgroundColor: '#16a34a',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  verifiedBadgeText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  fingerprintHint: { fontSize: 13, color: '#666', textAlign: 'center', marginBottom: 4 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  summaryLabel: { fontSize: 14, color: '#666' },
  summaryValue: { fontSize: 14, fontWeight: 'bold', color: '#1a1a2e', maxWidth: '60%', textAlign: 'right' },
  successCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  successIcon: { fontSize: 64, marginBottom: 12 },
  successTitle: { fontSize: 24, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 8 },
  successSubtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20 },
  infoRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: { fontSize: 13, color: '#666' },
  infoValue: { fontSize: 13, fontWeight: 'bold', color: '#1a1a2e', maxWidth: '60%', textAlign: 'right' },
  cameraContainer: { flex: 1, backgroundColor: '#000' },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fingerprintGuide: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fingerprintGuideText: { fontSize: 52 },
  cameraHint: {
    color: '#fff',
    marginTop: 20,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  cameraControls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  cancelBtn: { width: 80, alignItems: 'center' },
  cancelBtnText: { color: '#fff', fontSize: 15 },
  captureBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff' },
});