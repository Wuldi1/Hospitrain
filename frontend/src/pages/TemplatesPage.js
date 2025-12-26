import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
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
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import {
  getTemplates,
  getTemplateBundle,
  saveBakaraTemplate,
  saveScheduleTemplate,
} from '../api/drillsApi';

const columnLabels = {
  component: 'מרכיב',
  category: 'קטגוריה',
  metric: 'מדד',
  evaluation: 'הערכה',
  comment: 'הערות',
  serial: 'מספר',
  time: 'שעה',
  from: 'מאת',
  to: 'אל',
  message: 'הודעה',
  notes: 'הערות',
};

const defaultBakaraOrder = ['component', 'category', 'metric', 'evaluation', 'comment'];
const defaultScheduleOrder = ['serial', 'time', 'from', 'to', 'message', 'notes'];

const evaluationOptions = [
  { key: 'yes', label: 'כן' },
  { key: 'no', label: 'לא' },
  { key: 'notRelevant', label: 'לא רלוונטי' },
  { key: 'redFlag', label: 'קו אדום' },
];

const createId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
const emptyEvaluation = () => ({ yes: false, no: false, notRelevant: false, redFlag: false });

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

const createColumnsFromRows = (rows = [], preferredOrder = []) => {
  const seen = new Set();
  const columns = [];
  const addKey = (key) => {
    if (!key || key === 'id' || seen.has(key)) {
      return;
    }
    seen.add(key);
    columns.push({
      key,
      label: columnLabels[key] || key,
      type: key === 'evaluation' ? 'evaluation' : 'text',
    });
  };

  preferredOrder.forEach(addKey);
  rows.forEach((row) => {
    Object.keys(row || {}).forEach(addKey);
  });

  if (!columns.length) {
    columns.push({ key: 'value', label: 'ערך', type: 'text' });
  }

  return columns;
};

const ColumnHeader = ({ column, onRemove, disableRemove }) => (
  <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
    <Typography fontWeight={600}>{column.label}</Typography>
    {!disableRemove && (
      <Tooltip title="הסר עמודה">
        <IconButton size="small" onClick={() => onRemove(column.key)}>
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    )}
  </Stack>
);

