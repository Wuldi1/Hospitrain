import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  Paper,
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
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LinkIcon from '@mui/icons-material/Link';
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit';
import {
  addRow,
  addSheet,
  deleteRow,
  deleteSheet,
  getDrill,
  updateRow,
  updateSheet,
  saveDrillSchedule,
  updateDrill,
} from '../api/drillsApi';
import ApiClient from '../services/ApiClient';

const evaluationOptions = [
  { key: 'yes', label: 'כן' },
  { key: 'no', label: 'לא' },
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

const createId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

const makeColumnKey = (label, existingKeys = []) => {
  const base = (label || '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^\w\u0590-\u05FF]/g, '')
    .toLowerCase() || `column_${existingKeys.length + 1}`;
  let key = base;
  let counter = 1;
  while (existingKeys.includes(key)) {
    key = `${base}_${counter}`;
    counter += 1;
  }
  return key;
};

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
  events.forEach((event) => {
    Object.keys(event || {}).forEach(addKey);
  });

  if (!columns.length) {
    columns.push({ key: 'message', label: 'הודעה', type: 'text' });
  }

  return columns;
};

const normalizeScheduleForUi = (schedule) => {
  if (!schedule) {
    return null;
  }
  const columns = schedule.columns?.length ? schedule.columns : createColumnsFromEvents(schedule.events || []);
  return {
    ...schedule,
    columns: columns.map((col) => ({
      ...col,
      label: col.label || scheduleColumnLabels[col.key] || col.key,
      type: col.type || (col.key === 'time' ? 'time' : 'text'),
    })),
    events: (schedule.events || []).map((event) => ({
      ...event,
      id: event.id || createId(),
    })),
  };
};

const SheetTabs = ({
  sheets,
  selectedSheetId,
  onSelectSheet,
  onAddSheet,
  onDuplicateSheet,
  onDeleteSheet,
  disableSheetActions,
}) => {

  if (!sheets?.length) {
    return (
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center" justifyContent="space-between">
        <Typography color="text.secondary">עדיין אין גיליונות לתרגיל זה.</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={onAddSheet} disabled={disableSheetActions}>
          הוסף גיליון ראשון
        </Button>
      </Stack>
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: { xs: 'wrap', md: 'nowrap' } }}>
      <Tabs
        value={selectedSheetId || sheets[0].sheetId}
        onChange={(event, value) => onSelectSheet(value)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ flexGrow: 1, minWidth: 0 }}
      >
        {sheets.map((sheet) => (
          <Tab key={sheet.sheetId} value={sheet.sheetId} label={sheet.sheetName || 'ללא שם'} />
        ))}
      </Tabs>
      <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
        <Tooltip title="הוסף גיליון">
          <span>
            <IconButton onClick={onAddSheet} disabled={disableSheetActions}>
              <AddIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="שכפל גיליון">
          <span>
            <IconButton onClick={onDuplicateSheet} disabled={disableSheetActions || sheets.length === 0}>
              <ContentCopyIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="מחק גיליון">
          <span>
            <IconButton
              onClick={onDeleteSheet}
              disabled={disableSheetActions || sheets.length <= 1}
            >
              <DeleteIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
    </Box>
  );
};

