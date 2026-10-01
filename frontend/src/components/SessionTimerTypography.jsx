import React, { useState, useEffect, useContext } from "react";
import { Typography } from "@mui/material";
import { AuthContext } from "../context/AuthContext";

const SessionTimerTypography = ({ sx = {} }) => {
  const { token } = useContext(AuthContext);
  const [timeLeftStr, setTimeLeftStr] = useState("");

  useEffect(() => {
    if (!token) {
      setTimeLeftStr("");
      return;
    }

    const updateTimer = () => {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        if (!payload || !payload.exp) {
          setTimeLeftStr("");
          return;
        }

        const expMs = payload.exp * 1000;
        const now = Date.now();
        const diffMs = expMs - now;

        if (diffMs <= 0) {
          setTimeLeftStr("00:00");
          return;
        }

        const totalSec = Math.floor(diffMs / 1000);
        const mins = Math.floor(totalSec / 60);
        const secs = totalSec % 60;

        const formattedMins = String(mins).padStart(2, "0");
        const formattedSecs = String(secs).padStart(2, "0");

        setTimeLeftStr(`${formattedMins}:${formattedSecs}`);
      } catch (err) {
        setTimeLeftStr("");
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [token]);

  if (!timeLeftStr) return null;

  return (
    <Typography
      variant="body2"
      sx={{
        color: "text.secondary",
        fontSize: "0.85rem",
        fontWeight: 500,
        ...sx,
      }}
    >
      Session expires in : <strong>{timeLeftStr}</strong>
    </Typography>
  );
};

export default SessionTimerTypography;
