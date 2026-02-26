import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import LibraryAddIcon from "@mui/icons-material/LibraryAdd";
import LinkIcon from "@mui/icons-material/Link";
import SaveIcon from "@mui/icons-material/Save";
import {
  Alert,
  Box,
  Button,
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
} from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  addRow,
  addSheet,
  deleteRow,
  deleteSheet,
  getDrill,
  saveDrillSchedule,
  updateDrill,
  updateRow,
  updateSheet,
} from "../../api/drillsApi";
import RtlIconLabel from "../../components/RtlIconLabel";
import ApiClient from "../../services/ApiClient";
import {
  getHospitalsMap,
  resolveHospitalName,
  saveHospitalsMap,
} from "../../utils/hospitalsCache";

const evaluationOptions = [
  { key: "yes", label: "כן" },
  { key: "no", label: "לא" },
  { key: "partial", label: "חלקי" },
  { key: "notRelevant", label: "לא רלוונטי" },
  // { key: "redFlag", label: "קו אדום" },
];

const defaultScheduleOrder = [
  "serial",
  "time",
  "from",
  "to",
  "message",
  "notes",
];
const scheduleColumnLabels = {
  serial: "מספר",
  time: "שעה",
  from: "מאת",
  to: "אל",
  message: "הודעה",
  notes: "הערות",
};

const createId = () =>
  crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

const makeColumnKey = (label, existingKeys = []) => {
  const base =
    (label || "")
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^\w\u0590-\u05FF]/g, "")
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
    if (!key || key === "id" || seen.has(key)) {
      return;
    }
    seen.add(key);
    columns.push({
      key,
      label: scheduleColumnLabels[key] || key,
      type: "text",
    });
  };

  defaultScheduleOrder.forEach(addKey);
  events.forEach((event) => {
    Object.keys(event || {}).forEach(addKey);
  });

  if (!columns.length) {
    columns.push({ key: "message", label: "הודעה", type: "text" });
  }

  return columns;
};

const normalizeScheduleForUi = (schedule) => {
  if (!schedule) {
    return null;
  }
  const columns = schedule.columns?.length
    ? schedule.columns
    : createColumnsFromEvents(schedule.events || []);
  return {
    ...schedule,
    columns: columns.map((col) => ({
      ...col,
      label: col.label || scheduleColumnLabels[col.key] || col.key,
      type: col.type || (col.key === "time" ? "time" : "text"),
    })),
    events: (schedule.events || []).map((event) => ({
      ...event,
      id: event.id || createId(),
    })),
  };
};

const toDateTimeLocalValue = (value) => {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return typeof value === "string" ? value.slice(0, 16) : "";
  }
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
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
  info: {
    borderColor: "info.light",
    color: "info.main",
    bgcolor: "rgba(2,136,209,0.10)",
    "&:hover": { bgcolor: "rgba(2,136,209,0.18)" },
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
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        alignItems="center"
        justifyContent="space-between"
      >
        <Typography color="text.secondary">
          עדיין אין גיליונות לתרגיל זה.
        </Typography>
        <Tooltip title="הוסף גיליון ראשון">
          <span>
            <IconButton
              onClick={onAddSheet}
              disabled={disableSheetActions}
              sx={iconButtonSx("primary")}
            >
              <LibraryAddIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        flexWrap: { xs: "wrap", md: "nowrap" },
      }}
    >
      <Tabs
        value={selectedSheetId || sheets[0].sheetId}
        onChange={(event, value) => onSelectSheet(value)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ flexGrow: 1, minWidth: 0, direction: "rtl" }}
      >
        {sheets.map((sheet) => (
          <Tab
            key={sheet.sheetId}
            value={sheet.sheetId}
            label={sheet.sheetName || "ללא שם"}
          />
        ))}
      </Tabs>
      <Stack
        direction="row"
        spacing={1}
        sx={{ flexShrink: 0, minWidth: { xs: "100%", md: "auto" } }}
      >
        <Tooltip title="הוסף גיליון">
          <span>
            <IconButton
              onClick={onAddSheet}
              disabled={disableSheetActions}
              sx={iconButtonSx("primary")}
            >
              <LibraryAddIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="שכפל גיליון">
          <span>
            <IconButton
              onClick={onDuplicateSheet}
              disabled={disableSheetActions || sheets.length === 0}
              sx={iconButtonSx("success")}
            >
              <ContentCopyIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="מחק גיליון">
          <span>
            <IconButton
              onClick={onDeleteSheet}
              disabled={disableSheetActions || sheets.length <= 1}
              sx={iconButtonSx("danger")}
            >
              <DeleteIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
    </Box>
  );
};

