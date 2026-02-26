import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteIcon from "@mui/icons-material/Delete";
import LibraryAddIcon from "@mui/icons-material/LibraryAdd";
import SaveIcon from "@mui/icons-material/Save";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
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
} from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useEffect, useMemo, useState } from "react";
import {
  getTemplateBundle,
  getTemplates,
  saveBakaraTemplate,
  saveScheduleTemplate,
} from "../../api/drillsApi";

const columnLabels = {
  component: "מרכיב",
  category: "קטגוריה",
  metric: "מדד",
  evaluation: "הערכה",
  comment: "הערות",
  serial: "מספר",
  time: "שעה",
  from: "מאת",
  to: "אל",
  message: "הודעה",
  notes: "הערות",
};

const defaultBakaraOrder = [
  "component",
  "category",
  "metric",
  "evaluation",
  "comment",
];
const defaultScheduleOrder = [
  "serial",
  "time",
  "from",
  "to",
  "message",
  "notes",
];

const evaluationOptions = [
  { key: "yes", label: "כן" },
  { key: "no", label: "לא" },
  { key: "partial", label: "חלקי" },
  { key: "notRelevant", label: "לא רלוונטי" },
  // { key: "redFlag", label: "קו אדום" },
];

const createId = () =>
  crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
const emptyEvaluation = () => ({
  yes: false,
  no: false,
  partial: false,
  notRelevant: false,
  redFlag: false,
});

const createColumnsFromRows = (rows = [], preferredOrder = []) => {
  const seen = new Set();
  const columns = [];
  const addKey = (key) => {
    if (!key || key === "id" || seen.has(key)) {
      return;
    }
    seen.add(key);
    columns.push({
      key,
      label: columnLabels[key] || key,
      type: key === "evaluation" ? "evaluation" : "text",
    });
  };

  preferredOrder.forEach(addKey);
  rows.forEach((row) => {
    Object.keys(row || {}).forEach(addKey);
  });

  if (!columns.length) {
    columns.push({ key: "value", label: "ערך", type: "text" });
  }

  return columns;
};

const ColumnHeader = ({ column, onRemove, disableRemove }) => (
  <Stack
    direction="row"
    alignItems="center"
    justifyContent="space-between"
    spacing={1}
    sx={{ direction: "rtl" }}
  >
    <Typography fontWeight={600}>{column.label}</Typography>
    {!disableRemove && (
      <Tooltip title="הסר עמודה">
        <IconButton
          size="small"
          onClick={() => onRemove(column.key)}
          sx={compactIconButtonSx("neutral")}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    )}
  </Stack>
);

const EvaluationCell = ({ value, onChange }) => {
  const selectedKey = useMemo(() => {
    if (!value) {
      return "";
    }
    return evaluationOptions.find((option) => value[option.key])?.key || "";
  }, [value]);

  return (
    <FormControl component="fieldset" fullWidth>
      <RadioGroup
        row
        value={selectedKey}
        onChange={(event) => onChange(event.target.value)}
        sx={{
          direction: "rtl",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 0.5,
        }}
      >
        {evaluationOptions.map((option) => (
          <FormControlLabel
            key={option.key}
            value={option.key}
            control={<Radio size="small" />}
            label={option.label}
            labelPlacement="start"
            sx={{
              m: 0,
              minWidth: "48%",
              ".MuiFormControlLabel-label": { fontSize: "0.8rem" },
            }}
          />
        ))}
      </RadioGroup>
    </FormControl>
  );
};

const iconButtonBaseSx = {
  border: "1px solid",
  borderColor: "divider",
  borderRadius: 2,
  bgcolor: "background.paper",
  transition:
    "transform 0.16s ease, box-shadow 0.16s ease, background-color 0.16s ease, border-color 0.16s ease",
  "&:hover": {
    transform: "translateY(-1px)",
    boxShadow: "0 8px 18px rgba(15,23,42,0.08)",
  },
  "&.Mui-disabled": {
    opacity: 0.5,
    color: "action.disabled",
    borderColor: "divider",
    bgcolor: "action.hover",
    boxShadow: "none",
    transform: "none",
  },
};

