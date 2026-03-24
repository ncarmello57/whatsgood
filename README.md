# WhatsGood 🍽️

A personal dining journal app to track restaurant visits, menu items, and your reviews. Never forget what you ordered or whether you liked it!

## Features

### Current (Phase 1 - Local Storage)
- ✅ Add and manage restaurants
- ✅ Track visits with overall ratings
- ✅ Record menu items with individual ratings
- ✅ Mark items you'd order again
- ✅ Add notes for restaurants, visits, and menu items
- ✅ Search and filter restaurants
- ✅ View restaurant statistics (visit count, average rating, top items)
- ✅ All data stored locally using SQLite

### Future (Phase 2 - Cloud Sync)
- 🔄 Python FastAPI backend
- 🔄 Cloud database sync (SQL Server)
- 🔄 Web dashboard to view your reviews
- 🔄 Photo attachments for menu items
- 🔄 Location tagging with maps
- 🔄 Cross-device synchronization

## Technology Stack

### Frontend (React Native)
- **React Native** with Expo
- **TypeScript** for type safety
- **React Navigation** for screen navigation
- **expo-sqlite** for local database
- **React Native Star Rating** for ratings UI

### Backend (Future)
- **Python** with FastAPI
- **SQL Server** database
- **RESTful API** architecture

## Prerequisites

- Node.js (v18 or later)
- npm or yarn
- Expo CLI
- iOS Simulator (for Mac) or Android Studio (for testing)
- iPhone for actual device testing

## Installation

### 1. Install Dependencies

```bash
cd WhatsGood
npm install
```

### 2. Start the Development Server

```bash
npm start
```

This will start the Expo development server. You'll see a QR code in your terminal.

### 3. Run on Your Device

