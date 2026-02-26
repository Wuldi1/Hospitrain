import React, { useCallback, useEffect, useMemo, useState } from 'react';
import useMediaQuery from '@mui/material/useMediaQuery';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';
import TimerIcon from '@mui/icons-material/Timer';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import LinkIcon from '@mui/icons-material/Link';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ApiClient from '../../services/ApiClient';
import { getDrill, saveDrillSchedule, updateRow } from '../../api/drillsApi';
import { getHospitalsMap, resolveHospitalName, saveHospitalsMap } from '../../utils/hospitalsCache';

const api = new ApiClient();

const evaluationOptions = [
  { key: 'yes', label: 'כן' },
  { key: 'no', label: 'לא' },
  { key: 'partial', label: 'חלקי' },
  { key: 'notRelevant', label: 'לא רלוונטי' },
  { key: 'redFlag', label: 'קו אדום' },
];

const parseOffsetMinutes = (timeStr = '') => {
  const [h, m] = String(timeStr).split(':').map((n) => parseInt(n, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) {
    return null;
  }
  return (h * 60) + m;
};

const formatMinutesToTime = (minutes) => {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, minutes));
  const hh = String(Math.floor(clamped / 60)).padStart(2, '0');
  const mm = String(clamped % 60).padStart(2, '0');
  return `${hh}:${mm}`;
};

const isSameDay = (d1, d2) => (
  d1.getFullYear() === d2.getFullYear() &&
  d1.getMonth() === d2.getMonth() &&
  d1.getDate() === d2.getDate()
);

const getStartDeltaLabel = (startValue) => {
  const start = new Date(startValue);
  if (Number.isNaN(start.getTime())) {
    return 'זמן התחלה לא תקין';
  }
  const now = new Date();
  const diffMs = start.getTime() - now.getTime();
  const absMinutes = Math.round(Math.abs(diffMs) / 60000);
  if (diffMs > 0) {
    return `מתחיל בעוד ${absMinutes} דקות`;
  }
  return `התחיל לפני ${absMinutes} דקות`;
};

