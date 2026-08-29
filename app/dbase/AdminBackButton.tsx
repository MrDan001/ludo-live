"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
export default function AdminBackButton(){const pathname=usePathname();if(!pathname||pathname==="/dbase"||pathname==="/dbase/")return null;return <Link className="admin-back-dashboard" href="/dbase" aria-label="Back to Admin Dashboard"><span aria-hidden="true">←</span><span>Admin Dashboard</span></Link>}
