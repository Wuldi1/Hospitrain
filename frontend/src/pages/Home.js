import React, { useEffect, useState } from 'react';
import './Home.css';
import ApiClient from '../services/ApiClient';
import { Card, CardContent, Typography, Grid, Box, Chip, Avatar, List, ListItem, ListItemAvatar, ListItemText, Divider } from '@mui/material';
import { LocalHospital, Event, Schedule } from '@mui/icons-material';

const apiClient = new ApiClient();

const Home = () => {
  const [hospitals, setHospitals] = useState([]);
  const [recentDrills, setRecentDrills] = useState([]);
  const [upcomingDrills, setUpcomingDrills] = useState([]);

  useEffect(() => {
    apiClient.getHospitals().then(setHospitals).catch(console.error);
    apiClient.getDrills().then(setRecentDrills).catch(console.error);
    apiClient.getDrills().then(setUpcomingDrills).catch(console.error);
  }, []);

  const getStatusColor = (status) => {
    switch(status) {
      case 'פעיל': return 'success';
      case 'לא פעיל': return 'error';
      case 'בוצע': return 'success';
      case 'מתוכנן': return 'primary';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ flexGrow: 1, p: 3 }} dir="rtl">
      <Box mb={4}>
        {/* Welcome Card */}
        <Grid item xs={12}>
          <Card elevation={2} sx={{ background: 'linear-gradient(45deg, #166CC7 30%, #114f99 90%)', color: 'white' }}>
            <CardContent sx={{ textAlign: 'right', py: 3 }}>
              <Typography variant="h5" gutterBottom fontWeight="bold" sx={{ lineHeight: 1.2 }}>
                ברוכים הבאים למערכת Hospitrain
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.95 }}>
                כאן תוכלו לנהל תרגילים, לעקוב אחר סטטוס בתי החולים, ולצפות בדוחות וניתוחים.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Box>

      {/* Counters */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card elevation={1}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, flexDirection: 'row-reverse' }}>
              <Avatar sx={{ bgcolor: '#e3f2fd', color: '#166CC7' }}><LocalHospital /></Avatar>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="subtitle1" sx={{ color: 'text.secondary' }}>בתי חולים</Typography>
                <Typography variant="h5" fontWeight="bold" sx={{ mt: 0.5 }}>{hospitals.length}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card elevation={1}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, flexDirection: 'row-reverse' }}>
              <Avatar sx={{ bgcolor: '#e8f4ff', color: '#166CC7' }}><Event /></Avatar>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="subtitle1" sx={{ color: 'text.secondary' }}>תרגילים אחרונים</Typography>
                <Typography variant="h5" fontWeight="bold" sx={{ mt: 0.5 }}>{recentDrills.length}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card elevation={1}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, flexDirection: 'row-reverse' }}>
              <Avatar sx={{ bgcolor: '#fff4e5', color: '#166CC7' }}><Schedule /></Avatar>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="subtitle1" sx={{ color: 'text.secondary' }}>תרגילים קרובים</Typography>
                <Typography variant="h5" fontWeight="bold" sx={{ mt: 0.5 }}>{upcomingDrills.length}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Hospitals Widget */}
        <Grid item xs={12} md={4}>
          <Card elevation={2} sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2} sx={{ flexDirection: 'row-reverse' }}>
                <LocalHospital color="primary" sx={{ ml: 1 }} />
                <Typography variant="h6" sx={{ textAlign: 'right' }}>בתי חולים</Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <List>
                {hospitals.map((h, index) => (
                  <React.Fragment key={h.id}>
                    <ListItem sx={{ display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', py: 1.25 }}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: '#e3f2fd', color: '#1976d2' }}>
                          {h.name.charAt(0)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText 
                        primary={h.name} 
                        primaryTypographyProps={{ textAlign: 'right', fontWeight: 600 }}
                      />
                    </ListItem>
                    {index < hospitals.length - 1 && <Divider component="li" />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Drills Widget */}
        <Grid item xs={12} md={4}>
          <Card elevation={2} sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2} sx={{ flexDirection: 'row-reverse' }}>
                <Event color="primary" sx={{ ml: 1 }} />
                <Typography variant="h6" sx={{ textAlign: 'right' }}>תרגילים אחרונים</Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <List>
                {recentDrills.map((d, index) => (
                  <React.Fragment key={d.id}>
                    <ListItem sx={{ display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', py: 1.25 }}>
                      <ListItemText 
                        primary={d.hospital} 
                        secondary={d.date}
                        primaryTypographyProps={{ textAlign: 'right', fontWeight: 600 }}
                        secondaryTypographyProps={{ textAlign: 'right', sx: { mt: 0.5 } }}
                      />
                      <Chip label={d.status} color={getStatusColor(d.status)} size="small" />
                    </ListItem>
                    {index < recentDrills.length - 1 && <Divider component="li" />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Upcoming Drills Widget */}
        <Grid item xs={12} md={4}>
          <Card elevation={2} sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2} sx={{ flexDirection: 'row-reverse' }}>
                <Schedule color="primary" sx={{ ml: 1 }} />
                <Typography variant="h6" sx={{ textAlign: 'right' }}>תרגילים קרובים</Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <List>
                {upcomingDrills.map((d, index) => (
                  <React.Fragment key={d.id}>
                    <ListItem sx={{ display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', py: 1.25 }}>
                      <ListItemText 
                        primary={d.hospital} 
                        secondary={d.date}
                        primaryTypographyProps={{ textAlign: 'right', fontWeight: 600 }}
                        secondaryTypographyProps={{ textAlign: 'right', sx: { mt: 0.5 } }}
                      />
                      <Chip label={d.status} color={getStatusColor(d.status)} size="small" variant="outlined" />
                    </ListItem>
                    {index < upcomingDrills.length - 1 && <Divider component="li" />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Home;