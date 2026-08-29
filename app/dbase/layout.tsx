import AdminBackButton from "./AdminBackButton";
import "./dbase.css";
export default function AdminLayout({children}:{children:React.ReactNode}){return <>{children}<AdminBackButton/></>}