const EvaluationRadioGroup = ({ evaluation, onChange }) => {
  const selectedKey = useMemo(() => {
    if (!evaluation) {
      return "";
    }
    return (
      evaluationOptions.find((option) => evaluation[option.key])?.key || ""
    );
  }, [evaluation]);

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
        direction={{ xs: "column", md: "row" }}
        spacing={3}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", md: "center" }}
      >
        <TextField
          label="שם הגיליון"
          value={sheet.sheetName}
          onChange={(event) => onSheetRename(event.target.value)}
          fullWidth
        />
      </Stack>

      <TableContainer
        sx={{ mt: 3, overflowX: "auto", width: "100%", direction: "rtl" }}
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell align="right">מרכיב</TableCell>
              <TableCell align="right">קטגוריה</TableCell>
              <TableCell align="right">מדד</TableCell>
              <TableCell align="center" width="30%">
                הערכה
              </TableCell>
              <TableCell align="right" width="25%">
                הערות
              </TableCell>
              <TableCell align="center">פעולות</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell
                colSpan={6}
                align="center"
                sx={{ py: 1.25, bgcolor: "action.hover" }}
              >
                <Button size="small" onClick={onAddRow}>
                  הוספת שורה חדשה
                </Button>
              </TableCell>
            </TableRow>
            {sheet.rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography color="text.secondary" align="center">
                    אין שורות בגיליון זה. לחץ על &quot;הוסף שורה&quot; כדי
                    להתחיל.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              sheet.rows.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>
                    <TextField
                      value={row.component || ""}
                      onChange={(event) =>
                        onRowChange(row.id, { component: event.target.value })
                      }
                      fullWidth
                      variant="standard"
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      value={row.category || ""}
                      onChange={(event) =>
                        onRowChange(row.id, { category: event.target.value })
                      }
                      fullWidth
                      variant="standard"
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      value={row.metric || ""}
                      onChange={(event) =>
                        onRowChange(row.id, { metric: event.target.value })
                      }
                      fullWidth
                      variant="standard"
                    />
                  </TableCell>
                  <TableCell>
                    <EvaluationRadioGroup
                      evaluation={row.evaluation}
                      onChange={(value) =>
                        onRowChange(row.id, { evaluation: value })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      value={row.comment || ""}
                      onChange={(event) =>
                        onRowChange(row.id, { comment: event.target.value })
                      }
                      fullWidth
                      multiline
                      minRows={2}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Stack
                      direction="row"
                      spacing={1}
                      justifyContent="center"
                      alignItems="center"
                    >
                      {rowSavingState[row.id] && <CircularProgress size={18} />}
                      <Tooltip title="מחק שורה">
                        <IconButton
                          onClick={() => onDeleteRow(row.id)}
                          sx={compactIconButtonSx("danger")}
                        >
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
  const isMobile = useMediaQuery("(max-width:900px)");
  const [drill, setDrill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [activeTab, setActiveTab] = useState("bakara");
  const [selectedSheetId, setSelectedSheetId] = useState("");
  const [rowSavingState, setRowSavingState] = useState({});
  const [sheetSavingState, setSheetSavingState] = useState({});
  const [isMutating, setIsMutating] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState("");
  const [scheduleDraft, setScheduleDraft] = useState(null);
  const [bakaraDirty, setBakaraDirty] = useState(false);
  const [scheduleDirty, setScheduleDirty] = useState(false);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [saveAllLoading, setSaveAllLoading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [isMetaDialogOpen, setIsMetaDialogOpen] = useState(false);
  const [metaForm, setMetaForm] = useState({
    name: "",
    hospitalId: "",
    date: "",
  });
  const [metaSaving, setMetaSaving] = useState(false);
  const [hospitals, setHospitals] = useState([]);
  const [cachedHospitalsById, setCachedHospitalsById] = useState(() =>
    getHospitalsMap(),
  );
  const apiClientRef = useRef(new ApiClient());
  const refreshTimerRef = useRef(null);

  const isTodayDate = (dateStr) => {
    if (!dateStr) return false;
    const today = new Date().toISOString().slice(0, 10);
    return dateStr.slice(0, 10) === today;
  };

  const fetchDrill = useCallback(
    async (silent = false) => {
      if (!silent) {
        setLoading(true);
      }
      try {
        const data = await getDrill(drillId);
        setDrill(data);
        setSelectedSheetId(data.sheets?.[0]?.sheetId || "");
        setScheduleDraft(normalizeScheduleForUi(data.schedule));
        setBakaraDirty(false);
        setScheduleDirty(false);
        setMetaForm({
          name: data.name || "",
          hospitalId: data.hospitalId || data.hospital || "",
          date: toDateTimeLocalValue(data.date),
        });
        setError("");
      } catch (err) {
        if (!silent) {
          setError("לא ניתן לטעון את התרגיל");
        }
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [drillId],
  );

  useEffect(() => {
    fetchDrill();
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [fetchDrill]);

  useEffect(() => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
    }
    if (isTodayDate(drill?.date) && !bakaraDirty && !scheduleDirty) {
      refreshTimerRef.current = setInterval(() => fetchDrill(true), 15000);
    }
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [drill?.date, fetchDrill, bakaraDirty, scheduleDirty]);

  useEffect(() => {
    const fetchHospitals = async () => {
      try {
        const hospitalsResponse = await apiClientRef.current.getHospitals();
        setHospitals(hospitalsResponse);
        setCachedHospitalsById(saveHospitalsMap(hospitalsResponse));
      } catch (err) {
        // fallback to empty list
      }
    };
    fetchHospitals();
  }, []);

  const selectedSheet = useMemo(() => {
    if (!drill?.sheets) {
      return null;
    }
    return (
      drill.sheets.find((sheet) => sheet.sheetId === selectedSheetId) ||
      drill.sheets[0] ||
      null
    );
  }, [drill, selectedSheetId]);

  const scheduleToOptions = useMemo(() => {
    const sheetNames = (drill?.sheets || [])
      .map((sheet) => sheet.sheetName)
      .filter(Boolean);
    return ["כולם", ...sheetNames.filter((name) => name !== "כולם")];
  }, [drill]);

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
          rows: sheet.rows.map((row) =>
            row.id === rowId ? { ...row, ...changes } : row,
          ),
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
      const sheets = prev.sheets.map((sheet) =>
        sheet.sheetId === sheetId ? newSheet : sheet,
      );
      return { ...prev, sheets };
    });
  };

  const handleRowChange = (rowId, changes) => {
    if (!selectedSheet) {
      return;
    }

    if (Object.prototype.hasOwnProperty.call(changes, "evaluation")) {
      const nextEvaluation = {
        yes: false,
        no: false,
        partial: false,
        notRelevant: false,
        redFlag: false,
      };
      if (
        changes.evaluation &&
        nextEvaluation.hasOwnProperty(changes.evaluation)
      ) {
        nextEvaluation[changes.evaluation] = true;
      }
      updateRowInState(selectedSheet.sheetId, rowId, {
        evaluation: nextEvaluation,
      });
      setBakaraDirty(true);
    } else {
      updateRowInState(selectedSheet.sheetId, rowId, changes);
      setBakaraDirty(true);
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
          sheet.sheetId === selectedSheet.sheetId
            ? { ...sheet, rows: [...sheet.rows, newRow] }
            : sheet,
        );
        return { ...prev, sheets };
      });
      setSaveError("");
      setLastSavedAt(new Date().toISOString());
    } catch (err) {
      setSaveError(err.message || "הוספת השורה נכשלה");
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
            : sheet,
        );
        return { ...prev, sheets };
      });
      setSaveError("");
      setLastSavedAt(new Date().toISOString());
    } catch (err) {
      setSaveError(err.message || "מחיקת השורה נכשלה");
    } finally {
      setIsMutating(false);
    }
  };

  const handleRenameSheet = (value) => {
    if (!selectedSheet) {
      return;
    }
    replaceSheetInState(selectedSheet.sheetId, {
      ...selectedSheet,
      sheetName: value,
    });
    setBakaraDirty(true);
  };

  const handleAddSheet = async () => {
    if (!drill) {
      return;
    }
    setIsMutating(true);
    try {
      const newSheet = await addSheet(drillId, {
        sheetName: `גיליון ${drill.sheets.length + 1}`,
      });
      setDrill((prev) => ({ ...prev, sheets: [...prev.sheets, newSheet] }));
      setSelectedSheetId(newSheet.sheetId);
      setSaveError("");
      setLastSavedAt(new Date().toISOString());
    } catch (err) {
      setSaveError(err.message || "הוספת הגיליון נכשלה");
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
      setSaveError("");
      setLastSavedAt(new Date().toISOString());
    } catch (err) {
      setSaveError(err.message || "שכפול הגיליון נכשל");
    } finally {
      setIsMutating(false);
    }
  };

  const handleDeleteSheet = async () => {
    if (!drill || !selectedSheet || drill.sheets.length <= 1) {
      return;
    }
    setIsMutating(true);
    const remainingSheets = drill.sheets.filter(
      (sheet) => sheet.sheetId !== selectedSheet.sheetId,
    );
    try {
      await deleteSheet(drillId, selectedSheet.sheetId);
      setDrill((prev) => {
        if (!prev) {
          return prev;
        }
        const nextSheets = prev.sheets.filter(
          (sheet) => sheet.sheetId !== selectedSheet.sheetId,
        );
        return { ...prev, sheets: nextSheets };
      });
      setSelectedSheetId(remainingSheets[0]?.sheetId || "");
      setSaveError("");
      setLastSavedAt(new Date().toISOString());
    } catch (err) {
      setSaveError(err.message || "מחיקת הגיליון נכשלה");
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
      events: prev.events.map((event) =>
        event.id === rowId ? { ...event, [key]: value } : event,
      ),
    }));
    setScheduleDirty(true);
  };

  const handleAddScheduleRow = () => {
    if (!scheduleDraft) {
      return;
    }
    const row = { id: createId() };
    scheduleDraft.columns.forEach((col) => {
      row[col.key] = "";
    });
    setScheduleDraft((prev) => ({ ...prev, events: [...prev.events, row] }));
    setScheduleDirty(true);
  };

  const handleDeleteScheduleRow = (rowId) => {
    if (!scheduleDraft) {
      return;
    }
    setScheduleDraft((prev) => ({
      ...prev,
      events: prev.events.filter((row) => row.id !== rowId),
    }));
    setScheduleDirty(true);
  };

  const handleAddScheduleColumn = () => {
    if (!scheduleDraft) {
      return;
    }
    const label = window.prompt("שם העמודה החדשה");
    if (!label) {
      return;
    }
    setScheduleDraft((prev) => {
      const key = makeColumnKey(
        label,
        prev.columns.map((c) => c.key),
      );
      const column = { key, label, type: "text" };
      return {
        ...prev,
        columns: [...prev.columns, column],
        events: prev.events.map((event) => ({ ...event, [key]: "" })),
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

  const persistBakaraChanges = async () => {
    if (!bakaraDirty || !drill?.sheets?.length) {
      return;
    }

    const emptyEval = {
      yes: false,
      no: false,
      partial: false,
      notRelevant: false,
      redFlag: false,
    };

    for (const sheet of drill.sheets) {
      await updateSheet(drillId, sheet.sheetId, {
        sheetName: sheet.sheetName || "",
      });
      for (const row of sheet.rows || []) {
        await updateRow(drillId, sheet.sheetId, row.id, {
          component: row.component || "",
          category: row.category || "",
          metric: row.metric || "",
          comment: row.comment || "",
          evaluation: row.evaluation || emptyEval,
        });
      }
    }
    setBakaraDirty(false);
  };

  const persistScheduleChanges = async () => {
    if (!scheduleDirty || !scheduleDraft) {
      return;
    }
    setScheduleSaving(true);
    const saved = await saveDrillSchedule(drillId, scheduleDraft);
    const normalized = normalizeScheduleForUi(saved);
    setScheduleDraft(normalized);
    setDrill((prev) => (prev ? { ...prev, schedule: normalized } : prev));
    setScheduleDirty(false);
    setScheduleSaving(false);
  };

  const handleSaveAll = async () => {
    if (!bakaraDirty && !scheduleDirty) {
      return;
    }
    setSaveAllLoading(true);
    setSaveError("");
    try {
      await persistBakaraChanges();
      await persistScheduleChanges();
      setLastSavedAt(new Date().toISOString());
    } catch (err) {
      setSaveError(err.message || "שמירת השינויים נכשלה");
    } finally {
      setScheduleSaving(false);
      setSaveAllLoading(false);
    }
  };

  const handleMetaChange = (event) => {
    const { name, value } = event.target;
    setMetaForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveMeta = async () => {
    setMetaSaving(true);
    setSaveError("");
    try {
      const updated = await updateDrill(drillId, metaForm);
      setDrill((prev) => (prev ? { ...prev, ...updated } : updated));
      setIsMetaDialogOpen(false);
      setLastSavedAt(new Date().toISOString());
    } catch (err) {
      setSaveError(err.message || "שמירת פרטי התרגיל נכשלה");
    } finally {
      setMetaSaving(false);
    }
  };

  const isSaving = useMemo(() => {
    return (
      Object.keys(rowSavingState).length > 0 ||
      Object.keys(sheetSavingState).length > 0 ||
      isMutating ||
      scheduleSaving ||
      saveAllLoading
    );
  }, [
    rowSavingState,
    sheetSavingState,
    isMutating,
    scheduleSaving,
    saveAllLoading,
  ]);

  const renderBakaraSection = () => (
    <>
      <Paper
        sx={{
          p: 3,
          width: "100%",
          mt: 3,
          border: "1px solid",
          borderColor: "primary.main",
          boxShadow: "0 14px 40px rgba(0,0,0,0.06)",
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
          p: { xs: 2, md: 3 },
          mt: 3,
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
          <Box>
            <Typography variant="h5" fontWeight={700}>
              סדרה ג׳
            </Typography>
            <Typography color="text.secondary">
              עדכון לוח האירועים לתרגיל
            </Typography>
          </Box>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            flexWrap="wrap"
            justifyContent="flex-end"
          >
            <Tooltip title="הוסף עמודה">
              <span>
                <IconButton
                  onClick={handleAddScheduleColumn}
                  sx={iconButtonSx("primary")}
                >
                  <AddIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Stack>

        <TableContainer
          sx={{ mt: 2, overflowX: "auto", width: "100%", direction: "rtl" }}
        >
          <Table size="small">
            <TableHead>
              <TableRow>
                {scheduleDraft.columns.map((column) => (
                  <TableCell key={column.key} align="right">
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      spacing={1}
                    >
                      <Typography fontWeight={600}>{column.label}</Typography>
                      <Tooltip title="הסר עמודה">
                        <span>
                          <IconButton
                            size="small"
                            onClick={() =>
                              handleRemoveScheduleColumn(column.key)
                            }
                            disabled={scheduleDraft.columns.length <= 1}
                            sx={compactIconButtonSx("neutral")}
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
              <TableRow>
                <TableCell
                  colSpan={scheduleDraft.columns.length + 1}
                  align="center"
                  sx={{ py: 1.25, bgcolor: "action.hover" }}
                >
                  <Button size="small" onClick={handleAddScheduleRow}>
                    הוספת שורה חדשה
                  </Button>
                </TableCell>
              </TableRow>
              {(scheduleDraft.events || []).map((row) => (
                <TableRow key={row.id}>
                  {scheduleDraft.columns.map((column) => (
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
                                ערך זה אינו קיים בגיליונות. בחר יעד תקף.
                              </Typography>
                            )}
                        </Box>
                      ) : (
                        <TextField
                          fullWidth
                          variant="standard"
                          type={column.key === "time" ? "time" : "text"}
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

  if (loading) {
    return (
      <Box className="page-shell" dir="rtl">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box className="page-shell" dir="rtl">
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="outlined" onClick={() => navigate("/drills")}>
          <RtlIconLabel icon={<ArrowBackIcon />}>
            חזרה לרשימת התרגילים
          </RtlIconLabel>
        </Button>
      </Box>
    );
  }

  return (
    <Box
      className="page-shell"
      sx={{
        pb: 8,
        maxWidth: "none",
        width: "100%",
        px: { xs: 2, md: 3 },
        direction: "rtl",
        textAlign: "right",
      }}
      dir="rtl"
    >
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        spacing={2}
        alignItems={{ xs: "flex-start", md: "center" }}
      >
        <Box>
          <Typography variant="h4" fontWeight={700}>
            {drill?.name || "תרגיל"}
          </Typography>
          <Typography color="text.secondary">
            {`בית חולים: ${resolveHospitalName(drill?.hospitalId || drill?.hospital, cachedHospitalsById) || "לא צוין"}`}
          </Typography>
          <Typography color="text.secondary">{`תאריך: ${drill?.date || "לא צוין"}`}</Typography>
        </Box>
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          justifyContent="flex-end"
          sx={{
            p: 0.75,
            borderRadius: 2.5,
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
            flexWrap: "nowrap",
          }}
        >
          <Tooltip title="שמור שינויים">
            <span>
              <IconButton
                onClick={handleSaveAll}
                disabled={saveAllLoading || (!bakaraDirty && !scheduleDirty)}
                sx={iconButtonSx("primary")}
              >
                {saveAllLoading ? <CircularProgress size={18} /> : <SaveIcon />}
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={shareCopied ? "הועתק" : "העתק קישור לבוחנים"}>
            <IconButton
              onClick={() => {
                navigator.clipboard
                  .writeText(`${window.location.origin}/public/${drillId}`)
                  .then(() => {
                    setShareCopied(true);
                    setTimeout(() => setShareCopied(false), 1800);
                  })
                  .catch(() => setSaveError("לא ניתן להעתיק את הקישור"));
              }}
              sx={iconButtonSx(shareCopied ? "success" : "primary")}
            >
              {shareCopied ? <CheckCircleIcon /> : <LinkIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title="עריכת פרטי תרגיל">
            <IconButton
              onClick={() => setIsMetaDialogOpen(true)}
              sx={iconButtonSx("info")}
            >
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="חזרה לרשימה">
            <IconButton
              onClick={() => navigate("/drills")}
              sx={iconButtonSx("neutral")}
            >
              <ArrowBackIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>
      {!isSaving && !scheduleDirty && lastSavedAt && (
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{ mt: 1, color: "success.main" }}
        >
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

      {activeTab === "bakara" ? renderBakaraSection() : renderScheduleSection()}

      <Dialog
        open={isMetaDialogOpen}
        onClose={() => setIsMetaDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>עריכת פרטי התרגיל</DialogTitle>
        <DialogContent sx={{ pt: 2, direction: "rtl" }}>
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
                sx={{ textAlign: "right" }}
                MenuProps={{
                  PaperProps: {
                    sx: { direction: "rtl", textAlign: "right" },
                  },
                }}
              >
                {hospitals.map((hospital) => (
                  <MenuItem key={hospital.id} value={hospital.id}>
                    {hospital.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              type="datetime-local"
              label="מועד התחלת תרגיל"
              name="date"
              value={metaForm.date}
              onChange={handleMetaChange}
              InputLabelProps={{ shrink: true }}
              inputProps={{ step: 60 }}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ direction: "rtl" }}>
          <Button onClick={() => setIsMetaDialogOpen(false)}>בטל</Button>
          <Button
            variant="contained"
            onClick={handleSaveMeta}
            disabled={metaSaving}
          >
            {metaSaving ? (
              "שומר..."
            ) : (
              <RtlIconLabel icon={<SaveIcon />}>שמור</RtlIconLabel>
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DrillEditorPage;
