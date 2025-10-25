# 🚀 Postman Testing Guide - Uber Clone Backend

## 📋 Prerequisites

### 1. Start Your Services
```bash
# Start Docker services (PostgreSQL, Redis, Adminer)
cd ride-backend
npm run docker:up

# Run database migrations
npm run prisma:migrate

# Start the development server
npm run start:dev
```

### 2. Environment Variables
Create a `.env` file in the `ride-backend` directory:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ride_db"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-super-secret-jwt-key-here"
JWT_EXPIRES_IN="3600s"
PORT=3000
```

## 🔧 Postman Setup

### Base URL
```
http://localhost:3000/api
```

### Headers for All Requests
```
Content-Type: application/json
```

---

## 🧪 Complete Testing Workflow

## 1. **Authentication Endpoints** 🔐

### 1.1 Register Passenger
**POST** `/auth/register`
```json
{
  "phone": "+1234567890",
  "name": "John Passenger",
  "password": "password123"
}
```
**Expected Response:**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "uuid",
      "phone": "+1234567890",
      "name": "John Passenger",
      "role": "PASSENGER",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### 1.2 Register Driver
**POST** `/auth/register`
```json
{
  "phone": "+1234567891",
  "name": "Jane Driver",
  "password": "password123",
  "role": "DRIVER"
}
```

### 1.3 Login Passenger
**POST** `/auth/login`
```json
{
  "phone": "+1234567890",
  "password": "password123"
}
```
**Expected Response:**
```json
{
  "status": "success",
  "data": {
    "token": "jwt-token-here",
    "role": "PASSENGER"
  }
}
```

### 1.4 Login Driver
**POST** `/auth/login`
```json
{
  "phone": "+1234567891",
  "password": "password123"
}
```

### 1.5 Register Admin
**POST** `/auth/register`
```json
{
  "phone": "+1234567892",
  "name": "Admin User",
  "password": "password123",
  "role": "ADMIN"
}
```

### 1.6 Login Admin
**POST** `/auth/login`
```json
{
  "phone": "+1234567892",
  "password": "password123"
}
```

**💡 Save the JWT tokens from login responses for authenticated requests!**

---

## 2. **Driver Management Endpoints** 👨‍💼

### 2.1 Update Driver Status
**POST** `/drivers/status`
**Headers:** `Authorization: Bearer <driver-jwt-token>`
```json
{
  "status": "ONLINE"
}
```

### 2.2 Update Driver Location
**POST** `/drivers/location`
**Headers:** `Authorization: Bearer <driver-jwt-token>`
```json
{
  "lat": 40.7128,
  "lng": -74.0060
}
```

### 2.3 Find Nearby Drivers
**GET** `/drivers/nearby?lat=40.7128&lng=-74.0060&radius=5`
**Headers:** `Authorization: Bearer <passenger-jwt-token>`

### 2.4 Get Driver Statistics
**GET** `/drivers/stats`
**Headers:** `Authorization: Bearer <driver-jwt-token>`

### 2.5 Estimate Ride
**GET** `/drivers/estimate?pickupLat=40.7128&pickupLng=-74.0060&dropoffLat=40.7589&dropoffLng=-73.9851`
**Headers:** `Authorization: Bearer <passenger-jwt-token>`

### 2.6 Get Driver Location
**GET** `/drivers/{driver-id}/location`
**Headers:** `Authorization: Bearer <any-jwt-token>`

---

## 3. **Ride Management Endpoints** 🚗

### 3.1 Create Ride Request
**POST** `/rides`
**Headers:** `Authorization: Bearer <passenger-jwt-token>`
```json
{
  "pickupLat": 40.7128,
  "pickupLng": -74.0060,
  "dropoffLat": 40.7589,
  "dropoffLng": -73.9851
}
```

### 3.2 Get Ride History
**GET** `/rides/history?page=1&limit=10`
**Headers:** `Authorization: Bearer <any-jwt-token>`

### 3.3 Get Active Rides
**GET** `/rides/active`
**Headers:** `Authorization: Bearer <any-jwt-token>`

### 3.4 Get Specific Ride
**GET** `/rides/{ride-id}`
**Headers:** `Authorization: Bearer <any-jwt-token>`

### 3.5 Accept Ride (Driver)
**POST** `/rides/{ride-id}/accept`
**Headers:** `Authorization: Bearer <driver-jwt-token>`

### 3.6 Start Ride
**POST** `/rides/{ride-id}/start`
**Headers:** `Authorization: Bearer <driver-jwt-token>`

### 3.7 Complete Ride
**POST** `/rides/{ride-id}/complete`
**Headers:** `Authorization: Bearer <driver-jwt-token>`
```json
{
  "actualDistance": 2.5,
  "actualTimeMinutes": 8
}
```
**Expected Response:**
```json
{
  "ride": {
    "id": "ride-uuid",
    "status": "COMPLETED",
    "price": 45.60
  },
  "pricing": {
    "baseFare": 15,
    "distance": 2.5,
    "timeMinutes": 8,
    "distancePrice": 30.00,
    "timePrice": 16.00,
    "subtotal": 61.00,
    "surgeMultiplier": 1.15,
    "finalPrice": 70.15,
    "currency": "ETB",
    "breakdown": {
      "baseFare": 15,
      "distance": "2.50km × 12 ETB",
      "time": "8min × 2 ETB",
      "surge": "1.2x surge"
    }
  }
}
```

### 3.8 Cancel Ride
**POST** `/rides/{ride-id}/cancel`
**Headers:** `Authorization: Bearer <any-jwt-token>`

---

## 4. **Admin Dashboard Endpoints** 📊

**⚠️ SECURITY NOTE: Admin endpoints require ADMIN role token!**

### 4.1 Get Dashboard Statistics
**GET** `/admin/dashboard`
**Headers:** `Authorization: Bearer <admin-jwt-token>`

### 4.2 Get Recent Rides
**GET** `/admin/recent-rides?limit=20`
**Headers:** `Authorization: Bearer <admin-jwt-token>`

### 4.3 Get User Statistics
**GET** `/admin/users`
**Headers:** `Authorization: Bearer <admin-jwt-token>`

### 4.4 Get Analytics
**GET** `/admin/analytics?days=30`
**Headers:** `Authorization: Bearer <admin-jwt-token>`

### 4.5 Get Online Drivers
**GET** `/admin/drivers/online`
**Headers:** `Authorization: Bearer <admin-jwt-token>`

### 4.6 System Health Check
**GET** `/admin/health`
**Headers:** `Authorization: Bearer <admin-jwt-token>`

---

## 5. **WebSocket Testing** 🔌

### 5.1 Connect to WebSocket
**URL:** `ws://localhost:3000`
**Events to test:**

