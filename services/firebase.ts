import * as firebaseApp from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  setDoc, 
  getDoc, 
  writeBatch,
  Firestore 
} from 'firebase/firestore';
import { User, Task, Record } from "../types";

const STORAGE_KEY = 'kiddos_firebase_config';

let app: any;
let db: Firestore | undefined;

// Initialize immediately if config exists
try {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const config = JSON.parse(stored);
    app = firebaseApp.initializeApp(config);
    db = getFirestore(app);
  }
} catch (e) {
  console.error("Failed to initialize firebase from local storage", e);
  localStorage.removeItem(STORAGE_KEY);
}

// Helper to get DB or throw
const getDb = (): Firestore => {
  if (!db) throw new Error("FIREBASE_NOT_CONFIGURED");
  return db;
};

// Configuration Methods
export const saveFirebaseConfig = (configJson: string) => {
  try {
    // Validate JSON
    const config = JSON.parse(configJson);
    if (!config.apiKey || !config.projectId) {
      throw new Error("Invalid Configuration Object");
    }
    localStorage.setItem(STORAGE_KEY, configJson);
    window.location.reload(); // Reload to re-initialize cleanly
  } catch (e) {
    throw e;
  }
};

export const resetFirebaseConfig = () => {
  localStorage.removeItem(STORAGE_KEY);
  window.location.reload();
};

export const isFirebaseConfigured = () => !!db;

// Helper helper to map doc to data with id
const mapDoc = <T>(doc: any): T => ({ id: doc.id, ...doc.data() } as T);

// --- USERS ---
export const getUsers = async (): Promise<User[]> => {
  try {
    const querySnapshot = await getDocs(collection(getDb(), "users"));
    return querySnapshot.docs.map(doc => mapDoc<User>(doc));
  } catch (e: any) {
    console.error("Error getting users:", e);
    // Propagate the specific config error
    if (e.message === "FIREBASE_NOT_CONFIGURED") throw e;
    throw e;
  }
};

export const addUser = async (name: string, avatar: string): Promise<User> => {
  const docRef = await addDoc(collection(getDb(), "users"), { name, avatar });
  return { id: docRef.id, name, avatar };
};

// --- TASKS ---
export const getTasks = async (childId: string, dayOfWeek?: number): Promise<Task[]> => {
  try {
    let q = query(collection(getDb(), "tasks"), where("childId", "==", childId));
    
    if (dayOfWeek !== undefined) {
      q = query(q, where("dayOfWeek", "==", dayOfWeek));
    }
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => mapDoc<Task>(doc));
  } catch (e) {
    console.error("Error getting tasks:", e);
    return [];
  }
};

export const addTask = async (childId: string, title: string, dayOfWeek: number): Promise<Task> => {
  const docRef = await addDoc(collection(getDb(), "tasks"), { childId, title, dayOfWeek });
  return { id: docRef.id, childId, title, dayOfWeek };
};

export const deleteTask = async (taskId: string) => {
  await deleteDoc(doc(getDb(), "tasks", taskId));
};

export const copyRoutine = async (childId: string, fromDay: number, toDay: number) => {
  const _db = getDb();
  const batch = writeBatch(_db);

  // 1. Get source tasks
  const sourceQuery = query(
    collection(_db, "tasks"), 
    where("childId", "==", childId), 
    where("dayOfWeek", "==", fromDay)
  );
  const sourceSnapshot = await getDocs(sourceQuery);

  // 2. Get existing tasks on target day to clear them (overwrite mode)
  const targetQuery = query(
    collection(_db, "tasks"), 
    where("childId", "==", childId), 
    where("dayOfWeek", "==", toDay)
  );
  const targetSnapshot = await getDocs(targetQuery);

  // 3. Delete existing tasks on target day
  targetSnapshot.forEach((doc) => {
    batch.delete(doc.ref);
  });

  // 4. Create new tasks
  sourceSnapshot.forEach((sourceDoc) => {
    const data = sourceDoc.data();
    const newRef = doc(collection(_db, "tasks")); // auto-id
    batch.set(newRef, {
      childId: data.childId,
      title: data.title,
      dayOfWeek: toDay
    });
  });

  await batch.commit();
};

// --- RECORDS ---
export const getTodayRecords = async (childId: string, date: string): Promise<Record[]> => {
  try {
    const q = query(
      collection(getDb(), "records"), 
      where("childId", "==", childId),
      where("date", "==", date)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => mapDoc<Record>(doc));
  } catch (e) {
    console.error("Error getting records:", e);
    return [];
  }
};

export const addRecord = async (record: Omit<Record, 'id'>): Promise<Record> => {
  const docRef = await addDoc(collection(getDb(), "records"), record);
  return { id: docRef.id, ...record } as Record;
};

export const deleteRecord = async (recordId: string) => {
  await deleteDoc(doc(getDb(), "records", recordId));
};

export const getWeeklyRecords = async (startDate: string, endDate: string): Promise<Record[]> => {
  try {
    // Firestore string comparison works for YYYY-MM-DD
    const q = query(
      collection(getDb(), "records"),
      where("date", ">=", startDate),
      where("date", "<=", endDate)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => mapDoc<Record>(doc));
  } catch (e) {
    console.error("Error getting weekly records:", e);
    return [];
  }
};

// --- SECURITY (Simple PIN stored in a settings document) ---
const SETTINGS_DOC_ID = 'global_settings';

export const getParentPin = async (): Promise<string> => {
  try {
    const docRef = doc(getDb(), "settings", SETTINGS_DOC_ID);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().parentPin || "0000";
    }
    return "0000";
  } catch (e) {
    console.error("Error getting pin:", e);
    return "0000";
  }
};

export const setParentPin = async (pin: string) => {
  await setDoc(doc(getDb(), "settings", SETTINGS_DOC_ID), { parentPin: pin }, { merge: true });
};