const ActiveDrillsDashboard = () => {
  const isMobile = useMediaQuery('(max-width:900px)');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [drills, setDrills] = useState([]);
  const [drillDetails, setDrillDetails] = useState(null);
  const [activeTab, setActiveTab] = useState('schedule');
  const [selectedSheetId, setSelectedSheetId] = useState('');
  const [scheduleEditTarget, setScheduleEditTarget] = useState(null);
  const [bakaraEditMode, setBakaraEditMode] = useState(false);
  const [bakaraEditRows, setBakaraEditRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [cachedHospitalsById, setCachedHospitalsById] = useState(() => getHospitalsMap());

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [drillsData, hospitalsData] = await Promise.all([
        api.getDrills(),
        api.getHospitals(),
      ]);
      const now = new Date();
      const activeToday = drillsData.filter((d) => {
        const date = new Date(d.date || '');
        return !Number.isNaN(date.getTime()) && isSameDay(date, now);
      });
      activeToday.sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());
      setDrills(activeToday);
      setCachedHospitalsById(saveHospitalsMap(hospitalsData));
    } catch (err) {
      setError('טעינת תרגילים פעילים נכשלה.');
    } finally {
      setLoading(false);
    }
  }, []);

  const selectedDrillId = useMemo(
    () => drills[0]?.drillId || drills[0]?.id || '',
    [drills]
  );

  const loadDrillDetails = useCallback(async () => {
    if (!selectedDrillId) {
      setDrillDetails(null);
      return;
    }
    try {
      const details = await getDrill(selectedDrillId);
      setDrillDetails(details);
      setSelectedSheetId((prev) => prev || details.sheets?.[0]?.sheetId || '');
      if (!bakaraEditMode) {
        const currentSheet = details.sheets?.find((s) => s.sheetId === (selectedSheetId || details.sheets?.[0]?.sheetId));
        setBakaraEditRows((currentSheet?.rows || []).map((r) => ({ ...r })));
      }
    } catch (err) {
      setError('טעינת פרטי התרגיל נכשלה.');
    }
  }, [bakaraEditMode, selectedDrillId, selectedSheetId]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    loadDrillDetails();
  }, [loadDrillDetails]);

  useEffect(() => {
    if (bakaraEditMode || !selectedDrillId) {
      return undefined;
    }
    const intervalId = setInterval(() => {
      loadDrillDetails();
    }, 5000);
    return () => clearInterval(intervalId);
  }, [bakaraEditMode, loadDrillDetails, selectedDrillId]);

  const scheduleEvents = useMemo(() => {
    const start = new Date(drillDetails?.date || '');
    if (!drillDetails?.schedule?.events?.length || Number.isNaN(start.getTime())) {
      return [];
    }
    return [...drillDetails.schedule.events]
      .map((event, idx) => {
        const offset = parseOffsetMinutes(event.time);
        const absolute = offset == null ? null : new Date(start.getTime() + offset * 60000);
        return { ...event, _idx: idx, _offset: offset ?? Number.MAX_SAFE_INTEGER, _absolute: absolute };
      })
      .sort((a, b) => a._offset - b._offset);
  }, [drillDetails?.date, drillDetails?.schedule?.events]);

  const nextInlineEvent = useMemo(() => {
    const now = Date.now();
    return scheduleEvents.find((e) => e._absolute?.getTime() > now) || null;
  }, [scheduleEvents]);

  const visibleScheduleEvents = useMemo(() => {
    if (!scheduleEvents.length) {
      return [];
    }
    const now = Date.now();
    let lastCompletedIndex = -1;
    scheduleEvents.forEach((event, index) => {
      const eventAt = event._absolute?.getTime();
      if (eventAt && eventAt <= now) {
        lastCompletedIndex = index;
      }
    });
    return scheduleEvents.filter((_, index) => {
      if (lastCompletedIndex < 0) {
        return true;
      }
      return index >= lastCompletedIndex;
    });
  }, [scheduleEvents]);

  const testers = useMemo(() => {
    const source = Array.isArray(drillDetails?.publicTesters) ? drillDetails.publicTesters : [];
    return [...source].sort((a, b) => new Date(b.lastSeenAt || 0).getTime() - new Date(a.lastSeenAt || 0).getTime());
  }, [drillDetails?.publicTesters]);

  const selectedSheet = useMemo(() => {
    if (!drillDetails?.sheets?.length) {
      return null;
    }
    return drillDetails.sheets.find((s) => s.sheetId === selectedSheetId) || drillDetails.sheets[0];
  }, [drillDetails?.sheets, selectedSheetId]);

  useEffect(() => {
    if (!selectedSheet) {
      return;
    }
    setBakaraEditRows((selectedSheet.rows || []).map((r) => ({ ...r })));
  }, [selectedSheet]);

  const handleScheduleSave = async () => {
    if (!drillDetails?.schedule || !scheduleEditTarget) {
      return;
    }
    setSaving(true);
    try {
      const targetPayload = { ...scheduleEditTarget };
      delete targetPayload._idx;
      delete targetPayload._offset;
      delete targetPayload._absolute;
      delete targetPayload.shiftMinutes;
      delete targetPayload.pendingShiftScope;
      delete targetPayload.pendingShiftSign;
      const nextEvents = (drillDetails.schedule.events || []).map((event) =>
        (event.id || `${event.serial}-${event.time}`) === (scheduleEditTarget.id || `${scheduleEditTarget.serial}-${scheduleEditTarget.time}`)
          ? { ...event, ...targetPayload }
          : event
      );
      let finalEvents = nextEvents;
      const shiftScope = scheduleEditTarget.pendingShiftScope;
      const shiftSign = Number(scheduleEditTarget.pendingShiftSign || 0);
      const shiftDelta = Math.abs(parseInt(scheduleEditTarget.shiftMinutes, 10) || 0);
      if (shiftScope === 'from' && shiftSign && shiftDelta) {
        const targetOffset = parseOffsetMinutes(targetPayload.time);
        if (targetOffset == null) {
          throw new Error('Invalid target time');
        }
        const targetEventKey = targetPayload.id || `${targetPayload.serial || ''}-${targetPayload.time || ''}`;
        finalEvents = nextEvents.map((event) => {
          const eventKey = event.id || `${event.serial || ''}-${event.time || ''}`;
          if (eventKey === targetEventKey) {
            return event;
          }
          const offset = parseOffsetMinutes(event.time);
          if (offset == null || offset < targetOffset) {
            return event;
          }
          return {
            ...event,
            time: formatMinutesToTime(offset + (shiftSign * shiftDelta)),
          };
        });
      }
      const payload = { ...drillDetails.schedule, events: finalEvents };
      const saved = await saveDrillSchedule(selectedDrillId, payload);
      setDrillDetails((prev) => (prev ? { ...prev, schedule: saved } : prev));
      setScheduleEditTarget(null);
    } catch (err) {
      setError('שמירת אירוע סדרה נכשלה.');
    } finally {
      setSaving(false);
    }
  };

  const handleDialogShift = (applyFromEvent, sign = 1) => {
    if (!scheduleEditTarget) return;
    const delta = Math.abs(parseInt(scheduleEditTarget.shiftMinutes, 10) || 0);
    if (!delta) {
      setError('יש להזין מספר דקות תקין.');
      return;
    }
    const currentOffset = parseOffsetMinutes(scheduleEditTarget.time);
    if (currentOffset == null) {
      setError('לא ניתן להזיז אירוע עם זמן לא תקין.');
      return;
    }
    if (applyFromEvent) {
      setScheduleEditTarget((prev) => ({
        ...(prev || {}),
        pendingShiftScope: 'from',
        pendingShiftSign: sign,
      }));
      return;
    }
    const updated = formatMinutesToTime(currentOffset + (sign * delta));
    setScheduleEditTarget((prev) => ({
      ...(prev || {}),
      time: updated,
      pendingShiftScope: null,
      pendingShiftSign: null,
    }));
  };

  const handleBakaraSave = async () => {
    if (!selectedSheetId) return;
    setSaving(true);
    try {
      for (const row of bakaraEditRows) {
        await updateRow(selectedDrillId, selectedSheetId, row.id, {
          component: row.component || '',
          category: row.category || '',
          metric: row.metric || '',
          comment: row.comment || '',
          evaluation: row.evaluation || {},
        });
      }
      setBakaraEditMode(false);
      await loadDrillDetails();
    } catch (err) {
      setError('שמירת עדכוני בקרה נכשלה.');
    } finally {
      setSaving(false);
    }
  };

  const formatTimeOnly = (value) => {
    if (!value) return 'לא צוין';
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit' }).format(d);
  };

  const testerLink = selectedDrillId ? `${window.location.origin}/public/${selectedDrillId}` : '';
  const shiftMinutesValue = Math.max(1, Math.abs(parseInt(scheduleEditTarget?.shiftMinutes, 10) || 5));

  if (loading) {
    return <Box className="page-shell" dir="rtl"><CircularProgress /></Box>;
  }

  return (
    <Box
      className="page-shell"
      dir="rtl"
      sx={{
        maxWidth: 'none',
        width: '100%',
        px: { xs: 2, md: 3 },
        direction: 'rtl',
        textAlign: 'right',
      }}
    >
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
        <Box>
          <Typography variant="h4" fontWeight={800}>
            {`ניהול תרגיל פעיל: ${drillDetails?.name || drills[0]?.name || 'תרגיל'}`}
          </Typography>
          <Typography color="text.secondary">מעקב בזמן אמת אחרי סדרה ג׳ ובקרה</Typography>
        </Box>
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Tooltip title={shareCopied ? 'הועתק' : 'העתק קישור לבוחנים'}>
            <span>
              <IconButton
                color={shareCopied ? 'success' : 'primary'}
                disabled={!testerLink}
                onClick={() => {
                  navigator.clipboard
                    .writeText(testerLink)
                    .then(() => {
                      setShareCopied(true);
                      setTimeout(() => setShareCopied(false), 1800);
                    })
                    .catch(() => setError('לא ניתן להעתיק את הקישור'));
                }}
              >
                {shareCopied ? <CheckCircleIcon /> : <LinkIcon />}
              </IconButton>
            </span>
          </Tooltip>
          <Button variant="outlined" onClick={loadInitial} startIcon={<RefreshIcon />}>רענון</Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

      {!drills.length ? (
        <Alert severity="info" sx={{ mt: 2 }}>אין תרגילים שמתחילים או התחילו היום.</Alert>
      ) : (
        <>
          <Paper sx={{ p: 2, mt: 3 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
              <Box sx={{ flex: 1 }}>
                <Typography fontWeight={800}>
                  {drills[0]?.name || 'תרגיל פעיל'}
                </Typography>
                <Typography color="text.secondary">
                  {resolveHospitalName(drills[0]?.hospitalId || drills[0]?.hospital, cachedHospitalsById) || 'לא צוין'}
                </Typography>
              </Box>
              <Chip icon={<TimerIcon />} label={getStartDeltaLabel(drillDetails?.date)} color="primary" />
              <Chip icon={<EventAvailableIcon />} label={formatTimeOnly(drillDetails?.date)} variant="outlined" />
            </Stack>
          </Paper>

          <Paper sx={{ mt: 2 }}>
            <Tabs
              value={activeTab}
              onChange={(e, v) => setActiveTab(v)}
              variant={isMobile ? 'fullWidth' : 'standard'}
              sx={{ direction: 'rtl' }}
            >
              <Tab value="schedule" label="סדרה ג׳" />
              <Tab value="bakara" label="בקרה" />
              <Tab value="testers" label={`בוחנים (${testers.length})`} />
            </Tabs>
          </Paper>

          {activeTab === 'schedule' ? (
            <Paper sx={{ mt: 2 }}>
              <TableContainer sx={{ direction: 'rtl' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell align="right">זמן יחסי</TableCell>
                      <TableCell align="right">שעה בפועל</TableCell>
                      <TableCell align="right">מאת</TableCell>
                      <TableCell align="right">אל</TableCell>
                      <TableCell align="right">הודעה</TableCell>
                      <TableCell align="right">אישורי קבלה</TableCell>
                      <TableCell align="center">פעולות</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {visibleScheduleEvents.map((event) => {
                      const isNext = nextInlineEvent && (nextInlineEvent.id || nextInlineEvent._idx) === (event.id || event._idx);
                      const isPast = Boolean(event._absolute?.getTime()) && event._absolute.getTime() < Date.now();
                      return (
                        <TableRow
                          key={event.id || event._idx}
                          sx={{
                            ...(isNext ? { bgcolor: 'rgba(25,118,210,0.06)' } : {}),
                            ...(isPast
                              ? {
                                  bgcolor: 'rgba(15,23,42,0.03)',
                                  opacity: 0.82,
                                }
                              : {}),
                          }}
                        >
                          <TableCell align="right">{event.time}</TableCell>
                          <TableCell align="right">{formatTimeOnly(event._absolute)}</TableCell>
                          <TableCell align="right">{event.from || '-'}</TableCell>
                          <TableCell align="right">{event.to || '-'}</TableCell>
                          <TableCell align="right">{event.message || '-'}</TableCell>
                          <TableCell align="right">
                            {(event.acks || []).length
                              ? event.acks.map((ack) => ack.testerName || ack.testerId).join(', ')
                              : '-'}
                          </TableCell>
                          <TableCell align="center">
                            <Tooltip title="ערוך אירוע">
                              <IconButton onClick={() => setScheduleEditTarget({ ...event, shiftMinutes: 5 })}>
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          ) : activeTab === 'bakara' ? (
            <Paper sx={{ mt: 2, p: 2 }}>
              <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                <FormControl sx={{ minWidth: 240 }}>
                  <InputLabel id="sheet-select-active">גיליון</InputLabel>
                  <Select
                    labelId="sheet-select-active"
                    label="גיליון"
                    value={selectedSheetId}
                    onChange={(e) => setSelectedSheetId(e.target.value)}
                    sx={{ textAlign: 'right' }}
                    MenuProps={{
                      PaperProps: {
                        sx: { direction: 'rtl', textAlign: 'right' },
                      },
                    }}
                  >
                    {(drillDetails?.sheets || []).map((s) => (
                      <MenuItem key={s.sheetId} value={s.sheetId}>{s.sheetName || s.sheetId}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant={bakaraEditMode ? 'contained' : 'outlined'}
                    color="primary"
                    onClick={() => setBakaraEditMode((v) => !v)}
                  >
                    {bakaraEditMode ? 'יציאה ממצב עריכה' : 'עריכת בקרה'}
                  </Button>
                  {bakaraEditMode && (
                    <Button variant="contained" onClick={handleBakaraSave} disabled={saving}>
                      {saving ? 'שומר...' : 'שמור עדכוני בקרה'}
                    </Button>
                  )}
                </Stack>
              </Stack>

              <TableContainer sx={{ mt: 2, direction: 'rtl' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell align="right">מרכיב</TableCell>
                      <TableCell align="right">קטגוריה</TableCell>
                      <TableCell align="right">מדד</TableCell>
                      <TableCell align="right">הערכה</TableCell>
                      <TableCell align="right">הערות</TableCell>
                      <TableCell align="right">עודכן ע"י</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {bakaraEditRows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell align="right">{row.component}</TableCell>
                        <TableCell align="right">{row.category}</TableCell>
                        <TableCell align="right">{row.metric}</TableCell>
                        <TableCell align="right">
                          {bakaraEditMode ? (
                            <RadioGroup
                              row
                              value={evaluationOptions.find((o) => row.evaluation?.[o.key])?.key || ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                setBakaraEditRows((prev) => prev.map((r) => {
                                  if (r.id !== row.id) return r;
                                  const nextEval = { yes: false, no: false, partial: false, notRelevant: false, redFlag: false };
                                  if (Object.prototype.hasOwnProperty.call(nextEval, value)) nextEval[value] = true;
                                  return { ...r, evaluation: nextEval };
                                }));
                              }}
                              sx={{ direction: 'rtl' }}
                            >
                              {evaluationOptions.map((option) => (
                                <FormControlLabel
                                  key={option.key}
                                  value={option.key}
                                  control={<Radio size="small" />}
                                  label={option.label}
                                  labelPlacement="start"
                                />
                              ))}
                            </RadioGroup>
                          ) : (
                            evaluationOptions.find((o) => row.evaluation?.[o.key])?.label || '-'
                          )}
                        </TableCell>
                        <TableCell align="right">
                          {bakaraEditMode ? (
                            <TextField
                              fullWidth
                              value={row.comment || ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                setBakaraEditRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, comment: value } : r)));
                              }}
                            />
                          ) : (row.comment || '-')}
                        </TableCell>
                        <TableCell align="right">{row.lastUpdatedByTesterName || row.lastUpdatedByTesterId || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          ) : (
            <Paper sx={{ mt: 2, p: 2 }}>
              <Typography fontWeight={700} sx={{ mb: 1.5 }}>מעקב בוחנים</Typography>
              {!testers.length ? (
                <Alert severity="info">אין פעילות בוחנים עדיין.</Alert>
              ) : (
                <TableContainer sx={{ direction: 'rtl' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell align="right">שם</TableCell>
                        <TableCell align="right">מזהה</TableCell>
                        <TableCell align="right">נראה לאחרונה</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {testers.map((tester) => (
                        <TableRow key={tester.testerId}>
                          <TableCell align="right">{tester.testerName}</TableCell>
                          <TableCell align="right">{tester.testerId}</TableCell>
                          <TableCell align="right">{formatTimeOnly(tester.lastSeenAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          )}
        </>
      )}

      <Dialog open={Boolean(scheduleEditTarget)} onClose={() => setScheduleEditTarget(null)} fullWidth maxWidth="sm">
        <DialogTitle>עריכת אירוע סדרה</DialogTitle>
        <DialogContent sx={{ direction: 'rtl' }}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              type="time"
              label="זמן יחסי (HH:mm)"
              value={scheduleEditTarget?.time || ''}
              onChange={(e) => setScheduleEditTarget((prev) => ({ ...prev, time: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              inputProps={{ step: 60 }}
            />
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
              <Stack spacing={1.2}>
                <Typography variant="body2" color="text.secondary">הזזת זמנים</Typography>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  alignItems="stretch"
                  justifyContent="space-between"
                  sx={{ direction: { xs: 'rtl', sm: 'ltr' } }}
                >
                  <Stack spacing={0.75} sx={{ minWidth: { sm: 190 } }}>
                    <Button variant="outlined" onClick={() => handleDialogShift(false, -1)} disabled={saving}>
                      {`אירוע - ${shiftMinutesValue} דקות`}
                    </Button>
                    <Button variant="outlined" onClick={() => handleDialogShift(true, -1)} disabled={saving}>
                      {`מהאירוע והלאה - ${shiftMinutesValue} דקות`}
                    </Button>
                  </Stack>
                  <Stack alignItems="center" justifyContent="center" spacing={0.5}>
                    <TextField
                      type="number"
                      label="דקות"
                      value={scheduleEditTarget?.shiftMinutes ?? 5}
                      onChange={(e) => setScheduleEditTarget((prev) => ({ ...prev, shiftMinutes: e.target.value }))}
                      inputProps={{ min: 1 }}
                      sx={{ width: { xs: '100%', sm: 120 } }}
                    />
                  </Stack>
                  <Stack spacing={0.75} sx={{ minWidth: { sm: 190 } }}>
                    <Button variant="contained" onClick={() => handleDialogShift(false, 1)} disabled={saving}>
                      {`אירוע + ${shiftMinutesValue} דקות`}
                    </Button>
                    <Button variant="contained" color="primary" onClick={() => handleDialogShift(true, 1)} disabled={saving}>
                      {`מהאירוע והלאה + ${shiftMinutesValue} דקות`}
                    </Button>
                  </Stack>
                </Stack>
              </Stack>
            </Paper>
            {scheduleEditTarget?.pendingShiftScope === 'from' ? (
              <Typography variant="caption" color="text.secondary">
                השינוי לכל האירועים מהאירוע הנוכחי והלאה יבוצע רק בלחיצה על "שמור אירוע"
              </Typography>
            ) : null}
            <TextField
              label="מאת"
              value={scheduleEditTarget?.from || ''}
              onChange={(e) => setScheduleEditTarget((prev) => ({ ...prev, from: e.target.value }))}
            />
            <TextField
              label="אל"
              value={scheduleEditTarget?.to || ''}
              onChange={(e) => setScheduleEditTarget((prev) => ({ ...prev, to: e.target.value }))}
            />
            <TextField
              label="הודעה"
              multiline
              minRows={2}
              value={scheduleEditTarget?.message || ''}
              onChange={(e) => setScheduleEditTarget((prev) => ({ ...prev, message: e.target.value }))}
            />
            <TextField
              label="הערות"
              multiline
              minRows={2}
              value={scheduleEditTarget?.notes || ''}
              onChange={(e) => setScheduleEditTarget((prev) => ({ ...prev, notes: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ direction: 'rtl' }}>
          <Button onClick={() => setScheduleEditTarget(null)}>ביטול</Button>
          <Button variant="contained" onClick={handleScheduleSave} disabled={saving}>
            {saving ? 'שומר...' : 'שמור אירוע'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ActiveDrillsDashboard;
