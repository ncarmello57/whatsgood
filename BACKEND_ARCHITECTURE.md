# WhatsGood Backend Architecture (Phase 2)

This document outlines the backend architecture for cloud sync functionality. This is for future implementation after the local-first app is working.

## Overview

The backend will provide:
1. RESTful API for CRUD operations
2. User authentication and authorization
3. Data synchronization between devices
4. Web dashboard for viewing dining history

## Technology Stack

### Backend Framework
- **Python 3.11+**
- **FastAPI** - Modern, fast web framework
- **SQLAlchemy** - ORM for database operations
- **Alembic** - Database migrations
- **Pydantic** - Data validation

### Database
- **SQL Server** (your preference) or PostgreSQL
- Matches your existing SQL Server expertise
- Connection via pyodbc or asyncpg

### Authentication
- **JWT tokens** for API authentication
- **OAuth 2.0** for social login (optional)
- Password hashing with bcrypt

### Deployment
- **Docker** containers
- **Azure App Service** or **AWS ECS**
- **Azure SQL Database** or RDS

## Database Schema

### users
```sql
CREATE TABLE users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    email NVARCHAR(255) UNIQUE NOT NULL,
    username NVARCHAR(100) UNIQUE NOT NULL,
    password_hash NVARCHAR(255) NOT NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);
```

### restaurants (server version)
```sql
CREATE TABLE restaurants (
    id UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
    user_id INT NOT NULL FOREIGN KEY REFERENCES users(id),
    name NVARCHAR(255) NOT NULL,
    address NVARCHAR(500),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    phone NVARCHAR(50),
    website NVARCHAR(500),
    cuisine NVARCHAR(100),
    notes NVARCHAR(MAX),
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    deleted_at DATETIME2 NULL
);
```

### visits (server version)
```sql
CREATE TABLE visits (
    id UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
    user_id INT NOT NULL FOREIGN KEY REFERENCES users(id),
    restaurant_id UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES restaurants(id),
    visit_date DATE NOT NULL,
    overall_rating INT NOT NULL CHECK(overall_rating BETWEEN 1 AND 5),
    notes NVARCHAR(MAX),
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    deleted_at DATETIME2 NULL
);
```

### menu_items (server version)
```sql
CREATE TABLE menu_items (
    id UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
    user_id INT NOT NULL FOREIGN KEY REFERENCES users(id),
    visit_id UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES visits(id),
    restaurant_id UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES restaurants(id),
    name NVARCHAR(255) NOT NULL,
    description NVARCHAR(MAX),
    price DECIMAL(10, 2),
    rating INT NOT NULL CHECK(rating BETWEEN 1 AND 5),
    notes NVARCHAR(MAX),
    category NVARCHAR(100),
    would_order_again BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    deleted_at DATETIME2 NULL
);
```

### photos (server version)
```sql
CREATE TABLE photos (
    id UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
    user_id INT NOT NULL FOREIGN KEY REFERENCES users(id),
    visit_id UNIQUEIDENTIFIER FOREIGN KEY REFERENCES visits(id),
    menu_item_id UNIQUEIDENTIFIER FOREIGN KEY REFERENCES menu_items(id),
    restaurant_id UNIQUEIDENTIFIER FOREIGN KEY REFERENCES restaurants(id),
    file_path NVARCHAR(500) NOT NULL,
    caption NVARCHAR(500),
    created_at DATETIME2 DEFAULT GETDATE(),
    deleted_at DATETIME2 NULL
);
```

### sync_log (track changes for sync)
```sql
CREATE TABLE sync_log (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL FOREIGN KEY REFERENCES users(id),
    entity_type NVARCHAR(50) NOT NULL, -- 'restaurant', 'visit', 'menu_item', 'photo'
    entity_id UNIQUEIDENTIFIER NOT NULL,
    operation NVARCHAR(20) NOT NULL, -- 'create', 'update', 'delete'
    changed_at DATETIME2 DEFAULT GETDATE()
);
```

## API Endpoints

### Authentication
```
POST   /api/auth/register          - Create new user account
POST   /api/auth/login             - Login and get JWT token
POST   /api/auth/refresh           - Refresh access token
POST   /api/auth/logout            - Logout (invalidate token)
```

