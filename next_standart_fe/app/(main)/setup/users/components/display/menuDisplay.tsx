/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Standard
 * @file page.tsx
 * @description File komponen untuk menampilkan menu navbar pada page users
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


import { ListMenuDisplayProps, MenuDisplayProps } from "../interfaces";

const ListMenuDisplay = ({ data, indexPath = [], onEdit }: ListMenuDisplayProps) => {
    const submenu = data?.items && (
        <ul style={{ listStyleType: "none" }}>
            {data.items.map((val, i) => {
                return <ListMenuDisplay data={val} onEdit={onEdit} indexPath={[...indexPath, i]} key={val?.label + "-" + i} />;
            })}
        </ul>
    );

    const handleButtonClick = () => {
        onEdit(indexPath);
    };

    return (
        <li key={data?.label} style={{ margin: "0", padding: "0" }}>
            {data?.label && (
                <div className="flex align-content-end mt-3">
                    <span
                        onClick={handleButtonClick}
                        style={{ backgroundColor: "#d6d6d6", borderRadius: "1rem", padding: "2px 5px", cursor: "pointer" }}
                        className="mr-1">
                        <i className="pi pi-trash tooltip-button"></i>
                    </span>

                    <div className="flex gap-2 justify-content-center">
                        {data?.icon && (
                            <div className="flex align-items-center">
                                <i className={data?.icon}></i>
                            </div>
                        )}
                        <span className="flex align-items-center">{data?.label}</span>
                    </div>
                </div>
            )}
            {submenu}
        </li>
    );
};

const MenuDisplay = ({ data, onEdit }: MenuDisplayProps) => {
    return (
        <ul style={{ listStyleType: "none" }}>
            {data?.map((val, i) => {
                return <ListMenuDisplay data={val} indexPath={[i]} onEdit={onEdit} key={val?.label + "-" + i} />;
            })}
        </ul>
    );
};

export default MenuDisplay