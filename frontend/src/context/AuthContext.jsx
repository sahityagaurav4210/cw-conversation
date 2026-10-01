import React, { createContext, useState, useEffect } from "react";
import axios from "axios";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));

  useEffect(() => {
    if (token) {
      // Very simple token validation: decoding payload (not verifying signature on client)
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setUser({ id: payload.id, username: payload.username, name: payload.name, role: payload.role || 'user' });
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

  const login = async (username, password, isAdminLogin = false) => {
    const res = await axios.post(`${API_BASE}/api/auth/login`, {
      username,
      password,
      isAdminLogin,
    });
    setToken(res.data.token);
    localStorage.setItem("token", res.data.token);
    setUser(res.data.user);
    axios.defaults.headers.common["Authorization"] = `Bearer ${res.data.token}`;
  };

  const register = async (username, password, name) => {
    await axios.post(`${API_BASE}/api/auth/register`, {
      username,
      password,
      name,
    });
  };

  const updateProfile = async (name, password) => {
    const res = await axios.put(`${API_BASE}/api/auth/profile`, {
      name,
      password,
    });
    setToken(res.data.token);
    localStorage.setItem("token", res.data.token);
    setUser(res.data.user);
    axios.defaults.headers.common["Authorization"] = `Bearer ${res.data.token}`;
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
