# 🎓 LMS Portal V1

A scalable and modular **Learning Management System (LMS)** built with **Node.js**, **Express**, and **MongoDB**, designed to handle complete lifecycle management of batches, students, instructors, and authentication within an educational platform.

---

## 🚀 Overview

**LMS Portal V1** is a backend-driven platform that provides role-based access for **Admin**, **Instructor**, and **Student** users.  
It enables smooth onboarding, batch assignment, course tracking, and secure authentication with **JWT + Refresh Tokens**.

The system is designed with **modular architecture**, supporting easy scalability (Redis, Microservices, etc.) and future front-end integrations.

---

## 🧩 Modules

### 1. 🔐 Auth Module
Handles user identity, onboarding, and session management.

**Features**
- User Onboarding (Admin adds students/instructors)
- Role-based access control (`Admin`, `Instructor`, `Student`)
- Login / Logout
- Access & Refresh token mechanism
- Password reset (request & reset endpoints)
- Change password functionality
- `me` endpoint for user info retrieval

**Dependencies**
- `auth.middleware.js` – verifies access token
- `role.middleware.js` – restricts routes based on user role
- `user.model.js` – stores core user info
- `notification.service.js` – triggers welcome message + credentials
- `invoice.service.js` – generates invoice for batch fees during onboarding

---

### 2. 📦 Batch Module

Handles creation and management of training batches.

**Features**
- Create / Update / View / Deactivate batches
- Assign instructor(s)
- Enroll student(s)
- Retrieve instructor/student-specific batches
- List all batches (Admin)

**Dependencies**
- `auth.middleware.js` (JWT)
- `role.middleware.js`
- `notification.service.js` (batch assignment notification)
- `invoice.service.js` (batch fee invoice on enrollment)

---

### 3. 💬 Notification Module

Handles email and in-app notifications for onboarding, batch updates, and credentials.

**Triggers**
- New user onboarding → Sends welcome email + credentials
- Student enrollment → Sends invoice + enrollment details
- Batch instructor assignment → Sends assignment notification

**Integration**
- Uses Nodemailer / AWS SES (configurable)
- Can be extended to push notifications or socket events


## 🧱 Tech Stack

| Layer | Technology |
|-------|-------------|
| **Runtime** | Node.js (v18+) |
| **Framework** | Express.js |
| **Database** | MongoDB / Mongoose |
| **Cache** | Redis |
| **Auth** | JWT + Refresh Tokens |
| **Mailer** | Nodemailer |
| **Environment** | `.env` via dotenv |
| **Documentation** | Postman Collection |

## ⚙️ Setup Instructions

### 1. Clone Repo
```bash
git clone https://github.com/<your-username>/lms-portal-v1.git
cd lms-portal-v1
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
Create a `.env` file with:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/lms
JWT_SECRET=<your_jwt_secret>
REFRESH_TOKEN_SECRET=<your_refresh_secret>
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
MAIL_USER=<email_user>
MAIL_PASS=<email_password>
```

### 4. Start Server
```bash
npm run dev
```

Server runs at → `http://localhost:5000`

---

## 📬 Postman Collection

A complete, ready-to-import **Postman Collection** is provided for:
- Auth module (login, refresh, onboarding)
- Batch module (create, assign, enroll)

---

## 🧠 Architecture Notes

- Each module follows a **Controller–Service–Model** pattern.  
- Middleware ensures **token verification** and **role authorization**.  
- Redis caching improves performance for session-heavy operations.  
- Modular design ready for **microservice split** (planned for v2).

---

## 🧭 Future Roadmap (v2+)

- ✅ Microservices-based module separation (Auth, Batch, Payment)
- ✅ Docker support for environment consistency
- ✅ GraphQL support for flexible front-end queries
- ✅ Socket-based live class notifications
- ✅ Instructor analytics dashboard
- ✅ Student progress tracking

---

## 👥 Roles Summary

| Role | Capabilities |
|------|---------------|
| **Admin** | Onboard users, manage batches, assign instructors |
| **Instructor** | View assigned batches, manage students |
| **Student** | View enrolled batches, receive notifications/invoices |

---

## 🧾 License

MIT License © 2025 LMS Portal Team

---

## 💡 Author Notes

This project is built as part of a modular backend learning track — progressing from authentication to microservices and scaling.

