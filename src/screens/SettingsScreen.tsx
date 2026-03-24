import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { DatabaseService } from '../services/DatabaseService';

export const DEFAULT_LOCATION_KEY = 'default_location';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const [defaultLocation, setDefaultLocation] = useState('');
  const [saved, setSaved] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    DatabaseService.getSetting(DEFAULT_LOCATION_KEY).then(val => {
      const v = val ?? '';
      setDefaultLocation(v);
      setSaved(v);
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    const trimmed = defaultLocation.trim();
    if (!trimmed) {
      Alert.alert('Empty', 'Please enter a location or tap Clear to remove the default.');
      return;
    }
    setSaving(true);
    try {
      await DatabaseService.setSetting(DEFAULT_LOCATION_KEY, trimmed);
      setSaved(trimmed);
      Alert.alert('Saved', `"${trimmed}" will be used as your default search location.`);
    } catch {
      Alert.alert('Error', 'Failed to save setting.');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    Alert.alert('Clear Default', 'Remove your default location?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await DatabaseService.deleteSetting(DEFAULT_LOCATION_KEY);
          setDefaultLocation('');
          setSaved('');
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location" size={20} color="#2196F3" />
            <Text style={styles.sectionTitle}>Default Search Location</Text>
          </View>
          <Text style={styles.sectionDesc}>
            Set a home address, city, state, or zip code to automatically search nearby restaurants when you open the Find Restaurants screen.
          </Text>

          <TextInput
            style={styles.input}
            value={defaultLocation}
            onChangeText={setDefaultLocation}
            placeholder="e.g. Charlotte, NC or 28277"
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />

          {saved ? (
            <View style={styles.currentRow}>
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              <Text style={styles.currentText}>Current: {saved}</Text>
            </View>
          ) : (
            <Text style={styles.noDefault}>No default location set</Text>
          )}

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save'}</Text>
            </TouchableOpacity>

            {saved ? (
              <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16 },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#222',
  },
  sectionDesc: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 10,
  },
  currentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  currentText: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '500',
  },
  noDefault: {
    fontSize: 13,
    color: '#aaa',
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  buttonDisabled: { backgroundColor: '#90CAF9' },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  clearButton: {
    borderWidth: 1,
    borderColor: '#f44336',
    borderRadius: 8,
    padding: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  clearButtonText: { color: '#f44336', fontSize: 16, fontWeight: '600' },
});

export default SettingsScreen;
