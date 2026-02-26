import React from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';

const Settings = () => {
  return (
    <Box className="page-shell" dir="rtl">
      <Card>
        <CardContent>
          <Typography variant="h5">הגדרות</Typography>
          <Typography variant="body2">ניהול הגדרות המערכת.</Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Settings;
