import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Chip,
  Stack,
  IconButton,
  Alert,
  Autocomplete,
  CircularProgress,
} from '@mui/material';
import { PhotoCamera, Add as AddIcon, Delete as DeleteIcon, Restaurant } from '@mui/icons-material';
import api from '../api';
import axios from 'axios';

interface Ingredient {
  name: string;
  quantity: string;
}

const AddPost: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [newIngredient, setNewIngredient] = useState({ name: '', quantity: '' });
  const [allergies, setAllergies] = useState<string[]>([]);
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [description, setDescription] = useState('');
  const [mongoUserId, setMongoUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchMongoUserId = async () => {
      if (!user) return;
      
      try {
        const response = await api.get('/api/users/firebase/' + user.uid);
        setMongoUserId(response.data._id);
      } catch (err) {
        console.error('Error fetching MongoDB user ID:', err);
        const error: any = err;
        if (error.response) {
          console.error('Error response data:', error.response.data);
          console.error('Error response status:', error.response.status);
        } else if (error.request) {
          console.error('Error request:', error.request);
        } else {
          console.error('Error message:', error.message);
        }
        setError('Failed to load user data. Please try again later.');
      }
    };

    fetchMongoUserId();
  }, [user]);

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      setLoading(true);
      const response = await api.post('/api/posts/upload', formData);
      setPhoto(response.data.url);
      setError(null);
    } catch (err) {
      console.error('Upload error:', err);
      setError('Failed to upload photo. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddIngredient = () => {
    if (newIngredient.name && newIngredient.quantity) {
      setIngredients([...ingredients, newIngredient]);
      setNewIngredient({ name: '', quantity: '' });
    }
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const isFormValid = () => {
    return (
      photo &&
      ingredients.length > 0 &&
      city.trim() !== '' &&
      address.trim() !== '' &&
      pickupTime !== ''
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !mongoUserId) {
      setError('You must be logged in to create a post');
      return;
    }

    if (!isFormValid()) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const postData = {
        user: mongoUserId,
        photo,
        ingredients: ingredients.map(i => `${i.name} (${i.quantity})`),
        allergies,
        city,
        address,
        time: new Date(pickupTime),
        description,
        reserved: false
      };

      console.log('Submitting post data:', postData);
      const response = await api.post('/api/posts', postData);
      console.log('Post created successfully:', response.data);
      
      // Navigate to home page after successful post creation
      navigate('/');
    } catch (err: any) {
      console.error('Error creating post:', err);
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || 'Failed to create post. Please try again.');
      } else {
        setError('Failed to create post. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  console.log({
    photo,
    ingredients,
    city,
    address,
    pickupTime,
    isFormValid: isFormValid()
  });

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 3, py: 1, border: '2px solid #e0e0e0', borderRadius: 3, bgcolor: '#fff', boxShadow: 1 }}>
            <Restaurant sx={{ fontSize: 32, color: 'primary.main' }} />
            <Typography variant="h4" fontWeight={700} color="primary">
              Share Your Meal
            </Typography>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Stack spacing={3}>
            {/* Photo Upload */}
            <Box sx={{ textAlign: 'center' }}>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                style={{ display: 'none' }}
                ref={fileInputRef}
              />
              <Button
                variant="outlined"
                startIcon={<PhotoCamera />}
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
              >
                Upload Photo
              </Button>
              {photo && (
                <Box sx={{ mt: 2 }}>
                  <img
                    src={photo}
                    alt="Meal"
                    style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px' }}
                    onError={e => {
                      (e.target as HTMLImageElement).src = 'https://source.unsplash.com/featured/?food';
                      setError('Failed to load uploaded image. Showing fallback.');
                    }}
                  />
                  <Box sx={{ mt: 1 }}>
                    <a href={photo} target="_blank" rel="noopener noreferrer">View Uploaded Image URL</a>
                  </Box>
                </Box>
              )}
            </Box>

            {/* Ingredients */}
            <Box>
              <Typography variant="h6" gutterBottom>
                Ingredients
              </Typography>
              <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                <TextField
                  label="Ingredient Name"
                  value={newIngredient.name}
                  onChange={(e) => setNewIngredient({ ...newIngredient, name: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddIngredient();
                    }
                  }}
                  fullWidth
                />
                <TextField
                  label="Quantity"
                  value={newIngredient.quantity}
                  onChange={(e) => setNewIngredient({ ...newIngredient, quantity: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddIngredient();
                    }
                  }}
                  fullWidth
                />
                <IconButton
                  color="primary"
                  onClick={handleAddIngredient}
                  disabled={!newIngredient.name || !newIngredient.quantity}
                >
                  <AddIcon />
                </IconButton>
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                Add at least one ingredient (required). Press Enter or click + to add.
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {ingredients.map((ingredient, index) => (
                  <Chip
                    key={index}
                    label={`${ingredient.name} (${ingredient.quantity})`}
                    onDelete={() => handleRemoveIngredient(index)}
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Box>

            {/* Allergies */}
            <Autocomplete
              multiple
              freeSolo
              options={['Nuts', 'Dairy', 'Gluten', 'Shellfish', 'Eggs']}
              value={allergies}
              onChange={(_, newValue) => setAllergies(newValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Allergies"
                  placeholder="Add allergies"
                />
              )}
            />

            {/* Location */}
            <TextField
              label="City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
              fullWidth
              error={!city && error !== null}
              helperText={!city && error !== null ? 'City is required' : ''}
            />
            <TextField
              label="Pickup Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
              fullWidth
              multiline
              rows={2}
              error={!address && error !== null}
              helperText={!address && error !== null ? 'Address is required' : ''}
            />

            {/* Pickup Time */}
            <TextField
              label="Pickup Time"
              type="datetime-local"
              value={pickupTime}
              onChange={(e) => setPickupTime(e.target.value)}
              required
              fullWidth
              InputLabelProps={{ shrink: true }}
              error={!pickupTime && error !== null}
              helperText={!pickupTime && error !== null ? 'Pickup time is required' : ''}
            />

            {/* Description */}
            <TextField
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              multiline
              rows={4}
              fullWidth
            />

            {/* Submit Button */}
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={loading || !isFormValid()}
            >
              {loading ? <CircularProgress size={24} /> : 'Share Meal'}
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
};

export default AddPost;