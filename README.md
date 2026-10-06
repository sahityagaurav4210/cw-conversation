# Conversation - Encrypted Real-Time Chat & Management Platform

**Conversation** is a secure, real-time web application built using **React (Vite)**, **Node.js (Express)**, **Socket.IO**, and **PostgreSQL (Sequelize)**. The application features end-to-end encrypted messaging, secure file sharing, CAPTCHA authentication, admin user management, and feedback reporting.

This application was developed to facilitate communication among colleagues over the internal office network, where popular chat applications like WhatsApp and Google Chat are blocked. It provides essential features such as messaging and file sharing, which are sufficient for daily office operations.

## 🚀 Features

### 🔐 Security & Encrypted Messaging

- **End-to-End Encryption**: Messages and attachment captions are encrypted using AES algorithms before database persistence.
- **CAPTCHA Validation**: Visual and Audio CAPTCHA verification integrated into Login, Registration, Admin Authentication, and Profile Updates.
- **Account Protection**: Automatic account lockout after consecutive failed login attempts and configurable JWT session timeouts.
- **Singleton WebSocket Architecture**: Enforces a strict **Singleton Design Pattern** ensuring only **one active WebSocket connection per authenticated user** across client and server.
- **Magic Byte Image Validation**: Client & server-side magic number inspection (`FF D8 FF` for JPEG, `89 50 4E 47` for PNG) for profile picture uploads up to 2MB, preventing extension spoofing.

### 💬 Real-Time Chat & User Profiles

- **Instant Messaging**: Low-latency 1-on-1 real-time messaging powered by Socket.IO.
- **Read Receipts & Status**: Real-time read status tracking (`Sent`, `Read`) and online/offline user indicators.
- **Typing Indicators**: Live typing notifications when a conversation partner is drafting a message.
- **URL Sharing (`UrlShareModal.jsx`)**: Dedicated plug-and-play modal for sharing web links and URLs adjacent to the code snippet button in `ChatInput.jsx`. Formats URLs into clickable links with optional descriptions.
- **Code Snippet Sharing (`CodeSnippetModal.jsx`)**: Fenced markdown code block sharing supporting over 20+ programming languages/frameworks with syntax highlighting.
- **Enhanced User Profiles**: Optional email address with split domain autocomplete, sex selection (`male`, `female`, `tgp`), and profile photo avatars with magic byte validation.
- **Secure File Sharing**: Attachment support with encryption, size limits, and download status tracking.
- **Collapsible Navigation**: Responsive sidebar with collapsible toggle, user avatars, and built-in search bar with query reset adornments.

### 🛠️ Administration & System Masters

- **Admin Dashboard**: Interactive management table for user accounts built using `material-react-table`.
- **Account Control**: Ability to activate, deactivate, unlock, reset passwords, or delete user accounts.
- **System Masters Tab**: Card-based interface in Admin Panel featuring **Email Client Master**.
- **Email Client Master Layout**: Dedicated header control entity positioned above `material-react-table` (with Heading, Refresh button, and Add Email Client button), maintaining native Material React Table search and column toolbars.
- **Feedback System**: Integrated feedback submission modal for users and a dedicated admin feedback management panel.

---

## 🏗️ Architecture & Technology Stack

### Frontend

- **Framework**: React 18 (Vite build tool)
- **UI Components & Styling**: Material UI (MUI v5), `@emotion/react`, `@emotion/styled`
- **Data Table**: `material-react-table`
- **Notifications**: `react-toastify`
- **Real-Time Communication**: `socket.io-client`
- **HTTP Client**: `axios` with global interceptors for automated token refresh

### Backend

- **Runtime**: Node.js
- **Web Framework**: Express.js
- **Database & ORM**: PostgreSQL with Sequelize ORM
- **Real-Time Engine**: Socket.IO
- **Authentication**: JSON Web Tokens (JWT) & bcryptjs
- **File Uploads**: Multer

## ⚙️ Environment Configuration

Set up environment variables in both the `backend` and `frontend` directories using `.env` files.

### 1. Backend (`backend/.env`)

> **Note:** Never commit real secrets to source control. Use strong, randomly generated keys in production.

```env
PORT=5000
DB_NAME=your_db_name
DB_USER=your_db_user
DB_PASS=your_db_password
DB_HOST=localhost
JWT_SECRET=your_jwt_secret_key_here
SERVER_MASTER_KEY=your_64_character_hex_master_key_here
MAX_UPLOAD_SIZE_MB=350
MAX_WRONG_PWD_LIMIT=5
INIT_ADMIN_USER=admin
INIT_ADMIN_PASS=your_initial_admin_password
```

### 2. Frontend (`frontend/.env`)

```env
VITE_API_BASE_URI=http://localhost:5000
VITE_CAPTCHA_SERVICE_URL=http://localhost:11905
VITE_MAX_UPLOAD_SIZE_MB=350
```

---

## 💻 Getting Started

### Prerequisites

- **Node.js**: v18+ installed
- **PostgreSQL**: Running instance with a created database matching `DB_NAME`
- **CAPTCHA Service**: Running service at the configured `VITE_CAPTCHA_SERVICE_URL`

### 1. Backend Setup

```bash
# Navigate to the backend directory
cd backend

# Install dependencies
npm install

# Start development server
npm run dev
```

The backend server will start on `http://localhost:5000`.

### 2. Frontend Setup

```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

The frontend application will be accessible at `http://localhost:5173`.

---

## 🔒 Security Best Practices Implemented

- **Sanitized Inputs**: Input fields enforce strict length and character validation.
- **Session Protection**: Automatic token refresh handling on 401 Unauthorized errors and clean socket closure on logout or page refresh.
- **Singleton Sockets**: Server terminates stale socket connections if a new session is initialized for the same user ID.
- **Sensitive Credentials**: All administrative initialization credentials and database keys are managed via environment variables.

---

## 📄 License

This project is licensed under the Apache License. See the [LICENSE](LICENSE) file for details.
