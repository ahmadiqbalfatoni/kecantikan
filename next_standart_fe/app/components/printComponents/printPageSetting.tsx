import { PrintPageSettingState, PrintPageSettingProps, Orientation, PaperSize } from "@/types/print-tools";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { Toolbar } from "primereact/toolbar";
import { useState } from "react";

export default function PrintPageSetting({
    adjustDialog, setAdjustDialog, handleAdjust, handleExcel
}: PrintPageSettingProps) {
    const [dataAdjust, setDataAdjust] = useState<PrintPageSettingState>({
        marginTop: 10,
        marginBottom: 10,
        marginRight: 10,
        marginLeft: 10,
        paperWidth: 210,
        betweenCells: 10,
        paddingTop: 5,
        paperSize: "A4",
        orientation: "portrait",
        signature1: "",
        signature2: "",
        officerName1: "",
        officerName2: "",
        position1: "",
        position2: "",
    });

    const paperSizes: { name: string; value: PaperSize }[] = [
        { name: "A4", value: "A4" },
        { name: "Letter", value: "Letter" },
        { name: "Legal", value: "Legal" },
    ];

    const orientationOptions: { label: string; value: Orientation }[] = [
        { label: "Potrait", value: "portrait" },
        { label: "Lanskap", value: "landscape" },
    ];

    const onInputChangeNumber = (
        e: any,
        field: keyof PrintPageSettingState
    ) => {
        const val = Number(e.target?.value ?? e.value ?? 0);
        setDataAdjust((prev) => ({ ...prev, [field]: val }));
    };

    const onInputChange = (e: any, field: keyof PrintPageSettingState) => {
        const val = e.target?.value ?? e.value ?? "";
        setDataAdjust((prev) => ({ ...prev, [field]: val }));
    }

    const exportPDF = () => {
        handleAdjust(dataAdjust);
        setAdjustDialog(false);
    }

    const exportXLSX = () => {
        if (handleExcel) {
            handleExcel(dataAdjust);
            setAdjustDialog(false);
        }
    };

    const footer = () => (
        <div className="flex" >
            <Button
                label="Export PDF"
                icon="pi pi-file"
                className="p-button-danger mr-2"
                onClick={exportPDF}
            />
            {handleExcel && (
                <Button
                    label="Export XLSX"
                    icon="pi pi-file"
                    className="p-button-success mr-2"
                    onClick={exportXLSX}
                />
            )}
        </div>
    )

    return (
        <Dialog
            visible={adjustDialog}
            onHide={() => setAdjustDialog(false)}
            header="Print Page Settings"
            style={{ width: "50vw" }}
            breakpoints={{
                "960px": "85vw",
                "768px": "90vw",
                "576px": "95vw",
            }}
        >
            <div className="grid p-fluid">
                {/* Margin */}
                <div className="col-12 md:col-6">
                    <h5>Margin Settings</h5>
                    <div className="grid formgrid">
                        {["Top", "Bottom", "Right", "Left"].map((pos) => (
                            <div className="col-6 field" key={pos}>
                                <label>Margin {pos}</label>
                                <InputNumber
                                    value={dataAdjust[`margin${pos}` as keyof PrintPageSettingState] as number}
                                    onChange={(e) =>
                                        onInputChangeNumber(e, `margin${pos}` as keyof PrintPageSettingState)
                                    }
                                    min={0}
                                    suffix=" mm"
                                    showButtons
                                    className="w-full"
                                    inputStyle={{ padding: "0.3rem" }}
                                />
                            </div>
                        ))}
                    </div>
                </div>
                {/* Paper */}
                <div className="col-12 md:col-6">
                    <h5>Paper Settings</h5>
                    <div className="field">
                        <label>Paper Size</label>
                        <Dropdown
                            value={dataAdjust.paperSize}
                            options={paperSizes}
                            onChange={(e) => onInputChange(e, "paperSize")}
                            optionLabel="name"
                            className="w-full"
                        />
                    </div>
                    <div className="field">
                        <label>Orientation</label>
                        <Dropdown
                            value={dataAdjust.orientation}
                            options={orientationOptions}
                            onChange={(e) => onInputChange(e, "orientation")}
                            className="w-full"
                        />
                    </div>
                </div>
                {/* Officer */}
                <div className="col-12 grid">
                    <div className="col-12 md:col-6">
                        <h5>Officer 1 Information</h5>
                        <div className="field">
                            <label>Signature 1</label>
                            <InputText
                                value={dataAdjust.signature1}
                                onChange={(e) => onInputChange(e, "signature1")}
                                className="w-full"
                            />
                        </div>
                        <div className="field">
                            <label>Officer Name 1</label>
                            <InputText
                                value={dataAdjust.officerName1}
                                onChange={(e) => onInputChange(e, "officerName1")}
                                className="w-full"
                            />
                        </div>
                        <div className="field">
                            <label>Position 1</label>
                            <InputText
                                value={dataAdjust.position1}
                                onChange={(e) => onInputChange(e, "position1")}
                                className="w-full"
                            />
                        </div>
                    </div>
                    <div className="col-12 md:col-6">
                        <h5>Officer 2 Information</h5>
                        <div className="field">
                            <label>Signature 2</label>
                            <InputText
                                value={dataAdjust.signature2}
                                onChange={(e) => onInputChange(e, "signature2")}
                                className="w-full"
                            />
                        </div>
                        <div className="field">
                            <label>Officer Name 2</label>
                            <InputText
                                value={dataAdjust.officerName2}
                                onChange={(e) => onInputChange(e, "officerName2")}
                                className="w-full"
                            />
                        </div>
                        <div className="field">
                            <label>Position 1</label>
                            <InputText
                                value={dataAdjust.position2}
                                onChange={(e) => onInputChange(e, "position2")}
                                className="w-full"
                            />
                        </div>
                    </div>
                </div>
            </div>
            <Toolbar className="py-2 justify-content-end" end={footer} />
        </Dialog>
    )
}