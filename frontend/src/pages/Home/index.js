import React, { useEffect, useState } from 'react';
import ApiClient from '../../services/ApiClient';
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
  ListItemText,
  Divider,
  Button,
  Stack,
  Tooltip,
} from '@mui/material';
import { LocalHospital, Event, Schedule, Add, ArrowBack } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import RtlIconLabel from '../../components/RtlIconLabel';
import { getHospitalsMap, resolveHospitalName, saveHospitalsMap } from '../../utils/hospitalsCache';

const apiClient = new ApiClient();

const Home = () => {
  const navigate = useNavigate();
  const [hospitals, setHospitals] = useState([]);
  const [drills, setDrills] = useState([]);
  const [cachedHospitalsById, setCachedHospitalsById] = useState(() => getHospitalsMap());

  useEffect(() => {
    apiClient
      .getHospitals()
      .then((data) => {
        setHospitals(data);
        setCachedHospitalsById(saveHospitalsMap(data));
      })
      .catch(console.error);
    apiClient.getDrills().then(setDrills).catch(console.error);
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'פעיל':
      case 'בוצע':
        return 'success';
      case 'לא פעיל':
        return 'error';
      case 'מתוכנן':
        return 'primary';
      default:
        return 'default';
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
      return d.status === 'מתוכנן' || hasFutureDate;
    })
    .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0))
    .slice(0, 6);

  return (
    <Box className="page-shell" dir="rtl">
      <Box className="page-header-card" sx={{ mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="h4" sx={{ color: 'white' }}>לוח הבקרה המבצעי</Typography>
            <Typography sx={{ mt: 1, opacity: 0.92 }}>
              תמונת מצב של בתי חולים ותרגילים פעילים במערכת.
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <Chip label={`היום: ${new Date().toLocaleDateString('he-IL')}`} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
              <Chip label={`תרגילים ${drills.length || 0}`} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
            </Stack>
          </Box>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            useFlexGap
            sx={{
              width: { xs: '100%', md: 'auto' },
              '& .MuiButton-root': {
                width: { xs: '100%', sm: 'auto' },
                minWidth: 150,
                whiteSpace: 'nowrap',
              },
            }}
          >
            <Button variant="contained" color="secondary" onClick={() => navigate('/drills/new')}>
              <RtlIconLabel icon={<Add />}>תרגיל חדש</RtlIconLabel>
            </Button>
            <Button variant="outlined" color="inherit" onClick={() => navigate('/drills')} sx={{ borderColor: 'rgba(255,255,255,0.5)', color: 'white' }}>
              <RtlIconLabel icon={<ArrowBack />}>לכל התרגילים</RtlIconLabel>
            </Button>
          </Stack>
        </Stack>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'primary.light' }}><LocalHospital /></Avatar>
              <Box>
                <Typography variant="body2" color="text.secondary">בתי חולים מחוברים</Typography>
                <Typography variant="h5">{hospitals.length}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'secondary.main' }}><Event /></Avatar>
              <Box>
                <Typography variant="body2" color="text.secondary">תרגילים אחרונים</Typography>
                <Typography variant="h5">{recentDrills.length}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'success.main' }}><Schedule /></Avatar>
              <Box>
                <Typography variant="body2" color="text.secondary">תרגילים קרובים</Typography>
                <Typography variant="h5">{upcomingDrills.length}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="h6">תרגילים אחרונים</Typography>
                <Tooltip title="לכל התרגילים">
                  <Button size="small" onClick={() => navigate('/drills')}>פתח רשימה</Button>
                </Tooltip>
              </Box>
              <Divider sx={{ mb: 1.5 }} />
              <List disablePadding>
                {recentDrills.map((d, index) => (
                  <React.Fragment key={d.id || d.drillId || index}>
                    <ListItem sx={{ justifyContent: 'space-between' }}>
                      <ListItemText
                        primary={resolveHospitalName(d.hospitalId || d.hospital || d.name, cachedHospitalsById) || 'תרגיל'}
                        secondary={formatDate(d.date)}
                        primaryTypographyProps={{ textAlign: 'right', fontWeight: 700 }}
                        secondaryTypographyProps={{ textAlign: 'right' }}
                      />
                      <Chip label={d.status || 'ללא סטטוס'} color={getStatusColor(d.status)} size="small" />
                    </ListItem>
                    {index < recentDrills.length - 1 && <Divider component="li" />}
                  </React.Fragment>
                ))}
                {!recentDrills.length && <Typography color="text.secondary">אין תרגילים להצגה.</Typography>}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="h6">תרגילים קרובים</Typography>
                <Tooltip title="תכנן תרגיל חדש">
                  <Button size="small" onClick={() => navigate('/drills/new')}>תכנון מהיר</Button>
                </Tooltip>
              </Box>
              <Divider sx={{ mb: 1.5 }} />
              <List disablePadding>
                {upcomingDrills.map((d, index) => (
                  <React.Fragment key={d.id || d.drillId || index}>
                    <ListItem sx={{ justifyContent: 'space-between' }}>
                      <ListItemText
                        primary={resolveHospitalName(d.hospitalId || d.hospital || d.name, cachedHospitalsById) || 'תרגיל'}
                        secondary={formatDate(d.date)}
                        primaryTypographyProps={{ textAlign: 'right', fontWeight: 700 }}
                        secondaryTypographyProps={{ textAlign: 'right' }}
                      />
                      <Chip label={d.status || 'מתוכנן'} color={getStatusColor(d.status || 'מתוכנן')} size="small" variant="outlined" />
                    </ListItem>
                    {index < upcomingDrills.length - 1 && <Divider component="li" />}
                  </React.Fragment>
                ))}
                {!upcomingDrills.length && <Typography color="text.secondary">אין תרגילים קרובים כרגע.</Typography>}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Home;