#### Join Room
```javascript
// Emit this event after connecting
{
  "event": "join",
  "data": {
    "userId": "user-id-here",
    "role": "PASSENGER" // or "DRIVER"
  }
}
```

#### Driver Location Update
```javascript
{
  "event": "driver:location",
  "data": {
    "driverId": "driver-id-here",
    "lat": 40.7128,
    "lng": -74.0060
  }
}
```

#### Driver Status Update
```javascript
{
  "event": "driver:status",
  "data": {
    "driverId": "driver-id-here",
    "status": "ONLINE"
  }
}
```

---

## 🧪 **Complete Testing Scenario**

### Step-by-Step Test Flow:

1. **Setup Phase:**
   - Start services: `npm run docker:up`
   - Run migrations: `npm run prisma:migrate`
   - Start server: `npm run start:dev`

2. **User Registration:**
   - Register 2 passengers
   - Register 2 drivers
   - Login all users and save JWT tokens

3. **Driver Setup:**
   - Set drivers to ONLINE status
   - Update driver locations
   - Check driver statistics

4. **Ride Flow:**
   - Create ride request as passenger
   - Check if driver gets auto-assigned
   - Accept ride as driver (if not auto-assigned)
   - Start ride
   - Complete ride with price

5. **History & Analytics:**
   - Check ride history
   - View admin dashboard
   - Check analytics

6. **WebSocket Testing:**
   - Connect to WebSocket
   - Join rooms
   - Test real-time updates

---

## 📝 **Postman Collection Structure**

Create these folders in Postman:

```
📁 Uber Clone API
├── 📁 1. Authentication
│   ├── Register Passenger
│   ├── Register Driver
│   ├── Login Passenger
│   └── Login Driver
├── 📁 2. Driver Management
│   ├── Update Status
│   ├── Update Location
│   ├── Find Nearby Drivers
│   ├── Get Driver Stats
│   ├── Estimate Ride
│   └── Get Driver Location
├── 📁 3. Ride Management
│   ├── Create Ride
│   ├── Get Ride History
│   ├── Get Active Rides
│   ├── Get Specific Ride
│   ├── Accept Ride
│   ├── Start Ride
│   ├── Complete Ride
│   └── Cancel Ride
├── 📁 4. Admin Dashboard
│   ├── Dashboard Stats
│   ├── Recent Rides
│   ├── User Stats
│   ├── Analytics
│   ├── Online Drivers
│   └── Health Check
└── 📁 5. WebSocket Tests
    ├── Connect
    ├── Join Room
    ├── Location Update
    └── Status Update
```

---

## 🔍 **Expected Response Examples**

### Successful Ride Creation:
```json
{
  "id": "ride-uuid",
  "passengerId": "passenger-uuid",
  "driverId": "driver-uuid",
  "pickupLat": 40.7128,
  "pickupLng": -74.0060,
  "dropoffLat": 40.7589,
  "dropoffLng": -73.9851,
  "status": "ASSIGNED",
  "price": null,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### Dashboard Statistics:
```json
{
  "users": {
    "total": 4,
    "drivers": 2
  },
  "rides": {
    "total": 1,
    "completed": 0,
    "active": 1,
    "completionRate": 0
  },
  "revenue": {
    "total": 0,
    "average": 0
  }
}
```

---

## ⚠️ **Common Issues & Solutions**

### 1. **JWT Token Issues**
- Make sure to include `Authorization: Bearer <token>` header
- Tokens expire after 1 hour (3600s)
- Re-login if you get 401 Unauthorized

### 2. **Database Connection**
- Ensure PostgreSQL is running: `docker ps`
- Check DATABASE_URL in .env file
- Run migrations if needed: `npm run prisma:migrate`

### 3. **Redis Connection**
- Ensure Redis is running: `docker ps`
- Check REDIS_URL in .env file

### 4. **CORS Issues**
- Server is configured to allow all origins
- If issues persist, check CORS settings in main.ts

---

## 🎯 **Testing Checklist**

- [ ] All services running (PostgreSQL, Redis, Backend)
- [ ] Environment variables set
- [ ] Database migrations completed
- [ ] User registration working
- [ ] User login working
- [ ] JWT tokens being generated
- [ ] Driver status updates working
- [ ] Location updates working
- [ ] Ride creation working
- [ ] Driver assignment working
- [ ] Ride lifecycle working (start, complete)
- [ ] History endpoints working
- [ ] Admin dashboard working
- [ ] WebSocket connections working
- [ ] Real-time updates working

---

## 🚀 **Quick Start Commands**

```bash
# Start everything
npm run docker:up
npm run prisma:migrate
npm run start:dev

# Check services
docker ps

# Test basic endpoint
curl http://localhost:3000/api/admin/health
```

Your Uber clone backend is now ready for comprehensive testing! 🎉
