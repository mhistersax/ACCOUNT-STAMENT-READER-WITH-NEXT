# Multi-Account Statement Reader

A Next.js application for processing and analyzing financial statements from multiple accounts with VAT calculation capabilities.

![Project Screenshot](https://via.placeholder.com/800x450.png?text=Multi-Account+Statement+Reader)

## Overview

The Multi-Account Statement Reader is a web application designed to help businesses manage and analyze bank statement data across multiple accounts. It provides a centralized platform for uploading Excel-based account statements, processing transactions, and performing VAT calculations (with a default rate of 7.5%).

### Key Features

- **Multiple Account Support**: Upload and analyze multiple account statements simultaneously
- **VAT Management**: Flexibly select which transactions are VATable
- **Transaction Visualization**: Categorize and display credit and debit transactions
- **Aggregated Calculations**: View combined financial data across all accounts
- **Responsive Design**: Fully responsive UI using Tailwind CSS
- **Excel File Processing**: Read and process Excel files (.xlsx, .xls)

## Getting Started

### Prerequisites

- Node.js (v14.0 or higher)
- npm (v6.0 or higher) or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/multi-account-statement-reader.git
   cd multi-account-statement-reader
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. Open your browser and navigate to `http://localhost:3000`

## Usage Guide

### Uploading Account Statements

1. Click the "Upload First Account Statement" button on the home page
2. Select an Excel file (.xlsx or .xls) containing your account statement
3. The application will process the file and display the account information
4. To add more accounts, click "Add Another Account Statement"

### Managing VATable Transactions

1. Once an account is loaded, you'll see the "Select VATable Credit Transactions" section
2. By default, all credit transactions are marked as VATable
3. You can uncheck specific transactions that should not be subject to VAT
4. The VAT calculation (7.5%) will automatically update based on your selections
5. The "Select All" checkbox allows you to quickly select or deselect all transactions

### Viewing Account Information

1. Use the account tabs at the top to switch between different accounts
2. Each account displays:
   - Account summary (account name, number, opening/closing balances, etc.)
   - Transaction summary with VAT breakdown
   - List of credit and debit transactions

### Aggregate Calculations

The "Combined Calculations" panel shows aggregated data across all accounts, including:
- Total combined credit
- Total combined debit
- Combined VAT amount
- Combined credit after VAT

## File Format Requirements

The application expects Excel files with the following structure:

- Account information (name, number, currency, etc.) in the top rows
- A transaction table with headers including:
  - Date
  - Narration/Description
  - Reference
  - Debit
  - Credit
  - Balance

## Component Structure

The application is built using the following key components:

- **Home (page.js)**: Main entry point and state manager
- **AccountTabs**: Navigation between multiple accounts
- **AccountSummary**: Displays account details
- **VatableTransactionSelector**: Allows selection of VATable transactions
- **VatBreakdown**: Shows VAT calculation summary
- **TransactionController**: Manages and displays transactions
- **AggregateCalculations**: Shows combined data across accounts

## Troubleshooting

### Common Issues

1. **File Upload Errors**:
   - Ensure your Excel file follows the expected format
   - Check that the file isn't locked or read-only
   - Files larger than 10MB may take longer to process

2. **VAT Selection Issues**:
   - If checkboxes aren't responding, refresh the page and try again
   - Ensure you're clicking directly on the checkbox, not the surrounding area

### Debug Mode

For developers, you can enable debug mode by adding `?debug=true` to the URL. This will display additional console logs with transaction IDs and state updates.

## License

[MIT License](LICENSE)

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components styled with [Tailwind CSS](https://tailwindcss.com/)
- Excel processing via [SheetJS](https://sheetjs.com/)