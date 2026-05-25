# Expense Tracker API Testing Guide

This guide uses `curl.exe` so the commands work correctly in Windows PowerShell. Make sure the server is running first:

```bash
npm run dev
```

Base URL:

```text
http://localhost:5000
```

For protected routes, replace `<token>` with the JWT returned from register or login.

## Optional Setup: Seed Default Categories

Run this once before testing categories:

```bash
npm run seed
```

Expected result:

```text
Seeded 14 default categories
```

Seeding inserts starter data such as Food, Transport, Salary, and Freelance. The seed script is idempotent, meaning it deletes old default categories first and can be run multiple times safely.

## Step 1: Health Check

Request:

```bash
curl.exe http://localhost:5000/api/health
```

Expected status: `200 OK`

Expected response shape:

```json
{
  "status": "ok",
  "timestamp": "2026-05-25T..."
}
```

## Step 2: Register a User

Request:

```bash
curl.exe -X POST http://localhost:5000/api/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Test User\",\"email\":\"test@example.com\",\"password\":\"password123\"}"
```

Expected status: `201 Created`

Expected response shape:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "name": "Test User",
      "email": "test@example.com",
      "currency": "INR"
    },
    "token": "..."
  }
}
```

Save the `token` value. You will use it as:

```text
Authorization: Bearer <token>
```

## Step 3: Login

Request:

```bash
curl.exe -X POST http://localhost:5000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"test@example.com\",\"password\":\"password123\"}"
```

Expected status: `200 OK`

Expected response shape:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "name": "Test User",
      "email": "test@example.com",
      "currency": "INR"
    },
    "token": "..."
  }
}
```

You should get the same user with a new token.

## Step 4: Get Profile

Request:

```bash
curl.exe http://localhost:5000/api/auth/me ^
  -H "Authorization: Bearer <token>"
```

Expected status: `200 OK`

Expected response shape:

```json
{
  "success": true,
  "data": {
    "_id": "...",
    "name": "Test User",
    "email": "test@example.com",
    "currency": "INR",
    "createdAt": "..."
  }
}
```

The password should not appear.

## Step 5: Test Auth Protection

No token:

```bash
curl.exe http://localhost:5000/api/auth/me
```

Expected status: `401 Unauthorized`

Expected response:

```json
{
  "success": false,
  "message": "Not authorized, no token provided"
}
```

Fake token:

```bash
curl.exe http://localhost:5000/api/auth/me ^
  -H "Authorization: Bearer fake-token"
```

Expected status: `401 Unauthorized`

Expected response:

```json
{
  "success": false,
  "message": "Not authorized, token is invalid or expired"
}
```

## Step 6: Add Transactions

Create income:

```bash
curl.exe -X POST http://localhost:5000/api/transactions ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer <token>" ^
  -d "{\"type\":\"income\",\"amount\":50000,\"category\":\"Salary\",\"note\":\"Monthly salary\",\"date\":\"2025-01-01T09:00:00.000Z\"}"
```

Create freelance income:

```bash
curl.exe -X POST http://localhost:5000/api/transactions ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer <token>" ^
  -d "{\"type\":\"income\",\"amount\":12000,\"category\":\"Freelance\",\"note\":\"Website project\",\"date\":\"2025-01-15T10:00:00.000Z\"}"
```

Create food expense:

```bash
curl.exe -X POST http://localhost:5000/api/transactions ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer <token>" ^
  -d "{\"type\":\"expense\",\"amount\":850,\"category\":\"Food\",\"note\":\"Dinner\",\"date\":\"2025-01-10T19:30:00.000Z\"}"
```

Create transport expense:

```bash
curl.exe -X POST http://localhost:5000/api/transactions ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer <token>" ^
  -d "{\"type\":\"expense\",\"amount\":300,\"category\":\"Transport\",\"note\":\"Cab ride\",\"date\":\"2025-01-12T08:30:00.000Z\"}"
```

Create shopping expense:

```bash
curl.exe -X POST http://localhost:5000/api/transactions ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer <token>" ^
  -d "{\"type\":\"expense\",\"amount\":2200,\"category\":\"Shopping\",\"note\":\"Shoes\",\"date\":\"2025-02-03T16:00:00.000Z\"}"
```

Create bills expense:

```bash
curl.exe -X POST http://localhost:5000/api/transactions ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer <token>" ^
  -d "{\"type\":\"expense\",\"amount\":1800,\"category\":\"Bills\",\"note\":\"Electricity bill\",\"date\":\"2025-02-07T12:00:00.000Z\"}"
```

Expected status for each: `201 Created`

Expected response shape:

```json
{
  "success": true,
  "data": {
    "_id": "...",
    "user": "...",
    "type": "expense",
    "amount": 850,
    "category": "Food",
    "note": "Dinner",
    "date": "2025-01-10T19:30:00.000Z",
    "createdAt": "..."
  }
}
```

Save one transaction `_id` for update and delete tests.

## Step 7: Get All Transactions

All transactions:

```bash
curl.exe http://localhost:5000/api/transactions ^
  -H "Authorization: Bearer <token>"
```

Expected status: `200 OK`

