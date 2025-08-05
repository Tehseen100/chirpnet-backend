### ChirpNet - Backend 🐦

> A Twitter-like backend API built with Node.js, Express.js, and MongoDB, featuring authentication, user roles, media uploads, chirps, likes, comments, rechirps, and more.

---

### 📌 Overview

ChirpNet is a scalable and secure backend for a social media platform similar to Twitter (X). It handles user authentication, chirp creation with media support, interactions (likes, comments, rechirps), and efficient querying with pagination and population.

---

### 🚀 Features

### 🔐 Authentication & Authorization

- Register / Login / Logout (JWT + Refresh Tokens)
- Secure access token renewal via cookies
- Role-based access control (User/Admin)

### 🐦 Chirps

- Create chirps with optional media upload
- Like/unlike chirps
- Comment on chirps (with latest 3 visible)
- Rechirp original chirps
- View timeline with chirps, authors, and interactions
- Delete own chirps (with media & comment cleanup)
- Pagination supported

### 💬 Comments

- Add comments to chirps
- View latest 3 comments per chirp
- Delete own comment or if chirp is deleted

### 📁 File Uploads

- Upload images to Cloudinary
- Validations for file type and size

---

## 🛠️ Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** MongoDB + Mongoose
- **Authentication:** JWT (Access + Refresh Tokens)
- **File Storage:** Cloudinary
- **Security:** CORS, secure cookies
- **Dev Tools:** Postman, Nodemon, Git

---

# ⚙️ Installation

### 1. Clone the repo

```bash
git clone https://github.com/your-username/chirpnet-backend.git
cd chirpnet-backend
```

### 2. Install dependencies
npm install

### 3. Setup Environment Variables
Create a .env file in the root and add the following:

PORT=5000
MONGODB_URI=your_mongodb_connection
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

### 4. Run the Server
npm start
Server will start on http://localhost:5000.

### 🧪 API Testing
Use Postman to test the API. Make sure to:

-Send access tokens in cookies
-Use multipart/form-data for media uploads

### 🗃️ Folder Structure

chirpnet-backend/
├── config/             # DB config
├── controllers/        # Route logic
├── middleware/         # Auth, error handling
├── models/             # Mongoose schemas
├── routes/             # Express routes
├── utils/              # Helper functions
├── public/             # Temp media storage
├── .env.example        # Sample environment vars
├── server.js           # Entry point
└── README.md           # Project documentation

### 🧠 Lessons Learned
# Built secure, scalable REST APIs
# Mastered JWT authentication with refresh tokens
# Applied real-world MongoDB aggregation
# Designed and tested robust data models with Mongoose
# Implemented file uploads and cloud storage
# Focused on clean architecture and best practices

### 📄 License
MIT License.

### 👨‍💻 Author
Tehseen Javed
Backend Developer | Computer Systems Engineering Student at DUET
https://github.com/Tehseen100