# 🧠 Smart Stove Analytics Backend Specification

**Tech Stack:**

* Node.js (Express.js)
* MySQL (with Sequelize ORM)
* JWT for authentication
* bcrypt for password hashing
* dotenv for environment configuration

---

## 🏗️ 1. **System Overview**

This backend handles:

1. **User management** (signup, login, JWT auth)
2. **Admin management** (can view all users & stoves)
3. **Stove pre-registration** (done by admin/manufacturer)
4. **Stove pairing by user**
5. **Data collection via HTTP** (fuel usage reports from stoves)
6. **Analytics endpoints** (for users and admin dashboards)

---

## 🗃️ 2. **Database Schema**

### **users**

| Field      | Type                 | Description               |
| ---------- | -------------------- | ------------------------- |
| id         | INT (PK)             | Auto-increment            |
| name       | VARCHAR(100)         | User full name            |
| email      | VARCHAR(100)         | Unique email              |
| password   | VARCHAR(255)         | Hashed password           |
| role       | ENUM('user','admin') | Access level              |
| created_at | TIMESTAMP            | Default current_timestamp |

---

### **stoves**

| Field        | Type                      | Description                                  |
| ------------ | ------------------------- | -------------------------------------------- |
| id           | INT (PK)                  | Auto-increment                               |
| stove_id     | VARCHAR(50)               | Unique identifier for the stove              |
| model        | VARCHAR(100)              | Stove model name                             |
| pairing_code | VARCHAR(50)               | One-time code for pairing                    |
| api_key      | VARCHAR(100)              | Secret key used by device for authentication |
| user_id      | INT (FK → users.id)       | Null until paired                            |
| status       | ENUM('unpaired','paired') | Stove state                                  |
| created_at   | TIMESTAMP                 | Default current_timestamp                    |

---

### **stove_usage**

| Field          | Type         | Description                |
| -------------- | ------------ | -------------------------- |
| id             | INT (PK)     | Auto-increment             |
| stove_id       | VARCHAR(50)  | FK → stoves.stove_id       |
| date           | DATE         | Data collection date       |
| cooking_events | INT          | Number of cooking sessions |
| total_minutes  | INT          | Total cooking time         |
| fuel_used_kg   | DECIMAL(5,2) | Fuel used                  |
| created_at     | TIMESTAMP    | Default current_timestamp  |

---

## 🧩 3. **Folder Structure**

```
smart-stove-backend/
│
├── src/
│   ├── config/
│   │   └── db.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Stove.js
│   │   └── StoveUsage.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── stoveController.js
│   │   ├── usageController.js
│   │   └── adminController.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── stoveRoutes.js
│   │   ├── usageRoutes.js
│   │   └── adminRoutes.js
│   ├── middleware/
│   │   └── authMiddleware.js
│   └── server.js
│
├── .env
└── package.json
```

---

## 🔑 4. **Authentication Flow**

### User Signup

**POST** `/api/auth/signup`

```json
{
  "name": "Maxwell Joshua",
  "email": "max@example.com",
  "password": "secret123"
}
```

➡️ Backend:

* Hash password
* Store user
* Return JWT token

---

### User Login

**POST** `/api/auth/login`

```json
{
  "email": "max@example.com",
  "password": "secret123"
}
```

➡️ Returns:

```json
{
  "token": "<jwt_token>",
  "user": { "id": 1, "name": "Maxwell", "role": "user" }
}
```

---

## 🔧 5. **Stove Management**

### (Admin) Pre-register Stove

**POST** `/api/admin/stoves/register`
Headers: `Authorization: Bearer <admin_token>`

```json
{
  "stove_id": "0001",
  "model": "SmartFlame Pro"
}
```

➡️ Backend:

* Generates random `pairing_code`
* Saves with `status: "unpaired"`

---

### (User) Pair Stove

**POST** `/api/stoves/pair`
Headers: `Authorization: Bearer <user_token>`

```json
{
  "stove_id": "0001",
  "pairing_code": "XYZ123"
}
```

➡️ Backend:

* Verifies pairing code & unpaired status
* Links to user, generates `api_key`
* Updates status → `paired`
* Invalidates pairing_code

---

### (Device) Send Stove Data

**POST** `/api/stoves/data`
Headers:

```
Authorization: Bearer <api_key>
Content-Type: application/json
```

Body:

```json
{
  "stoveId": "0001",
  "date": "2025-10-25",
  "cookingEvents": 3,
  "totalMinutes": 180,
  "fuelUsedKg": 2
}
```

➡️ Backend:

* Validates API key and stove ID
* Saves record in `stove_usage`

---

### (User) Fetch Analytics

**GET** `/api/usage/summary`
Headers: `Authorization: Bearer <user_token>`

➡️ Returns:

```json
{
  "totalFuelUsed": 25.5,
  "averageCookingTime": 70,
  "daysActive": 10,
  "graph": [
    { "date": "2025-10-20", "fuelUsedKg": 2.0 },
    { "date": "2025-10-21", "fuelUsedKg": 3.5 }
  ]
}
```

---

### (Admin) View All Usage

**GET** `/api/admin/usage`
Headers: `Authorization: Bearer <admin_token>`

➡️ Returns all stove usage records grouped by user.

---

## ⚙️ 6. **Helper Functions**

* `generatePairingCode()`: 6-character random alphanumeric
* `generateApiKey()`: UUIDv4
* `hashPassword()`: bcrypt
* `verifyToken()`: JWT middleware

---

## 🧮 7. **Analytics Logic**

In `usageController.js`, you can compute analytics like:

```js
const summary = await StoveUsage.findAll({
  where: { stove_id: stoveId },
  attributes: [
    [sequelize.fn('SUM', sequelize.col('fuel_used_kg')), 'totalFuelUsed'],
    [sequelize.fn('AVG', sequelize.col('total_minutes')), 'averageCookingTime']
  ]
});
```

---

## 🧰 8. **Environment Variables (.env)**

```
PORT=4000
DB_HOST=localhost
DB_USER=root
DB_PASS=password
DB_NAME=smart_stove
JWT_SECRET=your_jwt_secret
```

---

## 🔒 9. **Security Best Practices**

* Only admin can register stoves
* Pairing codes expire after first use
* API keys are unique per stove
* Use HTTPS (especially for device HTTP requests)
* Sanitize inputs & rate-limit endpoints