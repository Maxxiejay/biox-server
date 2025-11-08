# Smart Stove Analytics Backend

Backend API for a smart stove monitoring and analytics system built with Node.js, Express, and MySQL.

## 🚀 Features

- User authentication (signup/login with JWT)
- Admin management (view all users & stoves)
- Stove pre-registration (admin/manufacturer)
- Stove pairing by users
- Data collection via HTTP (fuel usage reports from stoves)
- Analytics endpoints (for users and admin dashboards)

## 📋 Prerequisites

- Node.js (v14 or higher)
- MySQL (v5.7 or higher)
- npm or yarn

## 🔧 Installation

1. Clone the repository and navigate to the server directory:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Update the `.env` file with your database credentials:
   ```env
   PORT=4000
   DB_HOST=localhost
   DB_USER=root
   DB_PASS=your_password
   DB_NAME=smart_stove
   JWT_SECRET=your_secret_key_here
   ```

5. Create the MySQL database:
   ```sql
   CREATE DATABASE smart_stove;
   ```

6. Start the server:
   ```bash
   npm start
   ```

   For development with auto-reload:
   ```bash
   npm run dev
   ```

## 📚 API Endpoints

### Authentication

- **POST** `/api/auth/signup` - Register a new user
- **POST** `/api/auth/login` - Login user

### Stoves (User)

- **GET** `/api/stoves` - Get user's paired stoves (requires JWT)
- **POST** `/api/stoves/pair` - Pair a stove with pairing code (requires JWT)

### Stove Data (Device)

- **POST** `/api/stoves/data` - Send usage data from device (requires API key)

### Usage Analytics

- **GET** `/api/usage/summary` - Get usage summary for user (requires JWT)
- **GET** `/api/usage/stove/:stoveId` - Get detailed usage for specific stove (requires JWT)

### Admin

- **POST** `/api/admin/stoves/register` - Register a new stove (requires admin JWT)
- **GET** `/api/admin/usage` - View all usage records (requires admin JWT)
- **GET** `/api/admin/users` - View all users (requires admin JWT)
- **GET** `/api/admin/stoves` - View all stoves (requires admin JWT)

## 🔐 Authentication

### User Authentication

Include the JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

### Device Authentication

Include the API key in the Authorization header:
```
Authorization: Bearer <api_key>
```

## 📊 Example Usage

### 1. Sign up a new user
```bash
POST /api/auth/signup
{
  "name": "Maxwell Joshua",
  "email": "max@example.com",
  "password": "secret123"
}
```

### 2. Login
```bash
POST /api/auth/login
{
  "email": "max@example.com",
  "password": "secret123"
}
```

### 3. (Admin) Register a stove
```bash
POST /api/admin/stoves/register
Headers: Authorization: Bearer <admin_token>
{
  "stove_id": "0001",
  "model": "SmartFlame Pro"
}
```

### 4. (User) Pair a stove
```bash
POST /api/stoves/pair
Headers: Authorization: Bearer <user_token>
{
  "stove_id": "0001",
  "pairing_code": "XYZ123"
}
```

### 5. (Device) Send usage data
```bash
POST /api/stoves/data
Headers: Authorization: Bearer <api_key>
{
  "stoveId": "0001",
  "date": "2025-10-25",
  "cookingEvents": 3,
  "totalMinutes": 180,
  "fuelUsedKg": 2
}
```

### 6. Get usage summary
```bash
GET /api/usage/summary
Headers: Authorization: Bearer <user_token>
```

## 🗄️ Database Schema

See `plan.md` for detailed database schema information.

## 🔒 Security Notes

- Passwords are hashed using bcrypt
- JWT tokens expire after 7 days
- API keys are unique per stove
- Pairing codes are invalidated after first use
- Admin routes require admin role verification

## 📝 License

ISC

