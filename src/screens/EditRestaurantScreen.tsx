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
  Switch,
  Image,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import StarRating from 'react-native-star-rating-widget';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { DatabaseService } from '../services/DatabaseService';
import { Photo } from '../models/types';

type Props = NativeStackScreenProps<RootStackParamList, 'EditRestaurant'>;

const EditRestaurantScreen: React.FC<Props> = ({ route, navigation }) => {
  const { restaurantId } = route.params;
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [notes, setNotes] = useState('');
  const [rating, setRating] = useState(0);
  const [dogFriendly, setDogFriendly] = useState(false);
  const [outsideSeating, setOutsideSeating] = useState(false);
  const [existingPhotos, setExistingPhotos] = useState<Photo[]>([]);
  const [newPhotoUris, setNewPhotoUris] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [restaurant, photos] = await Promise.all([
          DatabaseService.getRestaurantById(restaurantId),
          DatabaseService.getPhotosByRestaurant(restaurantId),
        ]);
        if (!restaurant) {
          Alert.alert('Error', 'Restaurant not found');
          navigation.goBack();
          return;
        }
        setName(restaurant.name);
        setCuisine(restaurant.cuisine ?? '');
        setAddress(restaurant.address ?? '');
        setPhone(restaurant.phone ?? '');
        setWebsite(restaurant.website ?? '');
        setNotes(restaurant.notes ?? '');
        setRating(restaurant.rating ?? 0);
        setDogFriendly(restaurant.dogFriendly ?? false);
        setOutsideSeating(restaurant.outsideSeating ?? false);
        setExistingPhotos(photos);
      } catch {
        Alert.alert('Error', 'Failed to load restaurant');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [restaurantId]);

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

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a restaurant name');
      return;
    }
    try {
      setSaving(true);
      await DatabaseService.updateRestaurant(restaurantId, {
        name: name.trim(),
        cuisine: cuisine.trim() || undefined,
        address: address.trim() || undefined,
        phone: phone.trim() || undefined,
        website: website.trim() || undefined,
        notes: notes.trim() || undefined,
        rating: rating > 0 ? rating : undefined,
        dogFriendly,
        outsideSeating,
      });
      for (const uri of newPhotoUris) {
        await DatabaseService.createPhoto({ restaurantId, uri });
      }
      navigation.goBack();
    } catch (error) {
      console.error('Error updating restaurant:', error);
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Restaurant Name *</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} autoCapitalize="words" />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Cuisine Type</Text>
          <TextInput style={styles.input} value={cuisine} onChangeText={setCuisine} autoCapitalize="words" />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Address</Text>
          <TextInput style={styles.input} value={address} onChangeText={setAddress} autoCapitalize="words" />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Phone</Text>
          <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Website</Text>
          <TextInput
            style={styles.input}
            value={website}
            onChangeText={setWebsite}
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Your Rating</Text>
          <StarRating rating={rating} onChange={setRating} starSize={36} color="#F57C00" />
        </View>

        <View style={styles.toggleRow}>
          <Text style={styles.label}>Dog Friendly</Text>
          <Switch value={dogFriendly} onValueChange={setDogFriendly} />
        </View>

        <View style={styles.toggleRow}>
          <Text style={styles.label}>Outside Seating</Text>
          <Switch value={outsideSeating} onValueChange={setOutsideSeating} />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Photos</Text>
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
  formGroup: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 8 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: { height: 100, paddingTop: 12 },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  photoButtons: { flexDirection: 'row', gap: 12 },
  photoButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#2196F3',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  photoButtonText: { color: '#2196F3', fontSize: 14, fontWeight: '600' },
  photoStrip: { marginTop: 12 },
  photoThumbContainer: { marginRight: 8, position: 'relative' },
  photoThumb: { width: 80, height: 80, borderRadius: 8 },
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
  removePhotoText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  saveButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  saveButtonDisabled: { backgroundColor: '#90CAF9' },
  saveButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});

export default EditRestaurantScreen;
