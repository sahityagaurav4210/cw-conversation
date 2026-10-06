import React, { createContext, useState, useEffect } from "react";
import axios from "axios";
import socketService from "../services/socketService";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));

  useEffect(() => {
    if (token) {
      // Decode JWT token payload
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setUser({
          id: payload.id,
          username: payload.username,
          name: payload.name,
          email: payload.email,
          profile_photo: payload.profile_photo,
          sex: payload.sex,
          role: payload.role || 'user'
        });
        axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      } catch (e) {
        logout();
      }
    }
  }, [token]);

  const API_BASE = import.meta.env.VITE_API_BASE_URI || "http://localhost:5000";

  // Axios Interceptor: Automatically call Refresh Token API on 401 Unauthorized/Expired
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (
          error.response &&
          error.response.status === 401 &&
          originalRequest &&
          !originalRequest._retry &&
          !originalRequest.url?.includes("/api/auth/login") &&
          !originalRequest.url?.includes("/api/auth/refresh")
        ) {
          originalRequest._retry = true;
          try {
            const currentToken = localStorage.getItem("token");
            if (!currentToken) {
              logout();
              return Promise.reject(error);
            }

            const res = await axios.post(`${API_BASE}/api/auth/refresh`, {}, {
              headers: { Authorization: `Bearer ${currentToken}` }
            });

            const newToken = res.data.token;
            setToken(newToken);
            localStorage.setItem("token", newToken);
            setUser(res.data.user);
            axios.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
            originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
            return axios(originalRequest);
          } catch (refreshErr) {
            console.error("Auto token refresh failed on 401:", refreshErr);
            logout();
            return Promise.reject(refreshErr);
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  const login = async (username, password, isAdminLogin = false, captcha = "", captchaId = "") => {
    const res = await axios.post(`${API_BASE}/api/auth/login`, {
      username,
      password,
      isAdminLogin,
      captcha,
      captchaId,
    });
    setToken(res.data.token);
    localStorage.setItem("token", res.data.token);
    setUser(res.data.user);
    axios.defaults.headers.common["Authorization"] = `Bearer ${res.data.token}`;
  };

  const register = async (username, password, name, captcha = "", captchaId = "") => {
    await axios.post(`${API_BASE}/api/auth/register`, {
      username,
      password,
      name,
      captcha,
      captchaId,
    });
  };

  const updateProfile = async (payload) => {
    let data = payload;
    let config = {};
    if (payload instanceof FormData) {
      config = { headers: { "Content-Type": "multipart/form-data" } };
    }
    const res = await axios.put(`${API_BASE}/api/auth/profile`, data, config);
    setToken(res.data.token);
    localStorage.setItem("token", res.data.token);
    setUser(res.data.user);
    axios.defaults.headers.common["Authorization"] = `Bearer ${res.data.token}`;
    return res.data;
  };

  const refreshToken = async () => {
    const res = await axios.post(`${API_BASE}/api/auth/refresh`);
    setToken(res.data.token);
    localStorage.setItem("token", res.data.token);
    setUser(res.data.user);
    axios.defaults.headers.common["Authorization"] = `Bearer ${res.data.token}`;
    return res.data;
  };

  const logout = () => {
    socketService.disconnect();
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    delete axios.defaults.headers.common["Authorization"];
  };

  return (
    <AuthContext.Provider
      value={{ user, token, login, register, updateProfile, refreshToken, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};
