import { useAuth } from "@/hooks/use-auth"
import { useEffect } from "react"
import { useNavigate } from "react-router-dom"

const User = () => {

    const navigate = useNavigate()
    const { user } = useAuth()

    // Redirect if already logged in
    useEffect(() => {
        if (user) navigate("/user/conversations", { replace: true })
    }, [user, navigate])

    return (
        <></>
    )
}

export default User