**iOS (Recommended for iPhone):**
- Install the [Expo Go app](https://apps.apple.com/app/expo-go/id982107779) from the App Store
- Scan the QR code with your iPhone camera
- The app will open in Expo Go

**iOS Simulator (Mac only):**
```bash
npm run ios
```

**Android:**
```bash
npm run android
```

## Project Structure

```
WhatsGood/
├── App.tsx                          # Main app entry point
├── app.json                         # Expo configuration
├── package.json                     # Dependencies
├── tsconfig.json                    # TypeScript config
└── src/
    ├── models/
    │   └── types.ts                # TypeScript interfaces for data models
    ├── services/
    │   └── DatabaseService.ts      # SQLite database operations
    ├── navigation/
    │   └── AppNavigator.tsx        # Navigation configuration
    ├── screens/
    │   ├── RestaurantListScreen.tsx    # Main restaurant list
    │   ├── RestaurantDetailScreen.tsx  # Restaurant details & visits
    │   ├── AddRestaurantScreen.tsx     # Add new restaurant
    │   ├── AddVisitScreen.tsx          # Add visit with menu items
    │   └── VisitDetailScreen.tsx       # View visit details
    └── components/                  # Reusable components (future)
```

## Database Schema

The app uses SQLite with the following tables:

### restaurants
- `id` - Primary key
- `name` - Restaurant name (required)
- `address` - Street address
- `latitude` / `longitude` - GPS coordinates
- `phone` - Phone number
- `website` - Website URL
- `cuisine` - Cuisine type
- `notes` - Additional notes
- `server_id` - For future cloud sync
- `created_at` / `updated_at` - Timestamps

### visits
- `id` - Primary key
- `restaurant_id` - Foreign key to restaurants
- `visit_date` - Date of visit
- `overall_rating` - 1-5 star rating
- `notes` - Visit notes
- `server_id` - For future cloud sync
- `created_at` / `updated_at` - Timestamps

### menu_items
- `id` - Primary key
- `visit_id` - Foreign key to visits
- `restaurant_id` - Foreign key to restaurants
- `name` - Menu item name (required)
- `description` - Item description
- `price` - Price in dollars
- `rating` - 1-5 star rating (required)
- `notes` - Item notes
- `photo_uri` - Photo path (future)
- `category` - Item category (appetizer, entree, etc.)
- `would_order_again` - Boolean flag
- `server_id` - For future cloud sync
- `created_at` / `updated_at` - Timestamps

### photos (future)
- `id` - Primary key
- `visit_id` / `menu_item_id` / `restaurant_id` - Foreign keys
- `uri` - Photo file path
- `caption` - Photo caption
- `server_id` - For future cloud sync

## Architecture Design

### Service Layer Pattern
The `DatabaseService` abstracts all database operations, making it easy to swap SQLite for API calls in the future:

```typescript
// Current: SQLite
const restaurants = await DatabaseService.getAllRestaurants();

// Future: Could become API call with no screen changes
const restaurants = await ApiService.getAllRestaurants();
```

### Prepared for Cloud Sync
Every table includes:
- `server_id` - Maps local records to server records
- `last_synced_at` - Track sync status
- This design allows offline-first operation with background sync

### Type Safety
All data models are defined in TypeScript interfaces, ensuring:
- Compile-time error checking
- IntelliSense support
- Self-documenting code

## Usage Guide

### Adding a Restaurant
1. Tap the **+** button on the main screen
2. Enter restaurant details (only name is required)
3. Save

### Recording a Visit
1. Tap on a restaurant from the list
2. Tap **+ Add Visit**
3. Set the visit date and overall rating
4. Add menu items (at least one required)
5. For each item:
   - Name (required)
   - Category, price, description (optional)
   - Rating (1-5 stars)
   - Notes
   - "Would order again" checkbox
6. Save

### Viewing Your History
- **Restaurant List**: See all restaurants with visit counts and average ratings
- **Restaurant Detail**: View all visits and top-rated items
- **Visit Detail**: See all menu items from a specific visit

### Search
Use the search bar on the main screen to filter restaurants by:
- Restaurant name
- Cuisine type
- Address

## Future Enhancements

### Phase 2: Cloud Backend

**Backend Setup** (Python/FastAPI):
```
backend/
├── main.py                 # FastAPI app
├── models.py              # SQLAlchemy models
├── database.py            # Database connection
├── routers/
│   ├── restaurants.py     # Restaurant endpoints
│   ├── visits.py          # Visit endpoints
│   └── menu_items.py      # Menu item endpoints
└── requirements.txt       # Python dependencies
```

**API Endpoints**:
- `GET/POST /api/restaurants` - Restaurant CRUD
- `GET/POST /api/visits` - Visit CRUD
- `GET/POST /api/menu-items` - Menu item CRUD
- `POST /api/sync` - Sync local changes to server
- `GET /api/sync/changes` - Get server changes since timestamp

**Web Dashboard** (React):
- View all restaurants on a map
- Browse visit history
- Generate reports (most visited, highest rated, etc.)
- Export data

### Additional Features
- Photo uploads for menu items
- Location tagging with automatic restaurant detection
- Share recommendations with friends
- Import/export data
- Tags and custom categories
- Price range tracking
- Reservations and reminders

## Development

### Running Tests
```bash
npm test
```

### Building for Production

**iOS:**
```bash
eas build --platform ios
```

**Android:**
```bash
eas build --platform android
```

### Environment Setup
For production deployment:
1. Set up Expo Application Services (EAS)
2. Configure environment variables
3. Set up backend API URL
4. Configure authentication

## Troubleshooting

**Database Issues:**
- The SQLite database is stored in the app's local storage
- To reset: Uninstall and reinstall the app
- Database location: `{app_data}/whatsgood.db`

**Navigation Issues:**
- Make sure all screens are properly registered in `AppNavigator.tsx`
- Check that route parameters match type definitions

**Build Issues:**
- Clear cache: `expo start -c`
- Reinstall dependencies: `rm -rf node_modules && npm install`

## Contributing

This is a personal project, but suggestions are welcome! Feel free to:
1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## License

MIT License - Feel free to use this code for your own projects!

## Contact

Questions or suggestions? Open an issue or reach out!

---

**Happy dining! 🍽️**
