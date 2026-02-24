import { openDB } from "idb";

const DB_NAME = "AccountStatementDB";
const DB_VERSION = 1;
const TX_STORE = "transactions";
const META_STORE = "metadata";
const META_KEY = "account";

const getDB = () =>
  openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(TX_STORE)) {
        const store = db.createObjectStore(TX_STORE, { keyPath: "id" });
        store.createIndex("date", "date");
        store.createIndex("credit", "credit");
        store.createIndex("debit", "debit");
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE);
      }
    }
  });

export const saveTransactions = async (transactions, accountInfo) => {
  const db = await getDB();
  const tx = db.transaction([TX_STORE, META_STORE], "readwrite");
  await tx.objectStore(TX_STORE).clear();
  if (transactions && transactions.length > 0) {
    for (const transaction of transactions) {
      await tx.objectStore(TX_STORE).put(transaction);
    }
  }
  await tx.objectStore(META_STORE).put(
    {
      accountInfo: accountInfo || null,
      timestamp: Date.now()
    },
    META_KEY
  );
  await tx.done;
};

export const loadTransactions = async () => {
  const db = await getDB();
  const tx = db.transaction([TX_STORE, META_STORE], "readonly");
  const [transactions, meta] = await Promise.all([
    tx.objectStore(TX_STORE).getAll(),
    tx.objectStore(META_STORE).get(META_KEY)
  ]);
  await tx.done;
  return {
    transactions: transactions || [],
    accountInfo: meta?.accountInfo || null
  };
};

export const clearTransactions = async () => {
  const db = await getDB();
  const tx = db.transaction([TX_STORE, META_STORE], "readwrite");
  await tx.objectStore(TX_STORE).clear();
  await tx.objectStore(META_STORE).delete(META_KEY);
  await tx.done;
};
