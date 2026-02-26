import React from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';

const Profiles = () => {
  return (
    <Box className="page-shell" dir="rtl">
      <Card>
        <CardContent>
          <Typography variant="h5">מתארים</Typography>
          <Typography variant="body2">ניהול מתארים לתרגילים.</Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Profiles;
