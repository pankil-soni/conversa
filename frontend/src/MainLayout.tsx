import { Outlet } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";

export default function MainLayout() {
    return (
            <div className="h-dvh w-dvw overflow-hidden">
                <Outlet />
                <Toaster richColors />
            </div>
    );
}