### Restaurants
```
GET    /api/restaurants            - Get all user's restaurants
GET    /api/restaurants/{id}       - Get specific restaurant
POST   /api/restaurants            - Create new restaurant
PUT    /api/restaurants/{id}       - Update restaurant
DELETE /api/restaurants/{id}       - Soft delete restaurant
```

### Visits
```
GET    /api/visits                 - Get all user's visits
GET    /api/visits/{id}            - Get specific visit with details
GET    /api/restaurants/{id}/visits - Get visits for a restaurant
POST   /api/visits                 - Create new visit
PUT    /api/visits/{id}            - Update visit
DELETE /api/visits/{id}            - Soft delete visit
```

### Menu Items
```
GET    /api/menu-items             - Get all user's menu items
GET    /api/menu-items/{id}        - Get specific menu item
GET    /api/visits/{id}/menu-items - Get items for a visit
GET    /api/restaurants/{id}/top-items - Get top rated items
POST   /api/menu-items             - Create new menu item
PUT    /api/menu-items/{id}        - Update menu item
DELETE /api/menu-items/{id}        - Soft delete menu item
```

### Photos
```
POST   /api/photos                 - Upload photo
GET    /api/photos/{id}            - Get photo
DELETE /api/photos/{id}            - Delete photo
```

### Sync
```
POST   /api/sync/push              - Push local changes to server
GET    /api/sync/pull?since={timestamp} - Get server changes since timestamp
GET    /api/sync/status            - Get sync status
```

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                    # FastAPI app initialization
│   ├── config.py                  # Configuration settings
│   ├── database.py                # Database connection
│   ├── dependencies.py            # Dependency injection
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py               # User SQLAlchemy model
│   │   ├── restaurant.py         # Restaurant model
│   │   ├── visit.py              # Visit model
│   │   ├── menu_item.py          # MenuItem model
│   │   └── photo.py              # Photo model
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── user.py               # Pydantic schemas for User
│   │   ├── restaurant.py         # Pydantic schemas for Restaurant
│   │   ├── visit.py              # Pydantic schemas for Visit
│   │   ├── menu_item.py          # Pydantic schemas for MenuItem
│   │   └── photo.py              # Pydantic schemas for Photo
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── auth.py               # Authentication endpoints
│   │   ├── restaurants.py        # Restaurant endpoints
│   │   ├── visits.py             # Visit endpoints
│   │   ├── menu_items.py         # Menu item endpoints
│   │   ├── photos.py             # Photo endpoints
│   │   └── sync.py               # Sync endpoints
│   ├── services/
│   │   ├── __init__.py
│   │   ├── auth_service.py       # Authentication logic
│   │   ├── restaurant_service.py # Restaurant business logic
│   │   ├── visit_service.py      # Visit business logic
│   │   ├── menu_item_service.py  # Menu item business logic
│   │   ├── photo_service.py      # Photo upload/storage logic
│   │   └── sync_service.py       # Sync conflict resolution
│   └── utils/
│       ├── __init__.py
│       ├── security.py           # JWT, password hashing
│       ├── storage.py            # File storage (S3, Azure Blob)
│       └── validators.py         # Custom validators
├── alembic/                       # Database migrations
│   └── versions/
├── tests/
│   ├── __init__.py
│   ├── test_auth.py
│   ├── test_restaurants.py
│   └── test_sync.py
├── .env.example                   # Environment variables template
├── requirements.txt               # Python dependencies
├── Dockerfile                     # Docker configuration
└── README.md                      # Backend documentation
```

## Sync Strategy

### Conflict Resolution
The app uses "last write wins" with timestamp comparison:

1. **Client sends changes**: Include `updated_at` timestamp
2. **Server checks**: Compare with server timestamp
3. **If server newer**: Return conflict, client must resolve
4. **If client newer**: Accept update
5. **Deleted items**: Soft delete with `deleted_at` timestamp

### Sync Flow

```python
# Client sync request
{
  "last_sync": "2024-03-15T10:30:00Z",
  "changes": [
    {
      "type": "restaurant",
      "operation": "create",
      "local_id": 1,
      "data": { "name": "Taco Palace", ... }
    },
    {
      "type": "visit",
      "operation": "update",
      "server_id": "uuid-here",
      "local_id": 5,
      "data": { "overall_rating": 5, ... }
    }
  ]
}

