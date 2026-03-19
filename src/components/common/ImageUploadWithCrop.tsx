import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Upload, X, Check, Image as ImageIcon, Loader2 } from 'lucide-react';
import { supabase } from '@/supabaseClient';

interface ImageUploadWithCropProps {
  label: string;
  value: string;
  onUploadComplete: (url: string) => void;
  aspect?: number;
  bucketName?: string;
}

export function ImageUploadWithCrop({ 
  label, 
  value, 
  onUploadComplete, 
  aspect = 1,
  bucketName = 'business-assets'
}: ImageUploadWithCropProps) {
  const [image, setImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showCropper, setShowCropper] = useState(false);

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImage(reader.result as string);
        setShowCropper(true);
      });
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });

  const getCroppedImg = async (imageSrc: string, pixelCrop: any): Promise<Blob> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) throw new Error('No 2d context');

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) throw new Error('Canvas is empty');
        resolve(blob);
      }, 'image/jpeg');
    });
  };

  const handleUpload = async () => {
    if (!image || !croppedAreaPixels) return;

    try {
      setIsUploading(true);
      const croppedImageBlob = await getCroppedImg(image, croppedAreaPixels);
      
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      const filePath = `uploads/${fileName}`;

      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, croppedImageBlob);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(data.path);

      onUploadComplete(publicUrl);
      setShowCropper(false);
      setImage(null);
    } catch (error: any) {
      console.error('Error uploading image:', error);
      alert('Error al subir la imagen. Asegúrate de haber ejecutado el SQL para crear el bucket.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <label className="text-[10px] font-black text-space-muted uppercase tracking-[0.2em] ml-2 block">
        {label}
      </label>
      
      <div className="relative group">
        {value ? (
          <div className="relative rounded-2xl overflow-hidden border-2 border-space-border/20 aspect-video sm:aspect-[21/9] bg-neutral-100">
            <img src={value} alt={label} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
              <label className="cursor-pointer bg-white text-space-text px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:scale-105 transition-transform">
                <Upload size={14} /> Cambiar
                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
              </label>
              <button 
                onClick={() => onUploadComplete('')}
                className="bg-white/20 text-white p-2 rounded-xl hover:bg-space-danger transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center w-full aspect-video sm:aspect-[21/9] border-2 border-dashed border-space-border/40 rounded-3xl bg-neutral-50/50 hover:bg-white hover:border-space-primary/40 transition-all cursor-pointer group">
            <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-space-muted group-hover:text-space-primary group-hover:scale-110 transition-all mb-3">
              <Upload size={20} />
            </div>
            <p className="text-xs font-bold text-space-text uppercase tracking-widest">Subir Imagen</p>
            <p className="text-[10px] text-space-muted mt-1">Formatos: JPG, PNG (Max 5MB)</p>
            <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
          </label>
        )}
      </div>

      {showCropper && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-2 sm:p-10 backdrop-blur-md">
          <div className="relative w-[95vw] sm:w-full max-w-4xl aspect-square sm:aspect-video rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-white/10">
            <Cropper
              image={image!}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
            />
          </div>
          
          <div className="mt-4 sm:mt-8 w-full max-w-md px-4 space-y-4 sm:space-y-6">
            <div className="flex items-center gap-4 bg-white/10 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-white/5">
              <ImageIcon size={18} className="text-white shrink-0" />
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                aria-labelledby="Zoom"
                onChange={(e: any) => setZoom(e.target.value)}
                className="w-full accent-space-primary h-1.5 sm:h-2"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <button 
                onClick={() => setShowCropper(false)}
                className="py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-white/5 text-white font-bold uppercase tracking-widest text-[9px] sm:text-[10px] hover:bg-white/10 transition-all border border-white/10"
              >
                Cancelar
              </button>
              <button 
                onClick={handleUpload}
                disabled={isUploading}
                className="py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-space-primary text-white font-black uppercase tracking-widest text-[9px] sm:text-[10px] hover:scale-105 transition-all shadow-lg shadow-space-primary/20 flex items-center justify-center gap-2"
              >
                {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {isUploading ? 'Subiendo...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
