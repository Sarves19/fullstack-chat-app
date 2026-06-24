# 💬 Fullstack Realtime Chat App

A realtime chat application built with the MERN stack and Socket.io.

##  Tech Stack

- **Frontend**: React, TailwindCSS, DaisyUI, Zustand
- **Backend**: Node.js, Express, Socket.io
- **Database**: MongoDB Atlas
- **Media**: Cloudinary
- **Auth**: JWT

##  Features

- Real-time messaging with Socket.io
- User authentication & authorization (JWT)
- Online user status
- Profile picture upload via Cloudinary
- Global state management with Zustand

##  Setup

Create a `.env` file in the `backend/` folder:

```env
MONGODB_URI=your_mongodb_uri
PORT=5001
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
NODE_ENV=production
```

##  Run Locally

```bash
npm run build
npm start
```

Open [http://localhost:5001](http://localhost:5001)

##  Author

**Sarves** — [GitHub](https://github.com/Sarves19)
