import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// This endpoint receives the .glb file from the 3ds Max Plugin and returns a shareable link
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const { searchParams } = new URL(request.url);
    
    // Read the fields (supports both FormData and Query Params for MaxScript flexibility)
    const projectName = (formData.get('projectName') as string) || (searchParams.get('projectName') as string);
    const file = formData.get('file') as File;

    if (!file || !projectName) {
      return NextResponse.json(
        { error: 'Missing required fields: file, projectName' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Sanitize filename and create unique name
    const sanitizedName = projectName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${sanitizedName}_${Date.now()}.glb`;
    
    // Save locally to public/uploads so it can be served statically by Next.js
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(path.join(uploadDir, filename), buffer);

    // Generate the viewer URL to return to the 3ds Max plugin
    // In production this would be the live domain
    const viewerUrl = `http://localhost:3000/ar/viewer?url=/uploads/${filename}`;

    return NextResponse.json({
      success: true,
      message: 'Project received successfully!',
      viewerUrl: viewerUrl,
      project: {
        name: projectName,
        filename: filename
      }
    });

  } catch (error: any) {
    console.error('Plugin API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
