import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ApiClient from '../../services/ApiClient';
import useMediaQuery from '@mui/material/useMediaQuery';
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
import RtlIconLabel from '../../components/RtlIconLabel';
import { getHospitalsMap, resolveHospitalName, saveHospitalsMap } from '../../utils/hospitalsCache';

const api = new ApiClient();

function formatDate(dateStr) {
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('he-IL', { dateStyle: 'medium', timeStyle: 'short' }).format(d);
  } catch (e) {
    return dateStr;
  }
}

const Drills = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery('(max-width:900px)');
  const [drills, setDrills] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [cachedHospitalsById, setCachedHospitalsById] = useState(() => getHospitalsMap());
  const [selected, setSelected] = useState([]);
  const [showUpcomingOnly, setShowUpcomingOnly] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.getDrills().then(setDrills).catch((e) => console.error(e));
    api
      .getHospitals()
      .then((data) => {
        setHospitals(data);
        setCachedHospitalsById(saveHospitalsMap(data));
      })
      .catch((e) => console.error(e));
  }, []);

  const hospitalsById = useMemo(() => {
    const map = { ...cachedHospitalsById };
    hospitals.forEach((h) => (map[h.id] = h.name));
    return map;
  }, [cachedHospitalsById, hospitals]);

  const now = useMemo(() => {
    return new Date();
  }, []);

  const getDrillId = (drill) => drill.drillId || drill.id;

  const drillsWithStatus = useMemo(() => {
    return drills.map((drill) => {
      const dateValue = drill.date || '';
      const dDate = dateValue ? new Date(dateValue) : new Date();
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

  const displayedDrills = showUpcomingOnly ? upcomingDrillsList : [...drillsWithStatus].sort((a, b) => b.dateObj - a.dateObj);

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
    const newDate = window.prompt('עדכן מועד התחלה (YYYY-MM-DDTHH:mm)', drill.date);
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
    <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 } }} dir="rtl">
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
              onClick={() => {
                if (nextUpcoming?._id) {
                  navigate(`/drills/${nextUpcoming._id}/edit`);
                }
              }}
              sx={{ 
                height: '100%', 
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                color: 'white',
                borderRadius: 4,
                position: 'relative',
                overflow: 'hidden',
                cursor: nextUpcoming?._id ? 'pointer' : 'default',
                transition: 'transform 0.18s ease, box-shadow 0.18s ease',
                '&:hover': nextUpcoming?._id
                  ? { transform: 'translateY(-2px)', boxShadow: '0 16px 32px rgba(13,71,161,0.35)' }
                  : undefined,
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
                      {resolveHospitalName(nextUpcoming.hospitalKey || nextUpcoming.hospital, hospitalsById)}
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
                <Card
                  elevation={0}
                  onClick={() => setShowUpcomingOnly(true)}
                  sx={{
                    height: '100%',
                    borderRadius: 4,
                    border: '1px solid',
                    borderColor: 'divider',
                    cursor: 'pointer',
                    transition: 'transform 0.16s ease, border-color 0.16s ease',
                    '&:hover': { transform: 'translateY(-1px)', borderColor: 'primary.main' },
                  }}
                >
                  <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>מתוכננים לעתיד</Typography>
                      <Typography variant="h3" fontWeight={700} color="primary.main">{upcomingCount}</Typography>
                    </Box>
                    <Box sx={{ mt: 2 }}>
                      <Chip label={<RtlIconLabel icon={<TrendingUpIcon />} iconSize={16}>פעיל</RtlIconLabel>} size="small" color="primary" variant="outlined" />
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
                      <Chip label={<RtlIconLabel icon={<CheckCircleIcon />} iconSize={16}>הושלם</RtlIconLabel>} size="small" color="success" variant="outlined" />
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
              onClick={handleCreate}
              sx={{ borderRadius: 2, px: 3, py: 1, fontWeight: 600 }}
            >
              <RtlIconLabel icon={<AddIcon />}>צור תרגיל חדש</RtlIconLabel>
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
          {isMobile ? (
            <Stack spacing={1.5} sx={{ p: 1.5 }}>
              {displayedDrills.length === 0 ? (
                <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                  לא נמצאו תרגילים
                </Typography>
              ) : (
                displayedDrills.map((d) => {
                  const isSelected = selected.includes(d._id);
                  return (
                    <Paper
                      key={d._id}
                      variant="outlined"
                      onClick={() => toggleSelect(d._id)}
                      sx={{
                        p: 1.5,
                        borderRadius: 2.5,
                        cursor: 'pointer',
                        borderColor: isSelected ? 'primary.main' : 'divider',
                        bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.08) : 'background.paper',
                      }}
                    >
                      <Stack spacing={1.2}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main', width: 32, height: 32 }}>
                              <LocalHospitalIcon sx={{ fontSize: 18 }} />
                            </Avatar>
                            <Typography fontWeight={700} variant="body2">
                              {resolveHospitalName(d.hospitalKey, hospitalsById)}
                            </Typography>
                          </Stack>
                          <Checkbox
                            checked={isSelected}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelect(d._id);
                            }}
                          />
                        </Stack>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="caption" color="text.secondary">{formatDate(d.date)}</Typography>
                          <Chip
                            icon={getStatusIcon(d.status)}
                            label={d.status}
                            color={getStatusColor(d.status)}
                            variant={d.status === 'בוצע' ? 'outlined' : 'filled'}
                            size="small"
                            sx={{ fontWeight: 600 }}
                          />
                        </Stack>
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
                      </Stack>
                    </Paper>
                  );
                })
              )}
            </Stack>
          ) : (
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
                            {resolveHospitalName(d.hospitalKey, hospitalsById)}
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
          )}
        </Paper>
      </Container>
  );
};

export default Drills;