const EvaluationCell = ({ value, onChange }) => {
  const selectedKey = useMemo(() => {
    if (!value) {
      return null;
    }
    return evaluationOptions.find((option) => value[option.key])?.key || null;
  }, [value]);

  return (
    <ToggleButtonGroup
      exclusive
      value={selectedKey}
      onChange={(event, val) => onChange(val)}
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

const TemplatesPage = () => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [bakara, setBakara] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [selectedSheetId, setSelectedSheetId] = useState('');
  const [activeTab, setActiveTab] = useState('bakara');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState({ bakara: false, schedule: false });
  const [dirty, setDirty] = useState({ bakara: false, schedule: false });
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const data = await getTemplates();
        setTemplates(data);
        if (!selectedTemplateId && data.length) {
          setSelectedTemplateId(data[0].templateId);
        }
      } catch (err) {
        setError('טעינת התבניות נכשלה.');
      }
    };

    fetchTemplates();
  }, []);

  useEffect(() => {
    if (!selectedTemplateId) {
      return;
    }
    const fetchTemplateDetails = async () => {
      setLoading(true);
      setError('');
      setSuccessMessage('');
      try {
        const data = await getTemplateBundle(selectedTemplateId);
        const normalizedBakara = data?.bakara
          ? {
              ...data.bakara,
              sheets: (data.bakara.sheets || []).map((sheet, index) => {
                const columns = sheet.columns?.length
                  ? sheet.columns
                  : createColumnsFromRows(sheet.rows || [], defaultBakaraOrder);
                return {
                  ...sheet,
                  sheetId: sheet.sheetId || `sheet-${index + 1}`,
                  sheetName: sheet.sheetName || `גיליון ${index + 1}`,
                  columns: columns.map((col) => ({
                    ...col,
                    type: col.type || (col.key === 'evaluation' ? 'evaluation' : 'text'),
                    label: col.label || columnLabels[col.key] || col.key,
                  })),
                  rows: (sheet.rows || []).map((row) => ({
                    id: row.id || createId(),
                    ...row,
                    evaluation: row.evaluation || emptyEvaluation(),
                  })),
                };
              }),
            }
          : null;

        const normalizedSchedule = data?.schedule
          ? {
              ...data.schedule,
              events: (data.schedule.events || []).map((event) => ({
                id: event.id || createId(),
                ...event,
              })),
              columns: data.schedule.columns?.length
                ? data.schedule.columns
                : createColumnsFromRows(data.schedule.events || [], defaultScheduleOrder),
            }
          : null;

        setBakara(normalizedBakara);
        setSchedule(normalizedSchedule);
        setSelectedSheetId(normalizedBakara?.sheets?.[0]?.sheetId || '');
        setDirty({ bakara: false, schedule: false });
      } catch (err) {
        setError('טעינת התבנית נכשלה.');
      } finally {
        setLoading(false);
      }
    };

    fetchTemplateDetails();
  }, [selectedTemplateId]);

  const markDirty = (key) => setDirty((prev) => ({ ...prev, [key]: true }));

  const handleAddBakaraColumn = () => {
    if (!bakara || !selectedSheetId) {
      return;
    }
    const label = window.prompt('שם העמודה החדשה');
    if (!label) {
      return;
    }
    setBakara((prev) => {
      const sheets = prev.sheets.map((sheet) => {
        if (sheet.sheetId !== selectedSheetId) {
          return sheet;
        }
        const key = makeColumnKey(label, sheet.columns.map((c) => c.key));
        const newColumn = { key, label, type: 'text' };
        return {
          ...sheet,
          columns: [...sheet.columns, newColumn],
          rows: sheet.rows.map((row) => ({ ...row, [key]: '' })),
        };
      });
      return { ...prev, sheets };
    });
    markDirty('bakara');
  };

  const handleRemoveBakaraColumn = (columnKey) => {
    if (!bakara || !selectedSheetId) {
      return;
    }
    setBakara((prev) => {
      const sheets = prev.sheets.map((sheet) => {
        if (sheet.sheetId !== selectedSheetId) {
          return sheet;
        }
        const columns = sheet.columns.filter((col) => col.key !== columnKey);
        const rows = sheet.rows.map((row) => {
          const next = { ...row };
          delete next[columnKey];
          return next;
        });
        return { ...sheet, columns, rows };
      });
      return { ...prev, sheets };
    });
    markDirty('bakara');
  };

  const handleBakaraRowChange = (rowId, key, value) => {
    if (!bakara || !selectedSheetId) {
      return;
    }
    setBakara((prev) => {
      const sheets = prev.sheets.map((sheet) => {
        if (sheet.sheetId !== selectedSheetId) {
          return sheet;
        }
        const rows = sheet.rows.map((row) => {
          if (row.id !== rowId) {
            return row;
          }
          if (key === 'evaluation') {
            const nextEvaluation = emptyEvaluation();
            if (value && nextEvaluation.hasOwnProperty(value)) {
              nextEvaluation[value] = true;
            }
            return { ...row, evaluation: nextEvaluation };
          }
          return { ...row, [key]: value };
        });
        return { ...sheet, rows };
      });
      return { ...prev, sheets };
    });
    markDirty('bakara');
  };

  const handleAddBakaraRow = () => {
    if (!bakara || !selectedSheetId) {
      return;
    }
    setBakara((prev) => {
      const sheets = prev.sheets.map((sheet) => {
        if (sheet.sheetId !== selectedSheetId) {
          return sheet;
        }
        const row = { id: createId() };
        sheet.columns.forEach((col) => {
          row[col.key] = col.key === 'evaluation' ? emptyEvaluation() : '';
        });
        return { ...sheet, rows: [...sheet.rows, row] };
      });
      return { ...prev, sheets };
    });
    markDirty('bakara');
  };

  const handleDeleteBakaraRow = (rowId) => {
    if (!bakara || !selectedSheetId) {
      return;
    }
    setBakara((prev) => {
      const sheets = prev.sheets.map((sheet) => {
        if (sheet.sheetId !== selectedSheetId) {
          return sheet;
        }
        return { ...sheet, rows: sheet.rows.filter((row) => row.id !== rowId) };
      });
      return { ...prev, sheets };
    });
    markDirty('bakara');
  };

  const handleAddScheduleColumn = () => {
    if (!schedule) {
      return;
    }
    const label = window.prompt('שם העמודה החדשה');
    if (!label) {
      return;
    }
    setSchedule((prev) => {
      const key = makeColumnKey(label, prev.columns.map((c) => c.key));
      const column = { key, label, type: 'text' };
      return {
        ...prev,
        columns: [...prev.columns, column],
        events: prev.events.map((event) => ({ ...event, [key]: '' })),
      };
    });
    markDirty('schedule');
  };

  const handleRemoveScheduleColumn = (columnKey) => {
    if (!schedule) {
      return;
    }
    setSchedule((prev) => ({
      ...prev,
      columns: prev.columns.filter((col) => col.key !== columnKey),
      events: prev.events.map((event) => {
        const next = { ...event };
        delete next[columnKey];
        return next;
      }),
    }));
    markDirty('schedule');
  };

  const handleScheduleRowChange = (rowId, key, value) => {
    if (!schedule) {
      return;
    }
    setSchedule((prev) => ({
      ...prev,
      events: prev.events.map((event) => (event.id === rowId ? { ...event, [key]: value } : event)),
    }));
    markDirty('schedule');
  };

  const handleAddScheduleRow = () => {
    if (!schedule) {
      return;
    }
    const row = { id: createId() };
    schedule.columns.forEach((col) => {
      row[col.key] = '';
    });
    setSchedule((prev) => ({ ...prev, events: [...prev.events, row] }));
    markDirty('schedule');
  };

  const handleDeleteScheduleRow = (rowId) => {
    if (!schedule) {
      return;
    }
    setSchedule((prev) => ({ ...prev, events: prev.events.filter((row) => row.id !== rowId) }));
    markDirty('schedule');
  };

  const handleSaveBakara = async () => {
    if (!bakara || !selectedTemplateId) {
      return;
    }
    setSaving((prev) => ({ ...prev, bakara: true }));
    setError('');
    setSuccessMessage('');
    try {
      await saveBakaraTemplate(selectedTemplateId, { ...bakara, type: 'Bakara' });
      setDirty((prev) => ({ ...prev, bakara: false }));
      setSuccessMessage('תבנית הבקרה נשמרה בהצלחה.');
    } catch (err) {
      setError('שמירת תבנית הבקרה נכשלה.');
    } finally {
      setSaving((prev) => ({ ...prev, bakara: false }));
    }
  };

  const handleSaveSchedule = async () => {
    if (!schedule || !selectedTemplateId) {
      return;
    }
    setSaving((prev) => ({ ...prev, schedule: true }));
    setError('');
    setSuccessMessage('');
    try {
      await saveScheduleTemplate(selectedTemplateId, { ...schedule, type: 'Schedule' });
      setDirty((prev) => ({ ...prev, schedule: false }));
      setSuccessMessage('תבנית הסדרה נשמרה בהצלחה.');
    } catch (err) {
      setError('שמירת סדרת ג׳ נכשלה.');
    } finally {
      setSaving((prev) => ({ ...prev, schedule: false }));
    }
  };

  const selectedBakaraSheet = useMemo(() => {
    if (!bakara) {
      return null;
    }
    return bakara.sheets.find((sheet) => sheet.sheetId === selectedSheetId) || bakara.sheets[0] || null;
  }, [bakara, selectedSheetId]);

  const renderBakaraTab = () => {
    if (!bakara) {
      return (
        <Alert severity="info" sx={{ mt: 2 }}>
          לא נמצאה תבנית בקרה עבור תבנית זו.
        </Alert>
      );
    }

    if (!bakara.sheets?.length) {
      return (
        <Alert severity="info" sx={{ mt: 2 }}>
          לתבנית זו אין גיליונות זמינים לעריכה.
        </Alert>
      );
    }

    return (
      <Paper sx={{ p: 2, mt: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }}>
          <Tabs
            value={selectedBakaraSheet?.sheetId || false}
            onChange={(event, val) => setSelectedSheetId(val)}
            variant="scrollable"
            scrollButtons="auto"
          >
            {bakara.sheets.map((sheet) => (
              <Tab key={sheet.sheetId} value={sheet.sheetId} label={sheet.sheetName || 'גיליון'} />
            ))}
          </Tabs>
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleAddBakaraColumn}
            >
              הוסף עמודה
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSaveBakara}
              disabled={!dirty.bakara || saving.bakara}
            >
              {saving.bakara ? 'שומר...' : 'שמור בקרה'}
            </Button>
          </Stack>
        </Stack>

        <TableContainer sx={{ mt: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {(selectedBakaraSheet?.columns || []).map((column) => (
                  <TableCell key={column.key} align="right">
                    <ColumnHeader
                      column={column}
                      onRemove={handleRemoveBakaraColumn}
                      disableRemove={selectedBakaraSheet.columns.length <= 1}
                    />
                  </TableCell>
                ))}
                <TableCell align="center">פעולות</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(selectedBakaraSheet?.rows || []).map((row) => (
                <TableRow key={row.id}>
                  {selectedBakaraSheet.columns.map((column) => (
                    <TableCell key={column.key}>
                      {column.type === 'evaluation' ? (
                        <EvaluationCell
                          value={row[column.key]}
                          onChange={(val) => handleBakaraRowChange(row.id, column.key, val)}
                        />
                      ) : (
                        <TextField
                          fullWidth
                          variant="standard"
                          value={row[column.key] || ''}
                          onChange={(event) => handleBakaraRowChange(row.id, column.key, event.target.value)}
                        />
                      )}
                    </TableCell>
                  ))}
                  <TableCell align="center">
                    <Tooltip title="מחק שורה">
                      <IconButton onClick={() => handleDeleteBakaraRow(row.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={(selectedBakaraSheet?.columns?.length || 0) + 1}>
                  <Button startIcon={<AddIcon />} onClick={handleAddBakaraRow}>
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

  const renderScheduleTab = () => {
    if (!schedule) {
      return (
        <Alert severity="info" sx={{ mt: 2 }}>
          לא נמצאה סדרה ג׳ לתבנית זו.
        </Alert>
      );
    }

    return (
      <Paper sx={{ p: 2, mt: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }}>
          <Typography variant="h6">סדרה ג׳</Typography>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={handleAddScheduleColumn}>
              הוסף עמודה
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSaveSchedule}
              disabled={!dirty.schedule || saving.schedule}
            >
              {saving.schedule ? 'שומר...' : 'שמור סדרה ג׳'}
            </Button>
          </Stack>
        </Stack>

        <TableContainer sx={{ mt: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {schedule.columns.map((column) => (
                  <TableCell key={column.key} align="right">
                    <ColumnHeader
                      column={column}
                      onRemove={handleRemoveScheduleColumn}
                      disableRemove={schedule.columns.length <= 1}
                    />
                  </TableCell>
                ))}
                <TableCell align="center">פעולות</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(schedule.events || []).map((row) => (
                <TableRow key={row.id}>
                  {schedule.columns.map((column) => (
                    <TableCell key={column.key}>
                      <TextField
                        fullWidth
                        variant="standard"
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
                <TableCell colSpan={schedule.columns.length + 1}>
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

  return (
    <Box sx={{ p: 4 }} dir="rtl">
      <Typography variant="h4" fontWeight={700}>
        תבניות
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 1 }}>
        בחר תבנית, ערוך את הבקרה והסדרה ושמור כדי לדרוס את הקובץ הקיים.
      </Typography>

      <Paper sx={{ p: 2, mt: 3 }}>
        <FormControl fullWidth>
          <InputLabel id="template-select-label">בחר תבנית</InputLabel>
          <Select
            labelId="template-select-label"
            label="בחר תבנית"
            value={selectedTemplateId}
            onChange={(event) => setSelectedTemplateId(event.target.value)}
          >
            {templates.map((template) => (
              <MenuItem key={template.templateId} value={template.templateId}>
                {`${template.templateName || template.templateId} (${template.templateId})`}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
      {successMessage && (
        <Alert severity="success" sx={{ mt: 2 }}>
          {successMessage}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '70vh' }}>
          <Box sx={{ flex: 1 }}>
            {activeTab === 'bakara' ? renderBakaraTab() : renderScheduleTab()}
          </Box>
          <Paper
            sx={{
              mt: 3,
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
        </Box>
      )}
    </Box>
  );
};

export default TemplatesPage;
