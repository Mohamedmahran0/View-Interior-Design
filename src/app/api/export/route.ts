import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectName = (searchParams.get('projectName') as string) || 'Untitled';
    const authorId = (searchParams.get('authorId') as string) || '';

    let fileBuffer: ArrayBuffer;
    let contentType = request.headers.get('Content-Type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return NextResponse.json({ error: 'No file in form data' }, { status: 400 });
      }
      fileBuffer = await file.arrayBuffer();
    } else {
      fileBuffer = await request.arrayBuffer();
    }

    if (fileBuffer.byteLength === 0) {
      return NextResponse.json({ error: 'Empty file' }, { status: 400 });
    }

    const sanitizedName = projectName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const timestamp = Date.now();
    const filename = `${sanitizedName}_${timestamp}.glb`;

    if (supabaseServiceKey) {
      const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

      const folderPath = authorId ? `${authorId}/${filename}` : `anonymous/${filename}`;

      const { error: uploadError } = await serviceClient.storage
        .from('projects')
        .upload(folderPath, fileBuffer, {
          contentType: 'model/gltf-binary',
          upsert: false,
        });

      if (uploadError) {
        console.error('Storage error:', uploadError);
        return NextResponse.json({ error: 'Upload failed', details: uploadError.message }, { status: 500 });
      }

      const { data: urlData } = serviceClient.storage
        .from('projects')
        .getPublicUrl(folderPath);

      const modelUrl = urlData?.publicUrl || '';

      if (authorId) {
        await serviceClient.from('projects').insert({
          user_id: authorId,
          name: projectName,
          model_url: modelUrl,
          status: 'ready',
          is_public: false,
        });
      }

      const viewerUrl = `${new URL(supabaseUrl).origin}/en/viewer?url=${encodeURIComponent(modelUrl)}`;

      return NextResponse.json({
        success: true,
        message: 'Project uploaded to Supabase Storage!',
        viewerUrl: viewerUrl,
        project: { name: projectName, filename: filename },
      });
    }

    const { promises: fs } = await import('fs');
    const path = await import('path');
    const buffer = Buffer.from(fileBuffer);

    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(path.join(uploadDir, filename), buffer);

    const viewerUrl = `http://localhost:3000/ar/viewer?url=/uploads/${filename}`;

    return NextResponse.json({
      success: true,
      message: 'Project saved locally!',
      viewerUrl: viewerUrl,
      project: { name: projectName, filename: filename },
    });

  } catch (error: any) {
    console.error('Export API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
