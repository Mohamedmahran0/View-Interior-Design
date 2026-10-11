import * as tus from 'tus-js-client';
import { createClient } from '@/utils/supabase/client';

export interface ResumableUploadOptions {
  file: File;
  projectId: string;
  userId: string;
  onProgress?: (percentage: number, bytesUploaded: number, bytesTotal: number) => void;
}

/**
 * TUS Resumable Upload Service for large GLB and HDR files (> 6MB).
 * Connects directly to Supabase Storage resumable endpoint using 6MB chunking.
 */
export async function uploadGLBResumable({
  file,
  projectId,
  userId,
  onProgress,
}: ResumableUploadOptions): Promise<string> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Authentication session required for resumable GLB upload.');
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const projectRef = supabaseUrl.replace(/^https?:\/\//, '').split('.')[0];
  const endpoint = `https://${projectRef}.storage.supabase.co/storage/v1/upload/resumable`;
  const objectPath = `${userId}/${projectId}/scene.glb`;

  return new Promise((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        authorization: `Bearer ${session.access_token}`,
        'x-upsert': 'true',
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: 'models',
        objectName: objectPath,
        contentType: 'model/gltf-binary',
      },
      chunkSize: 6 * 1024 * 1024, // MUST be 6MB per Supabase TUS spec
      onError: (error) => {
        console.error('TUS Upload Error:', error);
        reject(error);
      },
      onProgress: (bytesUploaded, bytesTotal) => {
        const percentage = parseFloat(((bytesUploaded / bytesTotal) * 100).toFixed(2));
        if (onProgress) {
          onProgress(percentage, bytesUploaded, bytesTotal);
        }
      },
      onSuccess: () => {
        // Construct public URL from Supabase Storage
        const publicUrl = `${supabaseUrl}/storage/v1/object/public/models/${objectPath}`;
        resolve(publicUrl);
      },
    });

    // Check for previous uploads to resume interrupted transfers
    upload.findPreviousUploads().then((previousUploads) => {
      if (previousUploads.length > 0) {
        upload.resumeFromPreviousUpload(previousUploads[0]);
      }
      upload.start();
    }).catch((err) => {
      console.warn('Failed to find previous uploads, starting fresh:', err);
      upload.start();
    });
  });
}
