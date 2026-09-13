import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const ALLOWED_MODEL_EXTENSIONS = ['glb', 'gltf', 'ply'];
const ALLOWED_IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'avif'];
const MAX_MODEL_SIZE = 200 * 1024 * 1024; // 200 MB
const MAX_THUMBNAIL_SIZE = 5 * 1024 * 1024; // 5 MB

function getExtension(filename: string): string {
  const parts = filename.toLowerCase().split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

function getContentType(ext: string): string {
  if (ext === 'glb') return 'model/gltf-binary';
  if (ext === 'gltf') return 'model/gltf+json';
  if (ext === 'ply') return 'application/octet-stream';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'avif') return 'image/avif';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  return 'image/png';
}

export async function POST(request: Request) {
  try {
    // ---- Authentication from session cookie ----
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'You must be signed in to upload a project.' }, { status: 401 });
    }

    // ---- Parse multipart form ----
    const formData = await request.formData();
    const modelFile = formData.get('model') as File | null;
    const thumbnailFile = formData.get('thumbnail') as File | null;

    if (!modelFile) {
      return NextResponse.json({ error: 'Please select a 3D model file to upload.' }, { status: 400 });
    }

    const projectName = String(formData.get('name') || '').trim();
    if (!projectName) {
      return NextResponse.json({ error: 'Project name is required.' }, { status: 400 });
    }

    const description = String(formData.get('description') || '').trim();
    const category = String(formData.get('category') || '').trim();
    const isPublic = String(formData.get('isPublic')) === 'true';

    const modelExt = getExtension(modelFile.name);
    if (!ALLOWED_MODEL_EXTENSIONS.includes(modelExt)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload a .glb, .gltf or .ply file.' },
        { status: 400 }
      );
    }

    if (modelFile.size <= 0) {
      return NextResponse.json({ error: 'The model file is empty.' }, { status: 400 });
    }
    if (modelFile.size > MAX_MODEL_SIZE) {
      return NextResponse.json({ error: 'Model file exceeds the 200 MB limit.' }, { status: 413 });
    }

    if (thumbnailFile) {
      const thumbExt = getExtension(thumbnailFile.name);
      if (!ALLOWED_IMAGE_EXTENSIONS.includes(thumbExt)) {
        return NextResponse.json(
          { error: 'Unsupported thumbnail format. Please use a PNG, JPG, WEBP or AVIF image.' },
          { status: 400 }
        );
      }
      if (thumbnailFile.size > MAX_THUMBNAIL_SIZE) {
        return NextResponse.json({ error: 'Thumbnail exceeds the 5 MB limit.' }, { status: 413 });
      }
    }

    // ---- Check plan limits and credits ----
    const serviceClient = createServiceClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: profile, error: profileErr } = await serviceClient
      .from('profiles')
      .select('id, subscription_tier, credits_remaining, credits_used, full_name')
      .eq('id', user.id)
      .maybeSingle();

    if (profileErr || !profile) {
      return NextResponse.json({ error: 'Account not found. Please contact support.' }, { status: 404 });
    }

    if (profile.credits_remaining <= 0) {
      return NextResponse.json(
        { error: 'Insufficient credits. Please upgrade your plan or wait for the monthly reset.' },
        { status: 402 }
      );
    }

    const { data: plan } = await serviceClient
      .from('subscription_plans')
      .select('max_projects')
      .ilike('name', profile.subscription_tier)
      .maybeSingle();

    if (plan?.max_projects && plan.max_projects < 999999) {
      const { count } = await serviceClient
        .from('projects')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);
      if (count != null && count >= plan.max_projects) {
        return NextResponse.json(
          { error: 'Project limit reached for your plan. Upgrade to add more projects.' },
          { status: 402 }
        );
      }
    }

    // ---- Upload model file ----
    const sanitizedName = projectName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const timestamp = Date.now();
    const modelPath = `${user.id}/${sanitizedName}_${timestamp}.${modelExt}`;

    const { error: modelUploadError } = await serviceClient.storage
      .from('projects')
      .upload(modelPath, modelFile, {
        contentType: getContentType(modelExt),
        upsert: false,
      });

    if (modelUploadError) {
      console.error('Storage model upload error:', modelUploadError);
      return NextResponse.json(
        { error: 'Failed to upload the model file to storage.', details: modelUploadError.message },
        { status: 500 }
      );
    }

    const { data: modelUrlData } = serviceClient.storage
      .from('projects')
      .getPublicUrl(modelPath);
    const modelUrl = modelUrlData?.publicUrl || '';

    // ---- Upload thumbnail (optional) ----
    let thumbnailUrl: string | null = null;
    if (thumbnailFile) {
      const thumbExt = getExtension(thumbnailFile.name);
      const thumbPath = `${user.id}/${sanitizedName}_${timestamp}_thumb.${thumbExt}`;

      const { error: thumbUploadError } = await serviceClient.storage
        .from('thumbnails')
        .upload(thumbPath, thumbnailFile, {
          contentType: getContentType(thumbExt),
          upsert: false,
        });

      if (thumbUploadError) {
        console.error('Storage thumbnail upload error:', thumbUploadError);
      } else {
        const { data: thumbUrlData } = serviceClient.storage
          .from('thumbnails')
          .getPublicUrl(thumbPath);
        thumbnailUrl = thumbUrlData?.publicUrl || null;
      }
    }

    // ---- Create project record ----
    const { data: project, error: dbError } = await serviceClient
      .from('projects')
      .insert({
        user_id: user.id,
        name: projectName,
        description: description || null,
        category: category || null,
        author_name: profile.full_name || null,
        model_url: modelUrl,
        glb_url: modelExt === 'glb' || modelExt === 'gltf' ? modelUrl : null,
        thumbnail_url: thumbnailUrl,
        status: 'ready',
        is_public: isPublic,
        view_count: 0,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database insert error:', dbError);
      return NextResponse.json(
        { error: 'Failed to create the project record.', details: dbError.message },
        { status: 500 }
      );
    }

    // ---- Deduct one credit ----
    const { error: creditErr } = await serviceClient
      .from('profiles')
      .update({
        credits_remaining: profile.credits_remaining - 1,
        credits_used: profile.credits_used + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (creditErr) {
      console.error('Credit deduction error:', creditErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Project uploaded successfully!',
      project: {
        id: project.id,
        name: project.name,
        model_url: modelUrl,
        thumbnail_url: thumbnailUrl,
        status: project.status,
        is_public: project.is_public,
      },
    });
  } catch (error: unknown) {
    console.error('Project upload error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error.', details: message },
      { status: 500 }
    );
  }
}