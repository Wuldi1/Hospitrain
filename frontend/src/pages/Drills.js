import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ApiClient from '../services/ApiClient';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  Button,
  Checkbox,
  FormControlLabel,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  IconButton,
  Tooltip,
  Chip,
  Avatar,
  Container,
  Stack,
  Divider,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import EventIcon from '@mui/icons-material/Event';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ScheduleIcon from '@mui/icons-material/Schedule';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

const api = new ApiClient();

function formatDate(dateStr) {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return new Intl.DateTimeFormat('he-IL', { dateStyle: 'medium' }).format(d);
  } catch (e) {
    return dateStr;
  }
}

const Drills = () => {
  const theme = useTheme();
  const [drills, setDrills] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [selected, setSelected] = useState([]);
  const [showUpcomingOnly, setShowUpcomingOnly] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.getDrills().then(setDrills).catch((e) => console.error(e));
    api.getHospitals().then(setHospitals).catch((e) => console.error(e));
  }, []);

  const hospitalsById = useMemo(() => {
    const map = {};
    hospitals.forEach((h) => (map[h.id] = h.name));
    return map;
  }, [hospitals]);

  const now = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const getDrillId = (drill) => drill.drillId || drill.id;

  const drillsWithStatus = useMemo(() => {
    return drills.map((drill) => {
      const dateValue = drill.date || '';
      const dDate = dateValue ? new Date(dateValue + 'T00:00:00') : new Date();
      const status = dDate < now ? 'בוצע' : 'מתוכנן';
      return {
        ...drill,
        _id: getDrillId(drill),
        hospitalKey: drill.hospitalId || drill.hospital,
        dateObj: dDate,
        status,
      };
    });
  }, [drills, now]);

  const upcomingCount = drillsWithStatus.filter((d) => d.status === 'מתוכנן').length;
  const completedCount = drillsWithStatus.filter((d) => d.status === 'בוצע').length;

  const upcomingDrillsList = drillsWithStatus.filter((d) => d.status === 'מתוכנן').sort((a, b) => a.dateObj - b.dateObj);
  const nextUpcoming = upcomingDrillsList.length ? upcomingDrillsList[0] : null;

  const displayedDrills = showUpcomingOnly ? upcomingDrillsList : [...drillsWithStatus].sort((a, b) => a.dateObj - b.dateObj);

  const toggleSelect = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleCreate = () => {
    navigate('/drills/new');
  };

  const handleUpdate = () => {
    if (selected.length !== 1) return;
    const id = selected[0];
    const drill = drills.find((d) => getDrillId(d) === id);
    if (!drill) return;
    const newDate = window.prompt('עדכן תאריך (YYYY-MM-DD)', drill.date);
    if (!newDate) return;
    setDrills((s) => s.map((d) => (getDrillId(d) === id ? { ...d, date: newDate } : d)));
    setSelected([]);
  };

  const handleDelete = () => {
    if (!selected.length) return;
    if (!window.confirm('למחוק את התרגילים הנבחרים?')) return;
    setDrills((s) => s.filter((d) => !selected.includes(getDrillId(d))));
    setSelected([]);
  };

  const getStatusColor = (status) => {
    return status === 'בוצע' ? 'success' : 'primary';
  };

  const getStatusIcon = (status) => {
    return status === 'בוצע' ? <CheckCircleIcon fontSize="small" /> : <ScheduleIcon fontSize="small" />;
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }} dir="rtl">
        {/* Header Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight={800} color="primary.main" gutterBottom>
            ניהול תרגילים
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            צפה, נהל ועקוב אחר תרגילי החירום בבתי החולים
          </Typography>
        </Box>

        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Next Drill Card - Highlighted */}
          <Grid item xs={12} md={4}>
            <Card 
              elevation={0} 
              sx={{ 
                height: '100%', 
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                color: 'white',
                borderRadius: 4,
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <Box sx={{ position: 'absolute', top: -20, left: -20, opacity: 0.1 }}>
                <EventIcon sx={{ fontSize: 150 }} />
              </Box>
              <CardContent sx={{ position: 'relative', zIndex: 1, p: 3 }}>
                <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                  <ScheduleIcon />
                  <Typography variant="h6" fontWeight={600}>התרגיל הקרוב</Typography>
                </Stack>
                
                {nextUpcoming ? (
                  <Box>
                    <Typography variant="h4" fontWeight={700} gutterBottom>
                      {hospitalsById[nextUpcoming.hospital] || nextUpcoming.hospital}
                    </Typography>
                    <Chip 
                      label={formatDate(nextUpcoming.date)} 
                      sx={{ 
                        bgcolor: 'rgba(255,255,255,0.2)', 
                        color: 'white', 
                        fontWeight: 'bold',
                        fontSize: '1rem',
                        height: 32
                      }} 
                    />
                  </Box>
                ) : (
                  <Typography variant="h6" sx={{ opacity: 0.8 }}>אין תרגילים קרובים מתוכננים</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Stats Cards */}
          <Grid item xs={12} md={8}>
            <Grid container spacing={3} height="100%">
              <Grid item xs={12} sm={6}>
                <Card elevation={0} sx={{ height: '100%', borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
                  <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>מתוכננים לעתיד</Typography>
                      <Typography variant="h3" fontWeight={700} color="primary.main">{upcomingCount}</Typography>
                    </Box>
                    <Box sx={{ mt: 2 }}>
                      <Chip icon={<TrendingUpIcon />} label="פעיל" size="small" color="primary" variant="outlined" />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Card elevation={0} sx={{ height: '100%', borderRadius: 4, border: '1px solid', borderColor: 'divider', bgcolor: alpha(theme.palette.success.main, 0.05) }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>בוצעו בהצלחה</Typography>
                    <Typography variant="h3" fontWeight={700} color="success.main">{completedCount}</Typography>
                    <Box sx={{ mt: 2 }}>
                      <Chip icon={<CheckCircleIcon />} label="הושלם" size="small" color="success" variant="outlined" />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>
        </Grid>

        {/* Actions Bar */}
        <Paper 
          elevation={0} 
          sx={{ 
            p: 2, 
            mb: 3, 
            borderRadius: 3, 
            border: '1px solid', 
            borderColor: 'divider',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2
          }}
        >
          <Stack direction="row" spacing={1}>
            <Button 
              variant="contained" 
              startIcon={<AddIcon />} 
              onClick={handleCreate}
              sx={{ borderRadius: 2, px: 3, py: 1, fontWeight: 600 }}
            >
              צור תרגיל חדש
            </Button>
            <Tooltip title="ערוך נבחר">
              <span>
                <IconButton 
                  onClick={handleUpdate} 
                  disabled={selected.length !== 1}
                  sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
                >
                  <EditIcon color={selected.length === 1 ? 'primary' : 'disabled'} />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="מחק נבחרים">
              <span>
                <IconButton 
                  onClick={handleDelete} 
                  disabled={selected.length === 0}
                  sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.1) } }}
                >
                  <DeleteIcon color={selected.length > 0 ? 'error' : 'disabled'} />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>

          <FormControlLabel
            control={
              <Checkbox 
                checked={showUpcomingOnly} 
                onChange={(e) => setShowUpcomingOnly(e.target.checked)} 
                sx={{ '&.Mui-checked': { color: 'primary.main' } }}
              />
            }
            label={<Typography fontWeight={500}>הצג תרגילים קרובים בלבד</Typography>}
          />
        </Paper>

        {/* Data Table */}
        <Paper elevation={0} sx={{ borderRadius: 4, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
          <Table>
            <TableHead sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
              <TableRow>
                <TableCell padding="checkbox" align="right">
                  <Checkbox 
                    indeterminate={selected.length > 0 && selected.length < displayedDrills.length}
                    checked={displayedDrills.length > 0 && selected.length === displayedDrills.length}
                    onChange={(e) => {
                      if (e.target.checked) setSelected(displayedDrills.map(d => d._id));
                      else setSelected([]);
                    }}
                  />
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, py: 2 }}>בית חולים</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>תאריך</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>סטטוס</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>עריכה</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayedDrills.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 8 }}>
                    <Typography variant="h6" color="text.secondary">לא נמצאו תרגילים</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                displayedDrills.map((d) => {
                  const isSelected = selected.includes(d._id);
                  return (
                    <TableRow 
                      key={d._id} 
                      hover 
                      selected={isSelected}
                      sx={{ 
                        '&.Mui-selected': { bgcolor: alpha(theme.palette.primary.main, 0.08) },
                        '&.Mui-selected:hover': { bgcolor: alpha(theme.palette.primary.main, 0.12) },
                        cursor: 'pointer'
                      }}
                      onClick={() => toggleSelect(d._id)}
                    >
                      <TableCell align="right" padding="checkbox">
                        <Checkbox checked={isSelected} onClick={(e) => { e.stopPropagation(); toggleSelect(d._id); }} />
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" alignItems="center" spacing={2}>
                          <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main' }}>
                            <LocalHospitalIcon />
                          </Avatar>
                          <Typography fontWeight={500}>
                            {hospitalsById[d.hospitalKey] || d.hospitalKey}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
                          {formatDate(d.date)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Chip 
                          icon={getStatusIcon(d.status)}
                          label={d.status} 
                          color={getStatusColor(d.status)} 
                          variant={d.status === 'בוצע' ? 'outlined' : 'filled'}
                          size="small"
                          sx={{ fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/drills/${d._id}/edit`);
                          }}
                        >
                          ערוך
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Paper>
      </Container>
  );
};

export default Drills;
