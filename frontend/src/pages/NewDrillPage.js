import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  TextField,
  MenuItem,
  Button,
  Stack,
  Alert,
  CircularProgress,
} from '@mui/material';
import ApiClient from '../services/ApiClient';
import { getTemplates, createDrill } from '../api/drillsApi';

const apiClient = new ApiClient();

const NewDrillPage = () => {
  const navigate = useNavigate();
  const [hospitals, setHospitals] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    hospitalId: '',
    date: '',
    templateId: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        const [hospitalsResponse, templatesResponse] = await Promise.all([
          apiClient.getHospitals(),
          getTemplates(),
        ]);
        setHospitals(hospitalsResponse);
        setTemplates(templatesResponse);
        setLoadError('');
      } catch (err) {
        setLoadError('טעינת הנתונים נכשלה. נסו שוב מאוחר יותר.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      const drill = await createDrill(formData);
      navigate(`/drills/${drill.drillId}/edit`);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }} dir="rtl">
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress />
          <Typography sx={{ mt: 2 }}>טוען נתונים...</Typography>
        </Paper>
      </Box>
    );
  }

  if (loadError) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }} dir="rtl">
        <Paper sx={{ p: 4 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            {loadError}
          </Alert>
          <Button variant="outlined" onClick={() => navigate('/drills')}>
            חזרה לרשימת התרגילים
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }} dir="rtl">
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom textAlign="right">
          יצירת תרגיל חדש
        </Typography>
        <Typography variant="body1" sx={{ mb: 3 }} textAlign="right" color="text.secondary">
          מלא את פרטי התרגיל ובחר מתאר להפעלת הגיליונות.
        </Typography>
        <form onSubmit={handleSubmit}>
          <Stack spacing={3}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="שם התרגיל"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              fullWidth
            />
            <TextField
              select
              label="בית חולים"
              name="hospitalId"
              value={formData.hospitalId}
              onChange={handleChange}
              required
              fullWidth
            >
              {hospitals.map((hospital) => (
                <MenuItem key={hospital.id} value={hospital.id}>
                  {hospital.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              type="date"
              label="תאריך התרגיל"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              select
              label="מתאר"
              name="templateId"
              value={formData.templateId}
              onChange={handleChange}
              required
            >
              {templates.map((template) => (
                <MenuItem key={template.templateId} value={template.templateId}>
                  {template.templateName}
                </MenuItem>
              ))}
            </TextField>
            <Box display="flex" justifyContent="flex-end" gap={2}>
              <Button variant="outlined" onClick={() => navigate('/drills')}>
                ביטול
              </Button>
              <Button type="submit" variant="contained" disabled={isSubmitting}>
                יצירת תרגיל
              </Button>
            </Box>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
};

export default NewDrillPage;
