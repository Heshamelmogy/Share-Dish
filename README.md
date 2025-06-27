# Share Dish

A full-stack web application for sharing and discovering food posts, built with React, Node.js, and Express.

## Features

- **User Authentication**: Secure login and registration with Firebase
- **Food Post Sharing**: Upload and share food photos with descriptions
- **Real-time Messaging**: Chat with other users about food
- **User Profiles**: Personalize your profile and view others
- **Post Management**: Create, edit, and delete your posts
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

### Frontend
- React with TypeScript
- Firebase Authentication
- CSS for styling

### Backend
- Node.js with Express
- MongoDB (with Mongoose)
- Cloudinary for image uploads
- Socket.io for real-time messaging

## Project Structure

```
share-dish/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── contexts/       # React contexts
│   │   ├── pages/          # Page components
│   │   └── ...
├── server/                 # Node.js backend
│   ├── controllers/        # Route controllers
│   ├── models/            # MongoDB models
│   ├── routes/            # API routes
│   ├── uploads/           # Uploaded images
│   └── ...
└── ...
```

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- MongoDB database
- Firebase project
- Cloudinary account

### Installation

. Install dependencies for both client and server:
```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

. Set up environment variables:

Create `.env` files in both `server/` and `client/` directories with your configuration:





# Start the backend server (from server directory)
cd server
npm start

# Start the frontend (from client directory, in a new terminal)
cd client
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/verify` - Verify JWT token

### Posts
- `GET /api/posts` - Get all posts
- `POST /api/posts` - Create a new post
- `GET /api/posts/:id` - Get a specific post
- `PUT /api/posts/:id` - Update a post
- `DELETE /api/posts/:id` - Delete a post

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get a specific user
- `PUT /api/users/:id` - Update user profile

### Messages
- `GET /api/messages` - Get user messages
- `POST /api/messages` - Send a message



## Contact

hesham.elmogy14@gmail.com

