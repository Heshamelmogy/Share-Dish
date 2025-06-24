import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import type { GridProps } from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardMedia from '@mui/material/CardMedia';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import CardActions from '@mui/material/CardActions';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Restaurant } from '@mui/icons-material';
import EditIcon from '@mui/icons-material/Edit';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';

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
  user?: {
    _id: string;
    firebaseUid?: string;
    firstName?: string;
    lastName?: string;
  };
}

const API_URL =
  window.location.hostname.includes("github.dev") || window.location.hostname.includes("app.github.dev")
    ? "https://shiny-guide-q77q6pw7xwg42x6g-5000.app.github.dev"
    : "http://localhost:5000";
console.log("API_URL (dev hack):", API_URL);

const Home: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [menuPostId, setMenuPostId] = useState<string | null>(null);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.get(`${API_URL}/api/posts`);
        console.log('Fetched posts:', response.data);
        setPosts(response.data);
      } catch (err) {
        console.error('Error fetching posts:', err);
        setError('Failed to load posts. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const handleDelete = async (postId: string) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      await axios.delete(`${API_URL}/api/posts/${postId}`);
      setPosts(posts.filter(p => p._id !== postId));
    } catch (err) {
      alert('Failed to delete post.');
    }
  };

  const handleReserve = async (postId: string) => {
    try {
      const response = await axios.patch(`${API_URL}/api/posts/${postId}/reserve`);
      setPosts(posts.map(p => p._id === postId ? { ...p, reserved: true } : p));
    } catch (err) {
      alert('Failed to mark as reserved.');
    }
  };

  const handleViewAndChat = (postId: string) => {
    navigate(`/post/${postId}`);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, postId: string) => {
    setMenuAnchorEl(event.currentTarget);
    setMenuPostId(postId);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setMenuPostId(null);
  };

  return (
    <Container sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 3, py: 1, border: '2px solid #e0e0e0', borderRadius: 3, bgcolor: '#fff', boxShadow: 1 }}>
          <Restaurant sx={{ fontSize: 24, color: 'primary.main' }} />
          <Typography variant="h5" fontWeight={700} color="primary">
            Meals Near You
          </Typography>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {loading ? (
          // Loading skeletons
          Array.from({ length: 4 }).map((_, i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
                <Skeleton variant="rectangular" height={200} />
                <CardContent>
                  <Skeleton />
                  <Skeleton width="60%" />
                  <Skeleton width="40%" />
                </CardContent>
              </Card>
            </Grid>
          ))
        ) : posts.length === 0 ? (
          // No posts message
          <Grid item xs={12}>
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h6" color="text.secondary">
                No meals found. Be the first to share!
              </Typography>
            </Box>
          </Grid>
        ) : (
          // Posts grid
          posts.map((post: Post) => (
            <Grid item xs={12} sm={6} md={4} key={post._id}>
              <Box sx={{ position: 'relative', height: '100%' }}>
                <Card
                  sx={{
                    borderRadius: 3,
                    boxShadow: 3,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    '&:hover .edit-pen-icon': { opacity: 1 },
                  }}
                >
                  {user && post.user && post.user.firebaseUid && user.uid === post.user.firebaseUid && (
                    <>
                      <IconButton
                        aria-label="more"
                        onClick={e => handleMenuOpen(e, post._id)}
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          zIndex: 2,
                          bgcolor: 'white',
                          boxShadow: 1,
                          transition: 'opacity 0.2s',
                          '&:hover': { bgcolor: 'primary.light' },
                          pointerEvents: 'auto',
                        }}
                      >
                        <MoreVertIcon color="primary" />
                      </IconButton>
                      <Menu
                        anchorEl={menuAnchorEl}
                        open={menuPostId === post._id}
                        onClose={handleMenuClose}
                        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                      >
                        <MenuItem onClick={() => { handleMenuClose(); navigate(`/edit/${post._id}`); }}>
                          <EditIcon fontSize="small" sx={{ mr: 1 }} /> Edit
                        </MenuItem>
                        <MenuItem onClick={() => { handleMenuClose(); handleReserve(post._id); }} disabled={post.reserved}>
                          {post.reserved ? 'Reserved' : 'Mark as Reserved'}
                        </MenuItem>
                        <MenuItem onClick={() => { handleMenuClose(); handleDelete(post._id); }}>
                          <span style={{ color: '#d32f2f', fontWeight: 600 }}>Delete</span>
                        </MenuItem>
                      </Menu>
                    </>
                  )}
                  <CardMedia
                    component="img"
                    height="200"
                    image={post.photo || "https://source.unsplash.com/featured/?food"}
                    alt="Meal"
                    sx={{ objectFit: 'cover' }}
                  />
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {post.description}
                    </Typography>
                    <Typography variant="h6" fontWeight={600} gutterBottom>
                      {post.ingredients.join(', ')}
                    </Typography>
                    
                    {post.allergies.length > 0 && (
                      <Box mt={1} mb={1}>
                        {post.allergies.map((allergy, i) => (
                          <Chip key={i} label={allergy} color="warning" size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                        ))}
                      </Box>
                    )}

                    <Typography variant="body2" color="text.secondary">
                      <strong>Location:</strong> {post.city}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Address:</strong> {post.address}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Pickup Time:</strong> {formatDate(post.time)}
                    </Typography>

                    {post.reserved && (
                      <Chip
                        label="Reserved"
                        color="error"
                        size="small"
                        sx={{ mt: 1 }}
                      />
                    )}
                  </CardContent>
                  <CardActions sx={{ p: 2, pt: 0 }}>
                    <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
                      <Button
                        variant="contained"
                        color="primary"
                        size="medium"
                        sx={{ fontWeight: 600, minWidth: 120, flex: 1 }}
                        onClick={() => handleViewAndChat(post._id)}
                        disabled={post.reserved}
                      >
                        View & Chat
                      </Button>
                    </Box>
                  </CardActions>
                </Card>
              </Box>
            </Grid>
          ))
        )}
      </Grid>
    </Container>
  );
};

export default Home;