'use client';

import React, { useState, useRef, useEffect } from 'react';
import Modal from '@/components/Modal';
import {
  Upload,
  Camera,
  Image as ImageIcon,
  Check,
  Trash2,
  Sparkles,
  Link as LinkIcon,
  RefreshCw,
  UserCheck,
} from 'lucide-react';

interface EmployeePhotoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPhoto?: string | null;
  employeeName?: string;
  onSave: (photoUrl: string) => Promise<void> | void;
}

export const CORPORATE_PORTRAITS = [
  { id: 'p1', name: 'Executive Director (Arthur)', url: '/employees/arthur-pendelton.jpg', tag: 'Executive' },
  { id: 'p2', name: 'HR & Talent Lead (Elena)', url: '/employees/elena-rostova.jpg', tag: 'HR / People' },
  { id: 'p3', name: 'Engineering Lead (Marcus)', url: '/employees/marcus-vance.jpg', tag: 'Tech Lead' },
  { id: 'p4', name: 'Senior Engineer (John)', url: '/employees/john-doe.jpg', tag: 'Engineering' },
  { id: 'p5', name: 'Creative Design Lead (Sarah)', url: '/employees/sarah-smith.jpg', tag: 'Design / UX' },
  { id: 'p6', name: 'Field Sales Rep (Alex)', url: '/employees/alex-wong.jpg', tag: 'Field Sales' },
  { id: 'p7', name: 'Dealer Partner (Vikas)', url: '/employees/vikas-malhotra.jpg', tag: 'Partner' },
  { id: 'p8', name: 'Corporate VP (Portrait 1)', url: '/employees/avatar-exec-1.jpg', tag: 'Leadership' },
  { id: 'p9', name: 'Product Architect (Portrait 2)', url: '/employees/avatar-exec-2.jpg', tag: 'Product' },
  { id: 'p10', name: 'Senior Developer (Portrait 3)', url: '/employees/avatar-exec-3.jpg', tag: 'Tech' },
  { id: 'p11', name: 'Operations Manager (Portrait 4)', url: '/employees/avatar-exec-4.jpg', tag: 'Operations' },
  { id: 'p12', name: 'Solutions Consultant (Portrait 5)', url: '/employees/avatar-exec-5.jpg', tag: 'Enterprise' },
  { id: 'p13', name: 'Finance Controller (Portrait 6)', url: '/employees/avatar-exec-6.jpg', tag: 'Finance' },
];

