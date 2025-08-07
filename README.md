<<<<<<< HEAD
# PortfolioManager
=======
# Portfolio Manager - Simplified

A simple financial portfolio management system with REST API backend and web frontend.

## Features

- **Portfolio Management**: Add and remove assets from your portfolio
- **Real-time Values**: View current portfolio value and performance
- **Transaction History**: Track all buy/sell transactions
- **Simple UI**: Clean, responsive web interface

## Setup Instructions

### 1. Database Setup
1. Install MySQL and create the database:
   ```sql
   -- Run the commands in database.sql file
   ```

2. Update `.env` file with your MySQL credentials:
   ```
   DB_HOST=localhost
   DB_USER=your_username
   DB_PASSWORD=your_password
   DB_NAME=Portfolio_Manager
   PORT=3000
   ```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run the Application
```bash
npm start
```

The application will be available at `http://localhost:3000`

## API Endpoints

- `GET /api/portfolio` - Get all portfolio items
- `POST /api/portfolio` - Add asset to portfolio
- `DELETE /api/portfolio/:id` - Remove asset from portfolio
- `GET /api/transactions` - Get transaction history
- `GET /api/portfolio/summary` - Get portfolio summary

## Usage

1. **Add Assets**: Use the "Add Asset" tab to add stocks to your portfolio
2. **View Portfolio**: See all your assets and their current values
3. **Track Performance**: Monitor total portfolio value
4. **Transaction History**: Review all your buy/sell activities

## Technologies Used

- **Backend**: Node.js, Express.js, MySQL
- **Frontend**: HTML, CSS, JavaScript
- **Database**: MySQL with connection pooling
>>>>>>> final
