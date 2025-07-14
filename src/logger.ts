import fs from "fs";
import path from "path";
import os from "os";

const storageDir = path.join(os.homedir(), ".c2");
const logFile = path.join(storageDir, "mcp.log");

// Ensure storage directory exists
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true });
}

function appendLog(level: string, message: string) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${level}] ${message}\n`;
  try {
    fs.appendFileSync(logFile, logEntry);
    // Also output errors to console.error
    if (level === "ERROR") {
      console.error(`[${timestamp}] [${level}] ${message}`);
    }
  } catch (error) {
    // Fallback to stderr if file logging fails
    console.error(`[${timestamp}] [${level}] ${message}`);
    console.error("Failed to write to log file:", error);
  }
}

export const logger = {
  info: (msg: string) => appendLog("INFO", msg),
  error: (msg: string) => appendLog("ERROR", msg),
  debug: (msg: string) => appendLog("DEBUG", msg),
  warn: (msg: string) => appendLog("WARN", msg),
};

// Export storage directory for other modules
export const getStorageDir = () => storageDir;
