import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  Linking,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { DatabaseService } from '../services/DatabaseService';
import { Restaurant, Visit, MenuItem, Photo } from '../models/types';
import StarRating from 'react-native-star-rating-widget';
import { Ionicons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<RootStackParamList, 'RestaurantDetail'>;

const RestaurantDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { restaurantId } = route.params;
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [topItems, setTopItems] = useState<MenuItem[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={() => navigation.navigate('EditRestaurant', { restaurantId })}>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600', marginRight: 4 }}>Edit</Text>
        </TouchableOpacity>
      ),
    });
  }, [restaurantId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [restaurantData, visitsData, topItemsData, photosData] = await Promise.all([
        DatabaseService.getRestaurantById(restaurantId),
        DatabaseService.getVisitsByRestaurant(restaurantId),
        DatabaseService.getTopMenuItems(restaurantId, 5),
        DatabaseService.getPhotosByRestaurant(restaurantId),
      ]);

      setRestaurant(restaurantData);
      setVisits(visitsData);
      setTopItems(topItemsData);
      setPhotos(photosData);
    } catch (error) {
      console.error('Error loading restaurant data:', error);
      Alert.alert('Error', 'Failed to load restaurant details');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [restaurantId])
  );

  const handleDeleteRestaurant = () => {
    Alert.alert(
      'Delete Restaurant',
      'Are you sure you want to delete this restaurant? This will also delete all visits and menu items.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await DatabaseService.deleteRestaurant(restaurantId);
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete restaurant');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  if (!restaurant) {
    return (
      <View style={styles.centerContainer}>
        <Text>Restaurant not found</Text>
      </View>
    );
  }

  const averageRating = visits.length > 0
    ? visits.reduce((sum, v) => sum + v.overallRating, 0) / visits.length
    : 0;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.restaurantName}>{restaurant.name}</Text>
        {(restaurant.rating ?? averageRating) > 0 && (
          <StarRating
            rating={restaurant.rating ?? averageRating}
            onChange={() => {}}
            starSize={28}
            color="#F57C00"
          />
        )}
      </View>

      {restaurant.cuisine && (
        <Text style={styles.cuisineText}>{restaurant.cuisine}</Text>
      )}

      {restaurant.address && (
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Address:</Text>
          <Text style={styles.infoText}>{restaurant.address}</Text>
        </View>
      )}

      {restaurant.phone && (
        <TouchableOpacity
          style={styles.infoRow}
          onPress={() => Linking.openURL(`tel:${restaurant.phone}`)}
        >
          <View style={styles.infoLabelRow}>
            <Ionicons name="call" size={14} color="#4CAF50" style={styles.infoIcon} />
            <Text style={styles.infoLabel}>Phone:</Text>
          </View>
          <Text style={[styles.infoText, styles.phoneLink]}>{restaurant.phone}</Text>
        </TouchableOpacity>
      )}

      {restaurant.website && (
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Website:</Text>
          <Text
            style={[styles.infoText, styles.link]}
            onPress={() => Linking.openURL(restaurant.website!)}
          >
            {restaurant.website}
          </Text>
        </View>
      )}

      {(restaurant.dogFriendly || restaurant.outsideSeating) && (
        <View style={styles.badgeRow}>
          {restaurant.dogFriendly && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>🐶 Dog Friendly</Text>
            </View>
          )}
          {restaurant.outsideSeating && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>☀️ Outside Seating</Text>
            </View>
          )}
        </View>
      )}

      {restaurant.notes && (
        <View style={styles.notesContainer}>
          <Text style={styles.notesLabel}>Notes:</Text>
          <Text style={styles.notesText}>{restaurant.notes}</Text>
        </View>
      )}

      {photos.length > 0 && (
        <View style={styles.photosContainer}>
          <Text style={styles.photosLabel}>Photos</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {photos.map(photo => (
              <Image key={photo.id} source={{ uri: photo.uri }} style={styles.photo} />
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Visits ({visits.length})</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('AddVisit', { restaurantId })}
          >
            <Text style={styles.addButtonText}>+ Add Visit</Text>
          </TouchableOpacity>
        </View>

        {visits.length === 0 ? (
          <Text style={styles.emptyText}>No visits yet. Add your first visit!</Text>
        ) : (
          visits.map((visit) => (
            <TouchableOpacity
              key={visit.id}
              style={styles.visitCard}
              onPress={() => navigation.navigate('VisitDetail', { visitId: visit.id! })}
            >
              <View style={styles.visitHeader}>
                <Text style={styles.visitDate}>
                  {new Date(visit.visitDate).toLocaleDateString()}
                </Text>
                <StarRating rating={visit.overallRating} onChange={() => {}} starSize={16} color="#F57C00" />
              </View>
              {visit.notes && (
                <Text style={styles.visitNotes} numberOfLines={2}>
                  {visit.notes}
                </Text>
              )}
            </TouchableOpacity>
          ))
        )}
      </View>

      {topItems.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Rated Items</Text>
          {topItems.map((item) => (
            <View key={item.id} style={styles.menuItemCard}>
              <View style={styles.menuItemHeader}>
                <Text style={styles.menuItemName}>{item.name}</Text>
                <StarRating rating={item.rating} onChange={() => {}} starSize={16} color="#F57C00" />
              </View>
              {item.notes && (
                <Text style={styles.menuItemNotes} numberOfLines={2}>
                  {item.notes}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteRestaurant}>
        <Text style={styles.deleteButtonText}>Delete Restaurant</Text>
      </TouchableOpacity>

      <View style={styles.bottomSpacer} />
    </ScrollView>
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
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  restaurantName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  ratingContainer: {
    marginTop: 4,
  },
  cuisineText: {
    fontSize: 16,
    color: '#2196F3',
    backgroundColor: '#fff',
    padding: 12,
    fontWeight: '500',
  },
  infoRow: {
    backgroundColor: '#fff',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoIcon: {
    marginRight: 4,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoText: {
    fontSize: 16,
    color: '#333',
  },
  phoneLink: {
    color: '#4CAF50',
    fontWeight: '500',
  },
  link: {
    color: '#2196F3',
    textDecorationLine: 'underline',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: '#fff',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  badge: {
    backgroundColor: '#E3F2FD',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 14,
    color: '#1565C0',
    fontWeight: '500',
  },
  notesContainer: {
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 16,
  },
  notesLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 16,
    color: '#333',
  },
  photosContainer: {
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 16,
  },
  photosLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginRight: 8,
  },
  section: {
    marginTop: 16,
    backgroundColor: '#fff',
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  visitCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  visitDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  visitRating: {
    fontSize: 16,
    color: '#F57C00',
  },
  visitNotes: {
    fontSize: 14,
    color: '#666',
  },
  menuItemCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  menuItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  menuItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  menuItemRating: {
    fontSize: 16,
    color: '#F57C00',
  },
  menuItemNotes: {
    fontSize: 14,
    color: '#666',
  },
  editButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#2196F3',
    borderRadius: 8,
    padding: 16,
    margin: 16,
    marginBottom: 8,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f44336',
    borderRadius: 8,
    padding: 16,
    margin: 16,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#f44336',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 32,
  },
});

export default RestaurantDetailScreen;
