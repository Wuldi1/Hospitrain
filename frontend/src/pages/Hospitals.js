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
  Stack,
} from '@mui/material';
import { LocalHospital, VerifiedUser } from '@mui/icons-material';

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
        return 'primary';
    }
  };

  return (
    <Box className="page-shell">
      <Box className="page-header-card" sx={{ mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <LocalHospital sx={{ fontSize: 30 }} />
          <Box>
            <Typography variant="h5" sx={{ color: 'white' }}>מרכז בתי חולים</Typography>
            <Typography sx={{ opacity: 0.9 }}>רשימת בתי חולים פעילים ומוכנות אזורית</Typography>
          </Box>
        </Stack>
      </Box>

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
        <Card>
          <CardContent>
            <List>
              {hospitals.map((h, idx) => (
                <React.Fragment key={h.id}>
                  <ListItem sx={{ alignItems: 'center' }}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'rgba(21,101,192,0.12)', color: 'primary.dark' }}>{h.name?.charAt(0)}</Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={h.name}
                      secondary={h.region || ''}
                      primaryTypographyProps={{ fontWeight: 700 }}
                    />
                    <Chip icon={<VerifiedUser />} label={h.status || h.region || 'פעיל'} color={getStatusColor(h.status)} size="small" />
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
