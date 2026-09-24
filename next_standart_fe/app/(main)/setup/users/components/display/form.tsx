/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Standard
 * @file page.tsx
 * @description File form untuk menampilkan form tambah/edit data user
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

import { Dialog } from "primereact/dialog";
import { FormProps, initValue } from "../interfaces"
import { InputText } from "primereact/inputtext";
import { Password } from "primereact/password";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { apiEndpointCreate, apiEndpointDelete, apiEndpointGet, apiEndpointUpdate } from "../endpoints";
import postData from "@/lib/axios/postData";
import { showError, showSuccess } from "@/lib/tools/generalTools";
import { useEffect } from "react";
import { getTzUser } from "@/lib/tools/dateTools";

const Form = ({
    state,
    setState,
    formik,
    toast,
    getData
}: FormProps) => {

    const fetchComponentData = async () => {
        setState((p) => ({ ...p, load: true }));

        try {


        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || "Terjadi Kesalahan");
        } finally {
            setState((p) => ({ ...p, load: false }));
        }
    }

    const handleSave = async (input: initValue) => {
        setState((p) => ({ ...p, load: true }));

        try {
            const isEdit = Boolean(state.edit);

            const cEndPoint = isEdit ? apiEndpointUpdate : apiEndpointCreate;

            const oHeaders: Record<string, string> = {
                "X-Level": "1",
                "X-Credential": JSON.stringify({
                    username: input.username,
                    password: input.password,
                }),
            };

            const oBody: Record<string, any> = {
                fullname: input.fullname,
                telp: input.telp,
                status: input.status,
                role: input.role,
                tz: getTzUser()
            };

            if (isEdit) {
                oBody["user_code"] = input.user_code;
            }

            const vaData = await postData(cEndPoint, oBody, oHeaders);
            const res = vaData.data;

            showSuccess(toast, res.data?.message || "Berhasil Menyimpan Data");
            formik.resetForm();
            setState((p) => ({ ...p, add: false, edit: false, delete: false }));
            await getData(apiEndpointGet)
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || "Terjadi Kesalahan");
        } finally {
            setState((p) => ({ ...p, load: false, submittedData: null }));
        }
    };
    const handleDelete = async () => {
        setState((p) => ({ ...p, load: true }));

        try {

            if (state.selectedData.length < 1) {
                showError(toast, 'Tidak Ada User yang Dipilih')
                return
            }

            const vauser_code = state.selectedData.map(v => v.user_code)

            const vaData = await postData(apiEndpointDelete, { user_code: vauser_code });
            const res = vaData.data;

            showSuccess(toast, res.data?.message || "Berhasil Menghapus Data");
            setState((p) => ({ ...p, selectedData: [], add: false, edit: false, delete: false }));
            await getData(apiEndpointGet)
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || "Terjadi Kesalahan");
        } finally {
            setState((p) => ({ ...p, load: false }));
        }
    };


    const deleteFooterTemplate = (
        <div className="flex justify-content-center gap-2">
            <Button
                label="Batal"
                icon="pi pi-times"
                severity="secondary"
                outlined
                onClick={
                    () => {
                        setState((p) => ({ ...p, add: false, edit: false, delete: false }));
                    }
                }
                disabled={state.load}
            />
            <Button
                label="Ya, Hapus"
                icon="pi pi-trash"
                severity="danger"
                onClick={handleDelete}
                loading={state.load}
            />
        </div>
    );

    const isFormFieldInvalid = (name: keyof initValue) => !!(formik?.touched[name] && formik?.errors[name]);

    const getFormErrorMessage = (name: keyof initValue) => {
        return isFormFieldInvalid(name) ? <small className="p-error">{formik?.errors[name]}</small> : "";
    };

    useEffect(() => {
        if (state.submittedData) {
            handleSave(state.submittedData)
        }
    }, [state.submittedData])

    // useEffect(() => {
    //     fetchComponentData()
    // }, [])

    return <>
        <Dialog
            visible={state.add || state.edit}
            header={state.edit ? 'Edit Data User' : 'Tambah Data User'}
            modal
            style={{ width: '70%' }}
            onHide={() => {
                setState((p) => ({ ...p, add: false, edit: false, delete: false }));
                formik?.resetForm();
            }}
        >
            <form onSubmit={formik?.handleSubmit} className="flex gap-2 flex-column">

                <div className="flex md:flex-row flex-column gap-2 w-full">
                    <div className="flex flex-column gap-2 w-full">
                        <label htmlFor="name">Name</label>
                        <div className="p-inputgroup">
                            <InputText
                                id="name"
                                name="name"
                                value={formik?.values.fullname}
                                style={{ padding: '1rem' }}
                                placeholder="fullname"
                                onChange={(e) => {
                                    formik?.setFieldValue('fullname', e.target.value);
                                }}
                                className={isFormFieldInvalid('fullname') ? 'p-invalid' : ''}
                            />
                        </div>
                        {isFormFieldInvalid('fullname') ? getFormErrorMessage('fullname') : ''}
                    </div>
                    <div className="flex flex-column gap-2 w-full">
                        <label htmlFor="username">Username</label>
                        <div className="p-inputgroup">
                            <InputText
                                id="username"
                                name="username"
                                value={formik?.values.username}
                                style={{ padding: '1rem' }}
                                placeholder="username"
                                onChange={(e) => {
                                    formik?.setFieldValue('username', e.target.value);
                                }}
                                className={isFormFieldInvalid('username') ? 'p-invalid' : ''}
                            />
                        </div>
                        {isFormFieldInvalid('username') ? getFormErrorMessage('username') : ''}
                    </div>
                </div>

                <div className="flex md:flex-row flex-column gap-2 w-full">

                    <div className="flex flex-column gap-2 w-full">
                        <label htmlFor="telp">Telp</label>
                        <div className="p-inputgroup">
                            <InputText
                                id="telp"
                                name="telp"
                                keyfilter={'int'}
                                value={formik?.values.telp}
                                style={{ padding: '1rem' }}
                                onChange={(e) => {
                                    formik?.setFieldValue('telp', e.target.value);
                                }}
                                placeholder="089222333444"
                                className={isFormFieldInvalid('telp') ? 'p-invalid' : ''}
                            />
                        </div>
                        {isFormFieldInvalid('telp') ? getFormErrorMessage('telp') : ''}
                    </div>
                </div>



                {/* {!state?.edit && ( */}
                <div className="flex flex-column gap-2 w-full">
                    <label htmlFor="password">Password</label>
                    <div className="p-inputgroup">
                        <Password
                            id="password"
                            name="password"
                            unstyled
                            pt={{
                                root: { className: 'my-password-unstyled' },
                                input: {
                                    className: 'my-password-input',
                                    style: { width: '100%' }
                                },
                                showIcon: { style: { right: '10px' } },
                                hideIcon: { style: { right: '10px' } }
                            }}
                            toggleMask
                            value={formik?.values.password}
                            onChange={(e) => {
                                formik?.setFieldValue('password', e.target.value);
                            }}
                            className={isFormFieldInvalid('password') ? 'p-invalid' : ''}
                        />
                    </div>
                    {isFormFieldInvalid('password') ? getFormErrorMessage('password') : ''}
                </div>
                {/* )} */}
                {(formik.values.role == 'superadmin' && state.edit) ? "" :

                    <div className="flex flex-column gap-2 w-full">
                        <label htmlFor="role">Role</label>
                        <div className="p-inputgroup">
                            <Dropdown
                                id="role"
                                name="role"
                                options={[
                                    { label: "Admin", value: "admin" },
                                    { label: "Support", value: "support" },
                                    { label: "User", value: "user" },
                                ]}
                                value={formik?.values.role}
                                onChange={(e) => {
                                    formik?.setFieldValue('role', e.value);
                                }}
                                className={isFormFieldInvalid('role') ? 'p-invalid' : ''}
                            />
                        </div>
                        {isFormFieldInvalid('role') ? getFormErrorMessage('role') : ''}
                    </div>
                }
                <div className="flex flex-column gap-2 w-full">
                    <label htmlFor="status">Status</label>
                    <div className="p-inputgroup">
                        <Dropdown
                            id="status"
                            name="status"
                            optionValue="kode"
                            optionLabel="label"
                            options={[
                                { kode: '0', label: 'nonactive' },
                                { kode: '1', label: 'active' },
                            ]}
                            value={formik?.values.status}
                            onChange={(e) => {
                                formik?.setFieldValue('status', e.value);
                            }}
                            className={isFormFieldInvalid('status') ? 'p-invalid' : ''}
                        />
                    </div>
                    {isFormFieldInvalid('status') ? getFormErrorMessage('status') : ''}
                </div>
                <Button type="submit" label={state?.edit ? 'Update' : 'Save'} className="mt-2" loading={state?.load} />
            </form>
        </Dialog>

        <Dialog
            header="Confirm Delete"
            visible={state.delete}
            onHide={() => {
                setState((p) => ({ ...p, add: false, edit: false, delete: false }));
            }}
            modal
            style={{ width: "25rem" }}
            footer={() => {
                return <div className="flex justify-content-center gap-2">
                    <Button
                        label="Batal"
                        icon="pi pi-times"
                        severity="secondary"
                        outlined
                        onClick={
                            () => {
                                setState((p) => ({ ...p, add: false, edit: false, delete: false }));
                            }
                        }
                        disabled={state.load}
                    />
                    <Button
                        label="Ya, Hapus"
                        icon="pi pi-trash"
                        severity="danger"
                        onClick={handleDelete}
                        loading={state.load}
                    />
                </div>
            }}
        >
            <div className="flex flex-column align-items-center text-center gap-4 py-4">
                <i className="pi pi-exclamation-triangle text-red-500 text-6xl" />

                <div>
                    <h3 className="font-bold mb-2">
                        {state.selectedData.length > 1
                            ? `Delete ${state.selectedData.length} units?`
                            : "Delete this unit?"
                        }
                    </h3>
                    <p className="text-color-secondary">
                        {state.selectedData.length > 1 ? (
                            `You are going to delete all this selected ${state.selectedData.length} units`
                        ) : (
                            <>
                                You are going to delete this unit as follow : <strong>{state.selectedData[0]?.user_code || ""}</strong>
                                {`(${state.selectedData[0]?.fullname})`}.
                            </>
                        )}
                        <br />
                        This action can&apos;t be undone
                    </p>
                </div>
            </div>
        </Dialog>
    </>

}

export default Form