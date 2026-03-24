// Core data models for WhatsGood app

export interface Restaurant {
  id?: number;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  website?: string;
  cuisine?: string;
  notes?: string;
  rating?: number;
  dogFriendly?: boolean;
  outsideSeating?: boolean;
  createdAt?: string;
  updatedAt?: string;
  // For future API sync
  serverId?: string;
  lastSyncedAt?: string;
}

export interface Visit {
  id?: number;
  restaurantId: number;
  visitDate: string;
  overallRating: number; // 1-5
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  // For future API sync
  serverId?: string;
  lastSyncedAt?: string;
}

export interface MenuItem {
  id?: number;
  visitId: number;
  restaurantId: number;
  name: string;
  description?: string;
  price?: number;
  rating: number; // 1-5
  notes?: string;
  photoUri?: string;
  category?: string; // appetizer, entree, dessert, drink, etc.
  wouldOrderAgain: boolean;
  createdAt?: string;
  updatedAt?: string;
  // For future API sync
  serverId?: string;
  lastSyncedAt?: string;
}

export interface Photo {
  id?: number;
  visitId?: number;
  menuItemId?: number;
  restaurantId?: number;
  uri: string;
  caption?: string;
  createdAt?: string;
  // For future API sync
  serverId?: string;
  lastSyncedAt?: string;
}

// View models for displaying data
export interface RestaurantWithStats extends Restaurant {
  visitCount: number;
  averageRating: number;
  lastVisitDate?: string;
  favoriteItems?: string[];
}

export interface VisitWithDetails extends Visit {
  restaurant: Restaurant;
  menuItems: MenuItem[];
  photos: Photo[];
}
