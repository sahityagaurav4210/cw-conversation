import React, { useState } from "react";
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Typography,
  Grid,
  Button,
} from "@mui/material";
import AlternateEmailIcon from "@mui/icons-material/AlternateEmail";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EmailClientMaster from "./EmailClientMaster";

const SystemMasters = () => {
  const [selectedMaster, setSelectedMaster] = useState(null);

  if (selectedMaster === "email_client") {
    return (
      <Box p={2}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => setSelectedMaster(null)}
          sx={{ mb: 2 }}
        >
          Back to System Masters
        </Button>
        <EmailClientMaster />
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h5" color="primary" gutterBottom fontWeight="bold">
        System Masters
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Select a system master to view, search, add, or configure system-wide domains and configurations.
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={4}>
          <Card
            elevation={3}
            sx={{
              borderRadius: "12px",
              border: "1px solid",
              borderColor: "divider",
              transition: "transform 0.2s",
              "&:hover": { transform: "translateY(-4px)" },
            }}
          >
            <CardActionArea onClick={() => setSelectedMaster("email_client")}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2} mb={1}>
                  <AlternateEmailIcon color="primary" fontSize="large" />
                  <Typography variant="h6" fontWeight="bold">
                    Email Client Master
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Manage supported email client domain extensions (e.g. gmail.com, company.com) available for user profiles.
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SystemMasters;
