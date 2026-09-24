'use client'

import postData from "@/lib/axios/postData";
import { Toast } from "primereact/toast";
import { useEffect, useRef, useState } from "react";
import { showError, showSuccess } from "@/lib/tools/generalTools";
import { FormikErrors, useFormik } from "formik";
import { InitValue, State } from "./components/interfaces";
import { FilterMatchMode } from "primereact/api";
import { useSession } from "next-auth/react";
import { DataRekap } from "@/types/print-tools";
import Table from "./components/display/table";
import Print from "./components/display/print";
import Form from "./components/display/form";
import { apiEndpointPaymentMethodGet } from "./components/endpoints";

const Page = () => {
    const toast = useRef<Toast>(null)
    const { data: session } = useSession()

    const [state, setState] = useState<State>({
        load: false,
        data: [],
        add: false,
        edit: false,
        delete: false,
        selectedData: [],
        searchVal: '',
        filters: {
            global: { value: null, matchMode: FilterMatchMode.CONTAINS },
            method_type: { value: null, matchMode: FilterMatchMode.EQUALS },
            status: { value: null, matchMode: FilterMatchMode.EQUALS },
        },
        session: null,
        submittedData: null,

        rows: 10,
        page: 1,
        first: 0,
        totalRecords: 0
    })

    const [dataRekap, setDataRekap] = useState<DataRekap>({
        data: {},
        head: [],
        totalData: 0,
        load: false,
        columnStyles: {},
        show: false,
        adjust: false,
        fileName: `laporan-metode-pembayaran-${new Date().toISOString().slice(0, 10)}`,
        judul1: 'Daftar Metode Pembayaran',
        judul2: 'Sistem Registrasi & Pembayaran'
    });

    const formik = useFormik<InitValue>({
        initialValues: {
            method_code: '',
            method_type: 'MANUAL_TRANSFER',
            name: '',
            description: '',
            logo_url: null,
            logo: null,
            bank_name: '',
            account_number: '',
            account_name: '',
            pg_provider: '',
            pg_channel_code: '',
            admin_fee_type: 'FIXED',
            admin_fee_value: 0,
            requires_unique_code: false, // Default dinonaktifkan
            status: true, // Default aktif di UI
            tz: 'UTC'
        },
        validate: (data: InitValue) => {
            const errors = {} as FormikErrors<InitValue>;

            // Validasi Umum
            if (!data.method_code) errors.method_code = 'Kode Metode Pembayaran wajib diisi';
            if (!data.name) errors.name = 'Nama Metode Pembayaran wajib diisi';
            if (!data.method_type) errors.method_type = 'Tipe Pembayaran wajib dipilih';

            // Validasi Kondisional berdasarkan tipe pembayaran
            if (data.method_type === 'MANUAL_TRANSFER') {
                if (!data.bank_name) errors.bank_name = 'Nama Bank wajib diisi';
                if (!data.account_number) errors.account_number = 'Nomor Rekening wajib diisi';
                if (!data.account_name) errors.account_name = 'Nama Pemilik Rekening wajib diisi';
            } else {
                if (!data.pg_provider) errors.pg_provider = 'Provider Payment Gateway wajib diisi';
                if (!data.pg_channel_code) errors.pg_channel_code = 'Channel Code PG wajib diisi';
            }

            // Validasi Konfigurasi Biaya Admin
            if (data.admin_fee_value === undefined || data.admin_fee_value === null || data.admin_fee_value < 0) {
                errors.admin_fee_value = 'Biaya Admin tidak boleh bernilai negatif';
            } else if (data.admin_fee_type === 'PERCENTAGE' && data.admin_fee_value > 100) {
                errors.admin_fee_value = 'Nilai persentase biaya admin maksimal adalah 100%';
            }

            return errors;
        },
        onSubmit: (data) => {
            setState(p => ({ ...p, submittedData: data }));
        },
    });

    const getData = async (apiEndpoint: string) => {
        setState((p) => ({ ...p, load: true }));
        try {
            const res = await postData(apiEndpoint, {
                status: state.filters.status.value,
                method_type: state.filters.method_type.value,
                search: state.filters.global.value,
                first: state.first,
                page: state.page,
                rows: state.rows,
            });

            setState((p) => ({
                ...p,
                data: res.data.data,
                totalRecords: res.data.total_data
            }));

        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || 'Terjadi kesalahan saat mengambil data');
        } finally {
            setState((p) => ({ ...p, load: false }));
        }
    }

    useEffect(() => {
        if (session) {
            setState((prev) => ({
                ...prev,
                session: session
            }));
        }
    }, [session]);

    return (
        <div className="space-y-4">
            <Toast ref={toast} position="top-right" />

            <Table
                dataRekap={dataRekap}
                setDataRekap={setDataRekap}
                state={state}
                toast={toast}
                setState={setState}
                formik={formik}
                getData={getData}
            />

            <Form
                state={state}
                toast={toast}
                getData={getData}
                setState={setState}
                formik={formik}
            />

            <Print
                dataRekap={dataRekap}
                setDataRekap={setDataRekap}
                state={state}
                toast={toast}
                setState={setState}
                formik={formik}
                getData={getData}
            />
        </div>
    )
}

export default Page;