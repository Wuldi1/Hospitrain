import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  CircularProgress,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Radio,
  RadioGroup,
  FormControlLabel,
  Tooltip,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import DescriptionIcon from '@mui/icons-material/Description';
import { getPublicDrill, updatePublicRow } from '../../api/drillsApi';
import { resolveHospitalName } from '../../utils/hospitalsCache';

const evaluationOptions = [
  { key: 'yes', label: 'כן' },
  { key: 'no', label: 'לא' },
  { key: 'partial', label: 'חלקי' },
  { key: 'notRelevant', label: 'לא רלוונטי' },
  { key: 'redFlag', label: 'קו אדום' },
];

const defaultScheduleOrder = ['serial', 'time', 'from', 'to', 'message', 'notes'];
const scheduleColumnLabels = {
  serial: 'מספר',
  time: 'שעה',
  from: 'מאת',
  to: 'אל',
  message: 'הודעה',
  notes: 'הערות',
};

const emptyEvaluation = () => ({ yes: false, no: false, partial: false, notRelevant: false, redFlag: false });

const createColumnsFromEvents = (events = []) => {
  const seen = new Set();
  const columns = [];

  const addKey = (key) => {
    if (!key || key === 'id' || seen.has(key)) {
      return;
    }
    seen.add(key);
    columns.push({
      key,
      label: scheduleColumnLabels[key] || key,
      type: 'text',
    });
  };

  defaultScheduleOrder.forEach(addKey);
  events.forEach((event) => Object.keys(event || {}).forEach(addKey));

  if (!columns.length) {
    columns.push({ key: 'message', label: 'הודעה', type: 'text' });
  }

  return columns;
};

const normalizeSchedule = (schedule) => {
  if (!schedule) {
    return null;
  }
  const columns = schedule.columns?.length ? schedule.columns : createColumnsFromEvents(schedule.events || []);
  return {
    ...schedule,
    columns: columns.map((col) => ({
      ...col,
      label: col.label || scheduleColumnLabels[col.key] || col.key,
      type: col.type || 'text',
    })),
    events: (schedule.events || []).map((event) => ({
      ...event,
      id: event.id || `${event.serial || ''}-${event.time || ''}-${event.message || ''}`,
    })),
  };
};

const parseOffsetMinutes = (timeStr = '') => {
  const [h, m] = String(timeStr).split(':').map((n) => parseInt(n, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) {
    return null;
  }
  return (h * 60) + m;
};

const parseDrillStartDate = (value) => {
  if (!value) {
    return null;
  }
  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) {
    return direct;
  }
  if (typeof value === 'string') {
    const normalized = value.replace(' ', 'T');
    const fallback = new Date(normalized);
    if (!Number.isNaN(fallback.getTime())) {
      return fallback;
    }
  }
  return null;
};

