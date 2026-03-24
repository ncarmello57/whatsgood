import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { DatabaseService } from '../services/DatabaseService';
import { MenuItem, Photo } from '../models/types';
import StarRating from 'react-native-star-rating-widget';

type Props = NativeStackScreenProps<RootStackParamList, 'EditVisit'>;

interface MenuItemForm {
  id?: number; // existing items have an id
  name: string;
  description: string;
  price: string;
  rating: number;
  notes: string;
  category: string;
  wouldOrderAgain: boolean;
  deleted: boolean;
}

const toForm = (item: MenuItem): MenuItemForm => ({
  id: item.id,
  name: item.name,
  description: item.description ?? '',
  price: item.price ? String(item.price) : '',
  rating: item.rating,
  notes: item.notes ?? '',
  category: item.category ?? '',
  wouldOrderAgain: item.wouldOrderAgain,
  deleted: false,
});

const EditVisitScreen: React.FC<Props> = ({ route, navigation }) => {
  const { visitId } = route.params;
  const [loading, setLoading] = useState(true);
  const [restaurantId, setRestaurantId] = useState(0);

  const [visitDate, setVisitDate] = useState('');
  const [overallRating, setOverallRating] = useState(3);
  const [visitNotes, setVisitNotes] = useState('');
  const [menuItems, setMenuItems] = useState<MenuItemForm[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<Photo[]>([]);
  const [newPhotoUris, setNewPhotoUris] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const visit = await DatabaseService.getVisitWithDetails(visitId);
        if (!visit) {
          Alert.alert('Error', 'Visit not found');
          navigation.goBack();
          return;
        }
        setRestaurantId(visit.restaurantId);
        setVisitDate(visit.visitDate);
        setOverallRating(visit.overallRating);
        setVisitNotes(visit.notes ?? '');
        setMenuItems(visit.menuItems.map(toForm));
        setExistingPhotos(visit.photos);
      } catch {
        Alert.alert('Error', 'Failed to load visit');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [visitId]);

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setNewPhotoUris(prev => [...prev, ...result.assets.map(a => a.uri)]);
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow camera access.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled) {
      setNewPhotoUris(prev => [...prev, result.assets[0].uri]);
    }
  };

  const handleDeleteExistingPhoto = (photoId: number) => {
    Alert.alert('Remove Photo', 'Remove this photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await DatabaseService.deletePhoto(photoId);
          setExistingPhotos(prev => prev.filter(p => p.id !== photoId));
        },
      },
    ]);
  };

  const addMenuItem = () => {
    setMenuItems(prev => [
      ...prev,
      { name: '', description: '', price: '', rating: 3, notes: '', category: '', wouldOrderAgain: true, deleted: false },
    ]);
  };

  const updateMenuItem = (index: number, field: keyof MenuItemForm, value: any) => {
    setMenuItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const markDeleted = (index: number) => {
    const item = menuItems[index];
    if (item.id) {
      // Existing DB item — mark for deletion
      updateMenuItem(index, 'deleted', true);
    } else {
      // New unsaved item — just remove from list
      setMenuItems(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleSave = async () => {
    const activeItems = menuItems.filter(i => !i.deleted);
    if (activeItems.length === 0 || !activeItems.some(i => i.name.trim())) {
      Alert.alert('Error', 'Please keep at least one menu item');
      return;
    }

    try {
      setSaving(true);

      await DatabaseService.updateVisit(visitId, {
        visitDate,
        overallRating,
        notes: visitNotes.trim() || undefined,
      });

      for (const item of menuItems) {
        if (item.deleted && item.id) {
          await DatabaseService.deleteMenuItem(item.id);
        } else if (!item.deleted && item.name.trim()) {
          if (item.id) {
            await DatabaseService.updateMenuItem(item.id, {
              name: item.name.trim(),
              description: item.description.trim() || undefined,
              price: item.price ? parseFloat(item.price) : undefined,
              rating: item.rating,
              notes: item.notes.trim() || undefined,
              category: item.category.trim() || undefined,
              wouldOrderAgain: item.wouldOrderAgain,
            });
          } else {
            await DatabaseService.createMenuItem({
              visitId,
              restaurantId,
              name: item.name.trim(),
              description: item.description.trim() || undefined,
              price: item.price ? parseFloat(item.price) : undefined,
              rating: item.rating,
              notes: item.notes.trim() || undefined,
              category: item.category.trim() || undefined,
              wouldOrderAgain: item.wouldOrderAgain,
            });
          }
        }
      }

      for (const uri of newPhotoUris) {
        await DatabaseService.createPhoto({ visitId, restaurantId, uri });
      }

      navigation.goBack();
    } catch (error) {
      console.error('Error updating visit:', error);
      Alert.alert('Error', 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  const allPhotos = [
    ...existingPhotos.map(p => ({ key: `e-${p.id}`, uri: p.uri, existing: true, id: p.id! })),
    ...newPhotoUris.map(uri => ({ key: `n-${uri}`, uri, existing: false, id: 0 })),
  ];

  const visibleItems = menuItems.map((item, index) => ({ item, index })).filter(({ item }) => !item.deleted);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Visit Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Visit Details</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Date</Text>
            <TextInput
              style={styles.input}
              value={visitDate}
              onChangeText={setVisitDate}
              placeholder="YYYY-MM-DD"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Overall Rating</Text>
            <StarRating rating={overallRating} onChange={setOverallRating} starSize={40} color="#F57C00" />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Visit Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={visitNotes}
              onChangeText={setVisitNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Menu Items</Text>
            <TouchableOpacity style={styles.addItemButton} onPress={addMenuItem}>
              <Text style={styles.addItemButtonText}>+ Add Item</Text>
            </TouchableOpacity>
          </View>

          {visibleItems.map(({ item, index }) => (
            <View key={index} style={styles.menuItemSection}>
              <View style={styles.menuItemHeader}>
                <Text style={styles.menuItemTitle}>{item.name || `Item ${index + 1}`}</Text>
                <TouchableOpacity onPress={() => markDeleted(index)}>
                  <Text style={styles.removeText}>Remove</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Item Name *</Text>
                <TextInput
                  style={styles.input}
                  value={item.name}
                  onChangeText={v => updateMenuItem(index, 'name', v)}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Category</Text>
                <TextInput
                  style={styles.input}
                  value={item.category}
                  onChangeText={v => updateMenuItem(index, 'category', v)}
                  placeholder="e.g., Appetizer, Entrée, Dessert"
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Price</Text>
                <TextInput
                  style={styles.input}
                  value={item.price}
                  onChangeText={v => updateMenuItem(index, 'price', v)}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Rating</Text>
                <StarRating
                  rating={item.rating}
                  onChange={v => updateMenuItem(index, 'rating', v)}
                  starSize={32}
                  color="#F57C00"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={styles.input}
                  value={item.description}
                  onChangeText={v => updateMenuItem(index, 'description', v)}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={item.notes}
                  onChangeText={v => updateMenuItem(index, 'notes', v)}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => updateMenuItem(index, 'wouldOrderAgain', !item.wouldOrderAgain)}
              >
                <View style={[styles.checkboxBox, item.wouldOrderAgain && styles.checkboxChecked]}>
                  {item.wouldOrderAgain && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>Would order again</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Photos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photos</Text>
          <View style={styles.photoButtons}>
            <TouchableOpacity style={styles.photoButton} onPress={handlePickPhoto}>
              <Text style={styles.photoButtonText}>Choose from Library</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoButton} onPress={handleTakePhoto}>
              <Text style={styles.photoButtonText}>Take Photo</Text>
            </TouchableOpacity>
          </View>
          {allPhotos.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoStrip}>
              {allPhotos.map(photo => (
                <View key={photo.key} style={styles.photoThumbContainer}>
                  <Image source={{ uri: photo.uri }} style={styles.photoThumb} />
                  <TouchableOpacity
                    style={styles.removePhotoButton}
                    onPress={() =>
                      photo.existing
                        ? handleDeleteExistingPhoto(photo.id)
                        : setNewPhotoUris(prev => prev.filter(u => u !== photo.uri))
                    }
                  >
                    <Text style={styles.removePhotoText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  content: { padding: 16 },
  section: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 16 },
  addItemButton: { backgroundColor: '#2196F3', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  addItemButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  formGroup: { marginBottom: 16 },
  label: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 8 },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: { height: 80, paddingTop: 12 },
  menuItemSection: { borderTopWidth: 1, borderTopColor: '#e0e0e0', paddingTop: 16, marginTop: 8 },
  menuItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  menuItemTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', flex: 1 },
  removeText: { color: '#f44336', fontSize: 14, fontWeight: '600' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  checkboxBox: {
    width: 24, height: 24,
    borderWidth: 2, borderColor: '#2196F3',
    borderRadius: 4, marginRight: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  checkboxChecked: { backgroundColor: '#2196F3' },
  checkmark: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  checkboxLabel: { fontSize: 16, color: '#333' },
  photoButtons: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  photoButton: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#2196F3',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  photoButtonText: { color: '#2196F3', fontSize: 14, fontWeight: '600' },
  photoStrip: { marginTop: 4 },
  photoThumbContainer: { marginRight: 8, position: 'relative' },
  photoThumb: { width: 80, height: 80, borderRadius: 8 },
  removePhotoButton: {
    position: 'absolute', top: -6, right: -6,
    backgroundColor: '#f44336', borderRadius: 10,
    width: 20, height: 20, alignItems: 'center', justifyContent: 'center',
  },
  removePhotoText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  saveButton: { backgroundColor: '#2196F3', borderRadius: 8, padding: 16, alignItems: 'center', marginBottom: 32 },
  saveButtonDisabled: { backgroundColor: '#90CAF9' },
  saveButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});

export default EditVisitScreen;
