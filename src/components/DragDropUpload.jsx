// src/components/DragDropUpload.jsx
import React, { useState, useRef } from "react";

const DragDropUpload = ({ onFileSelect, accept = "*", disabled = false }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = e.dataTransfer.files;
      const event = { target: { files } };
      onFileSelect(event);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e);
      // Reset the input value to allow selecting the same file again if needed
      e.target.value = '';
    }
  };

  const handleClick = () => {
    if (fileInputRef.current && !disabled) {
      fileInputRef.current.click();
    }
  };

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
        isDragging
          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
          : "border-gray-300 hover:border-gray-400 dark:border-slate-700 dark:hover:border-slate-500"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept={accept}
        className="hidden"
        disabled={disabled}
      />

      <svg
        className="mx-auto h-12 w-12 text-gray-400 dark:text-slate-500"
        stroke="currentColor"
        fill="none"
        viewBox="0 0 48 48"
        aria-hidden="true"
      >
        <path
          d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <div className="flex text-sm text-gray-600 mt-2 justify-center dark:text-slate-300">
        <label className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
          <span>Upload a file</span>
        </label>
        <p className="pl-1">or drag and drop</p>
      </div>
      <p className="text-xs text-gray-500 mt-1 dark:text-slate-400">
        Excel files only (.xlsx, .xls)
      </p>
    </div>
  );
};

export default DragDropUpload;
