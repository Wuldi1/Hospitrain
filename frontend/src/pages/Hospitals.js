import React, { useEffect, useState } from 'react';
import ApiClient from '../services/ApiClient';
import {
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Chip,
  Divider,
  Box,
  CircularProgress,
  Alert,
} from '@mui/material';
import { LocalHospital } from '@mui/icons-material';
import './Hospitals.css';

const apiClient = new ApiClient();

const Hospitals = () => {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    apiClient
      .getHospitals()
      .then((data) => {
        if (!mounted) return;
        setHospitals(data);
        setError(null);
      })
      .catch((err) => {
        console.error(err);
        if (!mounted) return;
        setError('שגיאה בטעינת בתי החולים');
      })
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'פעיל':
        return 'success';
      case 'לא פעיל':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Card elevation={2} sx={{ mb: 3 }}>
        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ bgcolor: '#e3f2fd', borderRadius: '12px', p: 1 }}>
            <LocalHospital color="primary" />
          </Box>
          <Box>
            <Typography variant="h5" component="h1" fontWeight="bold">
              בתי חולים
            </Typography>
            <Typography variant="body2" color="text.secondary">
              כאן מוצגים בתי החולים המנוהלים במערכת
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!loading && !error && (
        <Card elevation={1}>
          <CardContent className=''>
            <List>
              {hospitals.map((h, idx) => (
                <React.Fragment key={h.id}>
                  <ListItem sx={{ alignItems: 'center', display: '-webkit-box' }}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: '#e3f2fd', color: '#1976d2' }}>{h.name?.charAt(0)}</Avatar>
                    </ListItemAvatar>
                    <ListItemText primary={h.name} secondary={h.region || ''} className='hospital-name' />
                    <Chip label={h.status || h.region} color={getStatusColor(h.status)} size="small" />
                  </ListItem>
                  {idx < hospitals.length - 1 && <Divider component="li" />}
                </React.Fragment>
              ))}
            </List>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default Hospitals;