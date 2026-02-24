"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export const useFileProcessor = ({ onStart, onMeta, onBatch, onDone }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [processingProgress, setProcessingProgress] = useState(0);
  const workerRef = useRef(null);
  const requestIdRef = useRef(null);

  useEffect(() => {
    if (!workerRef.current) {
      workerRef.current = new Worker(new URL("../workers/excelParser.worker.js", import.meta.url), {
        type: "module"
      });
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  const processExcelFile = useCallback(
    async (file) => {
      if (!file) {
        setError("No file provided");
        return;
      }

      setIsLoading(true);
      setError(null);
      setProcessingProgress(10);

      try {
        let data;
        try {
          data = await file.arrayBuffer();
        } catch (error) {
          throw new Error(
            "Failed to read file. The file might be corrupted or locked by another application."
          );
        }

        setProcessingProgress(30);

        if (!workerRef.current) {
          throw new Error("File processor is not ready. Please refresh the page and try again.");
        }

        onStart?.();

        const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        requestIdRef.current = requestId;

        const handleMessage = (event) => {
          const { type, value, data: parsed, message, id } = event.data || {};
          if (id !== requestIdRef.current) return;

          if (type === "progress") {
            setProcessingProgress(value);
            return;
          }

          if (type === "meta") {
            onMeta?.(parsed);
            return;
          }

          if (type === "batch") {
            onBatch?.(parsed?.transactions || []);
            return;
          }

          if (type === "result") {
            setProcessingProgress(100);
            onDone?.(parsed);
            setIsLoading(false);
            setTimeout(() => setProcessingProgress(0), 600);
            cleanupListeners();
            return;
          }

          if (type === "error") {
            setError(`Error processing Excel file ${file.name}: ${message}`);
            setIsLoading(false);
            setTimeout(() => setProcessingProgress(0), 600);
            cleanupListeners();
          }
        };

        const handleError = (event) => {
          if (requestIdRef.current !== requestId) return;
          setError(`Error processing Excel file ${file.name}: ${event.message || "Unknown worker error"}`);
          setIsLoading(false);
          setTimeout(() => setProcessingProgress(0), 600);
          cleanupListeners();
        };

        const cleanupListeners = () => {
          workerRef.current?.removeEventListener("message", handleMessage);
          workerRef.current?.removeEventListener("error", handleError);
        };

        workerRef.current.addEventListener("message", handleMessage);
        workerRef.current.addEventListener("error", handleError);
        workerRef.current.postMessage(
          {
            type: "parse",
            id: requestId,
            fileName: file.name,
            buffer: data
          },
          [data]
        );
      } catch (err) {
        setError(`Error processing Excel file ${file.name}: ${err.message}`);
        setIsLoading(false);
        setTimeout(() => setProcessingProgress(0), 600);
      }
    },
    [onBatch, onDone, onMeta, onStart]
  );

  const handleFileUpload = useCallback(
    (e) => {
      try {
        const files = e.target.files || e.dataTransfer?.files;
        if (!files || files.length === 0) {
          setError("No file selected. Please select an Excel file.");
          return;
        }

        const file = files[0];

        if (!file || file.size === 0) {
          setError("Selected file is empty or corrupted. Please try a different file.");
          return;
        }

        if (file.size > 50 * 1024 * 1024) {
          setError("File is too large. Please use a smaller Excel file (maximum 50MB).");
          return;
        }

        const fileExt = file.name.split(".").pop()?.toLowerCase();
        if (!fileExt || (fileExt !== "xlsx" && fileExt !== "xls")) {
          setError("Invalid file format. Please upload an Excel file (.xlsx or .xls).");
          return;
        }

        const validMimeTypes = [
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.ms-excel",
          "application/x-excel",
          "application/excel"
        ];

        if (file.type && !validMimeTypes.includes(file.type) && !file.type.startsWith("application/")) {
          setError("File type validation failed. Please ensure you're uploading a valid Excel file.");
          return;
        }

        processExcelFile(file);
      } catch (error) {
        setError(`Error handling file upload: ${error.message || "Unknown error occurred"}`);
      }
    },
    [processExcelFile]
  );

  return {
    handleFileUpload,
    isLoading,
    error,
    processingProgress,
    clearError: () => setError(null)
  };
};
