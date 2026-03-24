import React, { useState } from 'react';
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
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { DatabaseService } from '../services/DatabaseService';
import StarRating from 'react-native-star-rating-widget';

type Props = NativeStackScreenProps<RootStackParamList, 'AddVisit'>;

interface MenuItemInput {
  name: string;
  description: string;
  price: string;
  rating: number;
  notes: string;
  category: string;
  wouldOrderAgain: boolean;
}

const AddVisitScreen: React.FC<Props> = ({ route, navigation }) => {
  const { restaurantId } = route.params;
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);
  const [overallRating, setOverallRating] = useState(3);
  const [visitNotes, setVisitNotes] = useState('');
  const [menuItems, setMenuItems] = useState<MenuItemInput[]>([
    {
      name: '',
      description: '',
      price: '',
      rating: 3,
      notes: '',
      category: '',
      wouldOrderAgain: true,
    },
  ]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

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
      setPhotos(prev => [...prev, ...result.assets.map(a => a.uri)]);
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
      setPhotos(prev => [...prev, result.assets[0].uri]);
    }
  };

  const addMenuItem = () => {
    setMenuItems([
      ...menuItems,
      {
        name: '',
        description: '',
        price: '',
        rating: 3,
        notes: '',
        category: '',
        wouldOrderAgain: true,
      },
    ]);
  };

  const removeMenuItem = (index: number) => {
    if (menuItems.length > 1) {
      setMenuItems(menuItems.filter((_, i) => i !== index));
    }
  };

  const updateMenuItem = (index: number, field: keyof MenuItemInput, value: any) => {
    const updated = [...menuItems];
    updated[index] = { ...updated[index], [field]: value };
    setMenuItems(updated);
  };

  const handleSave = async () => {
    // Validate at least one menu item has a name
    const hasValidMenuItem = menuItems.some((item) => item.name.trim() !== '');
    
    if (!hasValidMenuItem) {
      Alert.alert('Error', 'Please add at least one menu item');
      return;
    }

    try {
      setSaving(true);

      // Create the visit
      const visitId = await DatabaseService.createVisit({
        restaurantId,
        visitDate,
        overallRating,
        notes: visitNotes.trim() || undefined,
      });

      // Create menu items
      for (const item of menuItems) {
        if (item.name.trim()) {
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

      // Save visit photos
      for (const uri of photos) {
        await DatabaseService.createPhoto({ visitId, restaurantId, uri });
      }

      Alert.alert('Success', 'Visit added successfully', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error('Error saving visit:', error);
      Alert.alert('Error', 'Failed to save visit');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
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
            <StarRating
              rating={overallRating}
              onChange={setOverallRating}
              starSize={40}
              color="#F57C00"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Visit Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={visitNotes}
              onChangeText={setVisitNotes}
              placeholder="How was your overall experience?"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Menu Items</Text>
            <TouchableOpacity style={styles.addItemButton} onPress={addMenuItem}>
              <Text style={styles.addItemButtonText}>+ Add Item</Text>
            </TouchableOpacity>
          </View>

          {menuItems.map((item, index) => (
            <View key={index} style={styles.menuItemSection}>
              <View style={styles.menuItemHeader}>
                <Text style={styles.menuItemTitle}>Item {index + 1}</Text>
                {menuItems.length > 1 && (
                  <TouchableOpacity onPress={() => removeMenuItem(index)}>
                    <Text style={styles.removeText}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Item Name *</Text>
                <TextInput
                  style={styles.input}
                  value={item.name}
                  onChangeText={(value) => updateMenuItem(index, 'name', value)}
                  placeholder="Enter dish name"
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Category</Text>
                <TextInput
                  style={styles.input}
                  value={item.category}
                  onChangeText={(value) => updateMenuItem(index, 'category', value)}
                  placeholder="e.g., Appetizer, Entrée, Dessert"
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Price</Text>
                <TextInput
                  style={styles.input}
                  value={item.price}
                  onChangeText={(value) => updateMenuItem(index, 'price', value)}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Rating</Text>
                <StarRating
                  rating={item.rating}
                  onChange={(value) => updateMenuItem(index, 'rating', value)}
                  starSize={32}
                  color="#F57C00"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={styles.input}
                  value={item.description}
                  onChangeText={(value) => updateMenuItem(index, 'description', value)}
                  placeholder="Describe the dish"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={item.notes}
                  onChangeText={(value) => updateMenuItem(index, 'notes', value)}
                  placeholder="Your thoughts on this item..."
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.checkboxContainer}>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => updateMenuItem(index, 'wouldOrderAgain', !item.wouldOrderAgain)}
                >
                  <View style={[styles.checkboxBox, item.wouldOrderAgain && styles.checkboxChecked]}>
                    {item.wouldOrderAgain && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.checkboxLabel}>Would order again</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

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
          {photos.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoStrip}>
              {photos.map(uri => (
                <View key={uri} style={styles.photoThumbContainer}>
                  <Image source={{ uri }} style={styles.photoThumb} />
                  <TouchableOpacity
                    style={styles.removePhotoButton}
                    onPress={() => setPhotos(prev => prev.filter(p => p !== uri))}
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
          <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Visit'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  addItemButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addItemButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    paddingTop: 12,
  },
  menuItemSection: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 16,
    marginTop: 16,
  },
  menuItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  menuItemTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  removeText: {
    color: '#f44336',
    fontSize: 14,
    fontWeight: '600',
  },
  checkboxContainer: {
    marginTop: 8,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#2196F3',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#2196F3',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#333',
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  photoButton: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#2196F3',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  photoButtonText: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '600',
  },
  photoStrip: {
    marginTop: 4,
  },
  photoThumbContainer: {
    marginRight: 8,
    position: 'relative',
  },
  photoThumb: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#f44336',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePhotoText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 32,
  },
  saveButtonDisabled: {
    backgroundColor: '#90CAF9',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default AddVisitScreen;
