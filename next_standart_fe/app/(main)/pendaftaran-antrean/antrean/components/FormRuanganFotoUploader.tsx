'use client';

import React, { useState, useRef } from 'react';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { ProgressSpinner } from 'primereact/progressspinner';
import postData from '@/lib/axios/postData';
import { showError, showSuccess } from '@/lib/tools/generalTools';

interface FormRuanganFotoUploaderProps {
    value?: {
        before?: string;
        after?: string;
    } | null;
    onChange: (newValue: { before?: string; after?: string }) => void;
    labelField: string;
    isRequired?: boolean;
    toast?: React.RefObject<Toast> | any;
    disabled?: boolean;
}

export const FormRuanganFotoUploader: React.FC<FormRuanganFotoUploaderProps> = ({
    value,
    onChange,
    labelField,
    isRequired = false,
    toast,
    disabled = false,
}) => {
    const [uploadingBefore, setUploadingBefore] = useState<boolean>(false);
    const fileInputBeforeRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (disabled) return;
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showError(toast, 'File harus berupa gambar (JPG, PNG, WEBP, dll)');
            return;
        }

        setUploadingBefore(true);

        try {
            const base64 = await convertFileToBase64(file);
            const res = await postData('/master/ruangan-form-upload-foto', {
                image_base64: base64,
                file_name: file.name,
                prefix: 'before',
            });

            if (res?.data?.status === 200 || res?.status === 200) {
                const filePath = res.data?.data?.file_path || res.data?.file_path;
                const updatedVal = {
                    ...value,
                    before: filePath,
                };
                onChange(updatedVal);
                showSuccess(toast, 'Foto Sebelum (Before) berhasil diunggah');
            } else {
                showError(toast, res?.data?.message || 'Gagal mengunggah foto');
            }
        } catch (error: any) {
            showError(toast, error?.response?.data?.message || 'Gagal mengunggah foto');
        } finally {
            setUploadingBefore(false);
            if (e.target) e.target.value = '';
        }
    };

    const convertFileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = (error) => reject(error);
        });
    };

    const handleRemove = () => {
        if (disabled) return;
        const updatedVal = {
            ...value,
            before: '',
        };
        onChange(updatedVal);
    };

    const getImgSrc = (path?: string) => {
        if (!path) return '';
        if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
            return path;
        }
        const beUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        const baseUrl = beUrl.replace(/\/$/, '');
        return `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
    };

    return (
        <div className="surface-card p-3 border-round border-1 surface-border mb-2">
            <div className="flex align-items-center justify-content-between mb-3">
                <label className="text-xs font-bold text-800 uppercase flex align-items-center gap-1">
                    <span>📷 {labelField}</span>
                    {isRequired && <span className="text-red-500 font-bold">*</span>}
                    {disabled && <span className="text-[10px] text-teal-600 font-bold bg-teal-50 px-2 py-0.5 border-round-md ml-2">(Telah Disimpan)</span>}
                </label>
            </div>

            <div className="grid">
                {/* BEFORE FOTO */}
                <div className="col-12">
                    <div className="border-1 surface-border border-round p-3 text-center bg-gray-50 flex flex-column align-items-center justify-content-center min-h-10rem relative">
                        <span className="text-xs font-bold text-600 mb-2">FOTO SEBELUM (BEFORE)</span>
                        {value?.before ? (
                            <div className="relative w-full flex flex-column align-items-center">
                                <img
                                    src={getImgSrc(value.before)}
                                    alt="Before"
                                    className="max-w-full border-round shadow-1"
                                    style={{ maxHeight: '180px', objectFit: 'cover' }}
                                />
                                {!disabled && (
                                    <div className="flex gap-2 mt-2">
                                        <Button
                                            type="button"
                                            icon="pi pi-pencil"
                                            label="Ganti Foto"
                                            className="p-button-outlined p-button-sm text-xs p-button-secondary"
                                            onClick={() => fileInputBeforeRef.current?.click()}
                                        />
                                        <Button
                                            type="button"
                                            icon="pi pi-trash"
                                            label="Hapus Foto"
                                            className="p-button-outlined p-button-sm text-xs p-button-danger"
                                            onClick={handleRemove}
                                        />
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div>
                                {uploadingBefore ? (
                                    <div className="flex flex-column align-items-center">
                                        <ProgressSpinner style={{ width: '30px', height: '30px' }} />
                                        <span className="text-xs text-500 mt-2">Mengunggah...</span>
                                    </div>
                                ) : (
                                    <Button
                                        type="button"
                                        icon="pi pi-upload"
                                        label="Unggah Foto Before"
                                        className="p-button-sm p-button-outlined text-xs p-button-info"
                                        disabled={disabled}
                                        onClick={() => fileInputBeforeRef.current?.click()}
                                    />
                                )}
                            </div>
                        )}
                        {!disabled && (
                            <input
                                ref={fileInputBeforeRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleFileSelect}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FormRuanganFotoUploader;
