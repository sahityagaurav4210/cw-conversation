import { toast } from "react-toastify";

/**
 * Global configuration options for react-toastify notifications.
 */
export const TOAST_GLOBAL_CONFIG = {
  position: "top-right",
  autoClose: 4000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  theme: "dark",
};

/**
 * Helper toast trigger functions using global configuration.
 */
export const notifySuccess = (message, options = {}) => {
  return toast.success(message, { ...TOAST_GLOBAL_CONFIG, ...options });
};

export const notifyError = (message, options = {}) => {
  return toast.error(message, { ...TOAST_GLOBAL_CONFIG, ...options });
};

export const notifyInfo = (message, options = {}) => {
  return toast.info(message, { ...TOAST_GLOBAL_CONFIG, ...options });
};

export const notifyWarning = (message, options = {}) => {
  return toast.warning(message, { ...TOAST_GLOBAL_CONFIG, ...options });
};

export const notify = (message, type = "info", options = {}) => {
  switch (type) {
    case "success":
      return notifySuccess(message, options);
    case "error":
      return notifyError(message, options);
    case "warning":
    case "warn":
      return notifyWarning(message, options);
    case "info":
    default:
      return notifyInfo(message, options);
  }
};
