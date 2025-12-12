import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Paper, Typography, TextField, Button, Box, Alert } from '@mui/material';
import { LocalHospital } from '@mui/icons-material';
import ApiClient from '../services/ApiClient';

const API_DOMAIN = 'http://localhost:4000';
const apiClient = new ApiClient(API_DOMAIN);

const Login = () => {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState(1);
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  const handleRequestCode = async (e) => {
    e.preventDefault();
    try {
      await apiClient.requestCode(email);
      setStep(2);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage('שליחת הקוד נכשלה');
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    try {
      const data = await apiClient.verifyCode(email, code);
      localStorage.setItem('authToken', data.token);
      navigate('/home');
    } catch (error) {
      setErrorMessage('קוד שגוי');
    }
  };

  return (
    <Container maxWidth="sm" style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Paper elevation={3} style={{ padding: '40px', width: '100%', borderRadius: '16px', textAlign: 'center' }}>
        <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
          <div style={{ 
            backgroundColor: '#e3f2fd', 
            borderRadius: '50%', 
            padding: '16px',
            marginBottom: '16px'
          }}>
            <LocalHospital style={{ fontSize: 48, color: '#1976d2' }} />
          </div>
          <Typography variant="h4" component="h1" gutterBottom style={{ fontWeight: 'bold', color: '#1976d2' }}>
            Hospitrain
          </Typography>
          <Typography variant="subtitle1" color="textSecondary">
            מערכת לניהול תרגילי חירום
          </Typography>
        </Box>

        <Typography variant="h5" gutterBottom style={{ marginBottom: '24px' }}>
          {step === 1 ? 'כניסה למערכת' : 'אימות קוד'}
        </Typography>

        {errorMessage && (
          <Alert severity="error" style={{ marginBottom: '20px' }}>
            {errorMessage}
          </Alert>
        )}

        {step === 1 && (
          <form onSubmit={handleRequestCode}>
            <TextField
              fullWidth
              label="כתובת אימייל"
              variant="outlined"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
              required
              dir="rtl"
            />
            <Button
              fullWidth
              variant="contained"
              color="primary"
              type="submit"
              size="large"
              style={{ marginTop: '24px', padding: '12px', fontSize: '1.1rem' }}
            >
              שלח קוד אימות
            </Button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerifyCode}>
            <Typography variant="body2" color="textSecondary" style={{ marginBottom: '16px' }}>
              קוד אימות נשלח לכתובת {email}
            </Typography>
            <TextField
              fullWidth
              label="קוד אימות"
              variant="outlined"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              margin="normal"
              required
              dir="rtl"
              autoFocus
            />
            <Button
              fullWidth
              variant="contained"
              color="primary"
              type="submit"
              size="large"
              style={{ marginTop: '24px', padding: '12px', fontSize: '1.1rem' }}
            >
              כניסה
            </Button>
            <Button
              fullWidth
              color="secondary"
              onClick={() => setStep(1)}
              style={{ marginTop: '12px' }}
            >
              חזרה
            </Button>
          </form>
        )}
      </Paper>
    </Container>
  );
};

export default Login;