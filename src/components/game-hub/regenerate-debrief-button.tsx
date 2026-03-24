"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, RefreshCcw } from "lucide-react";

type RegenerateDebriefState = {
    status: "idle" | "success" | "error";
    message: string;
};

type RegenerateDebriefButtonProps = {
    action: (
        state: RegenerateDebriefState,
        formData: FormData,
    ) => Promise<RegenerateDebriefState>;
    label: string;
};

const INITIAL_STATE: RegenerateDebriefState = {
    status: "idle",
    message: "",
};

function SubmitButton({ label }: { label: string }) {
    const { pending } = useFormStatus();

    return (
        <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-full bg-gray-950 px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.24em] text-white shadow-lg shadow-black/15 transition-transform duration-150 hover:scale-105 hover:bg-black active:scale-95 disabled:cursor-wait disabled:opacity-70"
        >
            {pending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCcw size={12} />}
            <span>{pending ? "Refreshing..." : label}</span>
        </button>
    );
}

export function RegenerateDebriefButton({ action, label }: RegenerateDebriefButtonProps) {
    const [state, formAction] = useActionState(action, INITIAL_STATE);

    return (
        <div className="flex flex-col items-start gap-2">
            <form action={formAction}>
                <SubmitButton label={label} />
            </form>
            {state.status !== "idle" ? (
                <p className={state.status === "error" ? "text-xs font-medium text-red-600" : "text-xs font-medium text-emerald-700"}>
                    {state.message}
                </p>
            ) : null}
        </div>
    );
}
