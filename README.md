# Account Statement Reader

A Next.js app for reading a single Excel account statement, extracting account details, and browsing transactions with fast filtering and smooth UX.

## Overview

Account Statement Reader lets you upload a bank statement (.xlsx/.xls), parses it in a web worker, and displays account metadata plus a virtualized transaction list. It’s designed for large statements while keeping the UI responsive.

## Key Features

- **Excel parsing in a worker** for non-blocking uploads
- **Account metadata extraction** (name, number, currency, period, balances)
- **Credit/Debit filters** with live totals
- **Virtualized table** for fast scrolling on large datasets
- **Sticky header + zebra striping** for readability
- **IndexedDB persistence** to save and reload statements
- **Dark / Light / System theme toggle**
- **Loading skeletons and empty states** for better UX

## Tech Stack

- Next.js + React
- Tailwind CSS
- ExcelJS (parsing)
- react-window (virtualized list)
- idb (IndexedDB wrapper)

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- npm

### Installation

1. Clone the repo
   ```bash
   git clone https://github.com/yourusername/account-statement-reader.git
   cd account-statement-reader
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Run the dev server
   ```bash
   npm run dev
   ```

4. Open `http://localhost:3000`

## Usage

1. Click the upload area or drag-and-drop a statement file.
2. Wait for parsing to complete (progress bar + skeletons).
3. Review account details and totals.
4. Filter transactions by **All / Credits / Debits**.

## Supported File Format

The parser expects:

- Account metadata (name, number, currency, period, balances) near the top.
- A transaction table with headers including:
  - Date
  - Narration/Description
  - Reference/Transaction Ref
  - Debit / Credit
  - Balance (or Balance After)

If headers differ, update `src/workers/excelParser.worker.js` to map them.

## Persistence

Statements are stored in IndexedDB so you can refresh without losing data. Use **Clear saved data** to wipe the local cache.

## Contributing

Contributions are welcome. If you want to collaborate:

1. Open an issue describing the feature or bug.
2. Propose a solution or implementation approach.
3. Submit a PR with a clear summary, screenshots (if UI changes), and testing notes.

### Good first ideas

- Improve statement header detection for more banks
- Add search across narration/reference
- Add export to CSV
- Add statement comparison tools

## License

[MIT License](LICENSE)
