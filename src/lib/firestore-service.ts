import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp, 
  Timestamp,
  DocumentData,
  setDoc,
  limit,
  startAfter
} from 'firebase/firestore';

import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

import { db } from './firebase';

// Types based on your Firestore data
export interface Product {
  id?: string;
  categoryId: string;
  title: string;
  subtitle: string;
  overview: string;
  material_number: string;
  iso: string;
  shank_size: string;
  cutting_condition: string[];
  abrasive: string;
  machine_hp?: string;
  cutting_material?: string;
  application: Array<{
    uses: string;
    icon: string;
  }>;
  images: string[];
  product_img: string;
  overview_img: string;
  overviewPoints: Array<Record<string, string>>;
  related_parts: string[];
  featured?: boolean;
  productPrice: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Category {
  id?: string;
  title: string;
  description: string;
  imageUrl: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface User {
  id?: string;
  email: string;
  phone: string;
  role: 'master' | 'admin' | 'user' | 'pending';
  status: 'active' | 'disabled';
  name: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  notificationsEnabled: {
    sms: boolean;
    email: boolean;
    whatsapp: boolean;
  };
}

export interface LogEntry {
  id: string;
  uid: string;
  action: string;
  details: Record<string, any>;
  timestamp?: Timestamp;
}

export interface RelatedPart {
  id: string;
  title: string;
}

export interface AppUser {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  companyName: string;
  companyGSTNumber: string;
  hashedPassword: string;
  displayName: string;
  isActive: boolean;
  emailVerified: boolean;
  createdAt?: any;
  updatedAt?: any;
  isAuthenticated: boolean;
}

export interface InquiryItemDetail {
  product_id: string;
  product_name: string;
  timestamp: string;
}

export interface InquirySubmission {
  items: InquiryItemDetail[];
  submitted_at: string;
}

export interface CartItem {
  product_id: string;
  product_name: string;
  quantity: number;
  timestamp: string;
}

export interface Inquiry {
  id?: string;
  user_id: string;
  created_at: string;
  inquiry?: InquirySubmission[];
  cart_items?: CartItem[];
}

export interface Notification {
  id?: string;
  name: string;
  description: string;
  time?: Timestamp;
  image?: string;
  link?: string;
}

export interface WhatsNew {
  id?: string;
  name: string;
  description: string;
  time?: Timestamp;
  image?: string;
  link?: string;
}

// Products
export const getProducts = async (): Promise<Product[]> => {
  const productsRef = collection(db, 'products');
  const snapshot = await getDocs(productsRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
};

export const getProduct = async (id: string): Promise<Product | null> => {
  const docRef = doc(db, 'products', id);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Product;
  } else {
    return null;
  }
};

export const createProduct = async (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const productsRef = collection(db, 'products');

  console.log("Creating product...", product)
  const docRef = await addDoc(productsRef, {
    ...product,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return docRef.id;
};

export const updateProduct = async (id: string, product: Partial<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
  const docRef = doc(db, 'products', id);
  await updateDoc(docRef, {
    ...product,
    updatedAt: serverTimestamp()
  });
};

export const deleteProduct = async (id: string): Promise<void> => {
  const docRef = doc(db, 'products', id);
  await deleteDoc(docRef);
};

// Categories
export const getCategories = async (): Promise<Category[]> => {
  const categoriesRef = collection(db, 'categories');
  const snapshot = await getDocs(categoriesRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
};

export const getCategory = async (id: string): Promise<Category | null> => {
  const docRef = doc(db, 'categories', id);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Category;
  } else {
    return null;
  }
};

export async function getCategoryById(categoryId: string) {
  try {
    const categoryRef = doc(db, 'categories', categoryId);
    const categorySnap = await getDoc(categoryRef);

    if (categorySnap.exists()) {
      return { id: categorySnap.id, ...categorySnap.data() } as Category;
    } else {
      throw new Error('Category not found');
    }
  } catch (error) {
    console.error('Error fetching category:', error);
    throw error;
  }
}

const storage = getStorage();

export async function uploadFile(file: File, path: string): Promise<string> {
  try {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
}

// Function to create a slug from a name
const createSlug = (name: string): string => {
  let slug = name.toLowerCase();
  slug = slug.replace(/\s+/g, '-');  // Replace spaces with hyphens
  slug = slug.replace(/[^a-z0-9\-]/g, '');  // Remove non-alphanumeric characters
  slug = slug.substring(0, 50);  // Limit to 50 characters for safety
  return slug;
};

export const createCategory = async (category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const categoriesRef = collection(db, 'categories');
  
  // Create the slug from the category name
  const categorySlug = createSlug(category.title);

  // Reference to the document with the custom ID (slug)
  const categoryRef = doc(categoriesRef, categorySlug);

  try {
    // Set the document with the custom ID
    await setDoc(categoryRef, {
      ...category,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    console.log("Category created successfully with slug:", categorySlug);
    
    return categorySlug;  // Return the custom ID (slug)
  } catch (error) {
    console.error("Error creating category:", error);
    throw new Error("Failed to create category");
  }
};

export const updateCategory = async (id: string, category: Partial<Omit<Category, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
  const docRef = doc(db, 'categories', id);
  await updateDoc(docRef, {
    ...category,
    updatedAt: serverTimestamp()
  });
};

export const deleteCategory = async (id: string): Promise<void> => {
  const docRef = doc(db, 'categories', id);
  await deleteDoc(docRef);
};

// Users
export const getUsers = async (): Promise<User[]> => {
  const usersRef = collection(db, 'users');
  const snapshot = await getDocs(usersRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
};

export const getUser = async (id: string): Promise<User | null> => {
  const docRef = doc(db, 'users', id);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as User;
  } else {
    return null;
  }
};

export const updateUser = async (id: string, userData: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
  const docRef = doc(db, 'users', id);
  await updateDoc(docRef, {
    ...userData,
    updatedAt: serverTimestamp()
  });
};

// Logs
export const createLogEntry = async (logEntry: Omit<LogEntry, 'id' | 'timestamp'>): Promise<string> => {
  const logsRef = collection(db, 'logs');
  const docRef = await addDoc(logsRef, {
    ...logEntry,
    timestamp: serverTimestamp()
  });
  return docRef.id;
};

export const getLogs = async (pageSize: number = 10, lastVisible: DocumentData | null = null): Promise<{ logs: LogEntry[], lastVisible: DocumentData | null }> => {
  const logsRef = collection(db, 'logs');
  let q = query(logsRef, orderBy('timestamp', 'desc'), limit(pageSize));

  if (lastVisible) {
    q = query(logsRef, orderBy('timestamp', 'desc'), startAfter(lastVisible), limit(pageSize));
  }

  const snapshot = await getDocs(q);
  const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LogEntry));
  const newLastVisible = snapshot.docs[snapshot.docs.length - 1];

  return { logs, lastVisible: newLastVisible };
};


export const getInquiries = async (): Promise<Inquiry[]> => {
  try {
    const inquiriesCollection = collection(db, 'inquiries');
    const snapshot = await getDocs(inquiriesCollection);
    const inquiries = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Inquiry));
    return inquiries;
  } catch (error) {
    console.error('Error fetching inquiries:', error);
    throw error;
  }
};

export const getRelatedParts = async (): Promise<RelatedPart[]> => {
  const relatedPartsRef = collection(db, 'related_parts');
  const snapshot = await getDocs(relatedPartsRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RelatedPart));
};

// App Users
export const getAppUsers = async (): Promise<AppUser[]> => {
  const appUsersRef = collection(db, 'app_users');
  const snapshot = await getDocs(appUsersRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser));
};

export const updateAppUser = async (id: string, userData: Partial<Omit<AppUser, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
  const docRef = doc(db, 'app_users', id);
  await updateDoc(docRef, {
    ...userData,
    updatedAt: serverTimestamp()
  });
};

// Notifications
export const getNotifications = async (): Promise<Notification[]> => {
  try {
    const notificationsRef = collection(db, 'notifications');
    const snapshot = await getDocs(notificationsRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
};

export const createNotification = async (notification: Omit<Notification, 'id' | 'time'>): Promise<string> => {
  const notificationsRef = collection(db, 'notifications');
  const docRef = await addDoc(notificationsRef, {
    ...notification,
    time: serverTimestamp(),
  });
  return docRef.id;
};

export const updateNotification = async (id: string, notification: Partial<Omit<Notification, 'id' | 'time'>>): Promise<void> => {
  const docRef = doc(db, 'notifications', id);
  await updateDoc(docRef, {
    ...notification,
  });
};

export const deleteNotification = async (id: string): Promise<void> => {
  const docRef = doc(db, 'notifications', id);
  await deleteDoc(docRef);
};

// What's New
export const getWhatsNew = async (): Promise<WhatsNew[]> => {
  try {
    const whatsNewRef = collection(db, 'whatsNew');
    const snapshot = await getDocs(whatsNewRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WhatsNew));
  } catch (error) {
    console.error('Error fetching whats new:', error);
    throw error;
  }
};

export const createWhatsNew = async (whatsNew: Omit<WhatsNew, 'id' | 'time'>): Promise<string> => {
  const whatsNewRef = collection(db, 'whatsNew');
  const docRef = await addDoc(whatsNewRef, {
    ...whatsNew,
    time: serverTimestamp(),
  });
  return docRef.id;
};

export const deleteWhatsNew = async (id: string): Promise<void> => {
  const docRef = doc(db, 'whatsNew', id);
  await deleteDoc(docRef);
};
