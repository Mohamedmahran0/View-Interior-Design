import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid Authorization header' }, { status: 401 });
    }
    const accessToken = authHeader.replace('Bearer ', '');

    const userClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser(accessToken);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid or expired session. Please login again.' }, { status: 401 });
    }

    // ---- Check plan & credits before upload ----
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: profile, error: profileErr } = await serviceClient
      .from('profiles')
      .select('id, subscription_tier, credits_remaining, credits_used')
      .eq('id', user.id)
      .maybeSingle();

    if (profileErr || !profile) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    if (profile.credits_remaining <= 0) {
      return NextResponse.json(
        { error: 'Insufficient credits. Please upgrade your plan or wait for monthly reset.' },
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

    const { searchParams } = new URL(request.url);
    const projectName = searchParams.get('projectName') || 'Untitled';
    const description = searchParams.get('description') || '';
    const isPublic = searchParams.get('isPublic') === 'true';

    const contentType = request.headers.get('Content-Type') || '';
    let fileBuffer: ArrayBuffer;
    let fileName: string;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return NextResponse.json({ error: 'No file provided in form data' }, { status: 400 });
      }
      fileBuffer = await file.arrayBuffer();
      fileName = file.name;
    } else {
      fileBuffer = await request.arrayBuffer();
      fileName = `${projectName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.glb`;
    }

    if (fileBuffer.byteLength === 0) {
      return NextResponse.json({ error: 'Empty file received' }, { status: 400 });
    }

    const sanitizedName = projectName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const timestamp = Date.now();
    const storagePath = `${user.id}/${sanitizedName}_${timestamp}.glb`;

    const { error: uploadError } = await serviceClient.storage
      .from('projects')
      .upload(storagePath, fileBuffer, {
        contentType: 'model/gltf-binary',
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload file to storage', details: uploadError.message }, { status: 500 });
    }

    const { data: urlData } = serviceClient.storage
      .from('projects')
      .getPublicUrl(storagePath);

    const modelUrl = urlData?.publicUrl || '';

    const { data: project, error: dbError } = await serviceClient
      .from('projects')
      .insert({
        user_id: user.id,
        name: projectName,
        description: description,
        model_url: modelUrl,
        status: 'ready',
        is_public: isPublic,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database insert error:', dbError);
      return NextResponse.json({ error: 'Failed to create project record', details: dbError.message }, { status: 500 });
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

    const viewerUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(supabaseUrl).origin : 'http://localhost:3000'}/en/view/${project.id}`;

    return NextResponse.json({
      success: true,
      message: 'Project exported and uploaded successfully!',
      viewerUrl: viewerUrl,
      project: {
        id: project.id,
        name: project.name,
        model_url: modelUrl,
        status: project.status,
      },
    });

  } catch (error: any) {
    console.error('Plugin upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
