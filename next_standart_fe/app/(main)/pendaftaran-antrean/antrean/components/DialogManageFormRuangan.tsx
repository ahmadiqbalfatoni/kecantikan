'use client';

import React, { useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dropdown } from 'primereact/dropdown';
import { InputSwitch } from 'primereact/inputswitch';
import { InputNumber } from 'primereact/inputnumber';
import { Toast } from 'primereact/toast';
import { confirmDialog } from 'primereact/confirmdialog';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Tag } from 'primereact/tag';
import postData from '@/lib/axios/postData';
import { showError, showSuccess } from '@/lib/tools/generalTools';
import { RuanganFormField } from './interfaces';

interface DialogManageFormRuanganProps {
    visible: boolean;
    onHide: () => void;
    kodeRuangan: string;
    namaRuangan: string;
    toast: React.RefObject<Toast>;
    onFieldsUpdated?: () => void;
}

export const DialogManageFormRuangan: React.FC<DialogManageFormRuanganProps> = ({
    visible,
    onHide,
    kodeRuangan,
    namaRuangan,
    toast,
    onFieldsUpdated,
}) => {
    const [fields, setFields] = useState<RuanganFormField[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [fieldDialogVisible, setFieldDialogVisible] = useState<boolean>(false);
    const [isEdit, setIsEdit] = useState<boolean>(false);
    const [saving, setSaving] = useState<boolean>(false);

    const [formField, setFormField] = useState<RuanganFormField>({
        kode_ruangan: kodeRuangan,
        label_field: '',
        tipe_field: 'text',
        options: '',
        is_required: false,
        urutan: 1,
    });

    useEffect(() => {
        if (visible && kodeRuangan) {
            loadFormFields();
        }
    }, [visible, kodeRuangan]);

    const loadFormFields = async () => {
        setLoading(true);
        try {
            const res = await postData('/master/ruangan-form-data', { kode_ruangan: kodeRuangan });
            setFields(res.data.data || []);
        } catch (error) {
            showError(toast, 'Gagal memuat daftar form ruangan');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenCreateField = () => {
        setIsEdit(false);
        setFormField({
            kode_ruangan: kodeRuangan,
            label_field: '',
            tipe_field: 'text',
            options: '',
            is_required: false,
            urutan: fields.length + 1,
        });
        setFieldDialogVisible(true);
    };

    const handleOpenEditField = (field: RuanganFormField) => {
        setIsEdit(true);
        setFormField({
            ...field,
            is_required: Boolean(field.is_required),
        });
        setFieldDialogVisible(true);
    };

    const handleSaveField = async () => {
        if (!formField.label_field || !formField.label_field.trim()) {
            showError(toast, 'Label Field wajib diisi!');
            return;
        }

        setSaving(true);
        try {
            const endpoint = isEdit ? '/master/ruangan-form-update' : '/master/ruangan-form-create';
            const payload = {
                ...formField,
                kode_ruangan: kodeRuangan,
            };
            const res = await postData(endpoint, payload);
            showSuccess(toast, res.data.message || 'Field berhasil disimpan');
            setFieldDialogVisible(false);
            loadFormFields();
            if (onFieldsUpdated) onFieldsUpdated();
        } catch (error: any) {
            showError(toast, error?.response?.data?.message || 'Gagal menyimpan field form');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteField = (field: RuanganFormField) => {
        confirmDialog({
            message: `Apakah Anda yakin ingin menghapus field "${field.label_field}"?`,
            header: 'Konfirmasi Hapus Field',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Ya, Hapus',
            rejectLabel: 'Batal',
            acceptClassName: 'p-button-danger',
            accept: async () => {
                try {
                    const res = await postData('/master/ruangan-form-delete', { id: field.id });
                    showSuccess(toast, res.data.message || 'Field berhasil dihapus');
                    loadFormFields();
                    if (onFieldsUpdated) onFieldsUpdated();
                } catch (error) {
                    showError(toast, 'Gagal menghapus field form');
                }
            },
        });
    };

    const TIPE_OPTIONS = [
        { label: '📝 Teks Singkat (Input)', value: 'text' },
        { label: '📄 Teks Panjang / Catatan (Textarea)', value: 'textarea' },
        { label: '🔢 Angka (Number)', value: 'number' },
        { label: '📋 Pilihan (Dropdown)', value: 'select' },
        { label: '☑️ Centang (Checkbox)', value: 'checkbox' },
        { label: '📷 Upload Foto (Before)', value: 'upload_foto' },
    ];

    return (
        <Dialog
            header={
                <div className="flex align-items-center gap-2">
                    <i className="pi pi-cog text-teal-600 text-2xl" />
                    <div>
                        <span className="text-xl font-bold block">Pengaturan Form / Isian Ruangan</span>
                        <span className="text-xs text-500 font-normal">Ruangan: {namaRuangan} ({kodeRuangan})</span>
                    </div>
                </div>
            }
            visible={visible}
            style={{ width: '720px' }}
            modal
            onHide={onHide}
            className="p-fluid"
        >
            <div className="flex align-items-center justify-content-between mb-3 border-bottom-1 surface-border pb-3">
                <p className="text-xs text-600 m-0">
                    Atur field form khusus yang wajib/perlu diisi oleh petugas ruangan saat menangani pasien di ruangan ini.
                </p>
                <Button
                    label="Tambah Field Baru"
                    icon="pi pi-plus"
                    size="small"
                    severity="success"
                    onClick={handleOpenCreateField}
                />
            </div>

            {loading ? (
                <div className="flex align-items-center justify-content-center py-6">
                    <ProgressSpinner style={{ width: '35px', height: '35px' }} />
                    <span className="ml-2 text-sm text-500">Memuat field form...</span>
                </div>
            ) : fields.length === 0 ? (
                <div className="text-center py-5 border-1 border-dashed border-round-xl surface-50">
                    <i className="pi pi-file-edit text-4xl mb-2 text-400 block" />
                    <p className="font-bold text-sm text-700 m-0">Belum Ada Field Form Khusus</p>
                    <p className="text-xs text-500 m-0 mt-1">Klik tombol &apos;Tambah Field Baru&apos; di atas untuk membuat isian khusus ruangan ini.</p>
                </div>
            ) : (
                <div className="flex flex-column gap-2">
                    {fields.map((f, idx) => (
                        <div
                            key={f.id || idx}
                            className="flex align-items-center justify-content-between p-3 border-round-lg border-1 surface-border surface-card hover:surface-50 transition-colors"
                        >
                            <div className="flex align-items-center gap-3">
                                <span className="font-bold text-teal-700 bg-teal-50 px-2 py-1 border-round-md text-xs">
                                    #{f.urutan || idx + 1}
                                </span>
                                <div>
                                    <div className="font-bold text-900 text-sm flex align-items-center gap-2">
                                        {f.label_field}
                                        {f.is_required ? (
                                            <Tag value="Wajib" severity="danger" className="text-xs py-0 px-1" />
                                        ) : null}
                                    </div>
                                    <span className="text-xs text-500">
                                        Tipe: <strong>{f.tipe_field}</strong> {f.options ? `(Opsi: ${f.options})` : ''}
                                    </span>
                                </div>
                            </div>

                            <div className="flex gap-1">
                                <Button
                                    icon="pi pi-pencil"
                                    text
                                    rounded
                                    severity="info"
                                    onClick={() => handleOpenEditField(f)}
                                    tooltip="Edit Field"
                                />
                                <Button
                                    icon="pi pi-trash"
                                    text
                                    rounded
                                    severity="danger"
                                    onClick={() => handleDeleteField(f)}
                                    tooltip="Hapus Field"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* MODAL FORM EDIT / CREATE FIELD */}
            <Dialog
                header={isEdit ? 'Edit Field Form' : 'Tambah Field Form Baru'}
                visible={fieldDialogVisible}
                style={{ width: '500px' }}
                modal
                onHide={() => setFieldDialogVisible(false)}
            >
                <div className="flex flex-column gap-3 pt-2">
                    <div>
                        <label className="block text-sm font-semibold mb-1">Label Field *</label>
                        <InputText
                            value={formField.label_field}
                            onChange={(e) => setFormField({ ...formField, label_field: e.target.value })}
                            placeholder="contoh: Kondisi Kulit Pasien / Catatan Alergi"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold mb-1">Tipe Field</label>
                        <Dropdown
                            value={formField.tipe_field}
                            options={TIPE_OPTIONS}
                            onChange={(e) => setFormField({ ...formField, tipe_field: e.value })}
                            placeholder="Pilih Tipe Input"
                        />
                    </div>

                    {formField.tipe_field === 'select' && (
                        <div>
                            <label className="block text-sm font-semibold mb-1">Opsi Pilihan (Pisahkan dengan koma)</label>
                            <InputText
                                value={formField.options || ''}
                                onChange={(e) => setFormField({ ...formField, options: e.target.value })}
                                placeholder="contoh: Normal, Sensitif, Berminyak, Kering"
                            />
                        </div>
                    )}

                    <div className="grid">
                        <div className="col-6">
                            <label className="block text-sm font-semibold mb-1">Urutan</label>
                            <InputNumber
                                value={formField.urutan || 1}
                                onValueChange={(e) => setFormField({ ...formField, urutan: e.value || 1 })}
                                min={1}
                            />
                        </div>
                        <div className="col-6 flex flex-column justify-content-end">
                            <div className="flex align-items-center gap-2 mb-2">
                                <InputSwitch
                                    checked={Boolean(formField.is_required)}
                                    onChange={(e) => setFormField({ ...formField, is_required: e.value })}
                                />
                                <label className="text-sm font-semibold">Wajib Diisi</label>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-content-end gap-2 mt-4">
                    <Button label="Batal" outlined severity="secondary" onClick={() => setFieldDialogVisible(false)} />
                    <Button label="Simpan Field" icon="pi pi-check" loading={saving} onClick={handleSaveField} />
                </div>
            </Dialog>
        </Dialog>
    );
};
