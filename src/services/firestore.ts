import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs,
  deleteDoc,
  doc,
  serverTimestamp
} from 'firebase/firestore';
import { auth } from '@/config/firebase';

const db = getFirestore();

export interface FileMetadata {
  id?: string;
  filename: string;
  r2Key: string;
  userId: string;
  uploadedAt: Date;
  fileType: string;
  size: number;
  totalRows: number;
  totalColumns: number;
  numericColumns: string[];
  categoricalColumns: string[];
}

export const saveFileMetadata = async (metadata: Omit<FileMetadata, 'id' | 'userId' | 'uploadedAt'>) => {
  if (!auth.currentUser) {
    throw new Error('User not authenticated');
  }

  const fileData = {
    ...metadata,
    userId: auth.currentUser.uid,
    uploadedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, 'files'), fileData);
  return { ...fileData, id: docRef.id };
};

export const getUserFiles = async () => {
  if (!auth.currentUser) {
    throw new Error('User not authenticated');
  }

  const filesQuery = query(
    collection(db, 'files'),
    where('userId', '==', auth.currentUser.uid)
  );

  const snapshot = await getDocs(filesQuery);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as FileMetadata[];
};

export const deleteFileMetadata = async (fileId: string) => {
  if (!auth.currentUser) {
    throw new Error('User not authenticated');
  }

  await deleteDoc(doc(db, 'files', fileId));
}; 