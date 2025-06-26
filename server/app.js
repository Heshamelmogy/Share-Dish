const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Allow CORS for localhost and Codespaces/GitHub.dev
const allowedOrigins = [
  'http://localhost:3000',
  'https://shiny-guide-q77q6pw7xwg42x6g-3000.app.github.dev', // Add your Codespaces frontend URL here
  'https://shiny-guide-q77q6pw7xwg42x6g-5000.app.github.dev', // Add your Codespaces backend URL here if needed
];
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

app.use(express.json());

// Import and use routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const userRoutes = require('./routes/users');
app.use('/api/users', userRoutes);

const postRoutes = require('./routes/posts');
app.use('/api/posts', postRoutes);

const messageRoutes = require('./routes/messages');
app.use('/api/messages', messageRoutes);

const chatRoutes = require('./routes/chat');
app.use('/api/chat', chatRoutes);

app.use('/uploads', express.static('uploads'));

app.get('/', (req, res) => {
  res.send('Share Dish API is running');
});

const http = require('http');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 5000;
// Use local MongoDB for easier setup - no external dependencies needed
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/share-dish';

// Connect to MongoDB with updated options
mongoose.connect(MONGO_URI, {
  serverApi: {
    version: '1',
    strict: true,
    deprecationErrors: true,
  }
})
.then(() => {
  console.log('Connected to MongoDB');
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Socket.io logic
  io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Join a chat room for a specific post
    socket.on('joinRoom', ({ postId }) => {
      socket.join(postId);
    });

    // Handle sending a message
    socket.on('sendMessage', async ({ postId, sender, text }) => {
      try {
        // Save message to DB
        const Chat = require('./models/Chat');
        let chat = await Chat.findOne({ post: postId });
        if (!chat) {
          chat = new Chat({ post: postId, users: [sender], messages: [] });
        }
        chat.messages.push({ sender, text });
        await chat.save();

        // Emit message to all users in the room
        io.to(postId).emit('receiveMessage', {
          sender,
          text,
          createdAt: new Date()
        });
      } catch (error) {
        console.error('Error saving message:', error);
        socket.emit('error', { message: 'Failed to save message' });
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
})
.catch(err => {
  console.error('MongoDB connection error:', err);
  console.log('Please make sure MongoDB is installed and running, or provide a valid MONGO_URI in the .env file');
  console.log('For local development, install MongoDB: https://docs.mongodb.com/manual/installation/');
  process.exit(1);
});