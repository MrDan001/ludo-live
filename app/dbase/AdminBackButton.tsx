"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";

export default function AdminBackButton(){
 const pathname=usePathname();
 if(!pathname||pathname==="/dbase"||pathname==="/dbase/")return null;
 return <>
   <style jsx global>{`
     .admin-back-dashboard{
       position:fixed !important;
       top:18px !important;
       bottom:auto !important;
       left:180px !important;
       z-index:101 !important;
       min-height:36px !important;
       padding:0 10px !important;
       border:0 !important;
       border-radius:8px !important;
       background:transparent !important;
       box-shadow:none !important;
       backdrop-filter:none !important;
       color:#8fa7c2 !important;
       font-size:11px !important;
       font-weight:900 !important;
       gap:5px !important;
     }
     .admin-back-dashboard:hover{background:#10253c !important;color:#fff !important;transform:none !important}
     .admin-back-dashboard span:first-child{font-size:18px !important;line-height:1 !important}
     @media(max-width:820px){
       .admin-back-dashboard{left:86px !important;top:20px !important}
     }
   `}</style>
   <Link className="admin-back-dashboard" href="/dbase" aria-label="Back to Admin Dashboard">
     <span aria-hidden="true">←</span><span>Back</span>
   </Link>
 </>
}
