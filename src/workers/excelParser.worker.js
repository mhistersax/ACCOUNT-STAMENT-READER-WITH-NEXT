import ExcelJS from "exceljs";

const postProgress = (value, id) => {
  self.postMessage({ type: "progress", value, id });
};

const safeNumber = (value) => {
  if (value && typeof value === "object" && value.result) {
    value = value.result;
  }
  const num = Number(value);
  return Number.isNaN(num) ? 0 : num;
};

const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "number" && value > 0) {
    return new Date((value - 25569) * 86400 * 1000);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const parseWorkbook = async ({ buffer, fileName, id }) => {
  postProgress(10, id);

  if (!buffer || buffer.byteLength === 0) {
    throw new Error("File appears to be empty or corrupted");
  }

  if (buffer.byteLength > 50 * 1024 * 1024) {
    throw new Error("File is too large. Please use a smaller Excel file (max 50MB)");
  }

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer);
  } catch (error) {
    if (error.message?.includes("Corrupt")) {
      throw new Error("Excel file appears to be corrupted. Please try saving it again or use a different file.");
    }
    if (error.message?.includes("password")) {
      throw new Error(
        "Password-protected Excel files are not supported. Please remove password protection and try again."
      );
    }
    throw new Error(`Failed to parse Excel file: ${error.message || "Invalid Excel format"}`);
  }

  postProgress(50, id);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error("No worksheet found in the Excel file. Please ensure the file contains data.");
  }

  postProgress(60, id);

  let headerRowNumber = -1;
  let isExtendedFormat = false;
  let columnIndices = null;

  const transactionData = [];
  let batch = [];
  const batchSize = 500;
  let totalCreditFromFile = 0;
  let totalDebitFromFile = 0;
  let firstTransactionDate = null;
  let lastTransactionDate = null;
  let accountNameFromRow = null;
  const accountDetails = {
    accountName: null,
    accountNumber: null,
    currency: null,
    statementPeriod: null,
    openingBalance: null,
    closingBalance: null,
    totalDebit: null,
    totalCredit: null
  };

  const totalRows = worksheet.rowCount || 0;
  let processedRows = 0;

  const hasString = (rowValues) => rowValues && rowValues.some((cell) => typeof cell === "string");
  const hasHeader = (rowValues, labels) => rowValues && labels.every((label) => rowValues.includes(label));
  const hasExtendedHeader = (rowValues) =>
    rowValues &&
    rowValues.some(
      (cell) =>
        typeof cell === "string" &&
        (cell.includes("Settlement Debit (NGN)") ||
          cell.includes("Settlement Credit (NGN)") ||
          cell.includes("Transaction Amount (NGN)"))
    );

  let metaSent = false;
  const postMetaIfReady = () => {
    if (metaSent) return;
    if (!accountDetails.accountName && !accountDetails.accountNumber && !accountDetails.currency) {
      return;
    }
    metaSent = true;
    self.postMessage({
      type: "meta",
      id,
      data: {
        accountName: accountDetails.accountName,
        accountNumber: accountDetails.accountNumber,
        currency: accountDetails.currency,
        statementPeriod: accountDetails.statementPeriod,
        openingBalance: accountDetails.openingBalance,
        closingBalance: accountDetails.closingBalance,
        totalDebit: accountDetails.totalDebit,
        totalCredit: accountDetails.totalCredit
      }
    });
  };

  const flushBatch = () => {
    if (batch.length === 0) return;
    self.postMessage({ type: "batch", id, data: { transactions: batch } });
    batch = [];
  };

  worksheet.eachRow({ includeEmpty: false }, (row) => {
    processedRows += 1;
    const rowValues = row.values || [];

    if (headerRowNumber === -1) {
      if (hasString(rowValues)) {
        if (!accountDetails.accountName) {
          const nameIndex = rowValues.indexOf("Account Name:");
          if (nameIndex !== -1 && rowValues[nameIndex + 1]) {
            accountDetails.accountName = rowValues[nameIndex + 1];
          }
        }
        if (!accountDetails.accountNumber) {
          const numberIndex = rowValues.indexOf("Account Number:");
          if (numberIndex !== -1 && rowValues[numberIndex + 1]) {
            accountDetails.accountNumber = rowValues[numberIndex + 1];
          }
        }
        if (!accountDetails.currency) {
          const currencyIndex = rowValues.indexOf("Currency:");
          if (currencyIndex !== -1 && rowValues[currencyIndex + 1]) {
            accountDetails.currency = rowValues[currencyIndex + 1];
          }
        }
        if (!accountDetails.statementPeriod) {
          const dateIndex = rowValues.indexOf("Date:");
          if (dateIndex !== -1 && rowValues[dateIndex + 1]) {
            accountDetails.statementPeriod = rowValues[dateIndex + 1];
          }
        }
        if (!accountDetails.openingBalance) {
          const openingIndex = rowValues.indexOf("Opening Balance:");
          if (openingIndex !== -1 && rowValues[openingIndex + 1]) {
            accountDetails.openingBalance = safeNumber(rowValues[openingIndex + 1]);
          }
        }
        if (!accountDetails.closingBalance) {
          const closingIndex = rowValues.indexOf("Closing Balance:");
          if (closingIndex !== -1 && rowValues[closingIndex + 1]) {
            accountDetails.closingBalance = safeNumber(rowValues[closingIndex + 1]);
          }
        }
        if (!accountDetails.totalDebit) {
          const debitIndex = rowValues.indexOf("Total Debit:");
          if (debitIndex !== -1 && rowValues[debitIndex + 1]) {
            accountDetails.totalDebit = safeNumber(rowValues[debitIndex + 1]);
          }
        }
        if (!accountDetails.totalCredit) {
          const creditIndex = rowValues.indexOf("Total Credit:");
          if (creditIndex !== -1 && rowValues[creditIndex + 1]) {
            accountDetails.totalCredit = safeNumber(rowValues[creditIndex + 1]);
          }
        }

        if (hasExtendedHeader(rowValues)) {
          headerRowNumber = row.number;
          isExtendedFormat = true;
          columnIndices = {
            date: rowValues.indexOf("Date"),
            narration: rowValues.indexOf("Narration"),
            reference: rowValues.findIndex((h) => h && (h.includes("Transaction Ref") || h.includes("Reference"))),
            debit: rowValues.indexOf("Settlement Debit (NGN)"),
            credit: rowValues.indexOf("Settlement Credit (NGN)"),
            balance: rowValues.findIndex((h) => h && (h.includes("Balance After") || h.includes("Balance"))),
            accountName: rowValues.indexOf("Account Name"),
            transactionType: rowValues.indexOf("Transaction Type"),
            transactionAmount: rowValues.indexOf("Transaction Amount (NGN)"),
            balanceBefore: rowValues.indexOf("Balance Before (NGN)")
          };
        } else if (hasHeader(rowValues, ["Date"]) && hasHeader(rowValues, ["Debit", "Credit"])) {
          headerRowNumber = row.number;
          isExtendedFormat = false;
          columnIndices = {
            date: rowValues.indexOf("Date"),
            narration: rowValues.indexOf("Narration"),
            reference: rowValues.indexOf("Reference"),
            debit: rowValues.indexOf("Debit"),
            credit: rowValues.indexOf("Credit"),
            balance: rowValues.indexOf("Balance")
          };
        }
      }
      postMetaIfReady();
      if (processedRows % 200 === 0) {
        postProgress(60, id);
      }
      return;
    }

    if (!columnIndices || row.number <= headerRowNumber) {
      return;
    }

    if (!rowValues[columnIndices.date]) {
      return;
    }

    const transactionDate = toDate(rowValues[columnIndices.date]);
    if (!transactionDate) return;

    let creditAmount;
    let debitAmount;

    if (isExtendedFormat) {
      creditAmount = safeNumber(rowValues[columnIndices.credit]);
      debitAmount = safeNumber(rowValues[columnIndices.debit]);

      if (creditAmount === 0 && debitAmount === 0 && columnIndices.transactionAmount !== -1) {
        const transactionAmount = safeNumber(rowValues[columnIndices.transactionAmount]);
        if (transactionAmount > 0) {
          const transactionType = rowValues[columnIndices.transactionType] || "";
          const accountName = rowValues[columnIndices.accountName] || "";

          if (
            transactionType.toString().toLowerCase().includes("credit") ||
            transactionType.toString().toLowerCase().includes("deposit") ||
            transactionType.toString().toLowerCase().includes("transfer in") ||
            accountName.toString().toLowerCase().includes("credit")
          ) {
            creditAmount = transactionAmount;
          } else {
            debitAmount = transactionAmount;
          }
        }
      }
    } else {
      creditAmount = safeNumber(rowValues[columnIndices.credit]);
      debitAmount = safeNumber(rowValues[columnIndices.debit]);
    }

    totalCreditFromFile += creditAmount;
    totalDebitFromFile += debitAmount;

    if (!firstTransactionDate) {
      firstTransactionDate = transactionDate;
    }
    lastTransactionDate = transactionDate;

    if (!accountNameFromRow && isExtendedFormat && columnIndices.accountName !== -1) {
      accountNameFromRow = rowValues[columnIndices.accountName];
    }

    transactionData.push({
      id: `tx-${fileName}-${row.number}-${Math.random().toString(36).slice(2, 9)}`,
      date: transactionDate.toISOString(),
      narration: rowValues[columnIndices.narration] || "",
      reference: rowValues[columnIndices.reference] || "",
      debit: debitAmount,
      credit: creditAmount,
      balance: safeNumber(rowValues[columnIndices.balance])
    });
    batch.push(transactionData[transactionData.length - 1]);
    if (batch.length >= batchSize) {
      flushBatch();
    }

    if (processedRows % 400 === 0 && totalRows > 0) {
      const progress = Math.min(90, Math.round(60 + (processedRows / totalRows) * 30));
      postProgress(progress, id);
    }
  });

  if (headerRowNumber === -1) {
    throw new Error(
      "Could not find transaction headers. Expected columns: Date with Debit/Credit or Settlement Debit/Credit."
    );
  }

  const missingColumns = [];
  if (columnIndices.date === -1) missingColumns.push("Date");
  if (isExtendedFormat) {
    if (columnIndices.debit === -1 && columnIndices.credit === -1 && columnIndices.transactionAmount === -1) {
      missingColumns.push("Settlement Debit/Credit or Transaction Amount");
    }
  } else {
    if (columnIndices.debit === -1) missingColumns.push("Debit");
    if (columnIndices.credit === -1) missingColumns.push("Credit");
  }

  if (missingColumns.length > 0) {
    throw new Error(`Missing essential columns: ${missingColumns.join(", ")}`);
  }

  if (transactionData.length === 0) {
    throw new Error("No valid transactions found in the Excel file");
  }

  flushBatch();
  postProgress(90, id);

  const accountInfo = {
    accountName:
      accountDetails.accountName ||
      accountNameFromRow ||
      fileName.split(".")[0] ||
      "Unknown Account",
    accountNumber: accountDetails.accountNumber,
    currency: accountDetails.currency,
    openingBalance: accountDetails.openingBalance,
    closingBalance: accountDetails.closingBalance,
    statementPeriod:
      accountDetails.statementPeriod ||
      (firstTransactionDate && lastTransactionDate
        ? `${new Date(firstTransactionDate).toLocaleDateString()} to ${new Date(lastTransactionDate).toLocaleDateString()}`
        : "N/A"),
    totalDebit: accountDetails.totalDebit ?? totalDebitFromFile,
    totalCredit: accountDetails.totalCredit ?? totalCreditFromFile
  };

  postProgress(100, id);

  return {
    fileName,
    accountInfo,
    transactionCount: transactionData.length
  };
};

self.onmessage = async (event) => {
  const { type, id, buffer, fileName } = event.data || {};
  if (type !== "parse") return;
  try {
    const result = await parseWorkbook({ buffer, fileName, id });
    self.postMessage({ type: "result", data: result, id });
  } catch (error) {
    self.postMessage({ type: "error", message: error.message || "Failed to parse Excel file", id });
  }
};