export default function EmployeePhotoUploadModal({
  isOpen,
  onClose,
  currentPhoto,
  employeeName = 'Employee',
  onSave,
}: EmployeePhotoUploadModalProps) {
  const [activeTab, setActiveTab] = useState<'presets' | 'upload' | 'camera' | 'url'>('presets');
  const [selectedPhoto, setSelectedPhoto] = useState<string>(currentPhoto || '');
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedPhoto(currentPhoto || '');
      setErrorMsg(null);
      setIsCameraActive(false);
    } else {
      stopCamera();
    }
  }, [isOpen, currentPhoto]);

  // Handle camera stop
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const startCamera = async () => {
    try {
      setErrorMsg(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 640 }, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: any) {
      setErrorMsg('Camera access failed or permission denied: ' + (err.message || 'Unknown error'));
      setIsCameraActive(false);
    }
  };

  const captureCameraSnapshot = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw center square crop
    const v = videoRef.current;
    const size = Math.min(v.videoWidth, v.videoHeight);
    const startX = (v.videoWidth - size) / 2;
    const startY = (v.videoHeight - size) / 2;
    ctx.drawImage(v, startX, startY, size, size, 0, 0, 400, 400);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setSelectedPhoto(dataUrl);
    stopCamera();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select an image file (PNG, JPG, WebP)');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setErrorMsg('Image size must be under 8MB');
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setSelectedPhoto(data.url);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to upload photo');
    } finally {
      setIsUploading(false);
    }
  };

  const handleApplyUrl = () => {
    if (!urlInput.trim()) return;
    setSelectedPhoto(urlInput.trim());
    setUrlInput('');
  };

  const handleSave = async () => {
    try {
      setIsUploading(true);
      setErrorMsg(null);

      // If it's a data URL, upload to get persistent file URL
      let finalUrl = selectedPhoto;
      if (selectedPhoto.startsWith('data:image/')) {
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64Data: selectedPhoto }),
        });
        const data = await res.json();
        if (res.ok && data.url) {
          finalUrl = data.url;
        }
      }

      await onSave(finalUrl);
      stopCamera();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update employee photo');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    try {
      setIsUploading(true);
      await onSave('');
      setSelectedPhoto('');
      stopCamera();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to remove photo');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        stopCamera();
        onClose();
      }}
      title={`Update Profile Photo`}
      description={`Set an executive, high-resolution portrait for ${employeeName}`}
      maxWidthClass="max-w-2xl"
    >
      <div className="space-y-5">
        {/* Top Current Preview & Identity */}
        <div className="flex flex-col sm:flex-row items-center gap-4 rounded-2xl bg-slate-50 p-4 border border-slate-200/80 dark:bg-slate-800/50 dark:border-slate-700">
          <div className="relative shrink-0">
            <div className="h-20 w-20 rounded-2xl overflow-hidden border-2 border-brand-500 shadow-md bg-brand-50 flex items-center justify-center dark:bg-brand-950">
              {selectedPhoto ? (
                <img
                  src={selectedPhoto}
                  alt={employeeName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-xl font-black text-brand-600 dark:text-brand-300">
                  {employeeName.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            {selectedPhoto && (
              <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white shadow">
                <Check className="h-3.5 w-3.5" />
              </span>
            )}
          </div>

          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">{employeeName}</h4>
              <span className="rounded-md bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-600 dark:bg-brand-950 dark:text-brand-300">
                Active Profile
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {selectedPhoto ? 'Photo selected and ready to apply across the company directory.' : 'No custom photo selected yet. Choose from the gallery below or upload.'}
            </p>
          </div>

          {selectedPhoto && (
            <button
              onClick={handleRemovePhoto}
              type="button"
              className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400"
              title="Remove Profile Photo"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Remove</span>
            </button>
          )}
        </div>

        {errorMsg && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 dark:bg-rose-950/40 dark:border-rose-900/50 dark:text-rose-300">
            {errorMsg}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => {
              stopCamera();
              setActiveTab('presets');
            }}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-all ${
              activeTab === 'presets'
                ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Corporate Headshots ({CORPORATE_PORTRAITS.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              stopCamera();
              setActiveTab('upload');
            }}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-all ${
              activeTab === 'upload'
                ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Upload File</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('camera');
              startCamera();
            }}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-all ${
              activeTab === 'camera'
                ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            <Camera className="h-3.5 w-3.5" />
            <span>Take Photo</span>
          </button>

          <button
            type="button"
            onClick={() => {
              stopCamera();
              setActiveTab('url');
            }}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-all ${
              activeTab === 'url'
                ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            <LinkIcon className="h-3.5 w-3.5" />
            <span>Image URL</span>
          </button>
        </div>

        {/* Tab 1: Corporate Headshot Library */}
        {activeTab === 'presets' && (
          <div className="space-y-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select an authentic, high-resolution corporate business portrait from our executive collection:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-72 overflow-y-auto pr-1">
              {CORPORATE_PORTRAITS.map((portrait) => {
                const isSelected = selectedPhoto === portrait.url;
                return (
                  <button
                    key={portrait.id}
                    type="button"
                    onClick={() => setSelectedPhoto(portrait.url)}
                    className={`relative group flex flex-col items-center rounded-2xl p-2.5 border text-left transition-all ${
                      isSelected
                        ? 'border-brand-600 bg-brand-50/70 shadow-md ring-2 ring-brand-500/30 dark:bg-brand-950/40 dark:border-brand-500'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900'
                    }`}
                  >
                    <div className="relative h-20 w-20 rounded-xl overflow-hidden shadow-inner">
                      <img
                        src={portrait.url}
                        alt={portrait.name}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      {isSelected && (
                        <div className="absolute inset-0 bg-brand-600/30 flex items-center justify-center">
                          <Check className="h-6 w-6 text-white drop-shadow-md stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <span className="mt-2 text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate w-full text-center">
                      {portrait.name}
                    </span>
                    <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 uppercase">
                      {portrait.tag}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Upload File */}
        {activeTab === 'upload' && (
          <div className="space-y-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center cursor-pointer hover:border-brand-500 hover:bg-brand-50/30 transition-all dark:border-slate-700 dark:hover:border-brand-500 dark:hover:bg-brand-950/20"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300 mb-3">
                <Upload className="h-6 w-6" />
              </div>
              <h5 className="text-sm font-bold text-slate-800 dark:text-white">Click or drag image file here</h5>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Supports JPG, PNG, WebP up to 8MB. Recommended square aspect ratio (400x400 or higher).
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
            {isUploading && (
              <div className="flex items-center justify-center gap-2 text-xs font-semibold text-brand-600 dark:text-brand-400 py-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Uploading and optimizing image...</span>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Camera Capture */}
        {activeTab === 'camera' && (
          <div className="space-y-4">
            <div className="relative mx-auto h-64 w-64 rounded-2xl overflow-hidden bg-black border border-slate-700 shadow-xl flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`h-full w-full object-cover ${!isCameraActive ? 'hidden' : ''}`}
              />
              {!isCameraActive && (
                <div className="text-center p-4">
                  <Camera className="h-8 w-8 text-slate-500 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">Camera preview inactive</p>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="mt-3 rounded-xl bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
                  >
                    Start Web Camera
                  </button>
                </div>
              )}
            </div>

            {isCameraActive && (
              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  onClick={captureCameraSnapshot}
                  className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-brand-700"
                >
                  <Camera className="h-4 w-4" />
                  <span>Capture Snapshot</span>
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                >
                  Stop Camera
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Direct URL */}
        {activeTab === 'url' && (
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              External High-Res Image URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="https://images.unsplash.com/... or https://..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none focus:border-brand-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <button
                type="button"
                onClick={handleApplyUrl}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-700"
              >
                Apply
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Enter any publicly accessible HTTPS portrait image URL.
            </p>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isUploading}
            className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-brand-700 disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Saving Photo...</span>
              </>
            ) : (
              <>
                <UserCheck className="h-3.5 w-3.5" />
                <span>Save Profile Photo</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
