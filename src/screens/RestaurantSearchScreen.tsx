import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import {
  geocodeAddress,
  searchNearbyRestaurants,
  distanceKm,
  formatDistance,
  PlaceResult,
} from '../services/PlacesService';
import { DatabaseService } from '../services/DatabaseService';
import { DEFAULT_LOCATION_KEY } from './SettingsScreen';

type Props = NativeStackScreenProps<RootStackParamList, 'RestaurantSearch'>;

const DEFAULT_REGION: Region = {
  latitude: 37.7749,
  longitude: -122.4194,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const RestaurantSearchScreen: React.FC<Props> = ({ navigation }) => {
  const [query, setQuery] = useState('');
  const [keyword, setKeyword] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [searchCenter, setSearchCenter] = useState<{ lat: number; lon: number } | null>(null);
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [selected, setSelected] = useState<PlaceResult | null>(null);
  const [adding, setAdding] = useState(false);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    DatabaseService.getSetting(DEFAULT_LOCATION_KEY).then(async (saved) => {
      if (saved) {
        setQuery(saved);
        const coords = await geocodeAddress(saved);
        if (coords) {
          runSearch(coords.lat, coords.lon);
        }
      }
    });
  }, []);

  const runSearch = async (lat: number, lon: number) => {
    setSearching(true);
    setResults([]);
    setSelected(null);
    try {
      const places = await searchNearbyRestaurants(lat, lon, 1500, keyword);
      const sorted = places.sort((a, b) =>
        distanceKm(lat, lon, a.lat, a.lon) - distanceKm(lat, lon, b.lat, b.lon)
      );
      setResults(sorted);
      setSearchCenter({ lat, lon });

      const newRegion: Region = {
        latitude: lat,
        longitude: lon,
        latitudeDelta: 0.03,
        longitudeDelta: 0.03,
      };
      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 600);

      if (sorted.length === 0) {
        Alert.alert('No results', 'No restaurants found nearby. Try a different location or expand your search.');
      }
    } catch (e: any) {
      console.error('Search error:', e);
      Alert.alert('Error', e?.message ?? 'Failed to search for restaurants.');
    } finally {
      setSearching(false);
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    const coords = await geocodeAddress(query.trim());
    if (!coords) {
      Alert.alert('Location not found', 'Could not find that address. Try a city name, zip code, or full address.');
      return;
    }
    await runSearch(coords.lat, coords.lon);
  };

  const handleUseLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Location access is needed to search near you.');
      return;
    }
    setSearching(true);
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await runSearch(loc.coords.latitude, loc.coords.longitude);
    } catch {
      Alert.alert('Error', 'Could not get your location.');
      setSearching(false);
    }
  };

  const handleMarkerPress = (place: PlaceResult) => {
    setSelected(place);
    mapRef.current?.animateToRegion(
      {
        latitude: place.lat,
        longitude: place.lon,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      400
    );
  };

  const handleAddRestaurant = async () => {
    if (!selected) return;
    setAdding(true);
    try {
      const id = await DatabaseService.createRestaurant({
        name: selected.name,
        address: selected.address,
        latitude: selected.lat,
        longitude: selected.lon,
        phone: selected.phone,
        website: selected.website,
        cuisine: selected.cuisine,
      });
      setSelected(null);
      Alert.alert('Added!', `${selected.name} has been added to your list.`, [
        { text: 'View', onPress: () => navigation.replace('RestaurantDetail', { restaurantId: id }) },
        { text: 'Keep Searching', style: 'cancel' },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to add restaurant.');
    } finally {
      setAdding(false);
    }
  };

  const renderResult = ({ item }: { item: PlaceResult }) => {
    const dist = item.distance != null ? formatDistance(item.distance) : null;
    const isSelected = selected?.fsqId === item.fsqId;

    return (
      <TouchableOpacity
        style={[styles.resultCard, isSelected && styles.resultCardSelected]}
        onPress={() => handleMarkerPress(item)}
      >
        <View style={styles.resultHeader}>
          <Text style={styles.resultName} numberOfLines={1}>{item.name}</Text>
          {dist && <Text style={styles.resultDist}>{dist}</Text>}
        </View>
        {item.cuisine && <Text style={styles.resultCuisine}>{item.cuisine}</Text>}
        {item.address && (
          <Text style={styles.resultAddress} numberOfLines={1}>{item.address}</Text>
        )}
        <Text style={styles.resultCategory}>{item.category}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Search bar */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="City, address, or zip code..."
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} disabled={searching}>
          <Ionicons name="search" size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.locationBtn} onPress={handleUseLocation} disabled={searching}>
          <Ionicons name="locate" size={20} color="#2196F3" />
        </TouchableOpacity>
      </View>

      <View style={styles.keywordBar}>
        <Ionicons name="restaurant-outline" size={16} color="#999" style={styles.keywordIcon} />
        <TextInput
          style={styles.keywordInput}
          placeholder="Search by type, e.g. pizza, tacos..."
          value={keyword}
          onChangeText={setKeyword}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {keyword.length > 0 && (
          <TouchableOpacity onPress={() => setKeyword('')}>
            <Ionicons name="close-circle" size={18} color="#bbb" />
          </TouchableOpacity>
        )}
      </View>

      {/* Map */}
      <MapView ref={mapRef} style={styles.map} region={region} onRegionChangeComplete={setRegion}>
        {results.map((place, index) => (
          <Marker
            key={place.fsqId ?? `place-${index}`}
            coordinate={{ latitude: place.lat, longitude: place.lon }}
            pinColor={selected?.fsqId === place.fsqId ? '#FF5722' : '#2196F3'}
            onPress={() => handleMarkerPress(place)}
          />
        ))}
      </MapView>

      {/* Loading overlay */}
      {searching && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      )}

      {/* Results list */}
      {results.length > 0 && (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsCount}>{results.length} restaurants found</Text>
          <FlatList
            data={results}
            renderItem={renderResult}
            keyExtractor={(item) => item.fsqId}
            contentContainerStyle={styles.listContent}
          />
        </View>
      )}

      {results.length === 0 && !searching && (
        <View style={styles.emptyState}>
          <Ionicons name="restaurant-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>Search for restaurants near an address or use your location</Text>
        </View>
      )}

      {/* Selected restaurant detail modal */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={styles.modalContainer}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setSelected(null)} />
          {selected && (
          <View style={styles.detailPanel}>
            <View style={styles.detailHandle} />
            <ScrollView>
              <View style={styles.detailHeader}>
                <Text style={styles.detailName}>{selected.name}</Text>
                <TouchableOpacity onPress={() => setSelected(null)}>
                  <Ionicons name="close" size={24} color="#999" />
                </TouchableOpacity>
              </View>

              <Text style={styles.detailCategory}>{selected.category}</Text>

              {selected.cuisine && (
                <View style={styles.detailRow}>
                  <Ionicons name="restaurant" size={16} color="#666" />
                  <Text style={styles.detailText}>{selected.cuisine}</Text>
                </View>
              )}
              {selected.address && (
                <View style={styles.detailRow}>
                  <Ionicons name="location" size={16} color="#666" />
                  <Text style={styles.detailText}>{selected.address}</Text>
                </View>
              )}
              {selected.phone && (
                <View style={styles.detailRow}>
                  <Ionicons name="call" size={16} color="#666" />
                  <Text
                    style={[styles.detailText, styles.detailLink]}
                    onPress={() => Linking.openURL(`tel:${selected.phone}`)}
                  >
                    {selected.phone}
                  </Text>
                </View>
              )}
              {selected.website && (
                <View style={styles.detailRow}>
                  <Ionicons name="globe-outline" size={16} color="#666" />
                  <Text
                    style={[styles.detailText, styles.detailLink]}
                    numberOfLines={1}
                    onPress={() => Linking.openURL(selected.website!)}
                  >
                    {selected.website}
                  </Text>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.addButton, adding && styles.addButtonDisabled]}
              onPress={handleAddRestaurant}
              disabled={adding}
            >
              <Ionicons name="add-circle-outline" size={20} color="#fff" />
              <Text style={styles.addButtonText}>{adding ? 'Adding...' : 'Add to My List'}</Text>
            </TouchableOpacity>
          </View>
          )}
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  searchBar: {
    flexDirection: 'row',
    padding: 12,
    paddingBottom: 6,
    backgroundColor: '#fff',
    alignItems: 'center',
    gap: 8,
  },
  keywordBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    alignItems: 'center',
    gap: 8,
  },
  keywordIcon: { marginLeft: 2 },
  keywordInput: {
    flex: 1,
    height: 36,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  searchInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  searchBtn: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationBtn: {
    borderWidth: 1,
    borderColor: '#2196F3',
    borderRadius: 8,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  map: { height: 260 },
  loadingOverlay: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  loadingText: { marginTop: 8, fontSize: 15, color: '#555' },
  resultsContainer: { flex: 1 },
  resultsCount: {
    fontSize: 13,
    color: '#888',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  listContent: { padding: 12, paddingBottom: 32 },
  resultCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  resultCardSelected: {
    borderWidth: 2,
    borderColor: '#FF5722',
  },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultName: { fontSize: 16, fontWeight: '600', color: '#222', flex: 1 },
  resultDist: { fontSize: 12, color: '#888', marginLeft: 8 },
  resultCuisine: { fontSize: 13, color: '#2196F3', marginTop: 2, fontWeight: '500' },
  resultAddress: { fontSize: 13, color: '#666', marginTop: 2 },
  resultCategory: { fontSize: 11, color: '#aaa', marginTop: 4 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { marginTop: 12, fontSize: 15, color: '#aaa', textAlign: 'center', lineHeight: 22 },
  // Modal / detail panel
  modalContainer: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
  detailPanel: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '55%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },
  detailHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#ddd',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  detailName: { fontSize: 20, fontWeight: 'bold', color: '#222', flex: 1, marginRight: 8 },
  detailCategory: { fontSize: 13, color: '#888', marginBottom: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  detailText: { fontSize: 14, color: '#444', flex: 1 },
  detailLink: { color: '#2196F3' },
  addButton: {
    flexDirection: 'row',
    backgroundColor: '#2196F3',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  addButtonDisabled: { backgroundColor: '#90CAF9' },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

export default RestaurantSearchScreen;
