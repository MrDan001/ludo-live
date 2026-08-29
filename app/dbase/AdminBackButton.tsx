"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";

export default function AdminBackButton(){
 const pathname=usePathname();
 if(!pathname||pathname==="/dbase"||pathname==="/dbase/")return null;
 return <>
   <style jsx global>{`
     .admin-back-dashboard{
       position:absolute !important;
       left:0 !important;
       top:50% !important;
       transform:translateY(-50%) !important;
       z-index:31 !important;
       display:flex !important;
       align-items:center !important;
       min-height:34px !important;
       padding:0 8px !important;
       border:0 !important;
       border-radius:8px !important;
       background:transparent !important;
       box-shadow:none !important;
       backdrop-filter:none !important;
       color:#8fa7c2 !important;
       text-decoration:none !important;
       font-size:11px !important;
       font-weight:900 !important;
       gap:4px !important;
     }
     .admin-back-dashboard:hover{background:#10253c !important;color:#fff !important;transform:translateY(-50%) !important}
     .admin-back-dashboard span:first-child{font-size:18px !important;line-height:1 !important}
     @media(max-width:820px){
       .admin-back-dashboard{left:0 !important;top:50% !important}
     }
   `}</style>
   <Link className="admin-back-dashboard" href="/dbase" aria-label="Back to Admin Dashboard">
     <span aria-hidden="true">←</span><span>Back</span>
   </Link>
 </>
}
