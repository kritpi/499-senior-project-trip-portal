import { Button } from "../ui/button";

export default function LogoutButton() {
    function logout () {
        localStorage.removeItem("access_token")
    }
    return (
        <Button onClick={logout} variant="destructive" className="w-full">
            Sign Out
        </Button>
    )
}