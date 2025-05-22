import { FileMetadata, deleteFileMetadata } from './firestore';
import { auth } from '@/config/firebase';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function deleteFile(file: FileMetadata) {
  try {
    // Check if user is authenticated
    if (!auth.currentUser) {
      throw new Error('User not authenticated');
    }

    // Verify file ownership
    if (file.userId !== auth.currentUser.uid) {
      throw new Error('Not authorized to delete this file');
    }

    // First, delete from R2
    const response = await fetch(`${API_URL}/api/files/${file.r2Key}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete file from R2');
    }

    // Then, delete from Firestore
    await deleteFileMetadata(file.id!);

    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
} 