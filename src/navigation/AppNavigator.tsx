import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Restaurant, Visit, MenuItem } from '../models/types';

// Import screens (we'll create these next)
import RestaurantListScreen from '../screens/RestaurantListScreen';
import RestaurantDetailScreen from '../screens/RestaurantDetailScreen';
import AddRestaurantScreen from '../screens/AddRestaurantScreen';
import AddVisitScreen from '../screens/AddVisitScreen';
import VisitDetailScreen from '../screens/VisitDetailScreen';
import EditRestaurantScreen from '../screens/EditRestaurantScreen';
import EditVisitScreen from '../screens/EditVisitScreen';
import RestaurantSearchScreen from '../screens/RestaurantSearchScreen';
import SettingsScreen from '../screens/SettingsScreen';

export type RootStackParamList = {
  RestaurantList: undefined;
  RestaurantDetail: { restaurantId: number };
  AddRestaurant: undefined;
  AddVisit: { restaurantId: number };
  VisitDetail: { visitId: number };
  EditRestaurant: { restaurantId: number };
  EditVisit: { visitId: number };
  RestaurantSearch: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="RestaurantList"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#2196F3',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen 
          name="RestaurantList" 
          component={RestaurantListScreen}
          options={{ title: "What's Good" }}
        />
        <Stack.Screen 
          name="RestaurantDetail" 
          component={RestaurantDetailScreen}
          options={{ title: 'Restaurant Details' }}
        />
        <Stack.Screen 
          name="AddRestaurant" 
          component={AddRestaurantScreen}
          options={{ title: 'Add Restaurant' }}
        />
        <Stack.Screen 
          name="AddVisit" 
          component={AddVisitScreen}
          options={{ title: 'Add Visit' }}
        />
        <Stack.Screen
          name="VisitDetail"
          component={VisitDetailScreen}
          options={{ title: 'Visit Details' }}
        />
        <Stack.Screen
          name="EditRestaurant"
          component={EditRestaurantScreen}
          options={{ title: 'Edit Restaurant' }}
        />
        <Stack.Screen
          name="EditVisit"
          component={EditVisitScreen}
          options={{ title: 'Edit Visit' }}
        />
        <Stack.Screen
          name="RestaurantSearch"
          component={RestaurantSearchScreen}
          options={{ title: 'Find Restaurants' }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: 'Settings' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
