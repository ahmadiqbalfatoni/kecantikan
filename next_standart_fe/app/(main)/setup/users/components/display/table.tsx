/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Standard
 * @file page.tsx
 * @description File komponen table untuk page users
 * 
 * @author Fadil <risqullah.s.fadhilah@gmail.com>
 * @created 2026-07-14
 * 
 * @contributors
 * - Fadil <risqullah.s.fadhilah@gmail.com>
 * 
 * @lastModified Fadil (2026-08-03)
 * @version 1.0.1
 */


'use client'

import { DataTable } from "primereact/datatable";
import { RoleColors, TableProps, TableData } from "../interfaces";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { formatDateSystem } from "@/lib/tools/dateTools";
import { Tag } from "primereact/tag";
import { Button } from "primereact/button";
import { Divider } from "primereact/divider";
import { apiEndpointGet } from "../endpoints";
import { useEffect, useRef } from "react";
import Form from "./form";
import { OverlayPanel } from "primereact/overlaypanel";
import { Dropdown } from "primereact/dropdown";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import postData from "@/lib/axios/postData";
import { showError } from "@/lib/tools/generalTools";

const Table = ({
    state,
    setState,
    formik,
    getData,
    toast,
    setDataRekap,
    setNavBar,
    navBar,
    getNav
}: TableProps) => {

    const op = useRef<OverlayPanel>(null);

    // Handler Print yang mengirimkan state filter aktif ke API untuk mengambil keseluruhan data laporan
    const handlePrint = async () => {
        setDataRekap((p) => ({ ...p, load: true }));
        try {
            const res = await postData(apiEndpointGet, {
                status: state.filters.status.value,
                role: state.filters.role.value ? [state.filters.role.value] : null,
                search: state.filters.global.value,
            });

            let columnStyles = {
                2: { halign: 'right' },
                3: { halign: 'right' },
                4: { halign: 'right' },
                5: { halign: 'right' },
            };

            setDataRekap(p => ({
                ...p,
                data: res.data.data.map((v: TableData) => ({
                    user_code: v.user_code,
                    fullname: v.fullname,
                    username: v.username,
                    telp: v.telp,
                    role: v.role,
                    status: v.status === '1' ? 'Active' : 'Inactive',
                    created_at: formatDateSystem(v.created_at)
                })),
                show: true,
                adjust: true,
                columnStyles,
            }));

        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || 'Terjadi kesalahan saat memproses laporan');
        } finally {
            setDataRekap((p) => ({ ...p, load: false }));
        }
    };

    const headerTemplate = (
        <div className="flex flex-wrap align-items-center justify-content-between gap-2">
            <span className="text-xl font-bold text-900">Master</span>

            <div className="flex gap-2">
                <Button
                    type="button"
                    icon="pi pi-filter"
                    label="Filter"
                    outlined
                    severity={
                        state.filters['status'].value || state.filters['role'].value ? 'warning' : 'secondary'
                    }
                    onClick={(e) => op.current?.toggle(e)}
                />
                <span className="p-input-icon-left w-full md:w-20rem">
                    <IconField iconPosition="left">
                        <InputIcon className="pi pi-search" />
                        <InputText
                            value={state.searchVal}
                            className="w-full"
                            onChange={(e) => {
                                const value = e.target.value;
                                let _filters = { ...state.filters };
                                _filters['global'].value = value;
                                setState((p) => ({ ...p, searchVal: value, filters: _filters, first: 0 }));
                            }}
                            placeholder="Cari Data..."
                        />
                    </IconField>
                </span>

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
                        _filters['status'].value = null;
                        _filters['role'].value = null;
                        setState(p => ({ ...p, filters: _filters, searchVal: '', first: 0 }));
                    }}
                />
            </div>

            <OverlayPanel ref={op} style={{ width: '400px' }}>
                <div className="flex flex-column gap-3">
                    <span className="font-bold text-lg border-bottom-1 border-300 pb-2">Filter Data</span>

                    <div className="flex flex-column md:flex-row gap-2 align-items-center">
                        <div className="flex flex-column gap-2 w-full">
                            <label className="font-semibold text-sm">Role</label>
                            <Dropdown
                                value={state.filters['role'].value}
                                options={[
                                    { label: 'Superadmin', value: 'superadmin' },
                                    { label: 'Admin', value: 'admin' },
                                    { label: 'Support', value: 'support' },
                                    { label: 'User', value: 'user' },
                                ]}
                                placeholder="Semua Role"
                                filter
                                showClear
                                onChange={(e) => {
                                    let _filters = { ...state.filters };
                                    _filters['role'].value = e.value;
                                    setState((p) => ({ ...p, filters: _filters, first: 0 }));
                                }}
                            />
                        </div>
                        <div className="flex flex-column gap-2 w-full">
                            <label className="font-semibold text-sm">Status</label>
                            <Dropdown
                                value={state.filters['status'].value}
                                options={[
                                    { label: 'Aktif', value: '1' },
                                    { label: 'Non-Aktif', value: '0' }
                                ]}
                                placeholder="Semua Status"
                                filter
                                showClear
                                onChange={(e) => {
                                    let _filters = { ...state.filters };
                                    _filters['status'].value = e.value;
                                    setState((p) => ({ ...p, filters: _filters, first: 0 }));
                                }}
                            />
                        </div>
                    </div>
                </div>
            </OverlayPanel>
        </div>
    );

    const roleBodyTemplate = (rowData: TableData) => {
        const roleColors: RoleColors = {
            superadmin: "danger",
            admin: "danger",
            support: "warning",
            user: "info",
        };

        const targetRole = rowData.role as keyof RoleColors;

        return (
            <Tag
                value={rowData.role}
                severity={roleColors[targetRole] || 'info'}
                className="text-xs font-semibold px-2 py-1"
            />
        );
    };

    const actionBodyTemplate = (rowData: TableData) => (
        <div className="flex gap-2">
            <Button
                icon="pi pi-pencil"
                // rounded
                outlined
                // className="p-button-sm h-2.5rem w-2.5rem"
                onClick={() => {
                    formik.setValues({
                        user_code: rowData.user_code,
                        fullname: rowData.fullname,
                        username: rowData.username,
                        password: '',
                        telp: rowData.telp,
                        status: rowData.status,
                        role: rowData.role
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
                // className="p-button-sm h-2.5rem w-2.5rem"
                onClick={() => setState(p => ({ ...p, delete: true, selectedData: [rowData] }))}
                tooltip="Hapus"
            />
        </div>
    );

    // Debouncing API call saat state filter, global search, atau halaman bergeser
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            getData(apiEndpointGet);
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [
        state.first,
        state.rows,
        state.searchVal,
        state.filters['role'].value,
        state.filters['status'].value
    ]);

    // Initial fetch saat load pertama kali
    useEffect(() => {
        getData(apiEndpointGet);
    }, []);

    return (
        <>
            <div className="card shadow-2 border-1 surface-border border-round-xl p-4 bg-white">
                <div className="flex flex-column gap-2 mb-6 px-1">
                    <h3 className="text-2xl font-semibold m-0 text-900">Data Master User</h3>
                    <div className="text-sm text-600">
                        Kelola master user tenant dan admin.
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
                            onClick={() => getData(apiEndpointGet)}
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
                    selectionMode={'multiple'}
                    rows={state.rows || 10}
                    totalRecords={state.totalRecords || 0}
                    first={state.first || 0}
                    header={headerTemplate}
                    onPage={(e) => setState(p => ({ ...p, first: e.first, page: e.page, rows: e.rows }))}
                    loading={state.load}
                    selection={state.selectedData}
                    onSelectionChange={(e) => setState(p => ({ ...p, selectedData: e.value }))}
                    dataKey="user_code"
                    emptyMessage="Data Kosong"
                    paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                    currentPageReportTemplate="Menampilkan {first} - {last} dari {totalRecords} data"
                    className="p-datatable-sm"
                    rowHover
                >
                    <Column selectionMode="multiple" headerStyle={{ width: "3rem" }} />
                    <Column field="user_code" header="Unique ID" className="font-semibold text-800" style={{ width: '130px' }}></Column>
                    <Column field="fullname" header="Name" className="font-medium text-900"></Column>
                    <Column field="username" header="Username" className="font-medium"></Column>
                    <Column field="telp" header="Phone" style={{ width: '150px' }}></Column>
                    <Column field="role" body={roleBodyTemplate} header="Role" style={{ width: '130px' }}></Column>
                    <Column field="status" body={(rowData) => {
                        const isActive = rowData.status === '1';
                        return (
                            <Tag
                                value={isActive ? "Active" : "Inactive"}
                                severity={isActive ? "success" : "danger"}
                                className="text-xs font-semibold px-2 py-1"
                                rounded
                            />
                        );
                    }} header="Status" style={{ width: '110px' }}></Column>
                    <Column field="created_at" sortable body={rowData => formatDateSystem(rowData.created_at)} header="Datetime" style={{ width: '150px' }}></Column>
                    <Column headerStyle={{ textAlign: 'center' }} header="Action" body={actionBodyTemplate} style={{ width: '120px' }}></Column>
                </DataTable>
            </div>

            <Form getData={getData} toast={toast} state={state} setState={setState} formik={formik} />
        </>
    );
};

export default Table;