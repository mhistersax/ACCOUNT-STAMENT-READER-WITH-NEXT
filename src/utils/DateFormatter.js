// DateFormatter.js - Utility for consistent date formatting
export const formatDateToDDMMYYYY = (dateString) => {
  try {
    const date = new Date(dateString);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return "";
    }

    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error("Error formatting date:", error);
    return "";
  }
};

// Format for Statement Period (showing date range)
export const formatDateRange = (startDateString, endDateString) => {
  const startDate = formatDateToDDMMYYYY(startDateString);
  const endDate = formatDateToDDMMYYYY(endDateString);

  if (startDate && endDate) {
    return `${startDate} - ${endDate}`;
  } else if (startDate) {
    return startDate;
  } else if (endDate) {
    return endDate;
  }

  return "";
};
