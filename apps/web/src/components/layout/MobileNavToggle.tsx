"use client";

import { Bars3Icon } from "@heroicons/react/24/outline";
import type React from "react";

type Props = {
    onClick?: () => void;
    open?: boolean;
};

export const MobileNavToggle: React.FC<Props> = ({ onClick, open = false }) => {
    return (
        <button
            type="button"
            aria-label="Toggle sidebar"
            onClick={onClick}
            className="md:hidden p-2 rounded-xl hover:bg-hover/50 transition-all duration-200 active:scale-95"
        >
            <Bars3Icon
                className={`w-5 h-5 transition-transform ${open ? "rotate-90" : "rotate-0"}`}
            />
        </button>
    );
};

export default MobileNavToggle;
