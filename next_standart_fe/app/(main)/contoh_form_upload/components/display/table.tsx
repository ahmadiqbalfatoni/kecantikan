'use client'

import { DataTable } from "primereact/datatable"
import { TableProps, TableData, PaymentMethodType } from "../interfaces"
import { Column } from "primereact/column"
import { InputText } from "primereact/inputtext"
import { Tag } from "primereact/tag"
import { Button } from "primereact/button"
import { Divider } from "primereact/divider"
import { apiEndpointPaymentMethodGet } from "../endpoints"
import { useEffect, useRef } from "react"
import { Dropdown } from "primereact/dropdown"
import { OverlayPanel } from "primereact/overlaypanel"
import { IconField } from "primereact/iconfield"
import { InputIcon } from "primereact/inputicon"
import postData from "@/lib/axios/postData"
import { showError } from "@/lib/tools/generalTools"
import { Image } from "primereact/image"
import Form from "./form"

const Table = ({
    state,
    setState,
    formik,
    getData,
    toast,
    setDataRekap,
}: TableProps) => {

    const op = useRef<OverlayPanel>(null)

    const handlePrint = async () => {
        setDataRekap((p) => ({ ...p, load: true }));
        try {
            const res = await postData(apiEndpointPaymentMethodGet, {
                status: state.filters.status.value,
                method_type: state.filters.method_type.value,
                search: state.filters.global.value,
            });

            setDataRekap(p => ({
                ...p,
                data: res.data.data,
                show: true,
                adjust: true,
            }))

        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || 'Terjadi kesalahan saat memproses laporan');
        } finally {
            setDataRekap((p) => ({ ...p, load: false }));
        }
    }

    const formatMethodType = (type: PaymentMethodType) => {
        const types: Record<PaymentMethodType, string> = {
            'MANUAL_TRANSFER': 'Transfer Manual',
            'PG_VA': 'PG - Virtual Account',
            'PG_QRIS': 'PG - QRIS',
            'PG_EWALLET': 'PG - E-Wallet',
            'PG_CREDIT_CARD': 'PG - Credit Card',
            'PG_RETAIL': 'PG - Retail Outlets'
        };
        return types[type] || type;
    };

    const methodTypeOptions = [
        { label: 'Transfer Manual', value: 'MANUAL_TRANSFER' },
        { label: 'PG - Virtual Account', value: 'PG_VA' },
        { label: 'PG - QRIS', value: 'PG_QRIS' },
        { label: 'PG - E-Wallet', value: 'PG_EWALLET' },
        { label: 'PG - Credit Card', value: 'PG_CREDIT_CARD' },
        { label: 'PG - Retail Outlets', value: 'PG_RETAIL' },
    ];

    const headerTemplate = (
        <div className="flex flex-wrap align-items-center justify-content-between gap-3 p-1">
            <div className="flex align-items-center gap-2">
                <span className="text-xl font-bold text-900">Datatable</span>
            </div>

            <div className="flex flex-wrap gap-2 align-items-center">
                <Button
                    type="button"
                    icon="pi pi-filter"
                    label="Filter"
                    outlined
                    severity={
                        state.filters['method_type'].value || state.filters['status'].value !== null
                            ? 'warning' : 'secondary'
                    }
                    onClick={(e) => op.current?.toggle(e)}
                />
                <div className="w-full sm:w-20rem">
                    <IconField iconPosition="left" >
                        <InputIcon className="pi pi-search text-gray-400" />
                        <InputText
                            value={state.searchVal}
                            className="w-full p-inputtext-sm"
                            onChange={(e) => {
                                const value = e.target.value;
                                let _filters = { ...state.filters };
                                _filters['global'].value = value;
                                setState((p) => ({ ...p, searchVal: value, filters: _filters, first: 0 }));
                            }}
                            placeholder="Cari Kode atau Nama Metode..."
                        />
                    </IconField>
                </div>

                <Button
                    type="button"
                    icon="pi pi-filter-slash"
                    outlined
                    severity="danger"
                    tooltip="Reset Semua Filter"
                    tooltipOptions={{ position: 'bottom' }}
                    onClick={() => {
                        let _filters = { ...state.filters };
                        _filters['global'].value = null;
                        _filters['method_type'].value = null;
                        _filters['status'].value = null;
                        setState(p => ({ ...p, filters: _filters, searchVal: '', first: 0 }));
                    }}
                />
            </div>

            <OverlayPanel ref={op} style={{ width: '320px' }} className="shadow-4">
                <div className="flex flex-column gap-3">
                    <span className="font-bold text-base text-800 border-bottom-1 border-200 pb-2 flex align-items-center gap-2">
                        <i className="pi pi-filter text-primary" /> Filter Data
                    </span>

                    <div className="flex flex-column gap-2">
                        <label className="font-semibold text-xs text-700">Tipe Pembayaran</label>
                        <Dropdown
                            value={state.filters['method_type'].value}
                            options={methodTypeOptions}
                            placeholder="Semua Tipe"
                            showClear
                            onChange={(e) => {
                                let _filters = { ...state.filters };
                                _filters['method_type'].value = e.value;
                                setState((p) => ({ ...p, filters: _filters, first: 0 }));
                            }}
                            className="p-inputtext-sm"
                        />
                    </div>

                    <div className="flex flex-column gap-2">
                        <label className="font-semibold text-xs text-700">Status</label>
                        <Dropdown
                            value={state.filters['status'].value}
                            options={[{ label: 'Aktif', value: 1 }, { label: 'Non-Aktif', value: 0 }]}
                            placeholder="Semua Status"
                            showClear
                            onChange={(e) => {
                                let _filters = { ...state.filters };
                                _filters['status'].value = e.value;
                                setState((p) => ({ ...p, filters: _filters, first: 0 }));
                            }}
                            className="p-inputtext-sm"
                        />
                    </div>
                </div>
            </OverlayPanel>
        </div>
    );

    const logoBodyTemplate = (rowData: TableData) => {
        if (rowData.logo_url) {
            return (
                <div className="flex justify-content-center">
                    <Image
                        src={rowData.logo_url}
                        alt={rowData.name}
                        width="46"
                        height="46"
                        preview
                        className="shadow-1 cursor-pointer"
                        imageClassName="border-round-lg object-cover"
                        style={{ width: '46px', height: '46px' }}
                    />
                </div>
            );
        }
        return (
            <div className="flex justify-content-center">
                <div className="w-3rem h-3rem surface-100 border-round-lg flex align-items-center justify-content-center shadow-1">
                    <i className="pi pi-wallet text-400 text-lg"></i>
                </div>
            </div>
        );
    };

    const statusBodyTemplate = (rowData: TableData) => {
        const isActive = rowData.status === 1;
        return (
            <Tag
                value={isActive ? 'Aktif' : 'Non-Aktif'}
                severity={isActive ? 'success' : 'danger'}
                className="font-semibold text-xs px-2 py-1"
                rounded
            />
        );
    };

    const adminFeeBodyTemplate = (rowData: TableData) => {
        const formatCurrency = (val: number) => {
            return new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0
            }).format(val || 0);
        };

        if (rowData.admin_fee_type === 'PERCENTAGE') {
            return (
                <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-1 border-round text-xs">
                    {rowData.admin_fee_value}%
                </span>
            );
        }

        return (
            <span className="font-semibold text-gray-800">
                {formatCurrency(rowData.admin_fee_value)}
            </span>
        );
    };

    const detailsBodyTemplate = (rowData: TableData) => {
        if (rowData.method_type === 'MANUAL_TRANSFER') {
            return (
                <div className="flex flex-column gap-1 py-1">
                    <span className="font-bold text-800 text-xs flex align-items-center gap-1">
                        <i className="pi pi-building text-primary text-sm" /> {rowData.bank_name || '-'}
                    </span>
                    <span className="font-mono text-xs text-700">{rowData.account_number || '-'}</span>
                    <span className="text-500 text-sm italic">a/n {rowData.account_name || '-'}</span>
                    {rowData.requires_unique_code === 1 && (
                        <Tag severity="info" value="+ Kode Unik" className="text-xs font-bold align-self-start mt-1" />
                    )}
                </div>
            );
        }

        if (rowData.method_type) {
            return (
                <div className="flex flex-column gap-1 py-1">
                    <span className="font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 border-round text-sm align-self-start">
                        {rowData.pg_provider || '-'}
                    </span>
                    <span className="font-medium text-xs text-800">
                        Code: <code className="font-mono bg-100 px-1 border-round text-gray-700">{rowData.pg_channel_code || '-'}</code>
                    </span>
                </div>
            );
        }

        return <span className="text-400 italic text-xs">Tidak ada detail</span>;
    };

    const actionBodyTemplate = (rowData: TableData) => (
        <div className="flex gap-2 justify-content-center">
            <Button
                icon="pi pi-pencil"
                // rounded
                outlined
                // className="p-button-sm"
                onClick={() => {
                    formik.setValues({
                        id: rowData.id,
                        method_code: rowData.method_code,
                        method_type: rowData.method_type,
                        name: rowData.name,
                        description: rowData.description || '',
                        logo_url: rowData.logo_url,
                        logo: null,
                        bank_name: rowData.bank_name || '',
                        account_number: rowData.account_number || '',
                        account_name: rowData.account_name || '',
                        pg_provider: rowData.pg_provider || '',
                        pg_channel_code: rowData.pg_channel_code || '',
                        admin_fee_type: rowData.admin_fee_type,
                        admin_fee_value: rowData.admin_fee_value,
                        requires_unique_code: rowData.requires_unique_code === 1,
                        status: rowData.status === 1,
                        tz: rowData.tz
                    });
                    setState(p => ({ ...p, add: false, delete: false, edit: true }));
                }}
                tooltip="Edit"
            />
            <Button
                icon="pi pi-trash"
                // rounded
                outlined
                severity="danger"
                // className="p-button-sm"
                onClick={() => setState(p => ({ ...p, delete: true, selectedData: [rowData] }))}
                tooltip="Hapus"
            />
        </div>
    );

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            getData(apiEndpointPaymentMethodGet);
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [
        state.first,
        state.rows,
        state.searchVal,
        state.filters['method_type'].value,
        state.filters['status'].value
    ]);

    useEffect(() => {
        getData(apiEndpointPaymentMethodGet);
    }, []);

    return (
        <>
            <div className="card shadow-2 border-1 surface-border border-round-xl p-4 bg-white">

                {/* ACTION BAR */}
                <div className="flex flex-column gap-2 mb-6 px-1">
                    <h3 className="text-2xl font-semibold m-0 text-900">Data Metode Pembayaran</h3>
                    <div className="text-sm text-600">
                        Kelola master metode pembayaran untuk user melakukan transaksi.
                    </div>
                </div>
                {/* TOOLBAR UTAMA */}
                <div className="flex justify-content-between mb-4">

                    <div className="flex flex-row gap-2">
                        <Button
                            label="Tambah"
                            icon="pi pi-plus"
                            outlined
                            severity="success"
                            size="small"
                            // className="font-medium"
                            onClick={() => {
                                formik.resetForm();
                                setState(p => ({ ...p, selectedData: [], add: true, edit: false }))
                            }}
                        />
                        <Divider layout="vertical" className="hidden sm:inline-block" />
                        <Button
                            label="Cetak"
                            icon="pi pi-print"
                            size="small"
                            outlined
                            // className="font-medium"
                            onClick={() => handlePrint()}
                        />
                        <Divider layout="vertical" className="hidden sm:inline-block" />
                        <Button
                            label={state.selectedData?.length > 0 ? `Hapus (${state.selectedData.length})` : 'Hapus'}
                            icon="pi pi-trash"
                            severity="danger"
                            size="small"
                            outlined
                            // className="font-medium"
                            onClick={() => {
                                if (!state.selectedData || state.selectedData.length < 1) {
                                    setState(p => ({ ...p, delete: false }))
                                    return
                                }
                                setState(p => ({ ...p, delete: true }))
                            }}
                            disabled={!state.selectedData || state.selectedData.length === 0}
                        />
                        <Divider layout="vertical" className="hidden sm:inline-block" />
                        <Button
                            label="Refresh"
                            icon="pi pi-refresh"
                            size="small"
                            outlined
                            // className="font-medium"
                            onClick={() => getData(apiEndpointPaymentMethodGet)}
                            loading={state.load}
                        />
                    </div>
                    {/* <div className="flex flex-row gap-2">
                        <Divider layout="vertical" className="hidden sm:inline-block" />

                    </div> */}
                </div>

                <DataTable
                    value={state.data}
                    paginator
                    lazy
                    rows={state.rows || 10}
                    totalRecords={state.totalRecords}
                    first={state.first || 0}
                    header={headerTemplate}
                    onPage={(e) => setState(p => ({ ...p, first: e.first, page: e.page, rows: e.rows }))}
                    loading={state.load}
                    selectionMode={'multiple'}
                    selection={state.selectedData}
                    onSelectionChange={(e) => setState(p => ({ ...p, selectedData: e.value }))}
                    dataKey="id"
                    emptyMessage="Tidak ada metode pembayaran ditemukan."
                    paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                    currentPageReportTemplate="Menampilkan {first} - {last} dari {totalRecords} metode pembayaran"
                    className="p-datatable-sm"
                    rowHover
                >
                    <Column selectionMode="multiple" headerStyle={{ width: "3rem" }} />
                    <Column header="Logo" body={logoBodyTemplate} alignHeader="center" style={{ width: '80px' }}></Column>
                    <Column field="method_code" header="Kode Metode" className="font-semibold text-800" style={{ width: '130px' }}></Column>
                    <Column field="name" header="Nama Metode Pembayaran" className="font-medium text-900" style={{ minWidth: '150px' }}></Column>
                    <Column field="method_type" header="Tipe Pembayaran" body={(r) => formatMethodType(r.method_type)} style={{ width: '150px' }}></Column>

                    <Column header="Detail Rekening / Provider" body={detailsBodyTemplate} style={{ minWidth: '220px' }}></Column>

                    <Column field="admin_fee_value" header="Biaya Admin" body={adminFeeBodyTemplate} style={{ width: '130px' }}></Column>
                    <Column field="status" header="Status" body={statusBodyTemplate} align="center" style={{ width: '110px' }}></Column>
                    <Column headerStyle={{ textAlign: 'center' }} header="Aksi" body={actionBodyTemplate} style={{ width: '120px' }}></Column>
                </DataTable>
            </div>

            <Form getData={getData} toast={toast} state={state} setState={setState} formik={formik} />
        </>
    )
}

export default Table;