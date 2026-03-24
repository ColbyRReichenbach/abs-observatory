import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

/**
 * S7-5: OG Image API — server-rendered PNG for social cards.
 * When shared on X/Twitter, the link preview shows this branded image
 * instead of a generic text card.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ vizId: string }> }) {
    const { vizId } = await params;

    return new ImageResponse(
        (
            <div
                style= {{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        backgroundColor: "#ffffff",
        fontFamily: "system-ui, sans-serif",
        padding: "60px",
    }}
            >
    <div
                    style={
    {
        display: "flex",
            flexDirection: "column",
                alignItems: "center",
                    justifyContent: "center",
                        flex: 1,
                    }
}
                >
    <div
                        style={
    {
        fontSize: 14,
            fontWeight: 900,
                color: "#0066cc",
                    letterSpacing: "0.2em",
                        textTransform: "uppercase",
                            marginBottom: 16,
                        }
}
                    >
    ABS Observatory
        </div>
        < div
style = {{
    fontSize: 48,
        fontWeight: 900,
            color: "#111827",
                textTransform: "uppercase",
                    letterSpacing: "-0.03em",
                        textAlign: "center",
                            lineHeight: 1.1,
                        }}
                    >
    AI Visualization
        </div>
        < div
style = {{
    fontSize: 16,
        color: "#86868b",
            marginTop: 20,
                textAlign: "center",
                    maxWidth: 500,
                        }}
                    >
    Custom ABS challenge data analysis — powered by aiBS
        </div>
        </div>
        < div
style = {{
    display: "flex",
        justifyContent: "space-between",
            width: "100%",
                alignItems: "center",
                    borderTop: "1px solid #e5e7eb",
                        paddingTop: 20,
                    }}
                >
    <div style={ { fontSize: 10, color: "#86868b", fontWeight: 700, letterSpacing: "0.1em" } }>
        absobs.io / v / { vizId }
        </div>
        < div style = {{ fontSize: 10, color: "#86868b", fontWeight: 700, letterSpacing: "0.1em" }}>
            absobs.io • @ColbyReichenbach
</div>
    </div>
    </div>
        ),
{
    width: 1200,
        height: 630,
        }
    );
}
