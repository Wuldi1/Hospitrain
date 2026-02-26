import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  CircularProgress,
  Divider,
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
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
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

const timeToMinutes = (timeStr = '') => {
  const [h, m] = timeStr.split(':').map((n) => parseInt(n, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) {
    return Number.MAX_SAFE_INTEGER;
  }
  return h * 60 + m;
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
  const rowUpdateTimers = useRef({});
  const refreshTimerRef = useRef(null);

  const isTodayDate = (dateStr) => {
    if (!dateStr) return false;
    const today = new Date().toISOString().slice(0, 10);
    return dateStr.slice(0, 10) === today;
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
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} alignItems={{ xs: 'flex-start', md: 'center' }}>
        <Box>
          <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight={800}>{data?.name || 'תרגיל'}</Typography>
          <Typography color="text.secondary">
            {`בית חולים: ${resolveHospitalName(data?.hospitalId || data?.hospital) || 'לא צוין'}`}
          </Typography>
          <Typography color="text.secondary">{`תאריך: ${data?.date || 'לא צוין'}`}</Typography>
          <Typography sx={{ mt: 1 }} fontWeight={700}>{sheet?.sheetName || 'בחר גיליון'}</Typography>
        </Box>
        <Paper sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', background: 'linear-gradient(120deg, rgba(25,118,210,0.08), rgba(25,118,210,0.02))' }}>
          <Typography fontWeight={700}>קישור אנונימי לבוחן</Typography>
          <Typography variant="body2" color="text.secondary">
            ניתן לעדכן רק הערכה והערות. שאר התוכן מוגן.
          </Typography>
        </Paper>
      </Stack>

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
              {(schedule.events || []).slice().sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time)).map((event, index) => (
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
                        {event.time || '--:--'}
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
                        <Typography variant="body2" color="text.secondary" minWidth={60}>שעה</Typography>
                        <Typography>{event.time || 'לא צוין'}</Typography>
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

      <Paper
        sx={{
          mt: 4,
          position: 'sticky',
          bottom: 0,
          zIndex: 6,
          boxShadow: '0 -6px 30px rgba(0,0,0,0.08)',
          borderTop: '1px solid',
          borderColor: 'divider',
          backdropFilter: 'blur(10px)',
        }}
      >
        <Divider />
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
    </Box>
  );
};

export default PublicTesterPage;