# Server response
{
  "server_changes": [
    {
      "type": "menu_item",
      "operation": "delete",
      "server_id": "uuid-here",
      "deleted_at": "2024-03-16T08:00:00Z"
    }
  ],
  "id_mappings": [
    {
      "local_id": 1,
      "server_id": "new-uuid-here"
    }
  ],
  "conflicts": [],
  "sync_timestamp": "2024-03-16T12:00:00Z"
}
```

## Mobile App Changes for Phase 2

### Add API Service Layer

```typescript
// src/services/ApiService.ts
export const ApiService = {
  async getAllRestaurants(): Promise<Restaurant[]> {
    const response = await fetch(`${API_URL}/api/restaurants`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  },
  // ... other methods
};
```

### Update DatabaseService

```typescript
// src/services/DatabaseService.ts
export const DatabaseService = {
  async getAllRestaurants(): Promise<Restaurant[]> {
    if (isOnline && shouldSync()) {
      // Fetch from API and update local cache
      const data = await ApiService.getAllRestaurants();
      await this.cacheRestaurants(data);
      return data;
    } else {
      // Return from local SQLite
      return this.getLocalRestaurants();
    }
  },
  // ... other methods with online/offline logic
};
```

### Add Sync Service

```typescript
// src/services/SyncService.ts
export const SyncService = {
  async syncData(): Promise<void> {
    const localChanges = await this.getLocalChanges();
    const response = await ApiService.sync({
      last_sync: await this.getLastSyncTimestamp(),
      changes: localChanges
    });
    
    await this.applyServerChanges(response.server_changes);
    await this.updateIdMappings(response.id_mappings);
    await this.setLastSyncTimestamp(response.sync_timestamp);
  }
};
```

## Sample Backend Code

### FastAPI Main App

```python
# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, restaurants, visits, menu_items, sync
from app.database import engine, Base

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="WhatsGood API",
    description="Personal dining journal backend",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(restaurants.router, prefix="/api/restaurants", tags=["restaurants"])
app.include_router(visits.router, prefix="/api/visits", tags=["visits"])
app.include_router(menu_items.router, prefix="/api/menu-items", tags=["menu_items"])
app.include_router(sync.router, prefix="/api/sync", tags=["sync"])

@app.get("/")
async def root():
    return {"message": "WhatsGood API v1.0"}
```

### Example Router

```python
# app/routers/restaurants.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app import schemas, models
from app.database import get_db
from app.dependencies import get_current_user

router = APIRouter()

@router.get("/", response_model=List[schemas.Restaurant])
async def get_restaurants(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    restaurants = db.query(models.Restaurant).filter(
        models.Restaurant.user_id == current_user.id,
        models.Restaurant.deleted_at == None
    ).all()
    return restaurants

@router.post("/", response_model=schemas.Restaurant)
async def create_restaurant(
    restaurant: schemas.RestaurantCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_restaurant = models.Restaurant(
        **restaurant.dict(),
        user_id=current_user.id
    )
    db.add(db_restaurant)
    db.commit()
    db.refresh(db_restaurant)
    return db_restaurant
```

## Deployment

### Docker Configuration

```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Environment Variables

```bash
# .env
DATABASE_URL=mssql+pyodbc://username:password@server/database?driver=ODBC+Driver+17+for+SQL+Server
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
AZURE_STORAGE_CONNECTION_STRING=your-storage-connection
```

## Testing

```bash
# Install dev dependencies
pip install pytest pytest-asyncio httpx

# Run tests
pytest

# With coverage
pytest --cov=app tests/
```

## Next Steps

1. **Setup Python virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # or venv\Scripts\activate on Windows
   ```

2. **Install FastAPI and dependencies**
   ```bash
   pip install fastapi uvicorn sqlalchemy pyodbc python-jose passlib python-multipart
   ```

3. **Create database connection**
   - Set up SQL Server database
   - Configure connection string
   - Run initial migrations

4. **Implement authentication**
   - User registration
   - JWT token generation
   - Protected routes

5. **Build API endpoints**
   - Start with restaurants
   - Add visits and menu items
   - Implement sync logic

6. **Update mobile app**
   - Add API service layer
   - Implement offline/online detection
   - Add sync UI

7. **Deploy**
   - Containerize with Docker
   - Deploy to Azure/AWS
   - Set up CI/CD pipeline

---

This architecture is designed to be scalable and maintainable while leveraging your existing SQL Server and .NET background. The Python/FastAPI stack is modern, well-documented, and easy to learn coming from a C# background.
