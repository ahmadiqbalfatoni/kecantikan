'use client'
import postData from "@/lib/axios/postData";
import { Toast } from "primereact/toast";
import { useEffect, useRef, useState } from "react";
import { showError, showSuccess } from "@/lib/tools/generalTools";
import { useFormik } from "formik";
import { initValue, NavState, State } from "./components/interfaces";
import { FilterMatchMode } from "primereact/api";
import Form from "./components/display/form";
import { useSession } from "next-auth/react";

const Page = () => {
    const toast = useRef<Toast>(null)
    const { data: session } = useSession()

    const [state, setState] = useState<State>({
        load: false,
        data: [],
        add: false,
        edit: false,
        delete: false,
        selectedUsers: [],
        searchVal: '',
        filters: { global: { value: null, matchMode: FilterMatchMode.CONTAINS } },
        session: null,
        submittedData: null,
        imgPrev: null
    })

    const formik = useFormik<initValue>({
        initialValues: {
            msNamaPerusahaan: '',
            msIzinOperasional: '',
            msAlamatPerusahaan: '',
            msKotaPerusahaan: '',
            msTeleponPerusahaan: '',
            msWaKlinik: '',
            msEmailPerusahaan: '',
            msWebsitePerusahaan: '',
            msLogoPerusahaan: '',
        },
        validate: (data: initValue) => {
            let errors = {};
            // Validasi name

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
                kode: [
                    'msNamaPerusahaan',
                    'msIzinOperasional',
                    'msAlamatPerusahaan',
                    'msKotaPerusahaan',
                    'msTeleponPerusahaan',
                    'msWaKlinik',
                    'msEmailPerusahaan',
                    'msWebsitePerusahaan',
                    'msLogoPerusahaan',
                ]
            });

            const { msLogoPerusahaan, ...vaValues } = res.data?.data || {};

            formik.setValues(vaValues || {});

            setState((p) => ({
                ...p,
                imgPrev: msLogoPerusahaan || null
            }));

        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || 'Terjadi Kesalahan');
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



    return <>
        <div className="">
            <Toast ref={toast} position="top-right" />
            <Form formik={formik} state={state} setState={setState} toast={toast} getData={getData} />
        </div>
    </>
}

export default Page