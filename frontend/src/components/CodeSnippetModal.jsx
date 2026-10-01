import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Box,
  Typography,
} from "@mui/material";
import CodeIcon from "@mui/icons-material/Code";
import SendIcon from "@mui/icons-material/Send";
import { useUI } from "../context/UIContext";

const LANGUAGES = [
  { label: "JavaScript", value: "javascript" },
  { label: "TypeScript", value: "typescript" },
  { label: "React (JSX / TSX)", value: "jsx" },
  { label: "Next.js", value: "nextjs" },
  { label: "NestJS", value: "nestjs" },
  { label: "Spring Boot (Java)", value: "springboot" },
  { label: "Java", value: "java" },
  { label: "Python", value: "python" },
  { label: "Node.js / Express", value: "nodejs" },
  { label: "Vue.js", value: "vue" },
  { label: "Angular", value: "angular" },
  { label: "C++", value: "cpp" },
  { label: "C# / .NET", value: "csharp" },
  { label: "PHP / Laravel", value: "php" },
  { label: "Go", value: "go" },
  { label: "Rust", value: "rust" },
  { label: "Kotlin", value: "kotlin" },
  { label: "Swift", value: "swift" },
  { label: "SQL", value: "sql" },
  { label: "HTML", value: "html" },
  { label: "CSS / SCSS", value: "css" },
  { label: "JSON / YAML", value: "json" },
  { label: "Docker / Bash", value: "bash" },
];

const countWords = (text) => {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).length;
};

const CodeSnippetModal = ({ open, onClose, onSendCode }) => {
  const { showAlert } = useUI();
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState("");
  const [additionalText, setAdditionalText] = useState("");

  const wordCount = countWords(code);
  const isOverWordLimit = wordCount > 5000;
  const messageRegex = /^[a-zA-Z0-9 .(),_\-#$/&%@*+'?]+$/;

  const isAdditionalTextInvalid = additionalText.trim()
    ? !messageRegex.test(additionalText.trim())
    : false;

  const handleSend = (e) => {
    e?.preventDefault();
    if (!code.trim()) {
      showAlert("Please enter some code to send.", "error");
      return;
    }

    if (isOverWordLimit) {
      showAlert("Code snippet cannot exceed 5000 words.", "error");
      return;
    }

    if (isAdditionalTextInvalid) {
      showAlert("Additional message contains invalid characters.", "error");
      return;
    }

    // Format as Markdown code block ```language\ncode\n``` and optional Additional Text
    const formattedCodeMessage = additionalText.trim()
      ? `\`\`\`${language}\n${code.trim()}\n\`\`\`\n\n**Additional Text:**\n${additionalText.trim()}`
      : `\`\`\`${language}\n${code.trim()}\n\`\`\``;

    onSendCode(formattedCodeMessage);

    // Reset and close
    setCode("");
    setAdditionalText("");
    onClose();
  };

  const handleClose = () => {
    setCode("");
    setAdditionalText("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <CodeIcon color="primary" />
        Share Code Snippet (Up to 5,000 words)
      </DialogTitle>
      <DialogContent dividers>
        <Box display="flex" flexDirection="column" gap={2} pt={1}>
          {/* 1. Language Select Dropdown */}
          <FormControl fullWidth size="small">
            <InputLabel id="language-select-label">
              Programming Language / Framework
            </InputLabel>
            <Select
              labelId="language-select-label"
              value={language}
              label="Programming Language / Framework"
              onChange={(e) => setLanguage(e.target.value)}
            >
              {LANGUAGES.map((lang) => (
                <MenuItem key={lang.value} value={lang.value}>
                  {lang.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* 2. MUI Multiline Textbox for Code */}
          <TextField
            label="Code Snippet"
            multiline
            rows={10}
            placeholder="Paste or write your code here (up to 5,000 words)..."
            value={code}
            onChange={(e) => setCode(e.target.value)}
            fullWidth
            required
            error={isOverWordLimit}
            sx={{
              "& .MuiInputBase-root": {
                overflowX: "hidden",
              },
              "& .MuiInputBase-input": {
                fontFamily:
                  'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
                fontSize: "0.9rem",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                overflowWrap: "break-word",
                overflowX: "hidden",
              },
            }}
            helperText={`${wordCount} / 5000 words (${code.length} characters)`}
          />

          {/* 3. MUI Multiline Textbox for Optional Additional Message */}
          <TextField
            label="Additional Message (Optional)"
            multiline
            placeholder="Add an optional explanation or note..."
            value={additionalText}
            onChange={(e) => setAdditionalText(e.target.value)}
            fullWidth
            error={isAdditionalTextInvalid}
            helperText={
              isAdditionalTextInvalid
                ? "Contains unsupported characters"
                : `${additionalText.length} characters`
            }
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handleSend}
          variant="contained"
          color="primary"
          startIcon={<SendIcon />}
          disabled={!code.trim() || isOverWordLimit || isAdditionalTextInvalid}
        >
          Send Code
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CodeSnippetModal;
