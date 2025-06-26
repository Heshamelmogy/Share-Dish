const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

const allowedOrigins = [
  'https://shiny-guide-q77q6pw7xwg42x6g-3000.app.github.dev'
];
app.use(cors({
  origin: allowedOrigins,
  credentials: true
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
  res.send('Share Dish API is running on Codespaces');
});

const http = require('http');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 5000;

// Try to connect to MongoDB, but don't fail if it's not available
const connectToMongoDB = async () => {
  try {
    const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/share-dish';
    
    await mongoose.connect(MONGO_URI, {
      serverApi: {
        version: '1',
        strict: true,
        deprecationErrors: true,
      }
    });
    
    console.log('Connected to MongoDB');
    return true;
  } catch (error) {
    console.log('MongoDB connection failed, using in-memory storage');
    console.log('   To use MongoDB, set MONGODB_URI in your environment variables');
    console.log('   You can use MongoDB Atlas: https://www.mongodb.com/atlas');
    return false;
  }
};

// Start server regardless of MongoDB connection
const startServer = async () => {
  const mongoConnected = await connectToMongoDB();
  
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // Socket.io logic
  io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('joinRoom', ({ postId }) => {
      socket.join(postId);
    });

    socket.on('sendMessage', async ({ postId, sender, text }) => {
      try {
        if (mongoConnected) {
          // Save message to DB
          const Chat = require('./models/Chat');
          let chat = await Chat.findOne({ post: postId });
          if (!chat) {
            chat = new Chat({ post: postId, users: [sender], messages: [] });
          }
          chat.messages.push({ sender, text });
          await chat.save();
        }

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

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API available at: http://localhost:${PORT}`);
    console.log(`Frontend will be available at: http://localhost:3000`);
  });
};

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
}); 