const iconToneSx = {
  primary: {
    borderColor: "primary.light",
    color: "primary.main",
    bgcolor: "rgba(25,118,210,0.10)",
    "&:hover": { bgcolor: "rgba(25,118,210,0.18)" },
  },
  success: {
    borderColor: "success.light",
    color: "success.main",
    bgcolor: "rgba(46,125,50,0.10)",
    "&:hover": { bgcolor: "rgba(46,125,50,0.18)" },
  },
  danger: {
    borderColor: "error.light",
    color: "error.main",
    bgcolor: "rgba(211,47,47,0.08)",
    "&:hover": { bgcolor: "rgba(211,47,47,0.16)" },
  },
  neutral: {
    borderColor: "divider",
    color: "text.secondary",
    bgcolor: "background.paper",
    "&:hover": { bgcolor: "action.hover" },
  },
};

const iconButtonSx = (tone = "neutral") => ({
  ...iconButtonBaseSx,
  ...iconToneSx[tone],
});

const compactIconButtonSx = (tone = "neutral") => ({
  ...iconButtonSx(tone),
  width: 30,
  height: 30,
  borderRadius: 1.5,
});

const TemplatesPage = () => {
  const isMobile = useMediaQuery("(max-width:900px)");
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [bakara, setBakara] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [selectedSheetId, setSelectedSheetId] = useState("");
  const [activeTab, setActiveTab] = useState("bakara");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState({ bakara: false, schedule: false });
  const [dirty, setDirty] = useState({ bakara: false, schedule: false });
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const data = await getTemplates();
        setTemplates(data);
        if (!selectedTemplateId && data.length) {
          setSelectedTemplateId(data[0].templateId);
        }
      } catch (err) {
        setError("טעינת התבניות נכשלה.");
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
      setError("");
      setSuccessMessage("");
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
                    type:
                      col.type ||
                      (col.key === "evaluation" ? "evaluation" : "text"),
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
                : createColumnsFromRows(
                    data.schedule.events || [],
                    defaultScheduleOrder,
                  ),
            }
          : null;

        setBakara(normalizedBakara);
        setSchedule(normalizedSchedule);
        setSelectedSheetId(normalizedBakara?.sheets?.[0]?.sheetId || "");
        setDirty({ bakara: false, schedule: false });
      } catch (err) {
        setError("טעינת התבנית נכשלה.");
      } finally {
        setLoading(false);
      }
    };

    fetchTemplateDetails();
  }, [selectedTemplateId]);

  const markDirty = (key) => setDirty((prev) => ({ ...prev, [key]: true }));

  const handleAddBakaraSheet = () => {
    if (!bakara) {
      return;
    }
    const newSheetId = createId();
    const nextColumns = selectedBakaraSheet?.columns?.length
      ? selectedBakaraSheet.columns
      : createColumnsFromRows([], defaultBakaraOrder);
    const newSheet = {
      sheetId: newSheetId,
      sheetName: `גיליון ${bakara.sheets.length + 1}`,
      columns: nextColumns.map((col) => ({ ...col })),
      rows: [],
    };
    setBakara((prev) => ({ ...prev, sheets: [...prev.sheets, newSheet] }));
    setSelectedSheetId(newSheetId);
    markDirty("bakara");
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
    markDirty("bakara");
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
          if (key === "evaluation") {
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
    markDirty("bakara");
  };

  const handleDuplicateBakaraSheet = () => {
    if (!bakara || !selectedSheetId) {
      return;
    }
    const sourceSheet = bakara.sheets.find(
      (sheet) => sheet.sheetId === selectedSheetId,
    );
    if (!sourceSheet) {
      return;
    }
    const newSheetId = createId();
    const newSheet = {
      ...sourceSheet,
      sheetId: newSheetId,
      sheetName: `${sourceSheet.sheetName || "גיליון"} (העתק)`,
      rows: sourceSheet.rows.map((row) => ({
        ...row,
        id: createId(),
        evaluation: row.evaluation || emptyEvaluation(),
      })),
    };
    setBakara((prev) => ({
      ...prev,
      sheets: [...prev.sheets, newSheet],
    }));
    setSelectedSheetId(newSheetId);
    markDirty("bakara");
  };

  const handleDeleteBakaraSheet = () => {
    if (
      !bakara?.sheets?.length ||
      !selectedSheetId ||
      bakara.sheets.length <= 1
    ) {
      return;
    }
    const nextSheets = bakara.sheets.filter(
      (sheet) => sheet.sheetId !== selectedSheetId,
    );
    setBakara((prev) => ({ ...prev, sheets: nextSheets }));
    setSelectedSheetId(nextSheets[0]?.sheetId || "");
    markDirty("bakara");
  };

  const handleRenameBakaraSheet = (value) => {
    if (!bakara || !selectedSheetId) {
      return;
    }
    setBakara((prev) => ({
      ...prev,
      sheets: prev.sheets.map((sheet) =>
        sheet.sheetId === selectedSheetId
          ? { ...sheet, sheetName: value }
          : sheet,
      ),
    }));
    markDirty("bakara");
  };

  const handleReorderBakaraSheets = (sourceId, targetId) => {
    if (!bakara || !sourceId || !targetId || sourceId === targetId) {
      return;
    }
    const sheets = [...bakara.sheets];
    const sourceIndex = sheets.findIndex((s) => s.sheetId === sourceId);
    const targetIndex = sheets.findIndex((s) => s.sheetId === targetId);
    if (sourceIndex === -1 || targetIndex === -1) {
      return;
    }
    const [moved] = sheets.splice(sourceIndex, 1);
    sheets.splice(targetIndex, 0, moved);
    setBakara((prev) => ({ ...prev, sheets }));
    setSelectedSheetId(moved.sheetId);
    markDirty("bakara");
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
          row[col.key] = col.key === "evaluation" ? emptyEvaluation() : "";
        });
        return { ...sheet, rows: [...sheet.rows, row] };
      });
      return { ...prev, sheets };
    });
    markDirty("bakara");
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
    markDirty("bakara");
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
    markDirty("schedule");
  };

  const handleScheduleRowChange = (rowId, key, value) => {
    if (!schedule) {
      return;
    }
    setSchedule((prev) => ({
      ...prev,
      events: prev.events.map((event) =>
        event.id === rowId ? { ...event, [key]: value } : event,
      ),
    }));
    markDirty("schedule");
  };

  const handleAddScheduleRow = () => {
    if (!schedule) {
      return;
    }
    const row = { id: createId() };
    schedule.columns.forEach((col) => {
      row[col.key] = "";
    });
    setSchedule((prev) => ({ ...prev, events: [...prev.events, row] }));
    markDirty("schedule");
  };

  const handleDeleteScheduleRow = (rowId) => {
    if (!schedule) {
      return;
    }
    setSchedule((prev) => ({
      ...prev,
      events: prev.events.filter((row) => row.id !== rowId),
    }));
    markDirty("schedule");
  };

  const handleSaveBakara = async () => {
    if (!bakara || !selectedTemplateId) {
      return;
    }
    setSaving((prev) => ({ ...prev, bakara: true }));
    setError("");
    setSuccessMessage("");
    try {
      await saveBakaraTemplate(selectedTemplateId, {
        ...bakara,
        type: "Bakara",
      });
      setDirty((prev) => ({ ...prev, bakara: false }));
      setSuccessMessage("תבנית הבקרה נשמרה בהצלחה.");
    } catch (err) {
      setError("שמירת תבנית הבקרה נכשלה.");
    } finally {
      setSaving((prev) => ({ ...prev, bakara: false }));
    }
  };

  const handleSaveSchedule = async () => {
    if (!schedule || !selectedTemplateId) {
      return;
    }
    setSaving((prev) => ({ ...prev, schedule: true }));
    setError("");
    setSuccessMessage("");
    try {
      await saveScheduleTemplate(selectedTemplateId, {
        ...schedule,
        type: "Schedule",
      });
      setDirty((prev) => ({ ...prev, schedule: false }));
      setSuccessMessage("תבנית הסדרה נשמרה בהצלחה.");
    } catch (err) {
      setError("שמירת סדרת ג׳ נכשלה.");
    } finally {
      setSaving((prev) => ({ ...prev, schedule: false }));
    }
  };

  const selectedBakaraSheet = useMemo(() => {
    if (!bakara) {
      return null;
    }
    return (
      bakara.sheets.find((sheet) => sheet.sheetId === selectedSheetId) ||
      bakara.sheets[0] ||
      null
    );
  }, [bakara, selectedSheetId]);

  const scheduleToOptions = useMemo(() => {
    const sheetNames = (bakara?.sheets || [])
      .map((sheet) => sheet.sheetName)
      .filter(Boolean);
    return ["כולם", ...sheetNames.filter((name) => name !== "כולם")];
  }, [bakara]);

  const isActiveTabSaving =
    activeTab === "bakara" ? saving.bakara : saving.schedule;
  const isActiveTabDirty =
    activeTab === "bakara" ? dirty.bakara : dirty.schedule;
  const hasActiveTabData =
    activeTab === "bakara" ? Boolean(bakara) : Boolean(schedule);

  const handleSaveActiveTab = () => {
    if (activeTab === "bakara") {
      handleSaveBakara();
      return;
    }
    handleSaveSchedule();
  };

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
      <Paper
        sx={{
          p: { xs: 2, md: 3 },
          mt: 3,
          width: "100%",
          border: "1px solid",
          borderColor: "primary.main",
          boxShadow: "0 14px 40px rgba(0,0,0,0.06)",
          borderRadius: 3,
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", md: "center" }}
          sx={{ flexWrap: { xs: "wrap", md: "nowrap" } }}
        >
          <Tabs
            value={selectedBakaraSheet?.sheetId || false}
            onChange={(event, val) => setSelectedSheetId(val)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ flexGrow: 1, minWidth: 0, direction: "rtl" }}
          >
            {bakara.sheets.map((sheet) => (
              <Tab
                key={sheet.sheetId}
                value={sheet.sheetId}
                label={sheet.sheetName || "גיליון"}
                draggable
                onDragStart={(e) =>
                  e.dataTransfer.setData("text/plain", sheet.sheetId)
                }
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const sourceId = e.dataTransfer.getData("text/plain");
                  handleReorderBakaraSheets(sourceId, sheet.sheetId);
                }}
              />
            ))}
          </Tabs>
          <Stack
            direction="row"
            spacing={1}
            justifyContent="flex-end"
            sx={{
              flexShrink: 0,
              flexWrap: "nowrap",
              minWidth: "fit-content",
              alignSelf: { xs: "flex-end", md: "auto" },
            }}
          >
            <Tooltip title="הוסף גיליון חדש">
              <span>
                <IconButton
                  onClick={handleAddBakaraSheet}
                  sx={iconButtonSx("primary")}
                >
                  <LibraryAddIcon />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="שכפל גיליון">
              <span>
                <IconButton
                  onClick={handleDuplicateBakaraSheet}
                  disabled={!selectedBakaraSheet}
                  sx={iconButtonSx("success")}
                >
                  <ContentCopyIcon />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="מחק גיליון">
              <span>
                <IconButton
                  onClick={handleDeleteBakaraSheet}
                  disabled={
                    !selectedBakaraSheet || (bakara?.sheets?.length || 0) <= 1
                  }
                  sx={iconButtonSx("danger")}
                >
                  <DeleteIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Stack>

        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems={{ xs: "stretch", md: "center" }}
          sx={{ mt: 2 }}
        >
          <TextField
            label="שם הגיליון"
            value={selectedBakaraSheet?.sheetName || ""}
            onChange={(event) => handleRenameBakaraSheet(event.target.value)}
            fullWidth
          />
        </Stack>

        <TableContainer
          sx={{ mt: 2, overflowX: "auto", width: "100%", direction: "rtl" }}
        >
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
              <TableRow>
                <TableCell
                  colSpan={(selectedBakaraSheet?.columns?.length || 0) + 1}
                  align="center"
                  sx={{ py: 1.25, bgcolor: "action.hover" }}
                >
                  <Button size="small" onClick={handleAddBakaraRow}>
                    הוספת שורה חדשה
                  </Button>
                </TableCell>
              </TableRow>
              {(selectedBakaraSheet?.rows || []).map((row) => (
                <TableRow key={row.id}>
                  {selectedBakaraSheet.columns.map((column) => (
                    <TableCell key={column.key}>
                      {column.type === "evaluation" ? (
                        <EvaluationCell
                          value={row[column.key]}
                          onChange={(val) =>
                            handleBakaraRowChange(row.id, column.key, val)
                          }
                        />
                      ) : (
                        <TextField
                          fullWidth
                          variant="standard"
                          value={row[column.key] || ""}
                          onChange={(event) =>
                            handleBakaraRowChange(
                              row.id,
                              column.key,
                              event.target.value,
                            )
                          }
                        />
                      )}
                    </TableCell>
                  ))}
                  <TableCell align="center">
                    <Tooltip title="מחק שורה">
                      <IconButton
                        onClick={() => handleDeleteBakaraRow(row.id)}
                        sx={compactIconButtonSx("danger")}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
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
      <Paper
        sx={{
          p: { xs: 2, md: 3 },
          mt: 3,
          width: "100%",
          border: "1px solid",
          borderColor: "secondary.main",
          boxShadow: "0 14px 40px rgba(0,0,0,0.06)",
          borderRadius: 3,
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", md: "center" }}
        >
          <Typography variant="h5" fontWeight={700}>
            סדרה ג׳
          </Typography>
          <Typography variant="body2" color="text.secondary">
            עריכת אירועי הסדרה לפי המבנה הקיים
          </Typography>
        </Stack>

        <TableContainer
          sx={{ mt: 2, overflowX: "auto", width: "100%", direction: "rtl" }}
        >
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
              <TableRow>
                <TableCell
                  colSpan={schedule.columns.length + 1}
                  align="center"
                  sx={{ py: 1.25, bgcolor: "action.hover" }}
                >
                  <Button size="small" onClick={handleAddScheduleRow}>
                    הוספת שורה חדשה
                  </Button>
                </TableCell>
              </TableRow>
              {(schedule.events || []).map((row) => (
                <TableRow key={row.id}>
                  {schedule.columns.map((column) => (
                    <TableCell key={column.key}>
                      {column.key === "to" ? (
                        <Box>
                          <TextField
                            select
                            fullWidth
                            variant="standard"
                            label="יעד"
                            value={row[column.key] || ""}
                            onChange={(event) =>
                              handleScheduleRowChange(
                                row.id,
                                column.key,
                                event.target.value,
                              )
                            }
                            SelectProps={{
                              MenuProps: {
                                PaperProps: {
                                  sx: { direction: "rtl", textAlign: "right" },
                                },
                              },
                            }}
                          >
                            {scheduleToOptions.map((option) => (
                              <MenuItem key={option} value={option}>
                                {option}
                              </MenuItem>
                            ))}
                          </TextField>
                          {row[column.key] &&
                            !scheduleToOptions.includes(row[column.key]) && (
                              <Typography
                                variant="caption"
                                color="error"
                                sx={{ mt: 0.5, display: "block" }}
                              >
                                ערך זה אינו תואם לגיליונות הבקרה. בחר יעד תקף.
                              </Typography>
                            )}
                        </Box>
                      ) : (
                        <TextField
                          fullWidth
                          variant="standard"
                          type={column.key === "time" ? "time" : "text"}
                          inputProps={
                            column.key === "time" ? { step: 60 } : undefined
                          }
                          InputLabelProps={
                            column.key === "time" ? { shrink: true } : undefined
                          }
                          value={row[column.key] || ""}
                          onChange={(event) =>
                            handleScheduleRowChange(
                              row.id,
                              column.key,
                              event.target.value,
                            )
                          }
                          multiline={
                            column.key === "message" || column.key === "notes"
                          }
                          minRows={
                            column.key === "message" || column.key === "notes"
                              ? 2
                              : 1
                          }
                        />
                      )}
                    </TableCell>
                  ))}
                  <TableCell align="center">
                    <Tooltip title="מחק שורה">
                      <IconButton
                        onClick={() => handleDeleteScheduleRow(row.id)}
                        sx={compactIconButtonSx("danger")}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    );
  };

  return (
    <Box
      className="page-shell"
      dir="rtl"
      sx={{ maxWidth: "none", width: "100%", px: { xs: 2, md: 3 } }}
    >
      <Typography variant="h4" fontWeight={700}>
        תבניות
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 1 }}>
        בחר תבנית, ערוך את הבקרה והסדרה ושמור כדי לדרוס את הקובץ הקיים.
      </Typography>

      <Box
        sx={{
          mt: 2,
          display: "flex",
          justifyContent: "flex-start",
        }}
      >
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{
            p: 0.75,
            borderRadius: 2.5,
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
          }}
        >
          <Tooltip title="שמור שינויים">
            <span>
              <IconButton
                onClick={handleSaveActiveTab}
                disabled={
                  !hasActiveTabData || !isActiveTabDirty || isActiveTabSaving
                }
                sx={iconButtonSx("primary")}
              >
                {isActiveTabSaving ? (
                  <CircularProgress size={18} />
                ) : (
                  <SaveIcon />
                )}
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </Box>

      <Paper sx={{ p: { xs: 1.5, md: 2 }, mt: 3 }}>
        <FormControl fullWidth>
          <InputLabel id="template-select-label">בחר תבנית</InputLabel>
          <Select
            labelId="template-select-label"
            label="בחר תבנית"
            value={selectedTemplateId}
            onChange={(event) => setSelectedTemplateId(event.target.value)}
            sx={{ textAlign: "right" }}
            MenuProps={{
              PaperProps: {
                sx: { direction: "rtl", textAlign: "right" },
              },
            }}
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
        <Box sx={{ mt: 4, display: "flex", justifyContent: "center" }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box
          sx={{ display: "flex", flexDirection: "column", minHeight: "70vh" }}
        >
          <Paper
            sx={{
              mt: 3,
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Tabs
              value={activeTab}
              onChange={(event, val) => setActiveTab(val)}
              centered={!isMobile}
              variant={isMobile ? "fullWidth" : "standard"}
              indicatorColor="primary"
              textColor="primary"
              TabIndicatorProps={{ sx: { height: 4, borderRadius: 2 } }}
              sx={{ direction: "rtl" }}
            >
              <Tab
                value="bakara"
                label="בקרה"
                sx={{
                  fontWeight: 800,
                  fontSize: isMobile ? 14 : 16,
                  letterSpacing: 0.2,
                }}
              />
              <Tab
                value="schedule"
                label="סדרה ג׳"
                sx={{
                  fontWeight: 800,
                  fontSize: isMobile ? 14 : 16,
                  letterSpacing: 0.2,
                }}
              />
            </Tabs>
          </Paper>
          <Box sx={{ flex: 1 }}>
            {activeTab === "bakara" ? renderBakaraTab() : renderScheduleTab()}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default TemplatesPage;
