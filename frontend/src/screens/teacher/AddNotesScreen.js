import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SPACING, RADIUS } from '../../styles/theme';
import { apiUpload } from '../../utils/auth';

const TABS = ['text', 'pdf', 'image'];
const TAB_LABELS = { text: '📝 Type Text', pdf: '📕 Upload PDF', image: '🖼️ Upload Image' };

export default function AddNotesScreen({ navigation, route }) {
  const { classroomId, onAdded } = route.params;
  const [activeTab, setActiveTab] = useState('text');
  const [title, setTitle] = useState('');
  const [textContent, setTextContent] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const pickPDF = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
    if (!result.canceled && result.assets?.[0]) {
      setSelectedFile(result.assets[0]);
    }
  };

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      setSelectedFile(result.assets[0]);
    }
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission Required', 'Please allow camera access');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled && result.assets?.[0]) {
      setSelectedFile(result.assets[0]);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a note title');
      return;
    }
    if (activeTab === 'text' && !textContent.trim()) {
      Alert.alert('Error', 'Please enter some text content');
      return;
    }
    if ((activeTab === 'pdf' || activeTab === 'image') && !selectedFile) {
      Alert.alert('Error', `Please select a ${activeTab.toUpperCase()} file`);
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', title.trim());

      if (activeTab === 'text') {
        formData.append('text_content', textContent.trim());
      } else {
        const file = selectedFile;
        const fileName = file.name || file.uri.split('/').pop();
        const mimeType = activeTab === 'pdf' ? 'application/pdf' : (file.mimeType || 'image/jpeg');
        formData.append('file', {
          uri: file.uri,
          type: mimeType,
          name: fileName,
        });
      }

      await apiUpload(`/notes/classroom/${classroomId}`, formData);
      Alert.alert('Success', 'Note uploaded! AI has extracted and indexed the content.', [
        { text: 'OK', onPress: () => { if (onAdded) onAdded(); navigation.goBack(); } },
      ]);
    } catch (error) {
      Alert.alert('Upload Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#0F0F1A', '#1A0A2E', '#0F0F1A']} style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Add Notes</Text>
          <Text style={styles.subtitle}>AI will extract and learn from your notes to create tests</Text>

          {/* Title */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Note Title</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Chapter 3 - Photosynthesis"
              placeholderTextColor={COLORS.textMuted}
              value={title}
              onChangeText={setTitle}
            />
          </View>

          {/* Tab Selector */}
          <View style={styles.tabBar}>
            {TABS.map(tab => (
              <TouchableOpacity
                key={tab}
                style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
                onPress={() => { setActiveTab(tab); setSelectedFile(null); }}
              >
                <Text style={[styles.tabBtnText, activeTab === tab && styles.tabBtnTextActive]}>
                  {TAB_LABELS[tab]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab Content */}
          <View style={styles.tabContent}>
            {activeTab === 'text' && (
              <TextInput
                style={styles.textArea}
                placeholder="Type or paste your notes here..."
                placeholderTextColor={COLORS.textMuted}
                value={textContent}
                onChangeText={setTextContent}
                multiline
                numberOfLines={12}
                textAlignVertical="top"
              />
            )}

            {activeTab === 'pdf' && (
              <View style={styles.filePickerContainer}>
                <Text style={{ fontSize: 48, marginBottom: SPACING.md }}>📕</Text>
                {selectedFile ? (
                  <View style={styles.selectedFileBox}>
                    <Text style={styles.selectedFileName}>{selectedFile.name || 'PDF Selected'}</Text>
                    <TouchableOpacity onPress={() => setSelectedFile(null)}>
                      <Text style={{ color: COLORS.error, marginTop: SPACING.sm }}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.pickBtn} onPress={pickPDF}>
                    <Text style={styles.pickBtnText}>Choose PDF File</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {activeTab === 'image' && (
              <View style={styles.filePickerContainer}>
                <Text style={{ fontSize: 48, marginBottom: SPACING.md }}>🖼️</Text>
                {selectedFile ? (
                  <View style={styles.selectedFileBox}>
                    <Text style={styles.selectedFileName}>Image selected</Text>
                    <TouchableOpacity onPress={() => setSelectedFile(null)}>
                      <Text style={{ color: COLORS.error, marginTop: SPACING.sm }}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{ gap: SPACING.md, width: '100%' }}>
                    <TouchableOpacity style={styles.pickBtn} onPress={pickImage}>
                      <Text style={styles.pickBtnText}>📷 Choose from Gallery</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.pickBtn} onPress={takePhoto}>
                      <Text style={styles.pickBtnText}>📸 Take a Photo</Text>
                    </TouchableOpacity>
                  </View>
                )}
                <Text style={styles.ocrNote}>
                  💡 AI will automatically read and extract text from the image, including handwritten notes
                </Text>
              </View>
            )}
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.gradientBtn}>
              {loading ? (
                <View style={{ flexDirection: 'row', gap: SPACING.sm, alignItems: 'center' }}>
                  <ActivityIndicator color="#fff" />
                  <Text style={styles.submitBtnText}>Uploading & Extracting...</Text>
                </View>
              ) : (
                <Text style={styles.submitBtnText}>Upload Note</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: SPACING.xl, paddingTop: 60 },
  backBtn: { marginBottom: SPACING.lg },
  backText: { color: COLORS.primaryLight, fontSize: 14, fontWeight: '600' },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.textPrimary, marginBottom: SPACING.xs },
  subtitle: { fontSize: 13, color: COLORS.textMuted, marginBottom: SPACING.xl, lineHeight: 20 },
  inputGroup: { gap: SPACING.xs, marginBottom: SPACING.lg },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  input: {
    backgroundColor: COLORS.bgInput, borderRadius: RADIUS.md,
    paddingVertical: SPACING.md, paddingHorizontal: SPACING.md,
    color: COLORS.textPrimary, fontSize: 15, borderWidth: 1, borderColor: COLORS.border,
  },
  tabBar: { flexDirection: 'column', gap: SPACING.sm, marginBottom: SPACING.lg },
  tabBtn: {
    paddingVertical: SPACING.sm + 2, paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard, alignItems: 'center',
  },
  tabBtnActive: { borderColor: COLORS.primary, backgroundColor: 'rgba(108,99,255,0.12)' },
  tabBtnText: { color: COLORS.textMuted, fontSize: 14, fontWeight: '600' },
  tabBtnTextActive: { color: COLORS.primary },
  tabContent: { marginBottom: SPACING.xl },
  textArea: {
    backgroundColor: COLORS.bgInput, borderRadius: RADIUS.md,
    padding: SPACING.md, color: COLORS.textPrimary, fontSize: 14,
    borderWidth: 1, borderColor: COLORS.border, minHeight: 200, lineHeight: 22,
  },
  filePickerContainer: {
    alignItems: 'center', backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg, padding: SPACING.xl,
    borderWidth: 1.5, borderColor: COLORS.border, borderStyle: 'dashed',
  },
  pickBtn: {
    backgroundColor: 'rgba(108,99,255,0.15)', borderRadius: RADIUS.md,
    paddingVertical: SPACING.md, paddingHorizontal: SPACING.xl,
    borderWidth: 1, borderColor: COLORS.primary,
  },
  pickBtnText: { color: COLORS.primary, fontSize: 15, fontWeight: '600', textAlign: 'center' },
  selectedFileBox: { alignItems: 'center' },
  selectedFileName: { color: COLORS.success, fontSize: 15, fontWeight: '600' },
  ocrNote: { color: COLORS.textMuted, fontSize: 12, textAlign: 'center', marginTop: SPACING.md, lineHeight: 18 },
  submitBtn: { borderRadius: RADIUS.full, overflow: 'hidden' },
  gradientBtn: { paddingVertical: SPACING.md + 2, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
