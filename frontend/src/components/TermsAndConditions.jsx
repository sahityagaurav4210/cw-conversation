import React from "react";
import {
  Typography,
  Button,
  Container,
  Paper,
  Stack,
  Divider,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import NavbarLogo from "./NavbarLogo";

const TermsAndConditions = ({ onBack }) => {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Button
        startIcon={<ArrowBackIcon fontSize="small" />}
        onClick={onBack}
        sx={{ mb: 2 }}
        variant="outlined"
        size="small"
      >
        Back
      </Button>

      <Paper
        elevation={3}
        sx={{
          p: 4,
          bgcolor: "background.paper",
          fontFamily: "Roboto, Arial, sans-serif",
          textAlign: "justify",
        }}
      >
        <Stack direction="row" sx={{ justifyContent: "center" }}>
          <Divider sx={{ width: "100%" }}>
            <NavbarLogo src="/logo.png" height={96} hidePadding />
          </Divider>
        </Stack>

        <Typography
          variant="h4"
          gutterBottom
          sx={{ fontWeight: 700, textTransform: "uppercase" }}
        >
          Terms and Conditions
        </Typography>

        <Typography variant="body1" paragraph>
          Welcome to our Secure Chat Application. By accessing or using our
          platform, you agree to be bound by these Terms and Conditions. Our
          platform provides end-to-end encrypted real-time chat, secure file
          sharing, and code snippet sharing functionalities.
        </Typography>

        <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
          1. Use of the Application
        </Typography>

        <Typography variant="body2" paragraph>
          You agree to use the service for lawful purposes only and in
          accordance with our usage policies. You must not use the application
          to transmit any illegal, harmful, or offensive content. The platform
          is designed for secure, private communication and must not be
          exploited or reverse-engineered.
        </Typography>

        <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
          2. User Accounts and Authentication
        </Typography>

        <Typography variant="body2" paragraph>
          You are responsible for safeguarding your account credentials. We
          utilize industry-standard security measures to ensure secure and
          authenticated access to the system. Any activity conducted under your
          account is your responsibility. You must notify us immediately of any
          unauthorized access to your account.
        </Typography>

        <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
          3. Data Security and Encryption
        </Typography>

        <Typography variant="body2" paragraph>
          Your privacy and security are our highest priority. All chat messages
          and file attachments are secured using end-to-end encryption. The
          decryption keys are never transmitted to our servers. While we use
          state-of-the-art security measures, you acknowledge that no method of
          electronic storage or transmission is fully immune to vulnerabilities.
        </Typography>

        <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
          4. Governance and Administration
        </Typography>

        <Typography variant="body2" paragraph>
          System administrators have the authority to manage system-wide
          configurations, including email client settings and coding language
          masters. Administrators do not have the capability or access rights to
          decrypt or view your personal messages or files.
        </Typography>

        <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
          5. Modifications to the Service
        </Typography>

        <Typography variant="body2" paragraph>
          We reserve the right to modify, suspend, or discontinue the service at
          any time without notice. We may also update these Terms and Conditions
          periodically. Your continued use of the application following any
          changes constitutes your acceptance of the revised terms.
        </Typography>

        <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
          6. Limitation of Liability
        </Typography>

        <Typography variant="body2" paragraph>
          In no event shall the developers or operators of this application be
          liable for any indirect, incidental, or consequential damages arising
          out of your use of the platform, including but not limited to data
          loss or security breaches outside our direct control.
        </Typography>
      </Paper>
    </Container>
  );
};

export default TermsAndConditions;
