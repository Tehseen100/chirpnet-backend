# 🐦 ChirpNet 

> Scalable Twitter-like backend API built with Node.js, Express, and MongoDB. Supports JWT authentication, user roles, media uploads, likes, comments, rechirps, and more.

---

## 📌 Overview

ChirpNet is a scalable and secure backend for a social media platform similar to Twitter (X). It handles user authentication, chirp creation with media support, interactions (likes, comments, rechirps), and efficient querying with pagination and population.

---

## 🚀 Features

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
- **Security:**  CORS, secure cookies
- **Dev Tools:** Postman, Nodemon, ESLint, Git

---

## 🗃️ Folder Structure

```txt
chirpnet-backend/
├── config/         # DB config
├── controllers/    # Route logic
├── middleware/     # Auth, error handling
├── models/         # Mongoose schemas
├── routes/         # Express routes
├── utils/          # Helper functions
├── public/         # Temp media storage
├── .env.example    # Sample environment vars
├── server.js       # Entry point
└── README.md       # Project documentation

---

## 📄 License
MIT License.
 
---

## 👨‍💻 Author

**Tehseen Javed**  
Backend Developer | Computer Systems Engineering Student at DUET  
[GitHub Profile](https://github.com/Tehseen100)