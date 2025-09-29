"use client";
import { useCallback } from 'react';
import ExcelJS from 'exceljs';
import { toast } from 'react-toastify';

export const useFileProcessor = (contextActions) => {
  const {
    addAccount,
    setLoading,
    setError,
    setProcessingProgress,
    onSuccess
  } = contextActions;

  const processExcelFile = useCallback(async (file, fileName) => {
    if (!file) {
      setError("No file provided");
      return;
    }

    setLoading(true);
    setError(null);
    setProcessingProgress(10);

    try {
      const data = await file.arrayBuffer();
      setProcessingProgress(30);

      if (data.byteLength === 0) {
        throw new Error("File appears to be empty or corrupted");
      }

      if (data.byteLength > 50 * 1024 * 1024) {
        throw new Error("File is too large. Please use a smaller Excel file (max 50MB)");
      }

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(data);

      setProcessingProgress(50);

      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        throw new Error("Could not read worksheet data");
      }

      const rawData = [];
      worksheet.eachRow({ includeEmpty: true }, (row) => {
        rawData.push(row.values);
      });

      if (rawData.length === 0) {
        throw new Error("No data found in the Excel file");
      }

      setProcessingProgress(60);

      const extractCellValue = (row, col) => {
        if (rawData[row] && rawData[row][col] !== undefined) {
          return rawData[row][col];
        }
        return null;
      };

      let headerRowIndex = -1;
      let isExtendedFormat = false;

      for (let i = 0; i < rawData.length; i++) {
        const row = rawData[i];
        if (row && row.some(cell => typeof cell === 'string' && cell.includes("Date"))) {
          if (row.some(cell => typeof cell === 'string' && (cell.includes("Debit") || cell.includes("Credit")))) {
            headerRowIndex = i;
            isExtendedFormat = false;
            break;
          }
          if (row.some(cell => typeof cell === 'string' && (cell.includes("Settlement Debit (NGN)") || cell.includes("Settlement Credit (NGN)") || cell.includes("Transaction Amount (NGN)")))) {
            headerRowIndex = i;
            isExtendedFormat = true;
            break;
          }
        }
      }

      if (headerRowIndex === -1) {
        throw new Error(
          "Could not find transaction headers in the Excel file. Expected columns: Date with Debit/Credit or Settlement Debit/Credit columns"
        );
      }

      const headers = rawData[headerRowIndex];
      let columnIndices;

      if (isExtendedFormat) {
        columnIndices = {
          date: headers.indexOf("Date"),
          narration: headers.indexOf("Narration"),
          reference: headers.findIndex(h => h && (h.includes("Transaction Ref") || h.includes("Reference"))),
          debit: headers.indexOf("Settlement Debit (NGN)"),
          credit: headers.indexOf("Settlement Credit (NGN)"),
          balance: headers.findIndex(h => h && (h.includes("Balance After") || h.includes("Balance"))),
          accountName: headers.indexOf("Account Name"),
          transactionType: headers.indexOf("Transaction Type"),
          transactionStatus: headers.indexOf("Transaction Status"),
          terminalId: headers.indexOf("Terminal ID"),
          rrn: headers.indexOf("RRN"),
          reversalStatus: headers.indexOf("Reversal Status"),
          transactionAmount: headers.indexOf("Transaction Amount (NGN)"),
          balanceBefore: headers.indexOf("Balance Before (NGN)"),
          charge: headers.indexOf("Charge (NGN)"),
          beneficiary: headers.indexOf("Beneficiary"),
          beneficiaryInstitution: headers.indexOf("Beneficiary Institution"),
          source: headers.indexOf("Source"),
          sourceInstitution: headers.indexOf("Source Institution")
        };
      } else {
        columnIndices = {
          date: headers.indexOf("Date"),
          narration: headers.indexOf("Narration"),
          reference: headers.indexOf("Reference"),
          debit: headers.indexOf("Debit"),
          credit: headers.indexOf("Credit"),
          balance: headers.indexOf("Balance"),
        };
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
        throw new Error(
          `Missing essential columns in the transaction table: ${missingColumns.join(", ")}`
        );
      }

      setProcessingProgress(70);

      const safeNumber = (value) => {
        if (value && typeof value === 'object' && value.result) {
            value = value.result;
        }
        const num = Number(value);
        return isNaN(num) ? 0 : num;
      };

      let accountInfo;

      if (isExtendedFormat) {
        const firstTransaction = rawData[headerRowIndex + 1];
        const accountNameFromData = firstTransaction && columnIndices.accountName !== -1
          ? firstTransaction[columnIndices.accountName]
          : null;

        accountInfo = {
          accountName: accountNameFromData || fileName.split(".")[0] || "Unknown Account",
          accountNumber: "N/A",
          currency: "NGN",
          openingBalance: 0,
          closingBalance: 0,
          totalDebit: 0,
          totalCredit: 0,
          statementPeriod: "N/A",
          format: "extended"
        };
      } else {
        accountInfo = {
          accountName:
            extractCellValue(2, 2) ||
            fileName.split(".")[0] ||
            "Unknown Account",
          accountNumber: extractCellValue(3, 2) || "N/A",
          currency: extractCellValue(4, 2) || "NGN",
          openingBalance: safeNumber(extractCellValue(2, 12)),
          closingBalance: safeNumber(extractCellValue(3, 12)),
          totalDebit: safeNumber(extractCellValue(4, 12)),
          totalCredit: safeNumber(extractCellValue(5, 12)),
          statementPeriod: extractCellValue(5, 2) || "N/A",
          format: "standard"
        };
      }

      const transactionData = [];
      let totalCreditFromFile = 0;
      let totalDebitFromFile = 0;

      for (let i = headerRowIndex + 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || row.length === 0 || !row[columnIndices.date]) continue;

        const dateValue = row[columnIndices.date];
        const transactionDate = new Date(dateValue);

        if (isNaN(transactionDate.getTime())) {
          console.warn(`Skipping transaction with invalid date at row ${i + 1}:`, dateValue);
          continue;
        }

        let creditAmount, debitAmount;

        if (isExtendedFormat) {
          creditAmount = safeNumber(row[columnIndices.credit]);
          debitAmount = safeNumber(row[columnIndices.debit]);

          if (creditAmount === 0 && debitAmount === 0 && columnIndices.transactionAmount !== -1) {
            const transactionAmount = safeNumber(row[columnIndices.transactionAmount]);
            if (transactionAmount > 0) {
              const transactionType = row[columnIndices.transactionType] || "";
              const accountName = row[columnIndices.accountName] || "";

              if (transactionType.toLowerCase().includes("credit") ||
                  transactionType.toLowerCase().includes("deposit") ||
                  transactionType.toLowerCase().includes("transfer in") ||
                  accountName.toLowerCase().includes("credit")) {
                creditAmount = transactionAmount;
              } else {
                debitAmount = transactionAmount;
              }
            }
          }
        } else {
          creditAmount = safeNumber(row[columnIndices.credit]);
          debitAmount = safeNumber(row[columnIndices.debit]);
        }

        totalCreditFromFile += creditAmount;
        totalDebitFromFile += debitAmount;

        const txId = `tx-${fileName}-${i}-${Math.random().toString(36).substr(2, 9)}`;
        const transaction = {
          id: txId,
          date: transactionDate.toISOString(),
          narration: row[columnIndices.narration] || "",
          reference: row[columnIndices.reference] || "",
          debit: debitAmount,
          credit: creditAmount,
          balance: safeNumber(row[columnIndices.balance]),
        };

        if (isExtendedFormat) {
          transaction.extendedInfo = {
            accountName: row[columnIndices.accountName] || "",
            transactionType: row[columnIndices.transactionType] || "",
            transactionStatus: row[columnIndices.transactionStatus] || "",
            terminalId: row[columnIndices.terminalId] || "",
            rrn: row[columnIndices.rrn] || "",
            reversalStatus: row[columnIndices.reversalStatus] || "",
            transactionAmount: safeNumber(row[columnIndices.transactionAmount]),
            balanceBefore: safeNumber(row[columnIndices.balanceBefore]),
            charge: safeNumber(row[columnIndices.charge]),
            beneficiary: row[columnIndices.beneficiary] || "",
            beneficiaryInstitution: row[columnIndices.beneficiaryInstitution] || "",
            source: row[columnIndices.source] || "",
            sourceInstitution: row[columnIndices.sourceInstitution] || ""
          };
        }

        transactionData.push(transaction);
      }

      if (transactionData.length === 0) {
        throw new Error("No valid transactions found in the Excel file");
      }

      setProcessingProgress(90);

      if (isExtendedFormat && transactionData.length > 0) {
        const firstTransaction = transactionData[0];
        const lastTransaction = transactionData[transactionData.length - 1];

        accountInfo.openingBalance = firstTransaction.extendedInfo?.balanceBefore || firstTransaction.balance || 0;
        accountInfo.closingBalance = lastTransaction.balance || 0;
        accountInfo.totalDebit = totalDebitFromFile;
        accountInfo.totalCredit = totalCreditFromFile;

        if (firstTransaction.date && lastTransaction.date) {
          accountInfo.statementPeriod = `${new Date(firstTransaction.date).toLocaleDateString()} to ${new Date(lastTransaction.date).toLocaleDateString()}`;
        }
      } else if (transactionData.length > 0) {
        const firstTransaction = transactionData[0];
        const lastTransaction = transactionData[transactionData.length - 1];
        if (firstTransaction.date && lastTransaction.date) {
          accountInfo.statementPeriod = `${new Date(firstTransaction.date).toLocaleDateString()} to ${new Date(lastTransaction.date).toLocaleDateString()}`;
        }
      }

      const newAccount = {
        id: `acc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        fileName: fileName || "Unnamed Account",
        accountInfo,
        transactions: transactionData,
        calculations: {
          totalCredit: totalCreditFromFile,
          totalDebit: totalDebitFromFile,
          vatAmount: 0,
          creditAfterVat: totalCreditFromFile,
          vatableTotal: 0,
          zeroRatedTotal: 0,
          vatExemptTotal: 0,
          nonVatableTotal: totalCreditFromFile
        },
        isExtendedFormat: isExtendedFormat,
      };

      setProcessingProgress(100);

      addAccount(newAccount);

      toast.success(`Successfully processed ${fileName}`);

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(`Error processing Excel file ${fileName}: ${err.message}`);
      console.error("Processing error:", err);
    } finally {
      setLoading(false);
      setTimeout(() => setProcessingProgress(0), 1000);
    }
  }, [addAccount, setLoading, setError, setProcessingProgress, onSuccess]);

  const handleFileUpload = useCallback((e) => {
    try {
      const files = e.target.files;
      if (!files || files.length === 0) {
        setError("No file selected. Please select an Excel file.");
        return;
      }

      const file = files[0];
      const fileExt = file.name.split(".").pop().toLowerCase();
      if (fileExt !== "xlsx" && fileExt !== "xls") {
        setError(
          "Invalid file format. Please upload an Excel file (.xlsx or .xls). Supports both standard and extended Moniepoint formats."
        );
        return;
      }

      processExcelFile(file, file.name);
    } catch (error) {
      setError(`Error handling file upload: ${error.message}`);
      console.error("File upload error:", error);
    }
  }, [processExcelFile, setError]);

  return {
    processExcelFile,
    handleFileUpload
  };
};