Expected response shape:

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 6,
    "pages": 1
  }
}
```

Filter by type:

```bash
curl.exe "http://localhost:5000/api/transactions?type=expense" ^
  -H "Authorization: Bearer <token>"
```

Filter by category:

```bash
curl.exe "http://localhost:5000/api/transactions?category=Food" ^
  -H "Authorization: Bearer <token>"
```

Filter by date range:

```bash
curl.exe "http://localhost:5000/api/transactions?startDate=2025-01-01&endDate=2025-01-31" ^
  -H "Authorization: Bearer <token>"
```

Pagination:

```bash
curl.exe "http://localhost:5000/api/transactions?page=1&limit=2" ^
  -H "Authorization: Bearer <token>"
```

Expected status for each: `200 OK`

## Step 8: Update a Transaction

Replace `<transactionId>` with a real transaction `_id`.

Request:

```bash
curl.exe -X PUT http://localhost:5000/api/transactions/<transactionId> ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer <token>" ^
  -d "{\"amount\":950,\"note\":\"Updated dinner amount\"}"
```

Expected status: `200 OK`

Expected response shape:

```json
{
  "success": true,
  "data": {
    "_id": "<transactionId>",
    "amount": 950,
    "note": "Updated dinner amount"
  }
}
```

## Step 9: Get Summary

Current month/year summary:

```bash
curl.exe http://localhost:5000/api/transactions/summary ^
  -H "Authorization: Bearer <token>"
```

Specific month/year summary:

```bash
curl.exe "http://localhost:5000/api/transactions/summary?month=1&year=2025" ^
  -H "Authorization: Bearer <token>"
```

Expected status: `200 OK`

Expected response shape:

```json
{
  "success": true,
  "data": {
    "balance": {
      "totalIncome": 62000,
      "totalExpense": 5150,
      "balance": 56850
    },
    "monthlySummary": [
      {
        "_id": {
          "month": 1,
          "type": "income"
        },
        "total": 62000
      }
    ],
    "categoryBreakdown": [
      {
        "_id": "Food",
        "total": 950,
        "count": 1
      }
    ]
  }
}
```

## Step 10: Delete a Transaction

Replace `<transactionId>` with a real transaction `_id`.

Request:

```bash
curl.exe -X DELETE http://localhost:5000/api/transactions/<transactionId> ^
  -H "Authorization: Bearer <token>"
```

Expected status: `200 OK`

Expected response:

```json
{
  "success": true,
  "message": "Transaction deleted"
}
```

## Step 11: Categories

Get categories:

```bash
curl.exe http://localhost:5000/api/categories ^
  -H "Authorization: Bearer <token>"
```

Expected status: `200 OK`

Expected response shape:

```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "name": "Food",
      "type": "expense",
      "icon": "🍔",
      "isDefault": true
    }
  ]
}
```

Create a custom category:

```bash
curl.exe -X POST http://localhost:5000/api/categories ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer <token>" ^
  -d "{\"name\":\"Travel\",\"type\":\"expense\",\"icon\":\"✈️\"}"
```

Expected status: `201 Created`

Expected response shape:

```json
{
  "success": true,
  "data": {
    "_id": "...",
    "name": "Travel",
    "type": "expense",
    "icon": "✈️",
    "isDefault": false
  }
}
```

Delete the custom category:

```bash
curl.exe -X DELETE http://localhost:5000/api/categories/<categoryId> ^
  -H "Authorization: Bearer <token>"
```

Expected status: `200 OK`

Expected response:

```json
{
  "success": true,
  "message": "Category deleted"
}
```

## Step 12: Error Cases

Missing amount:

```bash
curl.exe -X POST http://localhost:5000/api/transactions ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer <token>" ^
  -d "{\"type\":\"expense\",\"category\":\"Food\"}"
```

Expected status: `400 Bad Request`

Expected response shape:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "amount",
      "message": "..."
    }
  ]
}
```

Invalid transaction id:

```bash
curl.exe -X PUT http://localhost:5000/api/transactions/invalidid ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer <token>" ^
  -d "{\"note\":\"Testing invalid id\"}"
```

Expected status: `400 Bad Request`

Expected response:

```json
{
  "success": false,
  "message": "Resource not found — invalid ID format"
}
```

Register existing email:

```bash
curl.exe -X POST http://localhost:5000/api/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Test User\",\"email\":\"test@example.com\",\"password\":\"password123\"}"
```

Expected status: `400 Bad Request`

Expected response:

```json
{
  "success": false,
  "message": "Email already registered"
}
```

## Common Bugs Checklist

`Cannot find module`

Check import paths and include `.js` at the end of local ES module imports.

`MongoDB connection timeout`

Check `MONGO_URI`, internet connection, and Atlas Network Access IP whitelist.

`Token not working`

Check the header format exactly:

```text
Authorization: Bearer <token>
```

`Summary route returns empty`

Check that test transactions use dates matching the requested `month` and `year`. Also make sure `/summary` is mounted before any `/:id` route.

`Password showing in response`

Check `select: false` in `models/User.js` and make sure controllers never manually include `password`.

`CORS error from frontend`

Check `CLIENT_URL` in `.env` matches the frontend URL exactly, including protocol and port.
