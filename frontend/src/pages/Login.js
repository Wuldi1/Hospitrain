import {
  LocalHospital,
  MarkEmailReadOutlined,
  ShieldOutlined,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ApiClient from "../services/ApiClient";

const apiClient = new ApiClient();

const Login = () => {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("000000");
  const [step, setStep] = useState(1);
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();

  const handleRequestCode = async (e) => {
    e.preventDefault();
    try {
      await apiClient.requestCode(email);
      setStep(2);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage("שליחת הקוד נכשלה");
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    try {
      const data = await apiClient.verifyCode(email, code);
      localStorage.setItem("authToken", data.token);
      navigate("/home");
    } catch (error) {
      setErrorMessage("קוד שגוי");
    }
  };

  return (
    <Box
      dir="rtl"
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        background:
          "linear-gradient(135deg, rgba(21,101,192,0.94), rgba(66,165,245,0.88))",
      }}
    >
      <Container maxWidth="md">
        <Paper
          elevation={0}
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1.1fr 1fr" },
            overflow: "hidden",
            borderRadius: 4,
          }}
        >
          <Box
            sx={{
              p: { xs: 3, md: 4 },
              color: "#fff",
              textAlign: "right",
              background:
                "radial-gradient(circle at 0% 0%, rgba(255,255,255,0.24), transparent 45%), linear-gradient(160deg, #1565C0 0%, #0D47A1 100%)",
            }}
          >
            <Stack spacing={2.5}>
              <Box
                sx={{
                  display: "inline-flex",
                  p: 1.5,
                  borderRadius: "50%",
                  bgcolor: "rgba(255,255,255,0.16)",
                }}
              >
                <LocalHospital sx={{ fontSize: 36 }} />
              </Box>
              <Typography variant="h4">Hospitrain</Typography>
              <Typography variant="body1" sx={{ opacity: 0.92 }}>
                מרכז שליטה לתרגילי חירום רפואיים. ניטור בזמן אמת, משימות, ודיווח
                אחיד לכלל בתי החולים.
              </Typography>
              <Stack direction="row" spacing={1.2} flexWrap="wrap" useFlexGap>
                <Chip
                  icon={<ShieldOutlined />}
                  label="גישה מאובטחת"
                  sx={{
                    bgcolor: "rgba(255,255,255,0.2)",
                    color: "white",
                    "& .MuiChip-icon": {
                      marginInlineStart: 8,
                      marginInlineEnd: -4,
                    },
                  }}
                />
                <Chip
                  icon={<MarkEmailReadOutlined />}
                  label="אימות קוד במייל"
                  sx={{
                    bgcolor: "rgba(255,255,255,0.2)",
                    color: "white",
                    "& .MuiChip-icon": {
                      marginInlineStart: 8,
                      marginInlineEnd: -4,
                    },
                  }}
                />
              </Stack>
            </Stack>
          </Box>

          <Box sx={{ p: { xs: 3, md: 4 }, textAlign: "right" }}>
            <Typography variant="h5" sx={{ mb: 2.5 }}>
              {step === 1 ? "כניסה למערכת" : "אימות קוד"}
            </Typography>

            {errorMessage && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {errorMessage}
              </Alert>
            )}

            {step === 1 && (
              <Box component="form" onSubmit={handleRequestCode}>
                <TextField
                  fullWidth
                  label="כתובת אימייל"
                  variant="outlined"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  margin="normal"
                  required
                  dir="rtl"
                />
                <Button
                  fullWidth
                  variant="contained"
                  type="submit"
                  size="large"
                  sx={{ mt: 2 }}
                >
                  שלח קוד אימות
                </Button>
              </Box>
            )}

            {step === 2 && (
              <Box component="form" onSubmit={handleVerifyCode}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 1 }}
                >
                  קוד אימות נשלח לכתובת {email}
                </Typography>
                <TextField
                  fullWidth
                  label="קוד אימות"
                  variant="outlined"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  margin="normal"
                  required
                  dir="rtl"
                  autoFocus
                />
                <Button
                  fullWidth
                  variant="contained"
                  type="submit"
                  size="large"
                  sx={{ mt: 2 }}
                >
                  כניסה
                </Button>
                <Button
                  fullWidth
                  color="inherit"
                  onClick={() => setStep(1)}
                  sx={{ mt: 1 }}
                >
                  חזרה
                </Button>
              </Box>
            )}
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default Login;
