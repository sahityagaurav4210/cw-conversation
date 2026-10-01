import React, { useState } from 'react';
import { Box, Typography, Link, IconButton, Tooltip, Paper } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';

// Helper to render text with clickable URLs
const renderTextWithLinks = (text) => {
  if (!text) return null;

  // Regex to match URLs starting with http://, https://, or www.
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
  const parts = text.split(urlRegex);

  return parts.map((part, index) => {
    if (urlRegex.test(part)) {
      const href = part.toLowerCase().startsWith('www.') ? `http://${part}` : part;
      return (
        <Link
          key={index}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            color: 'primary.main',
            textDecoration: 'underline',
            wordBreak: 'break-all',
            fontWeight: 600,
            '&:hover': {
              color: 'primary.dark',
            },
          }}
        >
          {part}
        </Link>
      );
    }
    return part;
  });
};

// Helper to render text segments, formatting "Additional Text" inside MUI Paper in italics
const renderTextSegment = (text, key) => {
  if (!text || !text.trim()) return null;

  const additionalTextMarker = '**Additional Text:**';
  if (text.includes(additionalTextMarker)) {
    const parts = text.split(additionalTextMarker);
    const beforeText = parts[0]?.trim();
    const additionalContent = parts.slice(1).join(additionalTextMarker).trim();

    return (
      <Box key={key} sx={{ width: '100%' }}>
        {beforeText && (
          <Typography
            component="div"
            sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', mb: 1 }}
          >
            {renderTextWithLinks(beforeText)}
          </Typography>
        )}
        {additionalContent && (
          <Paper
            elevation={0}
            sx={{
              mt: 1.5,
              p: 1.5,
              bgcolor: 'action.hover',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: '8px',
            }}
          >
            <Typography
              variant="subtitle2"
              fontWeight="bold"
              color="primary"
              sx={{ mb: 0.5 }}
            >
              Additional Text
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontStyle: 'italic',
                color: 'text.primary',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {renderTextWithLinks(additionalContent)}
            </Typography>
          </Paper>
        )}
      </Box>
    );
  }

  return (
    <Typography
      key={key}
      component="span"
      sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
    >
      {renderTextWithLinks(text)}
    </Typography>
  );
};

// Syntax Tokenizer & Keyword Highlighter for Code Blocks
const highlightCodeTokens = (code) => {
  if (!code) return null;

  // Master Tokenizer Regex for Comments, Strings, Annotations/Decorators (@Controller, @Autowired, etc.), Numbers, and Keywords/Built-ins
  const tokenRegex = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|#[^\n]*|--[^\n]*)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(@[A-Za-z0-9_]+)|(\b\d+(?:\.\d+)?\b)|(\b(?:function|const|let|var|class|public|private|protected|static|import|export|from|return|if|else|for|while|do|switch|case|break|continue|default|try|catch|finally|throw|new|this|super|extends|implements|interface|type|enum|async|await|yield|typeof|instanceof|def|void|int|double|float|char|long|short|byte|string|bool|boolean|auto|struct|union|namespace|using|include|package|override|virtual|SELECT|FROM|WHERE|INSERT|INTO|UPDATE|DELETE|CREATE|DROP|ALTER|TABLE|JOIN|INNER|LEFT|RIGHT|ON|GROUP|BY|ORDER|HAVING|LIMIT|AND|OR|NOT|NULL|TRUE|FALSE|null|true|false|undefined|useState|useEffect|useContext|useReducer|useCallback|useMemo|useRef|useLayoutEffect|getServerSideProps|getStaticProps|getStaticPaths|useRouter|usePathname|useSearchParams|redirect|notFound|revalidatePath)\b)/gi;

  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = tokenRegex.exec(code)) !== null) {
    const textBefore = code.substring(lastIndex, match.index);
    if (textBefore) {
      parts.push(textBefore);
    }

    const [fullMatch, comment, str, annotation, num, keyword] = match;

    if (comment) {
      parts.push(<span key={match.index} style={{ color: '#6a9955', fontStyle: 'italic' }}>{comment}</span>);
    } else if (str) {
      parts.push(<span key={match.index} style={{ color: '#ce9178' }}>{str}</span>);
    } else if (annotation) {
      parts.push(<span key={match.index} style={{ color: '#dcdcaa', fontWeight: 600 }}>{annotation}</span>);
    } else if (num) {
      parts.push(<span key={match.index} style={{ color: '#b5cea8' }}>{num}</span>);
    } else if (keyword) {
      parts.push(<span key={match.index} style={{ color: '#569cd6', fontWeight: 600 }}>{keyword}</span>);
    }

    lastIndex = match.index + fullMatch.length;
  }

  const remaining = code.substring(lastIndex);
  if (remaining) {
    parts.push(remaining);
  }

  return parts;
};

// Prettified Code Block Component with Keyword Highlighting
const CodeBlock = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Box
      sx={{
        my: 1,
        borderRadius: '8px',
        overflow: 'hidden',
        bgcolor: '#1e1e1e', // VSCode Dark Theme background
        color: '#d4d4d4',
        fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
        fontSize: '0.85rem',
        border: '1px solid #333',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      }}
    >
      {/* Code Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          px: 2,
          py: 0.5,
          bgcolor: '#2d2d2d',
          borderBottom: '1px solid #333',
        }}
      >
        <Typography
          variant="caption"
          sx={{
            color: '#9cdcfe',
            textTransform: 'uppercase',
            fontWeight: 'bold',
            letterSpacing: 0.5,
          }}
        >
          {language || 'code'}
        </Typography>
        <Tooltip title={copied ? 'Copied!' : 'Copy Code'}>
          <IconButton size="small" onClick={handleCopy} sx={{ color: '#aaa', '&:hover': { color: '#fff' } }}>
            {copied ? <CheckIcon fontSize="small" color="success" /> : <ContentCopyIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      </Box>

      {/* Prettified Code View with Syntax & Keyword Highlighting */}
      <Box
        component="pre"
        sx={{
          m: 0,
          p: 2,
          overflowX: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          lineHeight: 1.5,
        }}
      >
        <code>{highlightCodeTokens(code)}</code>
      </Box>
    </Box>
  );
};

// Main FormattedMessage Component
const FormattedMessage = ({ content }) => {
  if (!content) return null;

  // Split by markdown fenced code blocks: ```lang ... ``` or ``` ... ```
  const codeBlockRegex = /```([a-zA-Z0-9_+#-]*)\n?([\s\S]*?)```/g;

  const elements = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const textBefore = content.substring(lastIndex, match.index);
    if (textBefore) {
      elements.push(renderTextSegment(textBefore, `text-${lastIndex}`));
    }

    const language = match[1]?.trim();
    const code = match[2]?.trim();

    elements.push(
      <CodeBlock key={`code-${match.index}`} code={code} language={language} />
    );

    lastIndex = match.index + match[0].length;
  }

  const remainingText = content.substring(lastIndex);
  if (remainingText) {
    elements.push(renderTextSegment(remainingText, `text-${lastIndex}`));
  }

  return <Box sx={{ width: '100%' }}>{elements}</Box>;
};

export default FormattedMessage;
