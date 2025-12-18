import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { User, Task, Record } from "../types";

const STORAGE_KEY_URL = 'kiddos_supabase_url';
const STORAGE_KEY_KEY = 'kiddos_supabase_key';

let supabase: SupabaseClient | undefined;

// Initialize immediately if config exists
try {
  const storedUrl = localStorage.getItem(STORAGE_KEY_URL);
  const storedKey = localStorage.getItem(STORAGE_KEY_KEY);
  
  if (storedUrl && storedKey) {
    supabase = createClient(storedUrl, storedKey);
  }
} catch (e) {
  console.error("Failed to initialize supabase from local storage", e);
  localStorage.removeItem(STORAGE_KEY_URL);
  localStorage.removeItem(STORAGE_KEY_KEY);
}

// Helper to get Client or throw
const getClient = (): SupabaseClient => {
  if (!supabase) throw new Error("SUPABASE_NOT_CONFIGURED");
  return supabase;
};

// Helper to handle Supabase errors consistently
const handleSupabaseError = (error: any) => {
  // Convert object error to readable string if needed
  const message = error?.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
  console.error("Supabase Operation Failed:", message, error);

  // Check for "Table not found" patterns
  if (
    error?.code === '42P01' || 
    message.includes('Could not find the table') || 
    message.includes('schema cache')
  ) {
    throw new Error("TABLE_NOT_FOUND");
  }
  
  throw new Error(message || "Unknown Supabase Error");
};

// Configuration Methods
export const saveSupabaseConfig = (url: string, key: string) => {
  if (!url.startsWith('http') || !key) {
    throw new Error("Invalid Supabase Configuration");
  }
  
  // Save to storage
  localStorage.setItem(STORAGE_KEY_URL, url);
  localStorage.setItem(STORAGE_KEY_KEY, key);
  
  // Initialize immediately without reload
  try {
    supabase = createClient(url, key);
  } catch (e) {
    console.error("Failed to init supabase client:", e);
    throw new Error("Failed to initialize Supabase client");
  }
};

export const resetSupabaseConfig = () => {
  localStorage.removeItem(STORAGE_KEY_URL);
  localStorage.removeItem(STORAGE_KEY_KEY);
  window.location.reload();
};

export const isSupabaseConfigured = () => !!supabase;

// --- USERS ---
export const getUsers = async (): Promise<User[]> => {
  try {
    const { data, error } = await getClient().from('users').select('*');
    if (error) handleSupabaseError(error);
    return data || [];
  } catch (e: any) {
    if (e.message === "SUPABASE_NOT_CONFIGURED") throw e;
    // Rethrow to be handled by App.tsx
    throw e;
  }
};

export const addUser = async (name: string, avatar: string): Promise<User> => {
  const { data, error } = await getClient()
    .from('users')
    .insert([{ name, avatar }])
    .select()
    .single();
  
  if (error) handleSupabaseError(error);
  return data;
};

// --- TASKS ---
export const getTasks = async (childId: string, dayOfWeek?: number): Promise<Task[]> => {
  try {
    let query = getClient().from('tasks').select('*').eq('child_id', childId);
    
    if (dayOfWeek !== undefined) {
      query = query.eq('day_of_week', dayOfWeek);
    }
    
    const { data, error } = await query;
    if (error) handleSupabaseError(error);

    return (data || []).map((t: any) => ({
      id: t.id,
      childId: t.child_id,
      title: t.title,
      dayOfWeek: t.day_of_week
    }));
  } catch (e) {
    console.error("Error getting tasks:", e);
    return [];
  }
};

export const addTask = async (childId: string, title: string, dayOfWeek: number): Promise<Task> => {
  const { data, error } = await getClient()
    .from('tasks')
    .insert([{ child_id: childId, title, day_of_week: dayOfWeek }])
    .select()
    .single();

  if (error) handleSupabaseError(error);

  return {
    id: data.id,
    childId: data.child_id,
    title: data.title,
    dayOfWeek: data.day_of_week
  };
};

export const deleteTask = async (taskId: string) => {
  const { error } = await getClient().from('tasks').delete().eq('id', taskId);
  if (error) handleSupabaseError(error);
};

export const copyRoutine = async (childId: string, fromDay: number, toDay: number) => {
  const client = getClient();

  const { data: sourceTasks, error: fetchError } = await client
    .from('tasks')
    .select('*')
    .eq('child_id', childId)
    .eq('day_of_week', fromDay);

  if (fetchError) handleSupabaseError(fetchError);
  if (!sourceTasks || sourceTasks.length === 0) return;

  const { error: deleteError } = await client
    .from('tasks')
    .delete()
    .eq('child_id', childId)
    .eq('day_of_week', toDay);

  if (deleteError) handleSupabaseError(deleteError);

  const newTasks = sourceTasks.map(t => ({
    child_id: childId,
    title: t.title,
    day_of_week: toDay
  }));

  const { error: insertError } = await client.from('tasks').insert(newTasks);
  if (insertError) handleSupabaseError(insertError);
};

// --- RECORDS ---
export const getTodayRecords = async (childId: string, date: string): Promise<Record[]> => {
  try {
    const { data, error } = await getClient()
      .from('records')
      .select('*')
      .eq('child_id', childId)
      .eq('date', date);

    if (error) handleSupabaseError(error);

    return (data || []).map((r: any) => ({
      id: r.id,
      childId: r.child_id,
      taskId: r.task_id,
      status: r.status,
      reason: r.reason,
      date: r.date
    }));
  } catch (e) {
    console.error("Error getting records:", e);
    return [];
  }
};

export const addRecord = async (record: Omit<Record, 'id'>): Promise<Record> => {
  const { data, error } = await getClient()
    .from('records')
    .insert([{
      child_id: record.childId,
      task_id: record.taskId,
      status: record.status,
      reason: record.reason,
      date: record.date
    }])
    .select()
    .single();

  if (error) handleSupabaseError(error);

  return {
    id: data.id,
    childId: data.child_id,
    taskId: data.task_id,
    status: data.status,
    reason: data.reason,
    date: data.date
  };
};

export const deleteRecord = async (recordId: string) => {
  const { error } = await getClient().from('records').delete().eq('id', recordId);
  if (error) handleSupabaseError(error);
};

export const getWeeklyRecords = async (startDate: string, endDate: string): Promise<Record[]> => {
  try {
    const { data, error } = await getClient()
      .from('records')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate);

    if (error) handleSupabaseError(error);

    return (data || []).map((r: any) => ({
      id: r.id,
      childId: r.child_id,
      taskId: r.task_id,
      status: r.status,
      reason: r.reason,
      date: r.date
    }));
  } catch (e) {
    console.error("Error getting weekly records:", e);
    return [];
  }
};

// --- SECURITY ---
const SETTINGS_DOC_ID = 'global_settings';

export const getParentPin = async (): Promise<string> => {
  try {
    const { data, error } = await getClient()
      .from('settings')
      .select('parent_pin')
      .eq('id', SETTINGS_DOC_ID)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return "0000"; // No rows
      handleSupabaseError(error);
      return "0000"; 
    }
    return data?.parent_pin || "0000";
  } catch (e) {
    if ((e as Error).message === "TABLE_NOT_FOUND") throw e;
    return "0000";
  }
};

export const setParentPin = async (pin: string) => {
  const { error } = await getClient()
    .from('settings')
    .upsert({ id: SETTINGS_DOC_ID, parent_pin: pin });
    
  if (error) handleSupabaseError(error);
};