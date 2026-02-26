import {
  MarkEmailReadOutlined,
  ShieldOutlined,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ApiClient from "../../services/ApiClient";
import RtlIconLabel from "../../components/RtlIconLabel";

const apiClient = new ApiClient();

const Login = () => {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("000000");
  const [step, setStep] = useState(1);
  const [errorMessage, setErrorMessage] = useState("");
  const [isRequestingCode, setIsRequestingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const navigate = useNavigate();

  const handleRequestCode = async (e) => {
    e.preventDefault();
    if (isRequestingCode) return;
    setIsRequestingCode(true);
    setErrorMessage("");
    try {
      await apiClient.requestCode(email);
      setStep(2);
    } catch (error) {
      setErrorMessage("שליחת הקוד נכשלה");
    } finally {
      setIsRequestingCode(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    if (isVerifyingCode) return;
    setIsVerifyingCode(true);
    setErrorMessage("");
    try {
      const data = await apiClient.verifyCode(email, code);
      localStorage.setItem("authToken", data.token);
      navigate("/home");
    } catch (error) {
      setErrorMessage("קוד שגוי");
    } finally {
      setIsVerifyingCode(false);
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
                <Box
                  component="img"
                  src={`${process.env.PUBLIC_URL}/favicon.ico`}
                  alt="Hospitrain"
                  sx={{ width: 36, height: 36, borderRadius: "8px", objectFit: "cover" }}
                />
              </Box>
              <Typography variant="h4">Hospitrain</Typography>
              <Typography variant="body1" sx={{ opacity: 0.92 }}>
                מרכז שליטה לתרגילי חירום רפואיים. ניטור בזמן אמת, משימות, ודיווח
                אחיד לכלל בתי החולים.
              </Typography>
              <Stack direction="row" spacing={1.2} flexWrap="wrap" useFlexGap>
                <Chip
                  label={<RtlIconLabel icon={<ShieldOutlined />} iconSize={15}>גישה מאובטחת</RtlIconLabel>}
                  sx={{
                    bgcolor: "rgba(255,255,255,0.2)",
                    color: "white",
                  }}
                />
                <Chip
                  label={<RtlIconLabel icon={<MarkEmailReadOutlined />} iconSize={15}>אימות קוד במייל</RtlIconLabel>}
                  sx={{
                    bgcolor: "rgba(255,255,255,0.2)",
                    color: "white",
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
                  disabled={isRequestingCode}
                />
                <Button
                  fullWidth
                  variant="contained"
                  type="submit"
                  size="large"
                  sx={{ mt: 2 }}
                  disabled={isRequestingCode}
                >
                  {isRequestingCode ? (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <CircularProgress size={18} color="inherit" />
                      <span>שולח קוד...</span>
                    </Stack>
                  ) : (
                    "שלח קוד אימות"
                  )}
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
                  disabled={isVerifyingCode}
                />
                <Button
                  fullWidth
                  variant="contained"
                  type="submit"
                  size="large"
                  sx={{ mt: 2 }}
                  disabled={isVerifyingCode}
                >
                  {isVerifyingCode ? (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <CircularProgress size={18} color="inherit" />
                      <span>מאמת קוד...</span>
                    </Stack>
                  ) : (
                    "כניסה"
                  )}
                </Button>
                <Button
                  fullWidth
                  color="inherit"
                  onClick={() => setStep(1)}
                  sx={{ mt: 1 }}
                  disabled={isVerifyingCode}
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
