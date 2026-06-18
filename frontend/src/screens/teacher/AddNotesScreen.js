import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SPACING, RADIUS } from '../../styles/theme';
import { apiUpload } from '../../utils/auth';

const TABS = ['word', 'pdf', 'image'];
const TAB_LABELS = { word: '📄 Upload Word', pdf: '📕 Upload PDF', image: '🖼️ Upload Image' };

// Web-compatible alert
const showAlert = (title, message) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}: ${message}`);
  } else {
    Alert.alert(title, message);
  }
};

export default function AddNotesScreen({ navigation, route }) {
  const { classroomId, onAdded } = route.params;
  const [activeTab, setActiveTab] = useState('word');
  const [title, setTitle] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]); // Array of { name, uri, type, webFile? }
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  // ── Word picker ─────────────────────────────────────────────
  const pickWord = async () => {
    if (Platform.OS === 'web') {
      fileInputRef.current?.click();
      return;
    }
    const result = await DocumentPicker.getDocumentAsync({ 
      type: [
        'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ], 
      multiple: true 
    });
    if (!result.canceled && result.assets?.length > 0) {
      const newFiles = result.assets.map(asset => ({ name: asset.name, uri: asset.uri, type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }));
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const onWebWordChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const newFiles = files.map(file => ({ name: file.name, uri: URL.createObjectURL(file), type: file.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', webFile: file }));
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  };

  // ── PDF picker ──────────────────────────────────────────────
  const pickPDF = async () => {
    if (Platform.OS === 'web') {
      fileInputRef.current?.click();
      return;
    }
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', multiple: true });
    if (!result.canceled && result.assets?.length > 0) {
      const newFiles = result.assets.map(asset => ({ name: asset.name, uri: asset.uri, type: 'application/pdf' }));
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const onWebPDFChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const newFiles = files.map(file => ({ name: file.name, uri: URL.createObjectURL(file), type: 'application/pdf', webFile: file }));
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  };

  // ── Image picker ─────────────────────────────────────────────
  const pickImage = async () => {
    if (Platform.OS === 'web') {
      imageInputRef.current?.click();
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showAlert('Permission Required', 'Please allow access to your photo library');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsMultipleSelection: true,
    });
    if (!result.canceled && result.assets?.length > 0) {
      const newFiles = result.assets.map(asset => ({ name: asset.fileName || 'image.jpg', uri: asset.uri, type: asset.mimeType || 'image/jpeg' }));
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const onWebImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const newFiles = files.map(file => ({ name: file.name, uri: URL.createObjectURL(file), type: file.type, webFile: file }));
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const takePhoto = async () => {
    if (Platform.OS === 'web') {
      showAlert('Info', 'On web, use "Choose from Gallery" to pick an image file');
      return;
    }
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      showAlert('Permission Required', 'Please allow camera access');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      setSelectedFiles(prev => [...prev, { name: 'photo.jpg', uri: asset.uri, type: 'image/jpeg' }]);
    }
  };

  // ── Submit ────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!title.trim()) {
      showAlert('Error', 'Please enter a note title');
      return;
    }
    if ((activeTab === 'word' || activeTab === 'pdf' || activeTab === 'image') && selectedFiles.length === 0) {
      showAlert('Error', `Please select at least one ${activeTab.toUpperCase()} file`);
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', title.trim());

      selectedFiles.forEach(fileObj => {
        if (Platform.OS === 'web' && fileObj.webFile) {
          formData.append('files', fileObj.webFile, fileObj.name);
        } else {
          formData.append('files', {
            uri: fileObj.uri,
            type: fileObj.type,
            name: fileObj.name,
          });
        }
      });

      await apiUpload(`/notes/classroom/${classroomId}`, formData);

      if (Platform.OS === 'web') {
        window.alert('Success: Note uploaded! AI has extracted and indexed the content.');
        if (onAdded) onAdded();
        navigation.goBack();
      } else {
        Alert.alert('Success', 'Note uploaded! AI has extracted and indexed the content.', [
          { text: 'OK', onPress: () => { if (onAdded) onAdded(); navigation.goBack(); } },
        ]);
      }
    } catch (error) {
      showAlert('Upload Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Add Notes</Text>
          <Text style={styles.subtitle}>AI will extract and learn from your notes to create tests</Text>

          {/* Hidden web file inputs */}
          {Platform.OS === 'web' && (
            <>
              {activeTab === 'word' && <input ref={fileInputRef} type="file" accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" multiple style={{ display: 'none' }} onChange={onWebWordChange} />}
              {activeTab === 'pdf' && <input ref={fileInputRef} type="file" accept="application/pdf" multiple style={{ display: 'none' }} onChange={onWebPDFChange} />}
              <input ref={imageInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={onWebImageChange} />
            </>
          )}

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
                onPress={() => { setActiveTab(tab); setSelectedFiles([]); }}
              >
                <Text style={[styles.tabBtnText, activeTab === tab && styles.tabBtnTextActive]}>
                  {TAB_LABELS[tab]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab Content */}
          <View style={styles.tabContent}>
            {activeTab === 'word' && (
              <View style={styles.filePickerContainer}>
                <Text style={{ fontSize: 48, marginBottom: SPACING.md }}>📄</Text>
                {selectedFiles.length > 0 ? (
                  <View style={styles.selectedFileBox}>
                    {selectedFiles.map((f, i) => <Text key={i} style={styles.selectedFileName}>✅ {f.name}</Text>)}
                    <TouchableOpacity onPress={() => setSelectedFiles([])}>
                      <Text style={{ color: COLORS.error, marginTop: SPACING.sm }}>Remove All</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.pickBtn} onPress={pickWord}>
                    <Text style={styles.pickBtnText}>Choose Word Files</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {activeTab === 'pdf' && (
              <View style={styles.filePickerContainer}>
                <Text style={{ fontSize: 48, marginBottom: SPACING.md }}>📕</Text>
                {selectedFiles.length > 0 ? (
                  <View style={styles.selectedFileBox}>
                    {selectedFiles.map((f, i) => <Text key={i} style={styles.selectedFileName}>✅ {f.name}</Text>)}
                    <TouchableOpacity onPress={() => setSelectedFiles([])}>
                      <Text style={{ color: COLORS.error, marginTop: SPACING.sm }}>Remove All</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.pickBtn} onPress={pickPDF}>
                    <Text style={styles.pickBtnText}>Choose PDF Files</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {activeTab === 'image' && (
              <View style={styles.filePickerContainer}>
                <Text style={{ fontSize: 48, marginBottom: SPACING.md }}>🖼️</Text>
                {selectedFiles.length > 0 ? (
                  <View style={styles.selectedFileBox}>
                    {selectedFiles.map((f, i) => <Text key={i} style={styles.selectedFileName}>✅ {f.name}</Text>)}
                    <TouchableOpacity onPress={() => setSelectedFiles([])}>
                      <Text style={{ color: COLORS.error, marginTop: SPACING.sm }}>Remove All</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{ gap: SPACING.md, width: '100%' }}>
                    <TouchableOpacity style={styles.pickBtn} onPress={pickImage}>
                      <Text style={styles.pickBtnText}>📷 Choose from Gallery (Multiple)</Text>
                    </TouchableOpacity>
                    {Platform.OS !== 'web' && (
                      <TouchableOpacity style={styles.pickBtn} onPress={takePhoto}>
                        <Text style={styles.pickBtnText}>📸 Take a Photo</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
                <Text style={styles.ocrNote}>
                  💡 AI will automatically read and extract text from the images, including handwritten notes
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
            <BlurView intensity={40} tint="light" style={[styles.gradientBtn, { backgroundColor: 'rgba(108,99,255,0.3)', borderWidth: 1.5, borderColor: 'rgba(108,99,255,0.6)' }]}>
              {loading ? (
                <View style={{ flexDirection: 'row', gap: SPACING.sm, alignItems: 'center' }}>
                  <ActivityIndicator color="#fff" />
                  <Text style={styles.submitBtnText}>Uploading & Extracting...</Text>
                </View>
              ) : (
                <Text style={styles.submitBtnText}>Upload Note</Text>
              )}
            </BlurView>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
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
    alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: RADIUS.lg, padding: SPACING.xl,
    borderWidth: 1.5, borderColor: COLORS.border, borderStyle: 'dashed', overflow: 'hidden',
  },
  pickBtn: {
    backgroundColor: 'rgba(108,99,255,0.15)', borderRadius: RADIUS.md,
    paddingVertical: SPACING.md, paddingHorizontal: SPACING.xl,
    borderWidth: 1, borderColor: COLORS.primary, width: '100%',
  },
  pickBtnText: { color: COLORS.primary, fontSize: 15, fontWeight: '600', textAlign: 'center' },
  selectedFileBox: { alignItems: 'center' },
  selectedFileName: { color: COLORS.success, fontSize: 15, fontWeight: '600', textAlign: 'center' },
  ocrNote: { color: COLORS.textMuted, fontSize: 12, textAlign: 'center', marginTop: SPACING.md, lineHeight: 18 },
  submitBtn: { borderRadius: RADIUS.full, overflow: 'hidden' },
  gradientBtn: { paddingVertical: SPACING.md + 2, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
