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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import {
  addRow,
  addSheet,
  deleteRow,
  deleteSheet,
  getDrill,
  updateRow,
  updateSheet,
} from '../api/drillsApi';

const evaluationOptions = [
  { key: 'yes', label: 'כן' },
  { key: 'no', label: 'לא' },
  { key: 'notRelevant', label: 'לא רלוונטי' },
  { key: 'redFlag', label: 'קו אדום' },
];

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
    <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap" justifyContent="space-between">
      <Tabs
        value={selectedSheetId || sheets[0].sheetId}
        onChange={(event, value) => onSelectSheet(value)}
        variant="scrollable"
        scrollButtons="auto"
      >
        {sheets.map((sheet) => (
          <Tab key={sheet.sheetId} value={sheet.sheetId} label={sheet.sheetName || 'ללא שם'} />
        ))}
      </Tabs>
      <Stack direction="row" spacing={1}>
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
    </Stack>
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
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }}>
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
  const [selectedSheetId, setSelectedSheetId] = useState('');
  const [rowSavingState, setRowSavingState] = useState({});
  const [sheetSavingState, setSheetSavingState] = useState({});
  const [isMutating, setIsMutating] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState('');
  const rowUpdateTimers = useRef({});
  const sheetUpdateTimers = useRef({});

  useEffect(() => {
    const fetchDrill = async () => {
      setLoading(true);
      try {
        const data = await getDrill(drillId);
        setDrill(data);
        setSelectedSheetId(data.sheets?.[0]?.sheetId || '');
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
    } catch (err) {
      setSaveError(err.message || 'מחיקת הגיליון נכשלה');
    } finally {
      setIsMutating(false);
    }
  };

  const isSaving = useMemo(() => {
    return (
      Object.keys(rowSavingState).length > 0 ||
      Object.keys(sheetSavingState).length > 0 ||
      isMutating
    );
  }, [rowSavingState, sheetSavingState, isMutating]);

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
    <Box sx={{ p: 4 }} dir="rtl">
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
        <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/drills')}>
          חזרה לרשימה
        </Button>
      </Stack>

      <Paper sx={{ p: 3, mt: 3 }}>
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

      {saveError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {saveError}
        </Alert>
      )}

      <SheetEditor
        sheet={selectedSheet}
        onSheetRename={handleRenameSheet}
        onAddRow={handleAddRow}
        onRowChange={handleRowChange}
        onDeleteRow={handleDeleteRow}
        rowSavingState={rowSavingState}
      />

      <Paper sx={{ p: 2, mt: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={1} alignItems="center">
            {isSaving ? <CircularProgress size={18} /> : <CheckCircleIcon color="success" fontSize="small" />}
            <Typography fontWeight={600}>{isSaving ? 'שומר שינויים...' : 'כל השינויים נשמרו'}</Typography>
          </Stack>
          {lastSavedAt && (
            <Typography color="text.secondary">
              {`נשמר לאחרונה: ${new Date(lastSavedAt).toLocaleTimeString('he-IL')}`}
            </Typography>
          )}
        </Stack>
      </Paper>

      <Divider sx={{ mt: 4 }} />
    </Box>
  );
};

export default DrillEditorPage;
