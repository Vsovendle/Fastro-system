# Fastro System (Spend Wise Secure Engine)

Fastro System is an advanced, AI-powered invoice processing and expense tracking application. It leverages OpenAI and Google Gemini to automatically parse invoice images, extract transaction details, and provide intelligent insights into spending habits.

## 🚀 Key Features

*   **AI-Powered Invoice Parsing**: Automatically extracts `Item`, `Amount`, and `Category` from uploaded invoice images/receipts using **GPT-4o-mini** (primary) and **Gemini 1.5 Flash** (fallback).
*   **Smart Dashboard**: Visualizes spending data with interactive charts.
*   **AI Assistant Chat**: Ask questions about your spending habits (e.g., "How much did I spend on food this month?") and get AI-generated answers based on your transaction history.
*   **Subscription Detection**: Automatically flags potential recurring subscriptions based on transaction frequency.
*   **Secure Authentication**: JWT-based login system with Role-Based Access Control (Admin vs. Viewer).
*   **System Health Monitoring**: Real-time status checks for AI services and database integrity.
*   **Dockerized**: Fully containerized for easy deployment.

## 🛠 Tech Stack

### Client
*   **Framework**: React (Vite)
*   **Styling**: Tailwind CSS, Framer Motion
*   **Charts**: Recharts
*   **HTTP Client**: Axios
*   **Icons**: Lucide React

### Server
*   **Runtime**: Node.js & Express
*   **Database**: JSON File System (`db.json`) for lightweight portability
*   **AI Integration**: OpenAI SDK, Google Generative AI SDK
*   **Authentication**: JSON Web Token (JWT) & Bcrypt
*   **File Handling**: Multer (Memory Storage)

## 📦 Prerequisites

*   Docker & Docker Compose (Recommended)
*   **OR** Node.js (v18+) and npm

## 🔧 Installation & Setup

### Option 1: Using Docker (Recommended)

1.  **Clone the repository** included in your project files.
2.  **Create a `.env` file** in the `server` directory (see [Environment Variables](#-environment-variables)).
3.  **Run with Docker Compose**:
    ```bash
    docker-compose up --build
    ```
4.  **Access the App**:
    *   Client: `http://localhost:8080`
    *   Server: `http://localhost:8081`

### Option 2: Manual Setup

#### Backend (Server)
1.  Navigate to the server directory:
    ```bash
    cd server
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create a `.env` file (see below).
4.  Start the server:
    ```bash
    npm run dev
    ```
    *Server runs on port 3000 by default.*

#### Frontend (Client)
1.  Navigate to the client directory:
    ```bash
    cd client
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    ```
    *Client runs on port 5173 by default.*

## 🔑 Environment Variables

Create a `.env` file in the `server/` directory with the following keys:

```env
# Server Configuration
PORT=3000
JWT_SECRET=your_super_secret_key_here

# AI Service Keys (At least one is required)
OPENAI_API_KEY=sk-proj-...
GEMINI_API_KEY=AIzaSy...
```

## 🛡️ Default Credentials

The system automatically creates a default admin account on first run:

*   **Username**: `admin`
*   **Password**: `admin123`

> **Note**: Change these credentials immediately after logging in for the first time.

## 📡 API Endpoints

### Authentication
*   `POST /api/auth/login` - Login and receive JWT
*   `GET /api/auth/me` - Get current user details

### Transactions & Uploads
*   `GET /api/transactions` - Get all transactions
*   `POST /api/upload` - Upload invoice images for AI processing
*   `POST /api/transactions/manual` - Manually add a transaction
*   `DELETE /api/transactions` - Clear all transactions (Admin only)

### Intelligence
*   `POST /api/ai/chat` - Chat with the AI about your finances
*   `GET /api/intel/subscriptions` - Detect recurring payments
*   `GET /api/intel/health` - Check system and AI API status

### Admin
*   `GET /api/admin/users` - List all users
*   `POST /api/admin/users` - Create a new user
*   `DELETE /api/admin/users/:id` - Delete a user
