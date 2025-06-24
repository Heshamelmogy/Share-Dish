import React, { useState, ChangeEvent } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { auth } from '../firebaseConfig';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, fetchSignInMethodsForEmail, sendEmailVerification, signOut } from 'firebase/auth';
import {
  Box, Button, Container, TextField, Typography, Paper, Stack, Alert, Link,
  FormControl, InputLabel, Select, MenuItem, SelectChangeEvent, InputAdornment
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import axios from 'axios';
import { Email, Lock, Person, Wc, CalendarToday } from '@mui/icons-material';

const API_URL =
  window.location.hostname.includes("github.dev") || window.location.hostname.includes("app.github.dev")
    ? "https://shiny-guide-q77q6pw7xwg42x6g-5000.app.github.dev"
    : "http://localhost:5000";

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isUnverified = searchParams.get('unverified') === '1';
  console.log('isUnverified:', isUnverified, 'searchParams:', searchParams.toString());
  const [unverifiedUser, setUnverifiedUser] = useState<any>(null);
  const [resendSuccess, setResendSuccess] = useState(false);

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validatePassword = (password: string) => {
    // Password must be at least 6 characters and contain at least one number
    return password.length >= 6 && /\d/.test(password);
  };

  const handleGenderChange = (event: SelectChangeEvent) => {
    setGender(event.target.value);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate email for both sign in and sign up
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (isSignUp) {
      // Additional validations for sign up
      if (!validatePassword(password)) {
        setError('Password must be at least 6 characters long and contain at least one number');
        return;
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      if (!firstName.trim()) {
        setError('Please enter your first name');
        return;
      }

      if (!lastName.trim()) {
        setError('Please enter your last name');
        return;
      }

      if (!gender) {
        setError('Please select your gender');
        return;
      }

      if (!dateOfBirth) {
        setError('Please select your date of birth');
        return;
      }

      // Check if user is at least 13 years old
      const today = new Date();
      const age = today.getFullYear() - dateOfBirth.getFullYear();
      const monthDiff = today.getMonth() - dateOfBirth.getMonth();
      if (age < 13 || (age === 13 && monthDiff < 0)) {
        setError('You must be at least 13 years old to sign up');
        return;
      }

      // Check if email already exists before attempting to create account
      try {
        const methods = await fetchSignInMethodsForEmail(auth, email);
        if (methods && methods.length > 0) {
          setError('This email is already registered. Please sign in instead.');
          return;
        }
      } catch (err) {
        console.error('Error checking email:', err);
        setError('An error occurred while checking email availability. Please try again.');
        return;
      }
    }

    setLoading(true);

    try {
      console.log('Attempting to', isSignUp ? 'sign up' : 'sign in', 'with:', { email });
      
      if (isSignUp) {
        // Sign Up
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        console.log('Sign up successful:', userCredential.user);

        // Send email verification
        await sendEmailVerification(userCredential.user);
        await signOut(auth); // Sign out after sending verification
        // Force a full page reload to check-email with email as query param
        window.location.href = `/check-email?email=${encodeURIComponent(email)}`;
        return;
      } else {
        // Sign In
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log('Sign in successful:', userCredential.user);

        // Check if email is verified
        if (!userCredential.user.emailVerified) {
          setError('Please verify your email before signing in.');
          setUnverifiedUser(userCredential.user);
          setResendSuccess(false);
          return;
        }

        // Check if user exists in MongoDB
        try {
          const response = await axios.get(`${API_URL}/api/users/firebase/${userCredential.user.uid}`);
          console.log('MongoDB user check response:', response.data);
          
          if (!response.data) {
            // If user doesn't exist in MongoDB, create it
            console.log('Creating MongoDB user profile...');
            const createResponse = await axios.post(`${API_URL}/api/users/profile`, {
              firebaseUid: userCredential.user.uid,
              email: userCredential.user.email,
              firstName: '', // These will be empty for existing users
              lastName: '',
              gender: ''
            });
            console.log('MongoDB user profile created:', createResponse.data);
          }
        } catch (err) {
          console.error('Error checking/creating MongoDB user:', err);
          // Continue with sign in even if MongoDB operations fail
        }
      }
      
      navigate('/');
    } catch (err: any) {
      console.error('Authentication error:', err);
      
      // Handle specific error cases
      switch (err.code) {
        case 'auth/operation-not-allowed':
          setError('Email/Password authentication is not enabled. Please contact support.');
          break;
        case 'auth/email-already-in-use':
          setError('This email is already registered. Please sign in instead.');
          break;
        case 'auth/invalid-email':
          setError('Please enter a valid email address.');
          break;
        case 'auth/weak-password':
          setError('Password must be at least 6 characters long and contain at least one number.');
          break;
        case 'auth/user-not-found':
          setError('No account found with this email. Please sign up first.');
          break;
        case 'auth/wrong-password':
          setError('Incorrect password. Please try again.');
          break;
        case 'auth/invalid-credential':
          setError('Invalid email or password. Please check your credentials and try again.');
          break;
        default:
          setError(err.message || 'Authentication failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xs">
      <Paper elevation={3} sx={{ mt: 8, p: 4, borderRadius: 3, boxShadow: '0 4px 24px 0 rgba(60,72,88,0.10)' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
          <img
            src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80"
            alt="Welcome Food"
            style={{ width: 120, height: 120, borderRadius: '50%', objectFit: 'cover', marginBottom: 16, boxShadow: '0 2px 8px rgba(60,72,88,0.10)' }}
          />
          <Typography variant="h4" fontWeight={600} align="center" gutterBottom>
            Share Dish
          </Typography>
          <Typography variant="subtitle1" align="center" color="text.secondary" gutterBottom>
            {isSignUp ? 'Create an account to share and discover meals!' : 'Sign in to share and discover meals!'}
          </Typography>
        </Box>
        {isUnverified && (
          <Alert severity="warning" sx={{ mt: 2, mb: 2 }}>
            Please verify your email before accessing the app.<br />
            Please check your inbox and spam folder for the confirmation email.<br />
            Didn't get it? <b>Sign up again</b> or use the <b>Resend Verification Email</b> option.
          </Alert>
        )}
        <form onSubmit={handleSubmit}>
          <Stack spacing={2} mt={3}>
            {isSignUp && (
              <>
                <TextField
                  label="First Name"
                  value={firstName}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    setFirstName(e.target.value);
                    setError(null);
                  }}
                  fullWidth
                  required
                  error={!!error && error.includes('first name')}
                  helperText={error && error.includes('first name') ? error : "Enter your first name"}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person />
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  label="Last Name"
                  value={lastName}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    setLastName(e.target.value);
                    setError(null);
                  }}
                  fullWidth
                  required
                  error={!!error && error.includes('last name')}
                  helperText={error && error.includes('last name') ? error : "Enter your last name"}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person />
                      </InputAdornment>
                    ),
                  }}
                />
              </>
            )}
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                setEmail(e.target.value);
                setError(null);
              }}
              fullWidth
              required
              error={!!error && error.includes('email')}
              helperText={error && error.includes('email') ? error : "Enter your email address"}
              autoComplete="email"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                setPassword(e.target.value);
                setError(null);
              }}
              fullWidth
              required
              error={!!error && error.includes('password')}
              helperText={
                error && error.includes('password') 
                  ? error 
                  : isSignUp 
                    ? "Password must be at least 6 characters and contain a number" 
                    : "Enter your password"
              }
              autoComplete={isSignUp ? "new-password" : "current-password"}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock />
                  </InputAdornment>
                ),
              }}
            />
            {isSignUp && (
              <>
                <TextField
                  label="Confirm Password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    setConfirmPassword(e.target.value);
                    setError(null);
                  }}
                  fullWidth
                  required
                  error={!!error && error.includes('match')}
                  helperText={error && error.includes('match') ? error : "Confirm your password"}
                  autoComplete="new-password"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock />
                      </InputAdornment>
                    ),
                  }}
                />
                <FormControl fullWidth required error={!!error && error.includes('gender')}>
                  <InputLabel>Gender</InputLabel>
                  <Select
                    value={gender}
                    label="Gender"
                    onChange={handleGenderChange}
                  >
                    <MenuItem value="male">Male</MenuItem>
                    <MenuItem value="female">Female</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                    <MenuItem value="prefer-not-to-say">Prefer not to say</MenuItem>
                  </Select>
                </FormControl>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Date of Birth"
                    value={dateOfBirth}
                    onChange={(newValue: Date | null) => {
                      setDateOfBirth(newValue);
                      setError(null);
                    }}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        required: true,
                        error: !!error && error.includes('birth'),
                        helperText: error && error.includes('birth') ? error : "Select your date of birth",
                        InputProps: {
                          startAdornment: (
                            <InputAdornment position="start">
                              <CalendarToday />
                            </InputAdornment>
                          ),
                        },
                      }
                    }}
                  />
                </LocalizationProvider>
              </>
            )}
            <Button
              type="submit"
              variant="contained"
              disabled={loading || !email || !password || (isSignUp && (!confirmPassword || !gender || !dateOfBirth || !firstName || !lastName))}
              sx={{ fontWeight: 600, py: 1.2, fontSize: '1rem', mt: 1 }}
            >
              {loading ? 'Please wait...' : (isSignUp ? 'Sign Up' : 'Sign In')}
            </Button>
            <Box sx={{ display: 'flex', alignItems: 'center', my: 2 }}>
              <Box sx={{ flex: 1, height: 1, background: '#e0e0e0' }} />
              <Typography variant="body2" color="text.secondary" sx={{ mx: 2 }}>
                OR
              </Typography>
              <Box sx={{ flex: 1, height: 1, background: '#e0e0e0' }} />
            </Box>
            <Box textAlign="center">
              <Link
                component="button"
                variant="body2"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError(null);
                  setEmail('');
                  setPassword('');
                  setConfirmPassword('');
                  setFirstName('');
                  setLastName('');
                  setGender('');
                  setDateOfBirth(null);
                }}
                sx={{ textDecoration: 'none', fontWeight: 600 }}
              >
                {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
              </Link>
            </Box>
            {unverifiedUser && (
              <Button
                variant="outlined"
                color="primary"
                sx={{ mb: 2 }}
                onClick={async () => {
                  await sendEmailVerification(unverifiedUser);
                  setResendSuccess(true);
                  setError(null);
                }}
              >
                Resend Verification Email
              </Button>
            )}
            {resendSuccess && (
              <Alert severity="success" sx={{ mt: 2, mb: 2 }}>
                Verification email resent! Please check your inbox and spam.
              </Alert>
            )}
          </Stack>
        </form>
      </Paper>
    </Container>
  );
};

export default Login;