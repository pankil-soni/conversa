import { Outlet, useParams } from "react-router-dom"
import ConversationsList from "../dashboard/ConversationsList"

const ConversationLayout = () => {
    // On mobile we show only the list OR the detail, not both
    // On desktop (lg+) we always show both side by side
    const { id } = useParams<{ id: string }>()

    return (
        <div className="h-full w-full flex overflow-hidden">
            {/* Conversations list — hidden on mobile when a chat is open */}
            <div
                className={[
                    "h-full shrink-0 border-r overflow-hidden",
                    "lg:flex lg:flex-col lg:w-96",   // always visible on desktop
                    id ? "hidden" : "flex flex-col w-full",  // mobile: hide when chat open
                ].join(" ")}
            >
                <ConversationsList />
            </div>

            {/* Chat detail / welcome — hidden on mobile when no chat is open */}
            <div
                className={[
                    "flex flex-1 flex-col min-h-0 overflow-hidden",
                    id ? "flex" : "hidden lg:flex",  // mobile: only show when chat open
                ].join(" ")}
            >
                <Outlet />
            </div>
        </div>
    )
}

export default ConversationLayout