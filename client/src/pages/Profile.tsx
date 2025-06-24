import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Box,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../firebaseConfig';
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential, deleteUser } from 'firebase/auth';
import { Person } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface UserProfile {
  _id: string;
  firstName: string;
  lastName: string;
  gender: string;
  email: string;
}

const API_URL =
  window.location.hostname.includes("github.dev") || window.location.hostname.includes("app.github.dev")
    ? "https://shiny-guide-q77q6pw7xwg42x6g-5000.app.github.dev"
    : "http://localhost:5000";

const Profile: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  
  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordChange, setShowPasswordChange] = useState(false);

  // Delete account states
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) {
        setError('Please sign in to view your profile');
        setLoading(false);
        return;
      }

      try {
        console.log('Fetching user data for Firebase UID:', user.uid);
        
        // First, get the MongoDB user ID
        const userResponse = await axios.get(`${API_URL}/api/users/firebase/${user.uid}`);
        console.log('User data response:', userResponse.data);
        
        if (!userResponse.data || !userResponse.data._id) {
          throw new Error('User profile not found');
        }

        const mongoUserId = userResponse.data._id;
        console.log('MongoDB User ID:', mongoUserId);

        // Then fetch the full profile
        const profileResponse = await axios.get(`${API_URL}/api/users/${mongoUserId}`);
        console.log('Profile data response:', profileResponse.data);
        
        setProfile(profileResponse.data);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching user data:', err);
        setError(err.response?.data?.message || 'Failed to load user data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile._id) {
      setError('User not authenticated');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await axios.put(`${API_URL}/api/users/${profile._id}`, profile);
      if (response.data) {
        setProfile(response.data);
        setSuccess('Profile updated successfully!');
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || 'Failed to update profile. Please try again.');
      } else {
        setError('Failed to update profile. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      setLoading(false);
      return;
    }

    if (!user || !user.email) {
      setError('User not authenticated');
      setLoading(false);
      return;
    }

    try {
      // Reauthenticate user before changing password
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Update password
      await updatePassword(user, newPassword);
      
      setSuccess('Password updated successfully!');
      setShowPasswordChange(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('Error changing password:', err);
      switch (err.code) {
        case 'auth/wrong-password':
          setError('Current password is incorrect');
          break;
        case 'auth/weak-password':
          setError('New password is too weak');
          break;
        default:
          setError('Failed to update password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user || !user.email || !deletePassword || !profile) {
      setError('Please enter your password to confirm account deletion');
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      console.log('Starting account deletion process for user:', profile._id);
      console.log('Full profile data:', profile);
      console.log('Firebase user:', user);
      
      // Reauthenticate user before deleting account
      console.log('Reauthenticating user...');
      const credential = EmailAuthProvider.credential(user.email, deletePassword);
      await reauthenticateWithCredential(user, credential);
      console.log('User reauthenticated successfully');

      // Delete user from MongoDB first
      console.log('Deleting user from MongoDB...');
      const mongoResponse = await axios.delete(`${API_URL}/api/users/${profile._id}`);
      console.log('MongoDB deletion response:', mongoResponse.data);

      // Delete Firebase user
      console.log('Deleting Firebase user...');
      await deleteUser(user);
      console.log('Firebase user deleted successfully');

      setSuccess('Account deleted successfully');
      setShowDeleteDialog(false);
      setDeletePassword('');
      
      // Logout and redirect to login
      setTimeout(() => {
        logout();
        navigate('/login');
      }, 2000);

    } catch (err: any) {
      console.error('Error deleting account:', err);
      if (axios.isAxiosError(err)) {
        console.error('Axios error details:', {
          status: err.response?.status,
          data: err.response?.data,
          message: err.message
        });
        setError(`Failed to delete account: ${err.response?.data?.error || err.message}`);
      } else {
        switch (err.code) {
          case 'auth/wrong-password':
            setError('Password is incorrect');
            break;
          case 'auth/requires-recent-login':
            setError('Please log in again before deleting your account');
            break;
          default:
            setError(`Failed to delete account: ${err.message}`);
        }
      }
    } finally {
      setDeleting(false);
    }
  };

  if (!user) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">
          Please log in to view your profile
        </Alert>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button
          variant="contained"
          color="primary"
          onClick={() => window.location.reload()}
          fullWidth
        >
          Retry
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 3, py: 1, border: '2px solid #e0e0e0', borderRadius: 3, bgcolor: '#fff', boxShadow: 1 }}>
          <Person sx={{ fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h4" fontWeight={700} color="primary">
            My Profile
          </Typography>
        </Box>
      </Box>

      {/* Profile Header */}
      <Paper elevation={3} sx={{ p: 4, mb: 3, borderRadius: 3, textAlign: 'center' }}>
        <Avatar sx={{ width: 80, height: 80, mx: 'auto', mb: 2, bgcolor: 'primary.main' }}>
          <Person sx={{ fontSize: 40 }} />
        </Avatar>
        <Typography variant="h5" gutterBottom fontWeight={600}>
          {profile.firstName} {profile.lastName}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {profile.email}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Member since {new Date(profile.createdAt).toLocaleDateString()}
        </Typography>
      </Paper>

      {/* Profile Information */}
      <Paper elevation={3} sx={{ p: 4, mb: 3, borderRadius: 3 }}>
        <Typography variant="h5" gutterBottom fontWeight={600} sx={{ mb: 3 }}>
          Profile Information
        </Typography>
        
        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}
        
        <form onSubmit={handleProfileUpdate}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="First Name"
                value={profile.firstName}
                onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                required
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Last Name"
                value={profile.lastName}
                onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                required
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                value={profile.email}
                disabled
                variant="outlined"
                sx={{ '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: 'rgba(0, 0, 0, 0.87)' } }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth variant="outlined">
                <InputLabel>Gender</InputLabel>
                <Select
                  value={profile.gender}
                  label="Gender"
                  onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                >
                  <MenuItem value="male">Male</MenuItem>
                  <MenuItem value="female">Female</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                  <MenuItem value="prefer-not-to-say">Prefer not to say</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={loading}
                fullWidth
                size="large"
                sx={{ mt: 2 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Update Profile'}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>

      {/* Change Password Section */}
      <Paper elevation={3} sx={{ p: 4, mb: 3, borderRadius: 3 }}>
        <Typography variant="h5" gutterBottom fontWeight={600} sx={{ mb: 3 }}>
          Change Password
        </Typography>
        
        {!showPasswordChange ? (
          <Button
            variant="outlined"
            color="primary"
            onClick={() => setShowPasswordChange(true)}
            fullWidth
            size="large"
          >
            Change Password
          </Button>
        ) : (
          <form onSubmit={handlePasswordChange}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="password"
                  label="Current Password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="password"
                  label="New Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="password"
                  label="Confirm New Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={loading}
                  fullWidth
                  size="large"
                >
                  {loading ? <CircularProgress size={24} /> : 'Update Password'}
                </Button>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setShowPasswordChange(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  fullWidth
                  size="large"
                >
                  Cancel
                </Button>
              </Grid>
            </Grid>
          </form>
        )}
      </Paper>

      {/* Delete Account Section */}
      <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
        <Typography variant="h5" gutterBottom fontWeight={600} sx={{ mb: 2, color: '#f44336' }}>
          Delete Account
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          This action cannot be undone. All your data, posts, and messages will be permanently deleted.
        </Typography>
        <Button
          variant="contained"
          color="error"
          onClick={() => setShowDeleteDialog(true)}
          fullWidth
          size="large"
        >
          Delete My Account
        </Button>
      </Paper>

      {/* Delete Account Confirmation Dialog */}
      <Dialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ color: '#f44336' }}>
          Confirm Account Deletion
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Are you sure you want to delete your account? This action cannot be undone.
          </DialogContentText>
          <TextField
            fullWidth
            type="password"
            label="Enter your password to confirm"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            variant="outlined"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteAccount}
            color="error"
            variant="contained"
            disabled={!deletePassword.trim() || deleting}
          >
            {deleting ? <CircularProgress size={20} /> : 'Delete Account'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Profile;