"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

export function GameHubRouter({ status }: { status: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();

    useEffect(() => {
        const currentStatus = searchParams.get("status");
        if (currentStatus !== status) {
            const newParams = new URLSearchParams(searchParams.toString());
            newParams.set("status", status);
            router.replace(`${pathname}?${newParams.toString()}`);
        }
    }, [status, searchParams, pathname, router]);

    return null;
}
