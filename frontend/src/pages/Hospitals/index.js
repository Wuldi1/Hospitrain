import React, { useEffect, useState } from 'react';
import ApiClient from '../../services/ApiClient';
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
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';
import { LocalHospital, VerifiedUser, Add } from '@mui/icons-material';
import RtlIconLabel from '../../components/RtlIconLabel';
import { saveHospitalsMap } from '../../utils/hospitalsCache';

const apiClient = new ApiClient();

const Hospitals = () => {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [createError, setCreateError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newHospital, setNewHospital] = useState({ id: '', name: '', region: '' });

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    apiClient
      .getHospitals()
      .then((data) => {
        if (!mounted) return;
        setHospitals(data);
        saveHospitalsMap(data);
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

  const handleOpenAddDialog = () => {
    setCreateError('');
    setNewHospital({ id: '', name: '', region: '' });
    setAddDialogOpen(true);
  };

  const handleCreateHospital = async () => {
    const payload = {
      id: newHospital.id.trim(),
      name: newHospital.name.trim(),
      region: newHospital.region.trim(),
    };

    if (!payload.id || !payload.name || !payload.region) {
      setCreateError('יש למלא מזהה, שם ואזור.');
      return;
    }

    setIsCreating(true);
    setCreateError('');
    try {
      const created = await apiClient.createHospital(payload);
      setHospitals((prev) => {
        const next = [...prev, created];
        saveHospitalsMap(next);
        return next;
      });
      setAddDialogOpen(false);
    } catch (err) {
      setCreateError('יצירת בית החולים נכשלה. נסה שוב.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Box className="page-shell" dir="rtl">
      <Box
        sx={{
          mb: 3,
          p: { xs: 2, md: 3 },
          borderRadius: 4,
          color: 'white',
          background: 'linear-gradient(135deg, #0D47A1 0%, #1976D2 60%, #42A5F5 100%)',
          boxShadow: '0 16px 32px rgba(13,71,161,0.28)',
        }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between">
          <Box>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <LocalHospital sx={{ fontSize: 30 }} />
              <Typography variant="h5" sx={{ color: 'white', fontWeight: 800 }}>
                מרכז בתי חולים
              </Typography>
            </Stack>
            <Typography sx={{ opacity: 0.92, mt: 1 }}>
              ניהול בתי חולים, צפייה באזורי כיסוי ועדכון נתוני מערכת.
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="secondary"
            onClick={handleOpenAddDialog}
            sx={{ minWidth: { xs: '100%', md: 190 }, fontWeight: 700 }}
          >
            <RtlIconLabel icon={<Add />}>הוסף בית חולים</RtlIconLabel>
          </Button>
        </Stack>
      </Box>

      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ py: 1.5 }}>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'right' }}>
            סה"כ בתי חולים במערכת: <strong>{hospitals.length}</strong>
          </Typography>
        </CardContent>
      </Card>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2, textAlign: 'right' }}>
          {error}
        </Alert>
      )}

      {!loading && !error && (
        <Card>
          <CardContent>
            <List sx={{ p: 0 }}>
              {hospitals.map((h, idx) => (
                <React.Fragment key={h.id}>
                  <ListItem sx={{ alignItems: 'center', py: 1.25 }}>
                    <ListItemAvatar sx={{ minWidth: 54 }}>
                      <Avatar sx={{ bgcolor: 'rgba(21,101,192,0.12)', color: 'primary.dark' }}>
                        {h.name?.charAt(0)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={h.name}
                      secondary={h.region || ''}
                      primaryTypographyProps={{ fontWeight: 700, textAlign: 'right' }}
                      secondaryTypographyProps={{ textAlign: 'right' }}
                    />
                    <Chip
                      label={<RtlIconLabel icon={<VerifiedUser />} iconSize={14}>{h.status || h.region || 'פעיל'}</RtlIconLabel>}
                      color={getStatusColor(h.status)}
                      size="small"
                    />
                  </ListItem>
                  {idx < hospitals.length - 1 && <Divider component="li" />}
                </React.Fragment>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ textAlign: 'right' }}>הוספת בית חולים חדש</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="מזהה (id)"
              placeholder="example_hospital"
              value={newHospital.id}
              onChange={(event) => setNewHospital((prev) => ({ ...prev, id: event.target.value }))}
              fullWidth
            />
            <TextField
              label="שם בית חולים"
              value={newHospital.name}
              onChange={(event) => setNewHospital((prev) => ({ ...prev, name: event.target.value }))}
              fullWidth
            />
            <TextField
              label="אזור"
              value={newHospital.region}
              onChange={(event) => setNewHospital((prev) => ({ ...prev, region: event.target.value }))}
              fullWidth
            />
            {createError && <Alert severity="error">{createError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAddDialogOpen(false)}>ביטול</Button>
          <Button variant="contained" onClick={handleCreateHospital} disabled={isCreating}>
            {isCreating ? 'יוצר...' : 'צור'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Hospitals;
