import React from 'react';
import { Box, Stack } from '@mui/material';

const RtlIconLabel = ({ icon, children, gap = 0.75, iconSize = 18 }) => {
  if (!icon) return children;

  return (
    <Stack
      component="span"
      direction="row-reverse"
      alignItems="center"
      spacing={gap}
      sx={{ lineHeight: 1.2 }}
    >
      <Box
        component="span"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          '& svg': { fontSize: iconSize },
        }}
      >
        {icon}
      </Box>
      <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center' }}>
        {children}
      </Box>
    </Stack>
  );
};

export default RtlIconLabel;
