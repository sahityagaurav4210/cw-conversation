import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Autocomplete,
} from "@mui/material";
import CodeIcon from "@mui/icons-material/Code";
import SendIcon from "@mui/icons-material/Send";
import axios from "axios";
import { useUI } from "../context/UIContext";

const DEFAULT_LANGUAGES = [
  { name: "JavaScript", value: "javascript" },
  { name: "TypeScript", value: "typescript" },
  { name: "React (JSX / TSX)", value: "jsx" },
  { name: "Next.js", value: "nextjs" },
  { name: "NestJS", value: "nestjs" },
  { name: "Spring Boot (Java)", value: "springboot" },
  { name: "Java", value: "java" },
  { name: "Python", value: "python" },
  { name: "Node.js / Express", value: "nodejs" },
  { name: "Vue.js", value: "vue" },
  { name: "Angular", value: "angular" },
  { name: "C++", value: "cpp" },
  { name: "C# / .NET", value: "csharp" },
  { name: "PHP / Laravel", value: "php" },
  { name: "Go", value: "go" },
  { name: "Rust", value: "rust" },
  { name: "Kotlin", value: "kotlin" },
  { name: "Swift", value: "swift" },
  { name: "SQL", value: "sql" },
  { name: "HTML", value: "html" },
  { name: "CSS / SCSS", value: "css" },
  { name: "JSON / YAML", value: "json" },
  { name: "Docker / Bash", value: "bash" },
];

const countWords = (text) => {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).length;
};

const CodeSnippetModal = ({ open, onClose, onSendCode }) => {
  const { showAlert } = useUI();
  const [languagesList, setLanguagesList] = useState(DEFAULT_LANGUAGES);
  const [selectedLanguage, setSelectedLanguage] = useState(DEFAULT_LANGUAGES[0]);
  const [code, setCode] = useState("");
  const [additionalText, setAdditionalText] = useState("");

  const API_BASE =
    import.meta.env.VITE_API_BASE_URI || "http://localhost:5000";

  const fetchCodingLanguages = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/auth/coding-languages`);
      if (Array.isArray(res.data) && res.data.length > 0) {
        setLanguagesList(res.data);
        if (!selectedLanguage) {
          setSelectedLanguage(res.data[0]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch coding languages:", err);
    }
  };

  useEffect(() => {
    if (open) {
      fetchCodingLanguages();
    }
  }, [open]);

  const wordCount = countWords(code);
  const isOverWordLimit = wordCount > 5000;
  const messageRegex = /^[a-zA-Z0-9 \t\r\n.(),_:\/\-#$/&%@*+'?!;=~\[\]{}<>"`|\\]+$/;

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

    const langValue =
      typeof selectedLanguage === "string"
        ? selectedLanguage.toLowerCase()
        : selectedLanguage?.value || "javascript";

    // Format as Markdown code block ```language\ncode\n``` and optional Additional Text
    const formattedCodeMessage = additionalText.trim()
      ? `\`\`\`${langValue}\n${code.trim()}\n\`\`\`\n\n**Additional Text:**\n${additionalText.trim()}`
      : `\`\`\`${langValue}\n${code.trim()}\n\`\`\``;

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
          {/* 1. MUI Autocomplete Dropdown for Coding Languages */}
          <Autocomplete
            options={languagesList}
            getOptionLabel={(option) =>
              typeof option === "string"
                ? option
                : option.name || option.value || ""
            }
            value={selectedLanguage}
            onChange={(event, newValue) => {
              setSelectedLanguage(newValue);
            }}
            isOptionEqualToValue={(option, value) => {
              const valString =
                typeof value === "string" ? value : value?.value;
              return option.value === valString || option.name === valString;
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Programming Language / Framework"
                placeholder="Search programming language..."
                size="small"
              />
            )}
          />

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

export default React.memo(CodeSnippetModal);
