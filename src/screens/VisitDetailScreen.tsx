import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { DatabaseService } from '../services/DatabaseService';
import { VisitWithDetails } from '../models/types';
import StarRating from 'react-native-star-rating-widget';

type Props = NativeStackScreenProps<RootStackParamList, 'VisitDetail'>;

const VisitDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { visitId } = route.params;
  const [visit, setVisit] = useState<VisitWithDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={() => navigation.navigate('EditVisit', { visitId })}>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600', marginRight: 4 }}>Edit</Text>
        </TouchableOpacity>
      ),
    });
  }, [visitId]);

  useFocusEffect(
    useCallback(() => {
      loadVisit();
    }, [visitId])
  );

  const loadVisit = async () => {
    try {
      setLoading(true);
      const data = await DatabaseService.getVisitWithDetails(visitId);
      setVisit(data);
    } catch (error) {
      console.error('Error loading visit:', error);
      Alert.alert('Error', 'Failed to load visit details');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVisit = () => {
    Alert.alert(
      'Delete Visit',
      'Are you sure you want to delete this visit and all its menu items?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await DatabaseService.deleteVisit(visitId);
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete visit');
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

  if (!visit) {
    return (
      <View style={styles.centerContainer}>
        <Text>Visit not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.restaurantName}>{visit.restaurant.name}</Text>
        <Text style={styles.visitDate}>{new Date(visit.visitDate).toLocaleDateString()}</Text>
        <View style={styles.ratingContainer}>
          <Text style={styles.ratingLabel}>Overall Rating</Text>
          <StarRating
            rating={visit.overallRating}
            onChange={async (r) => {
              await DatabaseService.updateVisit(visitId, { overallRating: r });
              loadVisit();
            }}
            starSize={32}
            color="#F57C00"
          />
        </View>
      </View>

      {visit.notes && (
        <View style={styles.notesContainer}>
          <Text style={styles.notesLabel}>Visit Notes:</Text>
          <Text style={styles.notesText}>{visit.notes}</Text>
        </View>
      )}

      {visit.photos.length > 0 && (
        <View style={styles.photosSection}>
          <Text style={styles.photosLabel}>Photos</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {visit.photos.map(photo => (
              <Image key={photo.id} source={{ uri: photo.uri }} style={styles.photo} />
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Menu Items ({visit.menuItems.length})</Text>
        {visit.menuItems.map((item) => (
          <View key={item.id} style={styles.menuItemCard}>
            <View style={styles.menuItemHeader}>
              <Text style={styles.menuItemName}>{item.name}</Text>
              <StarRating
                rating={item.rating}
                onChange={async (r) => {
                  await DatabaseService.updateMenuItem(item.id!, { rating: r });
                  loadVisit();
                }}
                starSize={20}
                color="#F57C00"
              />
            </View>

            {item.category && (
              <Text style={styles.categoryText}>{item.category}</Text>
            )}

            {item.description && (
              <Text style={styles.descriptionText}>{item.description}</Text>
            )}

            {item.price && (
              <Text style={styles.priceText}>${item.price.toFixed(2)}</Text>
            )}

            {item.notes && (
              <View style={styles.itemNotesContainer}>
                <Text style={styles.itemNotesText}>{item.notes}</Text>
              </View>
            )}

            <View style={styles.wouldOrderContainer}>
              {item.wouldOrderAgain ? (
                <Text style={styles.wouldOrderYes}>✓ Would order again</Text>
              ) : (
                <Text style={styles.wouldOrderNo}>✗ Would not order again</Text>
              )}
            </View>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteVisit}>
        <Text style={styles.deleteButtonText}>Delete Visit</Text>
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
  visitDate: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  ratingContainer: {
    marginTop: 4,
  },
  ratingLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  notesContainer: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  notesLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  section: {
    marginTop: 16,
    backgroundColor: '#fff',
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  menuItemCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  menuItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  menuItemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  menuItemRating: {
    fontSize: 18,
    color: '#F57C00',
  },
  categoryText: {
    fontSize: 14,
    color: '#2196F3',
    marginBottom: 4,
    fontWeight: '500',
  },
  descriptionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  priceText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
    marginBottom: 8,
  },
  itemNotesContainer: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 6,
    marginTop: 8,
    marginBottom: 8,
  },
  itemNotesText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  wouldOrderContainer: {
    marginTop: 8,
  },
  wouldOrderYes: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  wouldOrderNo: {
    fontSize: 14,
    color: '#f44336',
    fontWeight: '600',
  },
  photosSection: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
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

export default VisitDetailScreen;
