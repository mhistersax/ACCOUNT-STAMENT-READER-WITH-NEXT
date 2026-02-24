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

const isEmptyCell = (value) => value === null || value === undefined || value === "";
const normalizeCell = (value) => (typeof value === "string" ? value.trim() : value);
const isLabelLike = (value) => typeof value === "string" && value.trim().endsWith(":");

const findValueAfterLabel = (rowValues, label) => {
  if (!rowValues || !label) return null;
  const normalizedLabel = normalizeCell(label);
  const indices = [];
  rowValues.forEach((cell, idx) => {
    if (normalizeCell(cell) === normalizedLabel) indices.push(idx);
  });
  for (let i = indices.length - 1; i >= 0; i -= 1) {
    const start = indices[i] + 1;
    for (let j = start; j < rowValues.length; j += 1) {
      const value = rowValues[j];
      if (isEmptyCell(value)) continue;
      if (normalizeCell(value) === normalizedLabel) continue;
      if (isLabelLike(value)) continue;
      return value;
    }
  }
  return null;
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

  let lastMetaSignature = null;
  const postMetaIfReady = () => {
    if (!accountDetails.accountName && !accountDetails.accountNumber && !accountDetails.currency) {
      return;
    }
    const payload = {
      accountName: accountDetails.accountName,
      accountNumber: accountDetails.accountNumber,
      currency: accountDetails.currency,
      statementPeriod: accountDetails.statementPeriod,
      openingBalance: accountDetails.openingBalance,
      closingBalance: accountDetails.closingBalance,
      totalDebit: accountDetails.totalDebit,
      totalCredit: accountDetails.totalCredit
    };
    const signature = JSON.stringify(payload);
    if (signature === lastMetaSignature) return;
    lastMetaSignature = signature;
    self.postMessage({
      type: "meta",
      id,
      data: payload
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
        if (
          accountDetails.accountName === null ||
          accountDetails.accountName === undefined ||
          isLabelLike(accountDetails.accountName)
        ) {
          const accountName = findValueAfterLabel(rowValues, "Account Name:");
          if (accountName) accountDetails.accountName = accountName;
        }
        if (
          accountDetails.accountNumber === null ||
          accountDetails.accountNumber === undefined ||
          isLabelLike(accountDetails.accountNumber)
        ) {
          const accountNumber = findValueAfterLabel(rowValues, "Account Number:");
          if (accountNumber) accountDetails.accountNumber = accountNumber;
        }
        if (
          accountDetails.currency === null ||
          accountDetails.currency === undefined ||
          isLabelLike(accountDetails.currency)
        ) {
          const currency = findValueAfterLabel(rowValues, "Currency:");
          if (currency) accountDetails.currency = currency;
        }
        if (
          accountDetails.statementPeriod === null ||
          accountDetails.statementPeriod === undefined ||
          isLabelLike(accountDetails.statementPeriod)
        ) {
          const statementPeriod = findValueAfterLabel(rowValues, "Date:");
          if (statementPeriod) accountDetails.statementPeriod = statementPeriod;
        }
        if (accountDetails.openingBalance === null || accountDetails.openingBalance === undefined) {
          const openingBalance = findValueAfterLabel(rowValues, "Opening Balance:");
          if (openingBalance !== null) accountDetails.openingBalance = safeNumber(openingBalance);
        }
        if (accountDetails.closingBalance === null || accountDetails.closingBalance === undefined) {
          const closingBalance = findValueAfterLabel(rowValues, "Closing Balance:");
          if (closingBalance !== null) accountDetails.closingBalance = safeNumber(closingBalance);
        }
        if (accountDetails.totalDebit === null || accountDetails.totalDebit === undefined) {
          const totalDebit = findValueAfterLabel(rowValues, "Total Debit:");
          if (totalDebit !== null) accountDetails.totalDebit = safeNumber(totalDebit);
        }
        if (accountDetails.totalCredit === null || accountDetails.totalCredit === undefined) {
          const totalCredit = findValueAfterLabel(rowValues, "Total Credit:");
          if (totalCredit !== null) accountDetails.totalCredit = safeNumber(totalCredit);
        }

        if (hasExtendedHeader(rowValues)) {
          const balanceAfterIndex = rowValues.findIndex(
            (h) => h && typeof h === "string" && h.includes("Balance After")
          );
          headerRowNumber = row.number;
          isExtendedFormat = true;
          columnIndices = {
            date: rowValues.indexOf("Date"),
            narration: rowValues.indexOf("Narration"),
            reference: rowValues.findIndex((h) => h && (h.includes("Transaction Ref") || h.includes("Reference"))),
            debit: rowValues.indexOf("Settlement Debit (NGN)"),
            credit: rowValues.indexOf("Settlement Credit (NGN)"),
            balance:
              balanceAfterIndex !== -1
                ? balanceAfterIndex
                : rowValues.findIndex((h) => h && typeof h === "string" && h.includes("Balance")),
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

  postMetaIfReady();

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
