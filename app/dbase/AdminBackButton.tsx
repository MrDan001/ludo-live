"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";

export default function AdminBackButton(){
 const pathname=usePathname();
 if(!pathname||pathname==="/dbase"||pathname==="/dbase/")return null;
 return <>
   <style jsx global>{`
     .dbase-header{padding-left:92px !important}
     .admin-back-dashboard{
       position:fixed !important;
       left:calc(248px + 18px) !important;
       top:18px !important;
       z-index:60 !important;
       display:flex !important;
       align-items:center !important;
       min-height:40px !important;
       padding:0 12px !important;
       border:1px solid #2b4d6d !important;
       border-radius:10px !important;
       background:rgba(8,23,39,.94) !important;
       box-shadow:0 8px 24px rgba(0,0,0,.25) !important;
       backdrop-filter:blur(14px) !important;
       color:#d7e8ff !important;
       text-decoration:none !important;
       font-size:11px !important;
       font-weight:900 !important;
       gap:5px !important;
     }
     .admin-back-dashboard:hover{background:#102943 !important;color:#fff !important;border-color:#4f8fd1 !important}
     .admin-back-dashboard span:first-child{font-size:19px !important;line-height:1}
     @media(max-width:820px){
       .dbase-header{padding-left:72px !important}
       .admin-back-dashboard{left:12px !important;top:12px !important;min-height:40px !important;padding:0 11px !important}
     }
   `}</style>
   <Link className="admin-back-dashboard" href="/dbase" aria-label="Back to Admin Dashboard">
     <span aria-hidden="true">←</span><span>Back</span>
   </Link>
 </>
}
