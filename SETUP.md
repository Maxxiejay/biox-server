# Setup Instructions

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create `.env` file in the root directory:**
   ```env
   PORT=4000
   DB_HOST=localhost
   DB_USER=root
   DB_PASS=your_mysql_password
   DB_NAME=smart_stove
   JWT_SECRET=your_jwt_secret_change_this_in_production
   ```

3. **Create MySQL database:**
   ```sql
   CREATE DATABASE smart_stove;
   ```

4. **Start the server:**
   ```bash
   npm start
   ```
   
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

## Database Setup

The application uses Sequelize ORM which will automatically create the tables when the server starts. Make sure:

- MySQL server is running
- Database credentials in `.env` are correct
- The database `smart_stove` exists

## Creating an Admin User

To create an admin user, you can either:

1. **Manually update the database:**
   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'your_email@example.com';
   ```

2. **Or register a user and update via SQL:**
   - First signup normally via `/api/auth/signup`
   - Then update the role in MySQL

## Testing the API

Once the server is running, you can test the health endpoint:
```bash
curl http://localhost:4000/health
```

Should return:
```json
{"status":"OK","message":"Server is running"}
```

