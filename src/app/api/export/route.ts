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

      if (!authorId) {
        return NextResponse.json({ error: 'authorId is required' }, { status: 400 });
      }

      // ---- Check plan & credits for this user ----
      const { data: profile, error: profileErr } = await serviceClient
        .from('profiles')
        .select('id, subscription_tier, credits_remaining, credits_used')
        .eq('id', authorId)
        .maybeSingle();

      if (profileErr || !profile) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 });
      }

      if (profile.subscription_tier !== 'free' && profile.credits_remaining <= 0) {
        return NextResponse.json(
          { error: 'Insufficient credits. Please upgrade your plan or wait for monthly reset.' },
          { status: 402 }
        );
      }

      if (profile.subscription_tier === 'free' && profile.credits_remaining <= 0) {
        return NextResponse.json(
          { error: 'No credits remaining on the free plan. Upgrade to continue exporting.' },
          { status: 402 }
        );
      }

      // ---- Check max projects limit ----
      const { data: plan } = await serviceClient
        .from('subscription_plans')
        .select('max_projects')
        .ilike('name', profile.subscription_tier)
        .maybeSingle();

      if (plan?.max_projects && plan.max_projects < 999999) {
        const { count } = await serviceClient
          .from('projects')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', authorId);
        if (count != null && count >= plan.max_projects) {
          return NextResponse.json(
            { error: 'Project limit reached for your plan. Upgrade to add more projects.' },
            { status: 402 }
          );
        }
      }

      // ---- Upload file ----
      const folderPath = `${authorId}/${filename}`;

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

      const { error: insertErr } = await serviceClient.from('projects').insert({
        user_id: authorId,
        name: projectName,
        model_url: modelUrl,
        status: 'ready',
        is_public: false,
      });

      if (insertErr) {
        console.error('Project insert error:', insertErr);
        return NextResponse.json({ error: 'Failed to save project', details: insertErr.message }, { status: 500 });
      }

      // ---- Deduct one credit ----
      const { error: creditErr } = await serviceClient
        .from('profiles')
        .update({
          credits_remaining: profile.credits_remaining - 1,
          credits_used: profile.credits_used + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', authorId);

      if (creditErr) {
        console.error('Credit deduction error:', creditErr);
      }

      const viewerUrl = `${new URL(supabaseUrl).origin}/en/viewer?url=${encodeURIComponent(modelUrl)}`;

      return NextResponse.json({
        success: true,
        message: 'Project uploaded to Supabase Storage!',
        viewerUrl: viewerUrl,
        project: { name: projectName, filename: filename },
        credits_remaining: profile.credits_remaining - 1,
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