const EvaluationToggle = ({ evaluation, onChange }) => {
  const selectedKey = useMemo(() => {
    if (!evaluation) {
      return null;
    }
    return evaluationOptions.find((option) => evaluation[option.key])?.key || null;
  }, [evaluation]);

  return (
    <ToggleButtonGroup
      exclusive
      value={selectedKey}
      onChange={(event, value) => onChange(value)}
      size="small"
      fullWidth
    >
      {evaluationOptions.map((option) => (
        <ToggleButton key={option.key} value={option.key} sx={{ flex: 1 }}>
          {option.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
};

const SheetEditor = ({
  sheet,
  onSheetRename,
  onAddRow,
  onRowChange,
  onDeleteRow,
  rowSavingState,
}) => {
  if (!sheet) {
    return (
      <Paper sx={{ p: 4, mt: 3 }}>
        <Typography align="center" color="text.secondary">
          אין גיליונות להצגה. הוסף גיליון חדש כדי להתחיל.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ mt: 3, p: 3 }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={3}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', md: 'center' }}
      >
        <TextField
          label="שם הגיליון"
          value={sheet.sheetName}
          onChange={(event) => onSheetRename(event.target.value)}
          fullWidth
        />
        <Button variant="contained" startIcon={<AddIcon />} onClick={onAddRow}>
          הוסף שורה
        </Button>
      </Stack>

      <TableContainer sx={{ mt: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell align="right">מרכיב</TableCell>
              <TableCell align="right">קטגוריה</TableCell>
              <TableCell align="right">מדד</TableCell>
              <TableCell align="center" width="30%">הערכה</TableCell>
              <TableCell align="right" width="25%">הערות</TableCell>
              <TableCell align="center">פעולות</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sheet.rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography color="text.secondary" align="center">
                    אין שורות בגיליון זה. לחץ על &quot;הוסף שורה&quot; כדי להתחיל.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              sheet.rows.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>
                    <TextField
                      value={row.component || ''}
                      onChange={(event) => onRowChange(row.id, { component: event.target.value })}
                      fullWidth
                      variant="standard"
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      value={row.category || ''}
                      onChange={(event) => onRowChange(row.id, { category: event.target.value })}
                      fullWidth
                      variant="standard"
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      value={row.metric || ''}
                      onChange={(event) => onRowChange(row.id, { metric: event.target.value })}
                      fullWidth
                      variant="standard"
                    />
                  </TableCell>
                  <TableCell>
                    <EvaluationToggle
                      evaluation={row.evaluation}
                      onChange={(value) => onRowChange(row.id, { evaluation: value })}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      value={row.comment || ''}
                      onChange={(event) => onRowChange(row.id, { comment: event.target.value })}
                      fullWidth
                      multiline
                      minRows={2}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
                      {rowSavingState[row.id] && <CircularProgress size={18} />}
                      <Tooltip title="מחק שורה">
                        <IconButton onClick={() => onDeleteRow(row.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

const DrillEditorPage = () => {
  const { drillId } = useParams();
  const navigate = useNavigate();
  const [drill, setDrill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [activeTab, setActiveTab] = useState('bakara');
  const [selectedSheetId, setSelectedSheetId] = useState('');
  const [rowSavingState, setRowSavingState] = useState({});
  const [sheetSavingState, setSheetSavingState] = useState({});
  const [isMutating, setIsMutating] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState('');
  const [scheduleDraft, setScheduleDraft] = useState(null);
  const [scheduleDirty, setScheduleDirty] = useState(false);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [isMetaDialogOpen, setIsMetaDialogOpen] = useState(false);
  const [metaForm, setMetaForm] = useState({ name: '', hospitalId: '', date: '' });
  const [metaSaving, setMetaSaving] = useState(false);
  const [hospitals, setHospitals] = useState([]);
  const apiClientRef = useRef(new ApiClient());
  const rowUpdateTimers = useRef({});
  const sheetUpdateTimers = useRef({});

  useEffect(() => {
    const fetchDrill = async () => {
      setLoading(true);
      try {
        const data = await getDrill(drillId);
        setDrill(data);
        setSelectedSheetId(data.sheets?.[0]?.sheetId || '');
        setScheduleDraft(normalizeScheduleForUi(data.schedule));
        setScheduleDirty(false);
        setMetaForm({ name: data.name || '', hospitalId: data.hospitalId || data.hospital || '', date: data.date || '' });
        setError('');
      } catch (err) {
        setError('לא ניתן לטעון את התרגיל');
      } finally {
        setLoading(false);
      }
    };

    fetchDrill();
  }, [drillId]);

  useEffect(() => {
    const fetchHospitals = async () => {
      try {
        const hospitalsResponse = await apiClientRef.current.getHospitals();
        setHospitals(hospitalsResponse);
      } catch (err) {
        // fallback to empty list
      }
    };
    fetchHospitals();
  }, []);

  useEffect(() => {
    return () => {
      Object.values(rowUpdateTimers.current).forEach((timerId) => clearTimeout(timerId));
      Object.values(sheetUpdateTimers.current).forEach((timerId) => clearTimeout(timerId));
    };
  }, []);

  const selectedSheet = useMemo(() => {
    if (!drill?.sheets) {
      return null;
    }
    return drill.sheets.find((sheet) => sheet.sheetId === selectedSheetId) || drill.sheets[0] || null;
  }, [drill, selectedSheetId]);

  const markRowSaving = (rowId, value) => {
    setRowSavingState((prev) => {
      const next = { ...prev };
      if (value) {
        next[rowId] = true;
      } else {
        delete next[rowId];
      }
      return next;
    });
  };

  const markSheetSaving = (sheetId, value) => {
    setSheetSavingState((prev) => {
      const next = { ...prev };
      if (value) {
        next[sheetId] = true;
      } else {
        delete next[sheetId];
      }
      return next;
    });
  };

  const updateRowInState = (sheetId, rowId, changes) => {
    setDrill((prev) => {
      if (!prev) {
        return prev;
      }
      const sheets = prev.sheets.map((sheet) => {
        if (sheet.sheetId !== sheetId) {
          return sheet;
        }
        return {
          ...sheet,
          rows: sheet.rows.map((row) => (row.id === rowId ? { ...row, ...changes } : row)),
        };
      });
      return { ...prev, sheets };
    });
  };

  const replaceSheetInState = (sheetId, newSheet) => {
    setDrill((prev) => {
      if (!prev) {
        return prev;
      }
      const sheets = prev.sheets.map((sheet) => (sheet.sheetId === sheetId ? newSheet : sheet));
      return { ...prev, sheets };
    });
  };

  const scheduleRowPersistence = (sheetId, rowId, payload) => {
    const key = `${sheetId}:${rowId}`;
    if (rowUpdateTimers.current[key]) {
      clearTimeout(rowUpdateTimers.current[key]);
    }

    rowUpdateTimers.current[key] = setTimeout(async () => {
      markRowSaving(rowId, true);
      try {
        const updatedRow = await updateRow(drillId, sheetId, rowId, payload);
        updateRowInState(sheetId, rowId, updatedRow);
        setSaveError('');
        setLastSavedAt(new Date().toISOString());
      } catch (err) {
        setSaveError(err.message || 'שמירה נכשלה');
      } finally {
        markRowSaving(rowId, false);
        delete rowUpdateTimers.current[key];
      }
    }, 500);
  };

  const scheduleSheetPersistence = (sheetId, payload) => {
    if (!sheetId) {
      return;
    }
    if (sheetUpdateTimers.current[sheetId]) {
      clearTimeout(sheetUpdateTimers.current[sheetId]);
    }

    sheetUpdateTimers.current[sheetId] = setTimeout(async () => {
      markSheetSaving(sheetId, true);
      try {
        const updatedSheet = await updateSheet(drillId, sheetId, payload);
        replaceSheetInState(sheetId, updatedSheet);
        setSaveError('');
        setLastSavedAt(new Date().toISOString());
      } catch (err) {
        setSaveError(err.message || 'שמירת הגיליון נכשלה');
      } finally {
        markSheetSaving(sheetId, false);
        delete sheetUpdateTimers.current[sheetId];
      }
    }, 500);
  };

  const handleRowChange = (rowId, changes) => {
    if (!selectedSheet) {
      return;
    }

    if (Object.prototype.hasOwnProperty.call(changes, 'evaluation')) {
      const nextEvaluation = {
        yes: false,
        no: false,
        notRelevant: false,
        redFlag: false,
      };
      if (changes.evaluation && nextEvaluation.hasOwnProperty(changes.evaluation)) {
        nextEvaluation[changes.evaluation] = true;
      }
      updateRowInState(selectedSheet.sheetId, rowId, { evaluation: nextEvaluation });
      scheduleRowPersistence(selectedSheet.sheetId, rowId, { evaluation: nextEvaluation });
    } else {
      updateRowInState(selectedSheet.sheetId, rowId, changes);
      scheduleRowPersistence(selectedSheet.sheetId, rowId, changes);
    }
  };

  const handleAddRow = async () => {
    if (!selectedSheet) {
      return;
    }
    setIsMutating(true);
    try {
      const newRow = await addRow(drillId, selectedSheet.sheetId);
      setDrill((prev) => {
        if (!prev) {
          return prev;
        }
        const sheets = prev.sheets.map((sheet) =>
          sheet.sheetId === selectedSheet.sheetId ? { ...sheet, rows: [...sheet.rows, newRow] } : sheet
        );
        return { ...prev, sheets };
      });
      setSaveError('');
      setLastSavedAt(new Date().toISOString());
    } catch (err) {
      setSaveError(err.message || 'הוספת השורה נכשלה');
    } finally {
      setIsMutating(false);
    }
  };

  const handleDeleteRow = async (rowId) => {
    if (!selectedSheet) {
      return;
    }
    setIsMutating(true);
    try {
      await deleteRow(drillId, selectedSheet.sheetId, rowId);
      setDrill((prev) => {
        if (!prev) {
          return prev;
        }
        const sheets = prev.sheets.map((sheet) =>
          sheet.sheetId === selectedSheet.sheetId
            ? { ...sheet, rows: sheet.rows.filter((row) => row.id !== rowId) }
            : sheet
        );
        return { ...prev, sheets };
      });
      setSaveError('');
      setLastSavedAt(new Date().toISOString());
    } catch (err) {
      setSaveError(err.message || 'מחיקת השורה נכשלה');
    } finally {
      setIsMutating(false);
    }
  };

  const handleRenameSheet = (value) => {
    if (!selectedSheet) {
      return;
    }
    replaceSheetInState(selectedSheet.sheetId, { ...selectedSheet, sheetName: value });
    scheduleSheetPersistence(selectedSheet.sheetId, { sheetName: value });
  };

  const handleAddSheet = async () => {
    if (!drill) {
      return;
    }
    setIsMutating(true);
    try {
      const newSheet = await addSheet(drillId, { sheetName: `גיליון ${drill.sheets.length + 1}` });
      setDrill((prev) => ({ ...prev, sheets: [...prev.sheets, newSheet] }));
      setSelectedSheetId(newSheet.sheetId);
      setSaveError('');
      setLastSavedAt(new Date().toISOString());
    } catch (err) {
      setSaveError(err.message || 'הוספת הגיליון נכשלה');
    } finally {
      setIsMutating(false);
    }
  };

  const handleDuplicateSheet = async () => {
    if (!drill || !selectedSheet) {
      return;
    }
    setIsMutating(true);
    try {
      const newSheet = await addSheet(drillId, {
        sheetIdToDuplicate: selectedSheet.sheetId,
        sheetName: `${selectedSheet.sheetName} (העתק)`,
      });
      setDrill((prev) => ({ ...prev, sheets: [...prev.sheets, newSheet] }));
      setSelectedSheetId(newSheet.sheetId);
      setSaveError('');
      setLastSavedAt(new Date().toISOString());
    } catch (err) {
      setSaveError(err.message || 'שכפול הגיליון נכשל');
    } finally {
      setIsMutating(false);
    }
  };

  const handleDeleteSheet = async () => {
    if (!drill || !selectedSheet || drill.sheets.length <= 1) {
      return;
    }
    setIsMutating(true);
    const remainingSheets = drill.sheets.filter((sheet) => sheet.sheetId !== selectedSheet.sheetId);
    try {
      await deleteSheet(drillId, selectedSheet.sheetId);
      setDrill((prev) => {
        if (!prev) {
          return prev;
        }
        const nextSheets = prev.sheets.filter((sheet) => sheet.sheetId !== selectedSheet.sheetId);
        return { ...prev, sheets: nextSheets };
      });
      setSelectedSheetId(remainingSheets[0]?.sheetId || '');
      setSaveError('');
      setLastSavedAt(new Date().toISOString());
    } catch (err) {
      setSaveError(err.message || 'מחיקת הגיליון נכשלה');
    } finally {
      setIsMutating(false);
    }
  };

  const handleScheduleRowChange = (rowId, key, value) => {
    if (!scheduleDraft) {
      return;
    }
    setScheduleDraft((prev) => ({
      ...prev,
      events: prev.events.map((event) => (event.id === rowId ? { ...event, [key]: value } : event)),
    }));
    setScheduleDirty(true);
  };

  const handleAddScheduleRow = () => {
    if (!scheduleDraft) {
      return;
    }
    const row = { id: createId() };
    scheduleDraft.columns.forEach((col) => {
      row[col.key] = '';
    });
    setScheduleDraft((prev) => ({ ...prev, events: [...prev.events, row] }));
    setScheduleDirty(true);
  };

  const handleDeleteScheduleRow = (rowId) => {
    if (!scheduleDraft) {
      return;
    }
    setScheduleDraft((prev) => ({ ...prev, events: prev.events.filter((row) => row.id !== rowId) }));
    setScheduleDirty(true);
  };

  const handleAddScheduleColumn = () => {
    if (!scheduleDraft) {
      return;
    }
    const label = window.prompt('שם העמודה החדשה');
    if (!label) {
      return;
    }
    setScheduleDraft((prev) => {
      const key = makeColumnKey(label, prev.columns.map((c) => c.key));
      const column = { key, label, type: 'text' };
      return {
        ...prev,
        columns: [...prev.columns, column],
        events: prev.events.map((event) => ({ ...event, [key]: '' })),
      };
    });
    setScheduleDirty(true);
  };

  const handleRemoveScheduleColumn = (columnKey) => {
    if (!scheduleDraft) {
      return;
    }
    setScheduleDraft((prev) => ({
      ...prev,
      columns: prev.columns.filter((col) => col.key !== columnKey),
      events: prev.events.map((event) => {
        const next = { ...event };
        delete next[columnKey];
        return next;
      }),
    }));
    setScheduleDirty(true);
  };

  const handleSaveSchedule = async () => {
    if (!scheduleDraft) {
      return;
    }
    setScheduleSaving(true);
    setSaveError('');
    try {
      const saved = await saveDrillSchedule(drillId, scheduleDraft);
      const normalized = normalizeScheduleForUi(saved);
      setScheduleDraft(normalized);
      setDrill((prev) => (prev ? { ...prev, schedule: normalized } : prev));
      setScheduleDirty(false);
      setLastSavedAt(new Date().toISOString());
    } catch (err) {
      setSaveError(err.message || 'שמירת סדרה ג׳ נכשלה');
    } finally {
      setScheduleSaving(false);
    }
  };

  const handleMetaChange = (event) => {
    const { name, value } = event.target;
    setMetaForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveMeta = async () => {
    setMetaSaving(true);
    setSaveError('');
    try {
      const updated = await updateDrill(drillId, metaForm);
      setDrill((prev) => (prev ? { ...prev, ...updated } : updated));
      setIsMetaDialogOpen(false);
      setLastSavedAt(new Date().toISOString());
    } catch (err) {
      setSaveError(err.message || 'שמירת פרטי התרגיל נכשלה');
    } finally {
      setMetaSaving(false);
    }
  };

  const isSaving = useMemo(() => {
    return (
      Object.keys(rowSavingState).length > 0 ||
      Object.keys(sheetSavingState).length > 0 ||
      isMutating ||
      scheduleSaving
    );
  }, [rowSavingState, sheetSavingState, isMutating, scheduleSaving]);

  const renderBakaraSection = () => (
    <>
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
        <SheetTabs
          sheets={drill?.sheets || []}
          selectedSheetId={selectedSheet?.sheetId}
          onSelectSheet={setSelectedSheetId}
          onAddSheet={handleAddSheet}
          onDuplicateSheet={handleDuplicateSheet}
          onDeleteSheet={handleDeleteSheet}
          disableSheetActions={isMutating}
        />
      </Paper>

      <SheetEditor
        sheet={selectedSheet}
        onSheetRename={handleRenameSheet}
        onAddRow={handleAddRow}
        onRowChange={handleRowChange}
        onDeleteRow={handleDeleteRow}
        rowSavingState={rowSavingState}
      />
    </>
  );

  const renderScheduleSection = () => {
    if (!scheduleDraft) {
      return (
        <Alert severity="info" sx={{ mt: 3 }}>
          לתרגיל זה אין סדרה ג׳ זמינה לעריכה. ניתן להוסיף סדרה דרך מתאר התרגיל.
        </Alert>
      );
    }

    return (
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
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }}>
          <Box>
            <Typography variant="h5" fontWeight={700}>סדרה ג׳</Typography>
            <Typography color="text.secondary">עדכון לוח האירועים לתרגיל</Typography>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="flex-end">
            <Button variant="outlined" startIcon={<AddIcon />} onClick={handleAddScheduleColumn}>
              הוסף עמודה
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSaveSchedule}
              disabled={!scheduleDirty || scheduleSaving}
            >
              {scheduleSaving ? 'שומר...' : 'שמור סדרה ג׳'}
            </Button>
          </Stack>
        </Stack>

        <TableContainer sx={{ mt: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {scheduleDraft.columns.map((column) => (
                  <TableCell key={column.key} align="right">
                    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                      <Typography fontWeight={600}>{column.label}</Typography>
                      <Tooltip title="הסר עמודה">
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => handleRemoveScheduleColumn(column.key)}
                            disabled={scheduleDraft.columns.length <= 1}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                ))}
                <TableCell align="center">פעולות</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(scheduleDraft.events || []).map((row) => (
                <TableRow key={row.id}>
                  {scheduleDraft.columns.map((column) => (
                    <TableCell key={column.key}>
                      <TextField
                        fullWidth
                        variant="standard"
                        type={column.key === 'time' ? 'time' : 'text'}
                        InputLabelProps={column.key === 'time' ? { shrink: true } : undefined}
                        value={row[column.key] || ''}
                        onChange={(event) => handleScheduleRowChange(row.id, column.key, event.target.value)}
                        multiline={column.key === 'message' || column.key === 'notes'}
                        minRows={column.key === 'message' || column.key === 'notes' ? 2 : 1}
                      />
                    </TableCell>
                  ))}
                  <TableCell align="center">
                    <Tooltip title="מחק שורה">
                      <IconButton onClick={() => handleDeleteScheduleRow(row.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={scheduleDraft.columns.length + 1}>
                  <Button startIcon={<AddIcon />} onClick={handleAddScheduleRow}>
                    הוסף שורה
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    );
  };

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
        <Button variant="outlined" onClick={() => navigate('/drills')} startIcon={<ArrowBackIcon />}>
          חזרה לרשימת התרגילים
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4, pb: 8 }} dir="rtl">
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} alignItems={{ xs: 'flex-start', md: 'center' }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>
            {drill?.name || 'תרגיל'}
          </Typography>
          <Typography color="text.secondary">
            {`בית חולים: ${drill?.hospitalId || drill?.hospital || 'לא צוין'}`}
          </Typography>
          <Typography color="text.secondary">{`תאריך: ${drill?.date || 'לא צוין'}`}</Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" justifyContent="flex-end">
          <Button
            variant={shareCopied ? 'contained' : 'outlined'}
            color={shareCopied ? 'success' : 'primary'}
            startIcon={<LinkIcon />}
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/public/${drillId}`).then(() => {
                setShareCopied(true);
                setTimeout(() => setShareCopied(false), 1800);
              }).catch(() => setSaveError('לא ניתן להעתיק את הקישור'));
            }}
          >
            {shareCopied ? 'הועתק' : 'העתק קישור לבוחנים'}
          </Button>
          <Button variant="outlined" startIcon={<EditIcon />} onClick={() => setIsMetaDialogOpen(true)}>
            עריכת פרטי תרגיל
          </Button>
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/drills')}>
            חזרה לרשימה
          </Button>
        </Stack>
      </Stack>
      {!isSaving && !scheduleDirty && lastSavedAt && (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1, color: 'success.main' }}>
          <CheckCircleIcon fontSize="small" />
          <Typography variant="body2" fontWeight={700}>
            כל הפרטים נשמרו
          </Typography>
        </Stack>
      )}

      {saveError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {saveError}
        </Alert>
      )}

      {activeTab === 'bakara' ? renderBakaraSection() : renderScheduleSection()}

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
          <Tab value="bakara" label="בקרה" sx={{ fontWeight: 800, fontSize: 16, letterSpacing: 0.4 }} />
          <Tab value="schedule" label="סדרה ג׳" sx={{ fontWeight: 800, fontSize: 16, letterSpacing: 0.4 }} />
        </Tabs>
      </Paper>

      <Dialog open={isMetaDialogOpen} onClose={() => setIsMetaDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>עריכת פרטי התרגיל</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <TextField
              label="שם התרגיל"
              name="name"
              value={metaForm.name}
              onChange={handleMetaChange}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel id="meta-hospital-label">בית חולים</InputLabel>
              <Select
                labelId="meta-hospital-label"
                label="בית חולים"
                name="hospitalId"
                value={metaForm.hospitalId}
                onChange={handleMetaChange}
              >
                {hospitals.map((hospital) => (
                  <MenuItem key={hospital.id} value={hospital.id}>
                    {hospital.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              type="date"
              label="תאריך"
              name="date"
              value={metaForm.date}
              onChange={handleMetaChange}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsMetaDialogOpen(false)}>בטל</Button>
          <Button variant="contained" onClick={handleSaveMeta} disabled={metaSaving}>
            {metaSaving ? 'שומר...' : 'שמור'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DrillEditorPage;
