import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { Box, Typography, Paper, Button, CircularProgress, Chip, Grid, Card, CardContent, CardMedia } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { Message as MessageIcon, LocationOn, AccessTime, Restaurant } from '@mui/icons-material';

interface Post {
  _id: string;
  photo: string;
  ingredients: string[];
  allergies: string[];
  city: string;
  address: string;
  time: string;
  description: string;
  reserved: boolean;
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
}

const PostDetails: React.FC = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mongoUserId, setMongoUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchPost = async () => {
      setLoading(true);
      try {
        const postRes = await api.get('/api/posts');
        const found = postRes.data.find((p: Post) => p._id === id);
        setPost(found);
      } catch (err) {
        setError('Failed to load post.');
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [id]);

  useEffect(() => {
    const fetchMongoUserId = async () => {
      if (!user) return;
      try {
        const response = await api.get('/api/users/firebase/' + user.uid);
        setMongoUserId(response.data._id);
      } catch (err) {
        setMongoUserId(null);
      }
    };
    fetchMongoUserId();
  }, [user]);

  const handleContactPublisher = async () => {
    if (!mongoUserId || !post || !post.user?._id) return;
    try {
      // Create or fetch the chat
      const response = await api.post('/api/chat/start', {
        postId: post._id,
        userId1: mongoUserId,
        userId2: post.user._id,
      });
      // Navigate to messages and pass chatId in state
      navigate('/messages', { state: { chatId: response.data._id } });
    } catch (err) {
      alert('Failed to start chat.');
    }
  };

  const handleReserve = async () => {
    if (!post || !mongoUserId) return;
    
    try {
      await api.patch('/api/posts/' + post._id + '/reserve');
      setPost({ ...post, reserved: true });
    } catch (err) {
      setError('Failed to reserve post.');
    }
  };

  const handleDelete = async () => {
    if (!post || !mongoUserId) return;
    
    try {
      await api.delete('/api/posts/' + post._id);
      navigate('/');
    } catch (err) {
      setError('Failed to delete post.');
    }
  };

  if (loading) return <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh"><CircularProgress /></Box>;
  if (error || !post) return <Box p={4}><Typography color="error">{error || 'Post not found.'}</Typography></Box>;

  const isOwner = mongoUserId === post.user._id;

  return (
    <Box p={4}>
      <Grid container spacing={3}>
        {/* Post Image */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardMedia
              component="img"
              height="400"
              image={post.photo && post.photo.startsWith('http') ? post.photo : post.photo}
              alt="Food"
              sx={{ objectFit: 'cover' }}
            />
          </Card>
        </Grid>

        {/* Post Details */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: 'fit-content' }}>
            <Typography variant="h4" gutterBottom>
              {post.ingredients.join(', ')}
            </Typography>
            
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <Restaurant color="primary" />
              <Typography variant="body1">
                by {post.user.firstName} {post.user.lastName}
              </Typography>
            </Box>

            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <LocationOn color="primary" />
              <Typography variant="body1">
                {post.city}, {post.address}
              </Typography>
            </Box>

            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <AccessTime color="primary" />
              <Typography variant="body1">
                {new Date(post.time).toLocaleString()}
              </Typography>
            </Box>

            {post.description && (
              <Typography variant="body1" mb={2}>
                {post.description}
              </Typography>
            )}

            {post.allergies.length > 0 && (
              <Box mb={2}>
                <Typography variant="subtitle2" gutterBottom>
                  Allergies:
                </Typography>
                <Box display="flex" gap={1} flexWrap="wrap">
                  {post.allergies.map((allergy, index) => (
                    <Chip key={index} label={allergy} color="warning" size="small" />
                  ))}
                </Box>
              </Box>
            )}

            <Box display="flex" gap={2} flexWrap="wrap">
              {isOwner ? (
                <>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleReserve}
                    disabled={post.reserved}
                    sx={{ minWidth: 120 }}
                  >
                    {post.reserved ? 'Reserved' : 'Mark as Reserved'}
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    onClick={handleDelete}
                    sx={{ minWidth: 120 }}
                  >
                    Delete Post
                  </Button>
                </>
              ) : (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<MessageIcon />}
                  onClick={handleContactPublisher}
                  disabled={!mongoUserId}
                  sx={{ minWidth: 150 }}
                >
                  Contact Publisher
                </Button>
              )}
            </Box>

            {post.reserved && (
              <Box mt={2}>
                <Chip label="Reserved" color="success" />
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default PostDetails;