import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StarRating from 'react-native-star-rating-widget';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { DatabaseService } from '../services/DatabaseService';
import { RestaurantWithStats } from '../models/types';

type Props = NativeStackScreenProps<RootStackParamList, 'RestaurantList'>;

const RestaurantListScreen: React.FC<Props> = ({ navigation }) => {
  React.useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', gap: 12, marginRight: 4 }}>
          <TouchableOpacity onPress={() => navigation.navigate('RestaurantSearch')}>
            <Ionicons name="map-outline" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
            <Ionicons name="settings-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      ),
    });
  }, []);
  const [restaurants, setRestaurants] = useState<RestaurantWithStats[]>([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState<RestaurantWithStats[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const loadRestaurants = async () => {
    try {
      setLoading(true);
      const data = await DatabaseService.getRestaurantsWithStats();
      setRestaurants(data);
      setFilteredRestaurants(data);
    } catch (error) {
      console.error('Error loading restaurants:', error);
      Alert.alert('Error', 'Failed to load restaurants');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadRestaurants();
    }, [])
  );

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredRestaurants(restaurants);
    } else {
      const filtered = restaurants.filter(
        (r) =>
          r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (r.cuisine && r.cuisine.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (r.address && r.address.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredRestaurants(filtered);
    }
  }, [searchQuery, restaurants]);

  const renderRestaurantItem = ({ item }: { item: RestaurantWithStats }) => (
    <TouchableOpacity
      style={styles.restaurantCard}
      onPress={() => navigation.navigate('RestaurantDetail', { restaurantId: item.id! })}
    >
      <View style={styles.restaurantHeader}>
        <Text style={styles.restaurantName}>{item.name}</Text>
        {(item.rating ?? item.averageRating) > 0 && (
          <StarRating
            rating={item.rating ?? item.averageRating}
            onChange={() => {}}
            starSize={16}
            color="#F57C00"
            style={styles.starRating}
          />
        )}
      </View>
      
      {item.cuisine && (
        <Text style={styles.cuisineText}>{item.cuisine}</Text>
      )}
      
      {item.address && (
        <Text style={styles.addressText} numberOfLines={1}>{item.address}</Text>
      )}
      
      {(item.dogFriendly || item.outsideSeating || item.website || item.phone) && (
        <View style={styles.tagsRow}>
          {item.dogFriendly && (
            <View style={styles.tag}>
              <Ionicons name="paw" size={12} color="#555" />
              <Text style={styles.tagText}>Dog Friendly</Text>
            </View>
          )}
          {item.outsideSeating && (
            <View style={styles.tag}>
              <Ionicons name="sunny" size={12} color="#555" />
              <Text style={styles.tagText}>Outside Seating</Text>
            </View>
          )}
          {item.website && (
            <TouchableOpacity
              style={[styles.tag, styles.websiteTag]}
              onPress={() => Linking.openURL(item.website!)}
            >
              <Ionicons name="globe-outline" size={12} color="#2196F3" />
              <Text style={styles.websiteTagText}>Website</Text>
            </TouchableOpacity>
          )}
          {item.phone && (
            <TouchableOpacity
              style={[styles.tag, styles.phoneTag]}
              onPress={() => Linking.openURL(`tel:${item.phone}`)}
            >
              <Ionicons name="call" size={12} color="#4CAF50" />
              <Text style={styles.phoneTagText}>{item.phone}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>
          {item.visitCount} {item.visitCount === 1 ? 'visit' : 'visits'}
        </Text>
        {item.lastVisitDate && (
          <Text style={styles.statsText}>
            Last: {new Date(item.lastVisitDate).toLocaleDateString()}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search restaurants..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
        />
      </View>

      {filteredRestaurants.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {searchQuery ? 'No restaurants found' : 'No restaurants yet'}
          </Text>
          {!searchQuery && (
            <Text style={styles.emptySubtext}>
              Tap the + button below to add your first restaurant
            </Text>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredRestaurants}
          renderItem={renderRestaurantItem}
          keyExtractor={(item) => item.id!.toString()}
          contentContainerStyle={styles.listContent}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddRestaurant')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  listContent: {
    padding: 16,
  },
  restaurantCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  restaurantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  restaurantName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  starRating: {
    alignSelf: 'flex-end',
  },
  cuisineText: {
    fontSize: 14,
    color: '#2196F3',
    marginBottom: 4,
    fontWeight: '500',
  },
  addressText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  tagText: {
    fontSize: 12,
    color: '#555',
  },
  websiteTag: {
    backgroundColor: '#E3F2FD',
  },
  websiteTagText: {
    fontSize: 12,
    color: '#2196F3',
  },
  phoneTag: {
    backgroundColor: '#E8F5E9',
  },
  phoneTagText: {
    fontSize: 12,
    color: '#4CAF50',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  statsText: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bbb',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  fabText: {
    fontSize: 32,
    color: '#fff',
    fontWeight: '300',
  },
});

export default RestaurantListScreen;
