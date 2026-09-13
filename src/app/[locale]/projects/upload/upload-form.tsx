'use client';

import { useState, useRef, useCallback } from 'react';
import { useSupabase } from '@/providers/supabase-provider';
import { Link, useRouter } from '@/i18n/routing';
import {
  ArrowLeft,
  UploadCloud,
  FileBox,
  ImagePlus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Globe,
  Lock,
  X,
  Sparkles,
  Upload,
} from 'lucide-react';

const CATEGORIES = [
  { id: 'livingRoom', label: 'Living Room' },
  { id: 'bedroom', label: 'Bedroom' },
  { id: 'kitchen', label: 'Kitchen' },
  { id: 'bathroom', label: 'Bathroom' },
  { id: 'office', label: 'Office' },
  { id: 'commercial', label: 'Commercial' },
  { id: 'outdoor', label: 'Outdoor' },
];

const MODEL_ACCEPT = '.glb,.gltf,.ply';
const IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp,image/avif';

export default function UploadForm() {
  const { user, loading: userLoading } = useSupabase();
  const router = useRouter();

  const [model, setModel] = useState<File | null>(null);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const modelInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) setModel(file);
  }, []);

  const handleModelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setModel(file);
    if (!name.trim()) {
      setName(file.name.replace(/\.[^.]+$/, ''));
    }
    setError('');
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setThumbnail(file);
    const url = URL.createObjectURL(file);
    setThumbnailPreview(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
      setError('You must be signed in to upload a project.');
      return;
    }
    if (!model) {
      setError('Please choose a 3D model file (.glb, .gltf or .ply).');
      return;
    }
    if (!name.trim()) {
      setError('Project name is required.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('model', model);
      formData.append('name', name.trim());
      formData.append('description', description.trim());
      formData.append('category', category);
      formData.append('isPublic', String(isPublic));
      if (thumbnail) {
        formData.append('thumbnail', thumbnail);
      }

      const res = await fetch('/api/projects/upload', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Upload failed. Please try again.');
        if (res.status === 401) {
          router.push('/login');
        }
        return;
      }

      setSuccess('Project uploaded successfully! Redirecting...');
      setTimeout(() => {
        router.push('/projects');
        router.refresh();
      }, 1200);
    } catch (err) {
      console.error('Upload error:', err);
      setError('Upload failed. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-[2rem] p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-6">
            <UploadCloud size={32} className="text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Sign in required</h1>
          <p className="text-white/50 mb-8">
            Create an account or sign in to upload and manage your projects.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/signup"
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 font-bold transition"
            >
              Create Account
            </Link>
            <Link
              href="/login"
              className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 font-semibold transition"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <Link
        href="/projects"
        className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-emerald-400 transition mb-6"
      >
        <ArrowLeft size={16} />
        Back to My Projects
      </Link>

      <h1 className="text-3xl font-bold tracking-tight mb-2">Upload Project</h1>
      <p className="text-white/50 mb-8">
        Upload a 3D model exported from the 3ds Max plugin or your own GLB, GLTF or PLY file. It will be
        saved under your profile.
      </p>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Model file dropzone */}
        <div>
          <label className="block text-sm font-medium text-white/70 mb-2">
            Project Model <span className="text-red-400">*</span>
          </label>
          <input
            ref={modelInputRef}
            type="file"
            accept={MODEL_ACCEPT}
            onChange={handleModelChange}
            className="hidden"
          />
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => modelInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
              dragOver
                ? 'border-emerald-500 bg-emerald-500/10'
                : model
                  ? 'border-emerald-500/50 bg-emerald-500/5'
                  : 'border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/[0.07]'
            }`}
          >
            {model ? (
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-4">
                  <CheckCircle2 size={28} className="text-emerald-400" />
                </div>
                <p className="font-semibold truncate max-w-full">{model.name}</p>
                <p className="text-sm text-white/50 mt-1">
                  {(model.size / (1024 * 1024)).toFixed(2)} MB
                </p>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setModel(null); }}
                  className="mt-4 flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 transition"
                >
                  <X size={14} /> Remove file
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                  <FileBox size={28} className="text-white/40" />
                </div>
                <p className="font-semibold">Drag & drop your model here</p>
                <p className="text-sm text-white/50 mt-1">or click to browse</p>
                <p className="text-xs text-white/30 mt-4">Supported formats: .glb, .gltf, .ply (up to 200 MB)</p>
              </div>
            )}
          </div>
        </div>

        {/* Thumbnail */}
        <div>
          <label className="block text-sm font-medium text-white/70 mb-2">
            Thumbnail <span className="text-white/30 font-normal">(optional)</span>
          </label>
          <input
            ref={thumbInputRef}
            type="file"
            accept={IMAGE_ACCEPT}
            onChange={handleThumbnailChange}
            className="hidden"
          />
          <div
            onClick={() => thumbInputRef.current?.click()}
            className="relative border border-white/10 rounded-2xl p-6 text-center cursor-pointer bg-white/5 hover:bg-white/[0.07] transition"
          >
            {thumbnailPreview ? (
              <div className="flex items-center justify-center">
                <img src={thumbnailPreview} alt="" className="max-h-56 rounded-xl object-contain" />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <ImagePlus size={24} className="text-white/40" />
                <p className="text-sm text-white/50">Click to add a thumbnail image</p>
              </div>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-white/70 mb-2">
              Project Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Modern Living Room Walkthrough"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500/50 text-white placeholder:text-white/30 transition"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-white/70 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your design, materials and atmosphere..."
              rows={3}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500/50 text-white placeholder:text-white/30 transition resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500/50 text-white transition appearance-none"
            >
              <option value="" className="bg-neutral-900">Uncategorized</option>
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id} className="bg-neutral-900">
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-3 w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl cursor-pointer hover:bg-white/[0.07] transition">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="w-4 h-4 accent-emerald-500"
              />
              <span className="flex items-center gap-2 text-sm text-white/70">
                {isPublic ? <Globe size={15} className="text-emerald-400" /> : <Lock size={15} className="text-white/40" />}
                {isPublic ? 'Public' : 'Private'}
              </span>
            </label>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center flex items-center justify-center gap-2">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {success && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm text-center flex items-center justify-center gap-2">
            <CheckCircle2 size={16} />
            {success}
          </div>
        )}

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-start gap-3">
          <Sparkles size={18} className="text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-sm text-white/50 leading-relaxed">
            Uploading a project uses <span className="text-white font-semibold">1 credit</span>. You can
            manage your plan and credits from your account settings.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed font-bold transition shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]"
        >
          {loading ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload size={20} />
              Upload Project
            </>
          )}
        </button>
      </form>
    </div>
  );
}