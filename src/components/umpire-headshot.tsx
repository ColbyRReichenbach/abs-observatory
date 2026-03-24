"use client";

import { useState } from "react";

export function UmpireHeadshot({
    umpireId,
    umpireName
}: {
    umpireId: number;
    umpireName: string;
}) {
    const [error, setError] = useState(false);

    if (error) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-700 text-white font-display text-6xl">
                {umpireName.charAt(0)}
            </div>
        );
    }

    return (
        <img
            src={`https://midfield.mlbstatic.com/v1/people/${umpireId}/spots/120`}
            alt={umpireName}
            className="object-cover h-full w-full bg-gray-100"
            onError={() => setError(true)}
        />
    );
}
