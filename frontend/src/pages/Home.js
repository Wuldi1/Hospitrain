import React, { useEffect, useState } from 'react';
import ApiClient from '../services/ApiClient';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  Button,
  Stack,
  Tooltip,
} from '@mui/material';
import { LocalHospital, Event, Schedule, Add, ArrowForward } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const apiClient = new ApiClient();

const Home = () => {
  const navigate = useNavigate();
  const [hospitals, setHospitals] = useState([]);
  const [drills, setDrills] = useState([]);

  useEffect(() => {
    apiClient.getHospitals().then(setHospitals).catch(console.error);
    apiClient.getDrills().then(setDrills).catch(console.error);
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'פעיל': return 'success';
      case 'לא פעיל': return 'error';
      case 'בוצע': return 'success';
      case 'מתוכנן': return 'primary';
      default: return 'default';
    }
  };

  const formatDate = (date) => {
    if (!date) return 'תאריך לא ידוע';
    const d = new Date(date);
    return d.toLocaleDateString('he-IL', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const sortedDrills = [...drills].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  const recentDrills = sortedDrills.slice(0, 4);
  const upcomingDrills = drills
    .filter((d) => {
      const hasFutureDate = d.date && new Date(d.date) >= new Date(new Date().toDateString());
      return (d.status === 'מתוכנן') || hasFutureDate;
    })
    .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0))
    .slice(0, 6);

  return (
    <Box sx={{ flexGrow: 1, px: { xs: 2, md: 4 }, py: { xs: 2, md: 4 }, background: 'linear-gradient(120deg, #0b3f65 0%, #0f5c8c 60%, #0e304c 100%)' }} dir="rtl">
      <Card
        elevation={0}
        sx={{
          mb: 3,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
          border: '1px solid rgba(255,255,255,0.08)',
          color: 'white',
          borderRadius: 3,
          backdropFilter: 'blur(8px)',
        }}
      >
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2}>
            <Box>
              <Typography variant="h4" fontWeight={800} sx={{ lineHeight: 1.2 }}>
                ברוכים הבאים ל-Hospitrain
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9, mt: 1 }}>
                ניהול תרגילים בזמן אמת, מעקב אחר בתי חולים ולוח זמנים אחיד – הכל במקום אחד.
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap">
                <Chip label={`היום: ${new Date().toLocaleDateString('he-IL')}`} variant="outlined" sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }} />
                <Chip label={`תרגילים ${drills.length || 0}`} variant="outlined" sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }} />
              </Stack>
            </Box>
            <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="flex-end">
              <Button
                variant="contained"
                color="secondary"
                startIcon={<Add />}
                onClick={() => navigate('/drills/new')}
                sx={{ borderRadius: 2, px: 2.5 }}
              >
                תרגיל חדש
              </Button>
              <Button
                variant="outlined"
                color="inherit"
                endIcon={<ArrowForward />}
                onClick={() => navigate('/drills')}
                sx={{ borderRadius: 2, px: 2.5, borderColor: 'rgba(255,255,255,0.4)', color: 'white' }}
              >
                לכל התרגילים
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card elevation={3} sx={{ borderRadius: 3, background: '#0c1c2b', color: 'white', border: '1px solid rgba(255,255,255,0.05)' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, flexDirection: 'row-reverse' }}>
              <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.12)', color: 'white' }}><LocalHospital /></Avatar>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>בתי חולים מחוברים</Typography>
                <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5 }}>{hospitals.length}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card elevation={3} sx={{ borderRadius: 3, background: '#0c1c2b', color: 'white', border: '1px solid rgba(255,255,255,0.05)' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, flexDirection: 'row-reverse' }}>
              <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.12)', color: 'white' }}><Event /></Avatar>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>תרגילים אחרונים</Typography>
                <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5 }}>{recentDrills.length}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card elevation={3} sx={{ borderRadius: 3, background: '#0c1c2b', color: 'white', border: '1px solid rgba(255,255,255,0.05)' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, flexDirection: 'row-reverse' }}>
              <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.12)', color: 'white' }}><Schedule /></Avatar>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>תרגילים קרובים</Typography>
                <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5 }}>{upcomingDrills.length}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ flexDirection: 'row-reverse', mb: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Event color="primary" />
                  <Typography variant="h6" fontWeight={800}>תרגילים אחרונים</Typography>
                </Stack>
                <Tooltip title="לכל התרגילים">
                  <Button size="small" onClick={() => navigate('/drills')}>פתח רשימה</Button>
                </Tooltip>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <List disablePadding>
                {recentDrills.map((d, index) => (
                  <React.Fragment key={d.id}>
                    <ListItem sx={{ display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', py: 1.5 }}>
                      <ListItemText
                        primary={d.hospital || d.name || 'תרגיל'}
                        secondary={formatDate(d.date)}
                        primaryTypographyProps={{ textAlign: 'right', fontWeight: 700 }}
                        secondaryTypographyProps={{ textAlign: 'right', sx: { mt: 0.5 } }}
                      />
                      <Chip label={d.status || 'ללא סטטוס'} color={getStatusColor(d.status)} size="small" />
                    </ListItem>
                    {index < recentDrills.length - 1 && <Divider component="li" />}
                  </React.Fragment>
                ))}
                {recentDrills.length === 0 && (
                  <Typography color="text.secondary" textAlign="right">אין תרגילים להצגה.</Typography>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ flexDirection: 'row-reverse', mb: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Schedule color="primary" />
                  <Typography variant="h6" fontWeight={800}>תרגילים קרובים</Typography>
                </Stack>
                <Tooltip title="תכנן תרגיל חדש">
                  <Button size="small" onClick={() => navigate('/drills/new')}>תכנון מהיר</Button>
                </Tooltip>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <List disablePadding>
                {upcomingDrills.map((d, index) => (
                  <React.Fragment key={d.id}>
                    <ListItem sx={{ display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', py: 1.5 }}>
                      <ListItemText
                        primary={d.name || d.hospital || 'תרגיל'}
                        secondary={formatDate(d.date)}
                        primaryTypographyProps={{ textAlign: 'right', fontWeight: 700 }}
                        secondaryTypographyProps={{ textAlign: 'right', sx: { mt: 0.5 } }}
                      />
                      <Chip label={d.status || 'מתוכנן'} color={getStatusColor(d.status || 'מתוכנן')} size="small" variant="outlined" />
                    </ListItem>
                    {index < upcomingDrills.length - 1 && <Divider component="li" />}
                  </React.Fragment>
                ))}
                {upcomingDrills.length === 0 && (
                  <Typography color="text.secondary" textAlign="right">אין תרגילים קרובים כרגע.</Typography>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4} sx={{ mt: 2 }}>
          <Card elevation={3} sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ flexDirection: 'row-reverse', mb: 1 }}>
                <LocalHospital color="primary" />
                <Typography variant="h6" fontWeight={800}>בתי חולים</Typography>
              </Stack>
              <Divider sx={{ mb: 2 }} />
              <List disablePadding>
                {hospitals.map((h, index) => (
                  <React.Fragment key={h.id}>
                    <ListItem sx={{ display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', py: 1.25 }}>
                      <ListItemAvatar sx={{ minWidth: 48 }}>
                        <Avatar sx={{ bgcolor: '#e8f4ff', color: '#0f5c8c' }}>
                          {h.name.charAt(0)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={h.name}
                        primaryTypographyProps={{ textAlign: 'right', fontWeight: 700 }}
                      />
                    </ListItem>
                    {index < hospitals.length - 1 && <Divider component="li" />}
                  </React.Fragment>
                ))}
                {hospitals.length === 0 && (
                  <Typography color="text.secondary" textAlign="right">אין נתוני בתי חולים זמינים.</Typography>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Home;
