# 🐦 ChirpNet

> ChirpNet is a scalable backend for a social media platform similar to Twitter (X), built with Node.js, Express, and MongoDB. It supports secure JWT authentication, user profiles, follow system, chirps with media uploads, likes, comments, rechirps, and more.

---

## 📌 Overview

ChirpNet is a feature-rich backend designed for a modern social media experience. It handles user authentication, profile management, following/unfollowing, chirp creation with media uploads, and interactive features such as likes, comments, and rechirps.

---

## 🚀 Features

### 🔐 Authentication & Authorization

- Register / Login / Logout (JWT + Refresh Tokens)
- Access tokens in HTTP-only cookies; refresh token flow
- Change password (with current password verification)
- Update profile (avatar upload to Cloudinary)
- Delete account (with Cloudinary media cleanup & token invalidation)
- Role-based support (user / admin)

### 🐦 Chirps (posts)

- Create chirps with optional image/video upload (Cloudinary)
- Delete own chirps (and remove associated media + comments)
- Rechirp (retweet-style) — create or undo rechirp linked to original chirp
- Pagination for feeds and profile timelines

### 💬 Interactions

- Like / Unlike chirps (toggle)
- Comment on chirps (create & delete)
- Fetch comments for a chirp (paginated, with author info)
- commentsCount included in feed for efficiency

### 👥 Relationships

- Follow / Unfollow users (toggle)
- Get followers / following lists (paginated)
- Public user profiles with follower/following counts and isFollowing flag

### 📁 File Uploads

- Handled with multer → saved to public/temp → uploaded to Cloudinary → temp file deleted
- Validations for file type and size
- Cloudinary configuration and safe cleanup on delete

---

## 🛠️ Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** MongoDB + Mongoose
- **Authentication:** JWT (Access + Refresh Tokens)
- **File Storage:** Cloudinary
- **Security:** CORS, secure cookies
- **Dev Tools:** Postman, Nodemon, Git

---

## 🗃️ Folder Structure

```txt
chirpnet-backend/
├── config/         # DB config
├── controllers/    # Route logic
├── middlewares/    # Auth, multer, error handling, etc.
├── models/         # Mongoose schemas
├── routes/         # Express routes
├── utils/          # Helper functions
├── public/temp/    # Temp media storage (deleted after Cloudinary upload)
├── .env.example    # Sample environment variables
├── app.js          # Express app (routes + middleware)
├── server.js       # Entry point
└── README.md       # This file

```

---

## 📄 License

MIT License.

---

## 👨‍💻 Author

**Tehseen Javed**  
Backend Developer | Computer Systems Engineering Student @ DUET
[GitHub Profile](https://github.com/Tehseen100)

---
