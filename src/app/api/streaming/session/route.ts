import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await request.json().catch(() => ({}));
    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Retrieve project details
    const { data: project, error: projErr } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projErr || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Matchmaker & GPU instance scheduling
    // In production, Matchmaker matches an active UE5 instance on AWS g4dn / Azure NV series
    const instanceId = `ue5-gpu-inst-${Math.floor(Math.random() * 8) + 1}`;
    const signalingHost = process.env.NEXT_PUBLIC_SIGNALING_SERVER_URL || 'wss://signaling.viewinteriordesign.com';
    const signalingUrl = `${signalingHost}:8888?project=${projectId}&instance=${instanceId}`;

    // Record session in database
    const { data: sessionRecord, error: sessErr } = await supabase
      .from('streaming_sessions')
      .insert({
        project_id: projectId,
        designer_id: user?.id || null,
        instance_id: instanceId,
        signaling_url: signalingUrl,
        status: 'active',
        connection_quality: {
          target_bitrate_bps: 20000000, // 20 Mbps CBR
          max_fps: 60,
          encoder: 'NVENC',
          renderer: 'UE5 Lumen+Nanite',
        },
      })
      .select()
      .single();

    return NextResponse.json({
      success: true,
      sessionId: sessionRecord?.id || `sess-${Date.now()}`,
      instanceId,
      signalingUrl,
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
      streamConfig: {
        maxFps: 60,
        targetBitrate: 20000000,
        rateControl: 'CBR',
      },
      phases: project.scene_metadata?.phases || [
        { id: 1, name: 'Phase 1: Original State' },
        { id: 2, name: 'Phase 2: After Renovation' },
        { id: 3, name: 'Phase 3: Furnished Luxury' },
      ],
    });
  } catch (error: any) {
    console.error('Streaming session error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