const formatAbsoluteEventTime = (drillStart, offsetTime) => {
  if (!drillStart) {
    return 'לא זמין';
  }
  const start = parseDrillStartDate(drillStart);
  if (!start) {
    return 'לא זמין';
  }
  const minutes = parseOffsetMinutes(offsetTime);
  if (minutes == null) {
    return 'לא זמין';
  }
  const eventDate = new Date(start.getTime() + minutes * 60000);
  const now = new Date();
  const isToday = (
    eventDate.getFullYear() === now.getFullYear() &&
    eventDate.getMonth() === now.getMonth() &&
    eventDate.getDate() === now.getDate()
  );
  return new Intl.DateTimeFormat('he-IL', isToday ? {
    hour: '2-digit',
    minute: '2-digit',
  } : {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(eventDate);
};

const formatDrillStart = (value) => {
  if (!value) {
    return 'לא צוין';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat('he-IL', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const EvaluationControl = ({ evaluation, onChange, isMobile }) => {
  const selectedKey = useMemo(() => {
    if (!evaluation) {
      return '';
    }
    return evaluationOptions.find((option) => evaluation[option.key])?.key || '';
  }, [evaluation]);

  return (
    <FormControl component="fieldset" fullWidth>
      <RadioGroup
        row={!isMobile}
        value={selectedKey}
        onChange={(event) => onChange(event.target.value)}
        sx={{
          gap: isMobile ? 0.25 : 0.75,
          flexWrap: 'wrap',
          justifyContent: 'space-between',
        }}
      >
        {evaluationOptions.map((option) => (
          <FormControlLabel
            key={option.key}
            value={option.key}
            control={<Radio size="small" />}
            label={option.label}
            sx={{
              m: 0,
              minWidth: isMobile ? '48%' : 'auto',
              '.MuiFormControlLabel-label': {
                fontSize: isMobile ? '0.8rem' : '0.9rem',
                fontWeight: 500,
              },
            }}
          />
        ))}
      </RadioGroup>
    </FormControl>
  );
};

const PublicTesterPage = () => {
  const { drillId } = useParams();
  const isMobile = useMediaQuery('(max-width:600px)');
  const [data, setData] = useState(null);
  const [selectedSheetId, setSelectedSheetId] = useState('');
  const [activeTab, setActiveTab] = useState('bakara');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [rowSavingState, setRowSavingState] = useState({});
  const [notificationEvent, setNotificationEvent] = useState(null);
  const rowUpdateTimers = useRef({});
  const refreshTimerRef = useRef(null);
  const notificationTimerRef = useRef(null);
  const notifiedEventsRef = useRef(new Set());

  const isTodayDate = (dateStr) => {
    if (!dateStr) return false;
    const date = parseDrillStartDate(dateStr);
    if (!date) return false;
    const now = new Date();
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  };

  const loadData = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError('');
    }
    try {
      const response = await getPublicDrill(drillId);
      setData({
        ...response,
        schedule: normalizeSchedule(response.schedule),
      });
      setSelectedSheetId((prev) => prev || response.sheets?.[0]?.sheetId || '');
    } catch (err) {
      if (!silent) {
        setError('לא הצלחנו לטעון את הגיליון. נסו לרענן או לפנות למנהל המערכת.');
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [drillId]);

  useEffect(() => {
    loadData();
    return () => {
      Object.values(rowUpdateTimers.current).forEach((timerId) => clearTimeout(timerId));
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
      if (notificationTimerRef.current) {
        clearInterval(notificationTimerRef.current);
      }
      notifiedEventsRef.current.clear();
    };
  }, [drillId, loadData]);

  useEffect(() => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
    }
    if (isTodayDate(data?.date)) {
      refreshTimerRef.current = setInterval(() => loadData(true), 15000);
    }
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [data?.date, loadData]);

  const updateRowInState = (rowId, changes) => {
    setData((prev) => {
      if (!prev?.sheets) return prev;
      const sheets = prev.sheets.map((sheet) => {
        if (sheet.sheetId !== selectedSheetId) {
          return sheet;
        }
        return {
          ...sheet,
          rows: sheet.rows.map((row) => (row.id === rowId ? { ...row, ...changes } : row)),
        };
      });
      const sheet = {
        ...prev.sheets.find((s) => s.sheetId === selectedSheetId),
        rows: sheets.find((s) => s.sheetId === selectedSheetId)?.rows || [],
      };
      return { ...prev, sheets, sheet };
    });
  };

  const scheduleRowPersistence = (rowId, payload) => {
    if (!selectedSheetId) {
      return;
    }
    if (rowUpdateTimers.current[rowId]) {
      clearTimeout(rowUpdateTimers.current[rowId]);
    }
    rowUpdateTimers.current[rowId] = setTimeout(async () => {
      setRowSavingState((prev) => ({ ...prev, [rowId]: true }));
      try {
        const updatedRow = await updatePublicRow(drillId, selectedSheetId, rowId, payload);
        updateRowInState(rowId, updatedRow);
        setSaveError('');
      } catch (err) {
        setSaveError('שמירת הנתון נכשלה. נסו שוב.');
      } finally {
        setRowSavingState((prev) => {
          const next = { ...prev };
          delete next[rowId];
          return next;
        });
        delete rowUpdateTimers.current[rowId];
      }
    }, 400);
  };

  const handleEvaluationChange = (rowId, value) => {
    if (!selectedSheetId) {
      return;
    }
    const nextEvaluation = emptyEvaluation();
    if (value && nextEvaluation.hasOwnProperty(value)) {
      nextEvaluation[value] = true;
    }
    updateRowInState(rowId, { evaluation: nextEvaluation });
    scheduleRowPersistence(rowId, { evaluation: nextEvaluation });
  };

  const handleCommentChange = (rowId, value) => {
    if (!selectedSheetId) {
      return;
    }
    updateRowInState(rowId, { comment: value });
    scheduleRowPersistence(rowId, { comment: value });
  };

  const sheet = (data?.sheets || []).find((s) => s.sheetId === selectedSheetId) || null;
  const schedule = useMemo(() => {
    const base = data?.schedule;
    if (!base) return null;
    if (!selectedSheetId) return base;
    const allowed = (base.events || []).filter(
      (event) => (event.to === 'כולם') || (event.to === (sheet?.sheetName || ''))
    );
    return { ...base, events: allowed };
  }, [data?.schedule, selectedSheetId, sheet?.sheetName]);

  const scheduleEventsWithAbsoluteTime = useMemo(() => {
    if (!schedule?.events?.length) {
      return [];
    }
    const start = parseDrillStartDate(data?.date);
    return (schedule.events || [])
      .map((event, index) => {
        const offsetMinutes = parseOffsetMinutes(event.time);
        const absoluteDate = start && offsetMinutes != null
          ? new Date(start.getTime() + offsetMinutes * 60000)
          : null;
        return {
          ...event,
          _index: index,
          _offsetMinutes: offsetMinutes == null ? Number.MAX_SAFE_INTEGER : offsetMinutes,
          _absoluteDate: absoluteDate,
        };
      })
      .sort((a, b) => a._offsetMinutes - b._offsetMinutes);
  }, [data?.date, schedule?.events]);

  useEffect(() => {
    if (notificationTimerRef.current) {
      clearInterval(notificationTimerRef.current);
    }
    if (!scheduleEventsWithAbsoluteTime.length) {
      return;
    }

    const NOTIFICATION_GRACE_MS = 10 * 60 * 1000;
    const checkNotifications = () => {
      if (notificationEvent) {
        return;
      }
      const now = Date.now();
      const dueEvent = scheduleEventsWithAbsoluteTime.find((event) => {
        const eventId = event.id || `${event.time}-${event.message}-${event._index}`;
        if (notifiedEventsRef.current.has(eventId)) {
          return false;
        }
        const eventAt = event._absoluteDate?.getTime();
        if (!eventAt) {
          return false;
        }
        return eventAt <= now && now - eventAt <= NOTIFICATION_GRACE_MS;
      });
      if (dueEvent) {
        const eventId = dueEvent.id || `${dueEvent.time}-${dueEvent.message}-${dueEvent._index}`;
        notifiedEventsRef.current.add(eventId);
        setNotificationEvent(dueEvent);
      }
    };

    checkNotifications();
    notificationTimerRef.current = setInterval(checkNotifications, 5000);
    return () => {
      if (notificationTimerRef.current) {
        clearInterval(notificationTimerRef.current);
      }
    };
  }, [notificationEvent, scheduleEventsWithAbsoluteTime]);

  if (loading) {
    return (
      <Box sx={{ p: 4 }} dir="rtl">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4 }} dir="rtl">
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography>נסה שוב:</Typography>
          <IconButton onClick={loadData}>
            <RefreshIcon />
          </IconButton>
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, pb: 8 }} dir="rtl">
      <Paper
        sx={{
          p: { xs: 2, md: 3 },
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'primary.light',
          background: 'linear-gradient(120deg, rgba(25,118,210,0.16), rgba(25,118,210,0.04))',
          boxShadow: '0 14px 40px rgba(0,0,0,0.06)',
        }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} alignItems={{ xs: 'flex-start', md: 'center' }}>
          <Box>
            <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight={800}>{data?.name || 'תרגיל'}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              מעקב בוחן בזמן אמת
            </Typography>
          </Box>
          <Paper sx={{ p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(255,255,255,0.75)' }}>
            <Typography fontWeight={700}>גישה לבוחן</Typography>
            <Typography variant="body2" color="text.secondary">
              ניתן לעדכן הערכה והערות בלבד.
            </Typography>
          </Paper>
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} sx={{ mt: 2 }} useFlexGap flexWrap="wrap">
          <Paper sx={{ px: 1.5, py: 1, borderRadius: 2, border: '1px solid', borderColor: 'divider', minWidth: 170 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <LocalHospitalIcon fontSize="small" color="primary" />
              <Typography variant="body2">{resolveHospitalName(data?.hospitalId || data?.hospital) || 'לא צוין'}</Typography>
            </Stack>
          </Paper>
          <Paper sx={{ px: 1.5, py: 1, borderRadius: 2, border: '1px solid', borderColor: 'divider', minWidth: 170 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <EventAvailableIcon fontSize="small" color="primary" />
              <Typography variant="body2">{formatDrillStart(data?.date)}</Typography>
            </Stack>
          </Paper>
          <Paper sx={{ px: 1.5, py: 1, borderRadius: 2, border: '1px solid', borderColor: 'divider', minWidth: 170 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <DescriptionIcon fontSize="small" color="primary" />
              <Typography variant="body2">{sheet?.sheetName || 'בחר גיליון'}</Typography>
            </Stack>
          </Paper>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2, mt: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <FormControl fullWidth>
          <InputLabel id="sheet-select-label">בחר גיליון</InputLabel>
          <Select
            labelId="sheet-select-label"
            label="בחר גיליון"
            value={selectedSheetId}
            onChange={(event) => setSelectedSheetId(event.target.value)}
          >
            {(data?.sheets || []).map((s) => (
              <MenuItem key={s.sheetId} value={s.sheetId}>
                {s.sheetName || s.sheetId}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Paper>

      <Paper sx={{ mt: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Tabs
          value={activeTab}
          onChange={(event, val) => setActiveTab(val)}
          centered
          indicatorColor="primary"
          textColor="primary"
          TabIndicatorProps={{ sx: { height: 4, borderRadius: 2 } }}
        >
          <Tab value="bakara" label="בקרה" sx={{ fontWeight: 800, fontSize: isMobile ? 14 : 16, letterSpacing: 0.2 }} />
          <Tab value="schedule" label="סדרה ג׳" sx={{ fontWeight: 800, fontSize: isMobile ? 14 : 16, letterSpacing: 0.2 }} />
        </Tabs>
      </Paper>

      {saveError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {saveError}
        </Alert>
      )}

      {!sheet ? (
        <Alert severity="info" sx={{ mt: 3 }}>
          אין גיליונות זמינים לתרגיל זה.
        </Alert>
      ) : activeTab === 'bakara' ? (
        <Paper
          sx={{
            p: 3,
            mt: 3,
            border: '1px solid',
            borderColor: 'primary.main',
            boxShadow: '0 14px 40px rgba(0,0,0,0.06)',
            borderRadius: 3,
          }}
        >
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
            גיליון בקרה
          </Typography>
          {isMobile ? (
            <Stack spacing={1.5}>
              {(sheet?.rows || []).map((row) => (
                <Paper
                  key={row.id}
                  variant="outlined"
                  sx={{ p: 1.5, borderRadius: 2, borderColor: 'divider' }}
                >
                  <Stack spacing={1}>
                    <Typography variant="subtitle2" fontWeight={700}>
                      {row.metric || 'מדד ללא כותרת'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {`${row.component || ''}${row.category ? ` / ${row.category}` : ''}`}
                    </Typography>
                    <EvaluationControl
                      evaluation={row.evaluation}
                      onChange={(value) => handleEvaluationChange(row.id, value)}
                      isMobile
                    />
                    <TextField
                      fullWidth
                      size="small"
                      multiline
                      minRows={2}
                      placeholder="הערות"
                      value={row.comment || ''}
                      onChange={(event) => handleCommentChange(row.id, event.target.value)}
                    />
                    {rowSavingState[row.id] ? (
                      <Stack direction="row" justifyContent="flex-end">
                        <CircularProgress size={16} />
                      </Stack>
                    ) : null}
                  </Stack>
                </Paper>
              ))}
            </Stack>
          ) : (
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell align="right">מרכיב</TableCell>
                    <TableCell align="right">קטגוריה</TableCell>
                    <TableCell align="right">מדד</TableCell>
                    <TableCell align="center" width="30%">הערכה</TableCell>
                    <TableCell align="right" width="25%">הערות</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(sheet?.rows || []).map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell>{row.component}</TableCell>
                      <TableCell>{row.category}</TableCell>
                      <TableCell>{row.metric}</TableCell>
                      <TableCell>
                        <EvaluationControl
                          evaluation={row.evaluation}
                          onChange={(value) => handleEvaluationChange(row.id, value)}
                          isMobile={false}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          fullWidth
                          multiline
                          minRows={2}
                          value={row.comment || ''}
                          onChange={(event) => handleCommentChange(row.id, event.target.value)}
                        />
                      </TableCell>
                      <TableCell align="center" width="60">
                        {rowSavingState[row.id] && <CircularProgress size={18} />}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      ) : (
        <Paper
          sx={{
            p: 3,
            mt: 3,
            border: '1px solid',
            borderColor: 'secondary.main',
            boxShadow: '0 14px 40px rgba(0,0,0,0.06)',
            borderRadius: 3,
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6" fontWeight={700}>סדרה ג׳</Typography>
            <Typography variant="body2" color="text.secondary">צפייה בלבד</Typography>
          </Stack>
          {schedule ? (
            <Stack spacing={1.5}>
              {scheduleEventsWithAbsoluteTime.map((event, index) => (
                <Accordion key={event.id || index} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Stack direction="row" spacing={2} alignItems="center" sx={{ width: '100%' }}>
                      <Box
                        sx={{
                          minWidth: 70,
                          textAlign: 'center',
                          px: 1.5,
                          py: 0.5,
                          borderRadius: 2,
                          backgroundColor: 'secondary.light',
                          color: 'secondary.dark',
                          fontWeight: 800,
                        }}
                      >
                        {formatAbsoluteEventTime(data?.date, event.time)}
                      </Box>
                      <Box sx={{ flexGrow: 1, minWidth: 0, overflow: 'hidden', paddingX: '8px' }}>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          noWrap
                          sx={{ textOverflow: 'ellipsis', overflow: 'hidden', display: 'block' }}
                        >
                          {`${event.to || ''}`}
                        </Typography>
                      </Box>
                    </Stack>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Stack spacing={1.5} sx={{ wordBreak: 'break-word' }}>
                      <Stack direction="row" spacing={2}>
                        <Typography variant="body2" color="text.secondary" minWidth={90}>זמן יחסי</Typography>
                        <Typography>{event.time || 'לא צוין'}</Typography>
                      </Stack>
                      <Stack direction="row" spacing={2}>
                        <Typography variant="body2" color="text.secondary" minWidth={90}>זמן בפועל</Typography>
                        <Typography>{formatAbsoluteEventTime(data?.date, event.time)}</Typography>
                      </Stack>
                      <Stack direction="row" spacing={2}>
                        <Typography variant="body2" color="text.secondary" minWidth={60}>מאת</Typography>
                        <Typography>{event.from || 'לא צוין'}</Typography>
                      </Stack>
                      <Stack direction="row" spacing={2}>
                        <Typography variant="body2" color="text.secondary" minWidth={60}>אל</Typography>
                        <Typography>{event.to || 'לא צוין'}</Typography>
                      </Stack>
                      <Stack spacing={0.5}>
                        <Typography variant="body2" color="text.secondary">הודעה</Typography>
                        <Typography whiteSpace="pre-line">{event.message || '—'}</Typography>
                      </Stack>
                      {event.notes ? (
                        <Stack spacing={0.5}>
                          <Typography variant="body2" color="text.secondary">הערות</Typography>
                          <Typography whiteSpace="pre-line">{event.notes}</Typography>
                        </Stack>
                      ) : null}
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Stack>
          ) : (
            <Alert severity="info">אין סדרה ג׳ להצגה.</Alert>
          )}
        </Paper>
      )}

      <Dialog open={Boolean(notificationEvent)} onClose={() => setNotificationEvent(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.2, color: 'primary.main' }}>
          <NotificationsActiveIcon />
          אירוע תרגיל הגיע לזמן הביצוע
        </DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              {`זמן יחסי: ${notificationEvent?.time || '--:--'}`}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {`זמן בפועל: ${formatAbsoluteEventTime(data?.date, notificationEvent?.time)}`}
            </Typography>
            <Typography variant="body2"><strong>מאת:</strong> {notificationEvent?.from || 'לא צוין'}</Typography>
            <Typography variant="body2"><strong>אל:</strong> {notificationEvent?.to || 'לא צוין'}</Typography>
            <Paper
              elevation={0}
              sx={{
                p: 1.5,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'primary.light',
                bgcolor: 'rgba(25,118,210,0.06)',
              }}
            >
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>הודעה</Typography>
              <Typography whiteSpace="pre-line">{notificationEvent?.message || '—'}</Typography>
            </Paper>
            {notificationEvent?.notes ? (
              <Typography variant="body2" color="text.secondary" whiteSpace="pre-line">
                {`הערות: ${notificationEvent.notes}`}
              </Typography>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setNotificationEvent(null)}>
            הבנתי
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PublicTesterPage;
