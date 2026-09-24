/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Standard
 * @file page.tsx
 * @description File navbar untuk page users sebagai handler hak akses menu
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


import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import MenuDisplay from './menuDisplay';
import { useEffect, useState } from 'react';
import { NavbarProps } from '../interfaces';
import { AppMenuItem } from '@/types';

const NavForm = ({ navBar, setNavBar, handleSaveNavbar }: NavbarProps) => {
    const [state, setState] = useState({
        searchVal: "",
        filteredMenu: navBar?.menu || [],
    });


    const searchMenuByLabel = (
        menu: AppMenuItem[],
        keyword: string,
        parentIndexes: number[] = []
    ): AppMenuItem[] => {
        if (!Array.isArray(menu)) return [];

        const lowerKeyword = keyword?.toLowerCase() || "";

        if (!lowerKeyword) {
            return menu.map((item, idx) => ({
                ...item,
                indexPath: [...parentIndexes, idx],
                items: searchMenuByLabel(item.items || [], "", [...parentIndexes, idx])
            }));
        }

        return menu
            .map((item, idx): AppMenuItem | null => {
                const isMatch = item.label?.toLowerCase().includes(lowerKeyword);
                const childMatches = searchMenuByLabel(item.items || [], keyword, [...parentIndexes, idx]);

                if (isMatch || childMatches.length > 0) {
                    return {
                        ...item,
                        indexPath: [...parentIndexes, idx],
                        items: childMatches
                    };
                }
                return null;
            })
            .filter((item): item is AppMenuItem => item !== null);
    };



    const deleteItemByIndexes = (indexes: any[]) => {
        if (!Array.isArray(indexes) || indexes.length === 0) return;

        const updated = structuredClone(navBar.menu);
        let target = updated;

        for (let i = 0; i < indexes.length - 1; i++) {
            const current = target[indexes[i]];
            if (!current || !Array.isArray(current.items)) return;
            target = current.items;
        }

        target.splice(indexes?.at(-1), 1);

        setNavBar(p => ({ ...p, menu: updated }));
    };

    const removeIndexPath = (menu: AppMenuItem[]) => {
        const cloned = structuredClone(menu);

        const dfs = (items: AppMenuItem[]) => {
            items.forEach(item => {
                delete item.indexPath;
                if (item.items) dfs(item.items);
            });
        };

        dfs(cloned);
        return cloned;
    };


    const handleReset = () => {
        setNavBar(p => ({ ...p, menu: navBar?.data || [] }));
        setState({
            searchVal: "",
            filteredMenu: navBar?.data || [],
        });
    };

    const handleSave = () => {
        setNavBar(p => ({ ...p, show: false }));
        handleSaveNavbar();
    };

    const footerMenuTemplate = (
        <div>
            <Button
                label="No"
                icon="pi pi-times"
                onClick={() => setNavBar(p => ({ ...p, show: false, menu: [] }))}
                className="p-button-text"
            />
            <Button label="Yes" icon="pi pi-check" onClick={handleSave} />
        </div>
    );

    useEffect(() => {
        const filtered = searchMenuByLabel(navBar?.menu, state.searchVal);
        setState(p => ({ ...p, filteredMenu: filtered }));
    }, [navBar?.menu, state.searchVal]);
    return (
        <Dialog
            header="Akses"
            visible={navBar?.show}
            onHide={() => setNavBar(p => ({ ...p, show: false }))}
            className="w-9 md:w-6"
            footer={footerMenuTemplate}
        >
            <div>
                <div className="card shadow-2 mb-1 border-round p-3 flex gap-2">
                    <Button label="Reset" onClick={handleReset} />
                    <span className="block w-full p-input-icon-left">
                        <i className="pi pi-search" />
                        <InputText
                            type="search"
                            className="w-full"
                            value={state.searchVal}
                            onChange={e => {
                                const keyword = e.target.value;
                                const filtered = searchMenuByLabel(navBar.menu, keyword);
                                setState({ searchVal: keyword, filteredMenu: filtered });
                            }}
                            placeholder="Search..."
                        />
                    </span>
                </div>

                <div
                    className="card shadow-2 mt-0 border-round p-2 flex gap-2"
                    style={{ overflow: "scroll" }}
                >
                    <MenuDisplay onEdit={(item: number[]) => deleteItemByIndexes(item)} data={state.filteredMenu} />
                </div>
            </div>
        </Dialog>
    );
};

export default NavForm;
